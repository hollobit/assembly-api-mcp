/**
 * OpenAPI REST 라우터
 *
 * HTTP 요청 URL을 파싱하여 적절한 핸들러로 라우팅합니다.
 * 기존 MCP HTTP 서버에 /api/* 경로를 추가합니다.
 */

import { type IncomingMessage, type ServerResponse } from "node:http";
import { type AppConfig, overrideConfigFromParams } from "../config.js";
import { createApiClient } from "../api/client.js";
import { generateOpenApiSpec } from "./spec.js";
import {
  type HandlerContext,
  type RouteHandler,
  searchMembers,
  searchBills,
  getSchedule,
  searchMeetings,
  getVotes,
  analyzeLegislator,
  trackLegislation,
  discoverApis,
  queryAssembly,
  getBillDetail,
  getBillReview,
  getBillHistory,
  getCommittees,
  searchPetitions,
  getLegislationNotices,
  searchLibrary,
  getBudgetAnalysis,
  searchResearchReports,
} from "./handlers.js";

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

interface RouteEntry {
  readonly pattern: RegExp;
  readonly handler: RouteHandler;
  readonly pathParamNames: readonly string[];
  readonly profile: "lite" | "full";
}

/**
 * Route order matters: more specific patterns must come before generic ones.
 * /api/bills/review and /api/bills/history must precede /api/bills/{bill_id}.
 */
const ROUTES: readonly RouteEntry[] = [
  // Lite routes
  { pattern: /^\/api\/members$/, handler: searchMembers, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/bills\/review$/, handler: getBillReview, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/bills\/history$/, handler: getBillHistory, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/bills\/([^/]+)$/, handler: getBillDetail, pathParamNames: ["bill_id"], profile: "full" },
  { pattern: /^\/api\/bills$/, handler: searchBills, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/schedule$/, handler: getSchedule, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/meetings$/, handler: searchMeetings, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/votes$/, handler: getVotes, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/legislators\/([^/]+)\/analysis$/, handler: analyzeLegislator, pathParamNames: ["name"], profile: "lite" },
  { pattern: /^\/api\/legislation\/track$/, handler: trackLegislation, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/legislation\/notices$/, handler: getLegislationNotices, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/discover$/, handler: discoverApis, pathParamNames: [], profile: "lite" },
  { pattern: /^\/api\/query\/([^/]+)$/, handler: queryAssembly, pathParamNames: ["api_code"], profile: "lite" },
  // Full-only routes
  { pattern: /^\/api\/committees$/, handler: getCommittees, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/petitions$/, handler: searchPetitions, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/library$/, handler: searchLibrary, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/budget$/, handler: getBudgetAnalysis, pathParamNames: [], profile: "full" },
  { pattern: /^\/api\/research$/, handler: searchResearchReports, pathParamNames: [], profile: "full" },
];

// ---------------------------------------------------------------------------
// URL parser
// ---------------------------------------------------------------------------

function parseUrl(raw: string): { pathname: string; queryParams: Record<string, string | undefined> } {
  const idx = raw.indexOf("?");
  const pathname = idx === -1 ? raw : raw.slice(0, idx);
  const queryParams: Record<string, string | undefined> = {};

  if (idx !== -1) {
    const searchParams = new URLSearchParams(raw.slice(idx + 1));
    for (const [k, v] of searchParams) {
      queryParams[k] = v;
    }
  }

  return { pathname, queryParams };
}

// ---------------------------------------------------------------------------
// CORS headers (ChatGPT GPTs needs them)
// ---------------------------------------------------------------------------

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ---------------------------------------------------------------------------
// Public router
// ---------------------------------------------------------------------------

/**
 * /api/* 또는 /openapi.json 요청을 처리합니다.
 * 해당 경로가 아니면 false를 반환하여 기존 MCP 핸들러로 넘깁니다.
 */
export async function handleRestRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<boolean> {
  const url = req.url ?? "/";
  const { pathname, queryParams } = parseUrl(url);

  // CORS preflight
  if (req.method === "OPTIONS" && (pathname.startsWith("/api/") || pathname === "/openapi.json")) {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  // OpenAPI spec endpoint
  if (pathname === "/openapi.json" && req.method === "GET") {
    setCorsHeaders(res);
    const profile = (queryParams.profile === "full") ? "full" : "lite";
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const host = req.headers.host ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;
    const spec = generateOpenApiSpec(baseUrl, profile);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(spec, null, 2));
    return true;
  }

  // REST API endpoints
  if (!pathname.startsWith("/api/")) return false;
  if (req.method !== "GET") {
    setCorsHeaders(res);
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
    return true;
  }

  // Override config with query params (key, profile)
  const sessionConfig = overrideConfigFromParams(config, {
    key: queryParams.key,
    profile: queryParams.profile,
  });

  // Determine effective profile
  const effectiveProfile = sessionConfig.profile;

  // Match route
  for (const route of ROUTES) {
    const match = pathname.match(route.pattern);
    if (!match) continue;

    // Check profile access: full routes need full profile
    if (route.profile === "full" && effectiveProfile !== "full") {
      setCorsHeaders(res);
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: false,
        error: `이 엔드포인트는 Full 프로필에서만 사용할 수 있습니다. URL에 profile=full을 추가하세요.`,
      }));
      return true;
    }

    // Extract path params
    const pathParams: Record<string, string> = {};
    for (let i = 0; i < route.pathParamNames.length; i++) {
      pathParams[route.pathParamNames[i]] = decodeURIComponent(match[i + 1]);
    }

    const ctx: HandlerContext = {
      api: createApiClient(sessionConfig),
      config: sessionConfig,
    };

    setCorsHeaders(res);

    try {
      const result = await route.handler(ctx, queryParams, pathParams);
      res.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result.body));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: msg }));
    }

    return true;
  }

  // No matching route
  setCorsHeaders(res);
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error: "API endpoint not found" }));
  return true;
}
