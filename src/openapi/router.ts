/**
 * OpenAPI REST 라우터
 *
 * HTTP 요청 URL을 파싱하여 적절한 핸들러로 라우팅합니다.
 * 기존 MCP HTTP 서버에 /api/* 경로를 추가합니다.
 */

import { type IncomingMessage, type ServerResponse } from "node:http";
import { type AppConfig, overrideConfigFromParams } from "../config.js";
import { createApiClient, type ApiClient } from "../api/client.js";
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
  getNabo,
} from "./handlers.js";

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

interface RouteEntry {
  readonly pattern: RegExp;
  readonly handler: RouteHandler;
  readonly pathParamNames: readonly string[];
  readonly profile: "lite" | "full";
  /** Max-age in seconds for Cache-Control header. 0 = no-cache. */
  readonly cacheMaxAge: number;
}

/** 정적 데이터 (위원회, API 목록 등): 1시간 캐시 */
const CACHE_STATIC = 3600;
/** 동적 데이터 (의안, 일정 등): 1분 캐시 */
const CACHE_DYNAMIC = 60;
/** 캐시 불가 (분석, 추적 등): no-cache */
const CACHE_NONE = 0;

/**
 * Route order matters: more specific patterns must come before generic ones.
 * /api/bills/review and /api/bills/history must precede /api/bills/{bill_id}.
 */
const ROUTES: readonly RouteEntry[] = [
  // Lite routes
  { pattern: /^\/api\/members$/, handler: searchMembers, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_STATIC },
  { pattern: /^\/api\/bills\/review$/, handler: getBillReview, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/bills\/history$/, handler: getBillHistory, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/bills\/([^/]+)$/, handler: getBillDetail, pathParamNames: ["bill_id"], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/bills$/, handler: searchBills, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/schedule$/, handler: getSchedule, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/meetings$/, handler: searchMeetings, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/votes$/, handler: getVotes, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/legislators\/([^/]+)\/analysis$/, handler: analyzeLegislator, pathParamNames: ["name"], profile: "lite", cacheMaxAge: CACHE_NONE },
  { pattern: /^\/api\/legislation\/track$/, handler: trackLegislation, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_NONE },
  { pattern: /^\/api\/legislation\/notices$/, handler: getLegislationNotices, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/discover$/, handler: discoverApis, pathParamNames: [], profile: "lite", cacheMaxAge: CACHE_STATIC },
  { pattern: /^\/api\/query\/([^/]+)$/, handler: queryAssembly, pathParamNames: ["api_code"], profile: "lite", cacheMaxAge: CACHE_DYNAMIC },
  // Full-only routes
  { pattern: /^\/api\/committees$/, handler: getCommittees, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_STATIC },
  { pattern: /^\/api\/petitions$/, handler: searchPetitions, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/library$/, handler: searchLibrary, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/budget$/, handler: getBudgetAnalysis, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/research$/, handler: searchResearchReports, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
  { pattern: /^\/api\/nabo$/, handler: getNabo, pathParamNames: [], profile: "full", cacheMaxAge: CACHE_DYNAMIC },
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
// API Client cache — reuse across REST requests with the same API key
// ---------------------------------------------------------------------------

const clientCache = new Map<string, { client: ApiClient; lastUsed: number }>();
const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getOrCreateClient(config: AppConfig): ApiClient {
  const cacheKey = config.apiKeys.assemblyApiKey;
  const entry = clientCache.get(cacheKey);

  if (entry) {
    entry.lastUsed = Date.now();
    return entry.client;
  }

  // Evict stale entries
  const now = Date.now();
  for (const [key, val] of clientCache) {
    if (now - val.lastUsed > CLIENT_CACHE_TTL_MS) {
      clientCache.delete(key);
    }
  }

  const client = createApiClient(config);
  clientCache.set(cacheKey, { client, lastUsed: now });
  return client;
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
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    });
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
      api: getOrCreateClient(sessionConfig),
      config: sessionConfig,
    };

    setCorsHeaders(res);

    try {
      const result = await route.handler(ctx, queryParams, pathParams);
      const headers: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
      };
      if (route.cacheMaxAge > 0 && result.status === 200) {
        headers["Cache-Control"] = `public, max-age=${route.cacheMaxAge}`;
      } else {
        headers["Cache-Control"] = "no-cache";
      }
      res.writeHead(result.status, headers);
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
