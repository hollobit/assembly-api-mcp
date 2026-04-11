/**
 * MCP 서버 초기화 및 도구 등록
 *
 * McpServer 인스턴스를 생성하고, 모든 국회 API 도구를 등록합니다.
 * config.server.transport 설정에 따라 stdio 또는 HTTP 전송을 사용합니다.
 */

import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type AppConfig, overrideConfigFromParams } from "./config.js";
import { handleRestRequest } from "./openapi/router.js";
import { getLandingPageHtml } from "./pages/landing.js";
import { createApiClient } from "./api/client.js";
import { mcpLogger } from "./api/mcp-logger.js";
import { registerLiteTools } from "./tools/lite/index.js";
import { registerBillDetailTool } from "./tools/full/bill-detail.js";
import { registerCommitteeDetailTool } from "./tools/full/committee-detail.js";
import { registerPetitionDetailTool } from "./tools/full/petition-detail.js";
import { registerResearchDataTool } from "./tools/full/research-data.js";
import { registerNaboTools } from "./tools/nabo.js";
import { registerResources } from "./resources/static-data.js";
import { registerPrompts } from "./prompts/templates.js";

// ---------------------------------------------------------------------------
// MCP Server factory (transport-agnostic)
// ---------------------------------------------------------------------------

function buildMcpServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: "assembly-api-mcp",
    version: "0.7.0",
  });

  // 도구 등록 — 프로필에 따라 분기
  if (config.profile === "full") {
    // Lite 도구 6개 먼저 등록
    registerLiteTools(server, config);

    // Full 전용 심층 도구 5개 추가 (총 11개)
    registerBillDetailTool(server, config);      // bill_detail (상세+심사+이력+제안자+회의)
    registerCommitteeDetailTool(server, config);  // committee_detail (위원회+위원명단)
    registerPetitionDetailTool(server, config);   // petition_detail (청원 상세)
    registerResearchDataTool(server, config);     // research_data (도서관+조사처+예산처)
    registerNaboTools(server, config);          // get_nabo (nabo.go.kr 보고서/정기간행물/채용)
  } else {
    // Lite 프로필 (기본): 6개 도구
    registerLiteTools(server, config);
  }

  // MCP Logging 연결 — 도구/모니터 로그가 클라이언트에 전달됨
  mcpLogger.attach((params) => server.sendLoggingMessage(params));

  // 리소스 등록
  registerResources(server, config);

  // 프롬프트 등록
  registerPrompts(server);

  return server;
}

// ---------------------------------------------------------------------------
// Stdio transport
// ---------------------------------------------------------------------------

async function startStdioTransport(config: AppConfig): Promise<McpServer> {
  const server = buildMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

// ---------------------------------------------------------------------------
// Streamable HTTP transport
// ---------------------------------------------------------------------------

const MCP_ENDPOINT = "/mcp";

/** Session entry — transport + last-used timestamp for cleanup */
interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  lastUsed: number;
}

/** Session TTL: 30 minutes */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** Session cleanup interval: 5 minutes */
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Maximum concurrent sessions (memory protection) */
const MAX_SESSIONS = 200;

async function startHttpTransport(config: AppConfig): Promise<McpServer> {
  const sessions = new Map<string, SessionEntry>();

  // Periodic cleanup of stale sessions
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of sessions) {
      if (now - entry.lastUsed > SESSION_TTL_MS) {
        process.stderr.write(
          `[assembly-api-mcp] 세션 만료, 정리합니다: ${id}\n`,
        );
        void entry.transport.close();
        sessions.delete(id);
      }
    }
  }, SESSION_CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  const httpServer = createHttpServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const url = req.url ?? "/";

      // Landing page (setup helper)
      if (url === "/" && req.method === "GET") {
        const baseUrl = `${req.headers["x-forwarded-proto"] ?? "http"}://${req.headers.host ?? "localhost:" + String(config.server.port)}`;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getLandingPageHtml(baseUrl));
        return;
      }

      // Health-check endpoint
      if (url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", sessions: sessions.size }));
        return;
      }

      // OpenAPI REST endpoints (/api/*, /openapi.json)
      if (url.startsWith("/api/") || url.startsWith("/openapi.json")) {
        void handleRestRequest(req, res, config)
          .then((handled) => {
            if (!handled) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Not found" }));
            }
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            if (!res.headersSent) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: msg }));
            }
          });
        return;
      }

      // MCP endpoint — per-session transport routing
      if (url === MCP_ENDPOINT || url.startsWith(MCP_ENDPOINT + "?")) {
        void handleMcpRequest(req, res, config, sessions);
        return;
      }

      // Everything else → 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    },
  );

  const { port } = config.server;

  await new Promise<void>((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, () => {
      process.stderr.write(
        `[assembly-api-mcp] HTTP 서버가 포트 ${String(port)}에서 시작되었습니다. (엔드포인트: ${MCP_ENDPOINT})\n`,
      );
      resolve();
    });
  });

  // 캐시 Warm-up + 주기 갱신 (백그라운드, 실패해도 서버 가동에 영향 없음)
  if (config.apiKeys.assemblyApiKey && config.apiKeys.assemblyApiKey !== "sample") {
    const warmClient = createApiClient(config);
    void warmClient.warmUp();
    warmClient.startPeriodicRefresh(); // 30분마다 정적 API 리프레시
  }

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    process.stderr.write("[assembly-api-mcp] 서버를 종료합니다...\n");
    clearInterval(cleanupTimer);
    const closePromises = Array.from(sessions.values()).map((entry) =>
      entry.transport.close(),
    );
    await Promise.all(closePromises);
    sessions.clear();
    httpServer.close();
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  // Return a "template" server instance (not bound to any session)
  return buildMcpServer(config);
}

function parseQueryParams(url: string): { key?: string; profile?: string } {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const searchParams = new URLSearchParams(url.slice(idx + 1));
  return {
    key: searchParams.get("key") ?? undefined,
    profile: searchParams.get("profile") ?? undefined,
  };
}

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  sessions: Map<string, SessionEntry>,
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session — route to stored transport
  if (sessionId && sessions.has(sessionId)) {
    const entry = sessions.get(sessionId)!;
    entry.lastUsed = Date.now();
    await entry.transport.handleRequest(req, res);
    return;
  }

  // New session — only allowed via POST (initialization) or when no session ID
  if (!sessionId && req.method === "POST") {
    // 세션 수 제한 (메모리 보호)
    if (sessions.size >= MAX_SESSIONS) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Too many active sessions. Try again later." }));
      return;
    }
    // URL 쿼리 파라미터로 세션별 config 생성 (key, profile)
    const params = parseQueryParams(req.url ?? "");
    const sessionConfig = overrideConfigFromParams(config, params);

    const newTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    const newServer = buildMcpServer(sessionConfig);
    await newServer.connect(newTransport);

    // Handle the request (this will generate the session ID in the response)
    await newTransport.handleRequest(req, res);

    // Store the session using the transport's generated session ID
    const newSessionId = newTransport.sessionId;
    if (newSessionId) {
      sessions.set(newSessionId, {
        transport: newTransport,
        server: newServer,
        lastUsed: Date.now(),
      });
      process.stderr.write(
        `[assembly-api-mcp] 새 세션 생성: ${newSessionId} (총 ${sessions.size}개)\n`,
      );

      // Clean up when transport closes
      newTransport.onclose = () => {
        sessions.delete(newSessionId);
        process.stderr.write(
          `[assembly-api-mcp] 세션 종료: ${newSessionId} (남은 ${sessions.size}개)\n`,
        );
      };
    }
    return;
  }

  // Invalid or expired session
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Invalid or expired session" }));
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function createServer(config: AppConfig): Promise<McpServer> {
  if (config.server.transport === "http") {
    return startHttpTransport(config);
  }
  return startStdioTransport(config);
}
