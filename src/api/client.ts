/**
 * 국회 API 공통 HTTP 클라이언트
 *
 * 한국 공공데이터 API의 3대 quirk를 처리:
 * 1. ServiceKey 이중 인코딩 방지 — URL에 raw string 직접 append
 * 2. HTTP 200 + Body 에러 — resultCode로 성공/실패 판별
 * 3. XML 기본값 — 항상 Type=json 파라미터 추가
 */

import {
  type AppConfig,
  ASSEMBLY_ERROR_CODES,
  API_BASE_URLS,
} from "../config.js";
import { createCache, buildCacheKey, type Cache } from "./cache.js";
import { API_CODES } from "./codes.js";
import { createMonitor, type Monitor, type ApiCallMetric } from "./monitor.js";
import { createRateLimiter, type RateLimiter } from "./rate-limiter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssemblyApiResponse {
  readonly [key: string]: unknown;
}

interface OpenAssemblyRawResponse {
  readonly [apiCode: string]: readonly [
    { readonly head: readonly [{ readonly list_total_count: number }, { readonly RESULT: { readonly CODE: string; readonly MESSAGE: string } }] },
    { readonly row: readonly Record<string, unknown>[] },
  ];
}

export interface ApiResult {
  readonly totalCount: number;
  readonly rows: readonly Record<string, unknown>[];
}

/** NABO API type discriminator — matches the three published endpoints. */
export type NaboResource = "report" | "periodical" | "recruitments";

/** NABO API error codes returned by https://www.nabo.go.kr/api/v1/*. */
export const NABO_ERROR_CODES: Record<string, string> = {
  INVALID_KEY: "NABO 인증키가 유효하지 않습니다. NABO_API_KEY를 확인하세요.",
  NOT_APPROVED: "NABO 인증키가 아직 승인되지 않았습니다. 관리자 승인 대기 중입니다.",
  EXPIRED: "NABO 인증키 사용 기간이 만료되었습니다. 재발급이 필요합니다.",
};

/** NABO endpoint path mapping — used by fetchNabo(). */
const NABO_ENDPOINTS: Record<NaboResource, string> = {
  report: "/api/v1/report.do",
  periodical: "/api/v1/periodical.do",
  recruitments: "/api/v1/recruitments.do",
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createApiClient(config: AppConfig) {
  const { assemblyApiKey } = config.apiKeys;
  const cache: Cache = createCache(config.cache);
  const monitor: Monitor = createMonitor();
  const rateLimiter: RateLimiter = createRateLimiter();

  /** 거의 변하지 않는 정적 데이터 — ttlStatic(24h) 사용 */
  const STATIC_API_CODES: ReadonlySet<string> = new Set([
    API_CODES.MEMBER_INFO,
    API_CODES.COMMITTEE_INFO,
    API_CODES.META_API_LIST,
    API_CODES.VOTE_PLENARY,
  ]);

  function getTtl(apiCode: string): number {
    return STATIC_API_CODES.has(apiCode)
      ? config.cache.ttlStatic
      : config.cache.ttlDynamic;
  }

  function shouldCache(params: Record<string, string | number>): boolean {
    return !("BILL_ID" in params);
  }

  /**
   * 열린국회정보 API 호출
   *
   * Base URL: https://open.assembly.go.kr/portal/openapi/{apiCode}
   * 인증: KEY 파라미터
   * 응답: JSON (Type=json)
   */
  async function fetchOpenAssembly(
    apiCode: string,
    params: Record<string, string | number> = {},
  ): Promise<ApiResult> {
    const queryParams: Record<string, string | number> = {
      Type: "json",
      pIndex: 1,
      pSize: config.apiResponse.defaultPageSize,
      ...params,
    };

    // 캐시 조회 — cacheKey를 1회만 계산
    const cacheable = shouldCache(params);
    const cacheKey = cacheable ? buildCacheKey(apiCode, queryParams) : "";
    if (cacheable) {
      const cached = cache.get<ApiResult>(cacheKey);
      if (cached) return cached;
    }

    // URL 구성 — KEY를 raw string으로 append하여 이중 인코딩 방지
    const entries = Object.entries(queryParams)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    const url = `${API_BASE_URLS.openAssembly}/${apiCode}?${entries}&KEY=${assemblyApiKey}`;

    const startTime = Date.now();
    let success = true;
    try {
      rateLimiter.increment();

      const response = await fetchWithErrorHandling(url);
      const result = parseOpenAssemblyResponse(response, apiCode);

      if (cacheable) {
        cache.set(cacheKey, result, getTtl(apiCode));
      }

      return result;
    } catch (err: unknown) {
      success = false;
      throw err;
    } finally {
      const metric: ApiCallMetric = {
        apiCode,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
        success,
      };
      monitor.record(metric);
    }
  }

  /**
   * 공공데이터포털 API 호출 (data.go.kr 경유)
   *
   * Base URL: http://apis.data.go.kr/9710000/{serviceName}
   * 인증: ServiceKey 파라미터
   */
  async function fetchDataGoKr(
    servicePath: string,
    params: Record<string, string | number> = {},
  ): Promise<unknown> {
    const { dataGoKrServiceKey } = config.apiKeys;
    if (!dataGoKrServiceKey) {
      throw new Error(
        "DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다.\n" +
          "발급: https://data.go.kr → 회원가입 → API 활용 신청",
      );
    }

    const queryParams: Record<string, string | number> = {
      dataType: "JSON",
      pageNo: 1,
      numOfRows: config.apiResponse.defaultPageSize,
      ...params,
    };

    const entries = Object.entries(queryParams)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    const url = `${API_BASE_URLS.dataGoKr}/${servicePath}?${entries}&ServiceKey=${dataGoKrServiceKey}`;

    return fetchWithErrorHandling(url);
  }

  /**
   * NABO(국회예산정책처) Open API 호출
   *
   * Base URL: https://www.nabo.go.kr/api/v1/{report|periodical|recruitments}.do
   * 인증: key 파라미터 (NABO_API_KEY)
   * 응답: JSON `{ page, size, total, items: [...] }` (엔드포인트별 필드 상이)
   *
   * - NABO는 열린국회정보와 완전히 다른 응답 구조를 사용하므로 전용 파서를 사용합니다.
   * - INVALID_KEY / NOT_APPROVED / EXPIRED 에러는 명시적 메시지로 변환됩니다.
   */
  async function fetchNabo(
    resource: NaboResource,
    params: Record<string, string | number> = {},
  ): Promise<NaboResult> {
    const { naboApiKey } = config.apiKeys;
    if (!naboApiKey) {
      throw new Error(
        "NABO_API_KEY가 설정되지 않았습니다.\n" +
          "발급: https://www.nabo.go.kr/ko/api/apply.do?key=2509230004 → SNS 인증 → 관리자 승인",
      );
    }

    const path = NABO_ENDPOINTS[resource];
    if (!path) {
      throw new Error(`알 수 없는 NABO 리소스: ${resource}`);
    }

    const queryParams: Record<string, string | number> = {
      page: 1,
      size: config.apiResponse.defaultPageSize,
      ...params,
    };

    // 캐시 조회 — NABO 요청도 리스트 조회이므로 동적 TTL로 캐시
    const cacheKey = `nabo:${resource}:${buildCacheKey("", queryParams)}`;
    const cached = cache.get<NaboResult>(cacheKey);
    if (cached) return cached;

    const entries = Object.entries(queryParams)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    const url = `${API_BASE_URLS.nabo}${path}?${entries}&key=${encodeURIComponent(naboApiKey)}`;

    const startTime = Date.now();
    let success = true;
    try {
      rateLimiter.increment();
      const raw = await fetchWithErrorHandling(url);
      const result = parseNaboResponse(raw);
      cache.set(cacheKey, result, config.cache.ttlDynamic);
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      monitor.record({
        apiCode: `nabo:${resource}`,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
        success,
      });
    }
  }

  return { fetchOpenAssembly, fetchDataGoKr, fetchNabo, cache, monitor, rateLimiter };
}

/** NABO API 응답 공통 형태 */
export interface NaboResult {
  readonly page: number;
  readonly size: number;
  readonly total: number;
  readonly items: readonly Record<string, unknown>[];
}

/** createApiClient 반환 타입 */
export type ApiClient = ReturnType<typeof createApiClient>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithErrorHandling(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`API 요청 시간 초과 (${FETCH_TIMEOUT_MS / 1000}초). 잠시 후 다시 시도하세요.`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`네트워크 오류: ${message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`HTTP 오류: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  // XML 응답이 돌아온 경우 (JSON 요청했으나 서버가 XML 반환)
  if (text.trim().startsWith("<")) {
    const codeMatch = text.match(/<CODE>([^<]+)<\/CODE>/);
    const msgMatch = text.match(/<MESSAGE>([^<]+)<\/MESSAGE>/);
    const code = codeMatch?.[1] ?? "unknown";
    const msg = msgMatch?.[1] ?? "알 수 없는 오류 (XML 응답)";
    throw new Error(`API 오류 [${code}]: ${msg}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON 파싱 실패. 응답: ${text.slice(0, 200)}`);
  }
}

function parseOpenAssemblyResponse(
  raw: unknown,
  apiCode: string,
): ApiResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("응답 형식 오류: 객체가 아닙니다.");
  }

  const data = (raw as Record<string, unknown>)[apiCode];
  if (!Array.isArray(data) || data.length < 1) {
    // 일부 API는 다른 키 이름 사용 — 첫 번째 키를 시도
    const keys = Object.keys(raw as Record<string, unknown>);
    const firstKey = keys[0];
    if (firstKey) {
      const altData = (raw as Record<string, unknown>)[firstKey];
      if (Array.isArray(altData) && altData.length >= 1) {
        return extractFromArrayResponse(altData);
      }
    }
    return { totalCount: 0, rows: [] };
  }

  return extractFromArrayResponse(data);
}

function parseNaboResponse(raw: unknown): NaboResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("NABO 응답 형식 오류: 객체가 아닙니다.");
  }

  const obj = raw as Record<string, unknown>;

  // NABO 에러 응답: { code: "INVALID_KEY" | "NOT_APPROVED" | "EXPIRED", message: "..." }
  const errorCode = typeof obj.code === "string" ? obj.code : undefined;
  if (errorCode && errorCode in NABO_ERROR_CODES) {
    const description = NABO_ERROR_CODES[errorCode] ?? String(obj.message ?? "알 수 없는 오류");
    throw new Error(`NABO API 오류 [${errorCode}]: ${description}`);
  }

  // 정상 응답: { page, size, total, items|list|rows: [...] }
  const items = Array.isArray(obj.items)
    ? (obj.items as Record<string, unknown>[])
    : Array.isArray(obj.list)
      ? (obj.list as Record<string, unknown>[])
      : Array.isArray(obj.rows)
        ? (obj.rows as Record<string, unknown>[])
        : [];

  const toInt = (v: unknown, fallback: number): number => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseInt(v, 10);
      return Number.isNaN(n) ? fallback : n;
    }
    return fallback;
  };

  return {
    page: toInt(obj.page, 1),
    size: toInt(obj.size, items.length),
    total: toInt(obj.total, items.length),
    items,
  };
}

function extractFromArrayResponse(
  data: readonly unknown[],
): ApiResult {
  // 열린국회정보 응답 구조: [{head: [...]}, {row: [...]}]
  const headPart = data[0] as
    | { readonly head?: readonly Record<string, unknown>[] }
    | undefined;
  const rowPart = data[1] as
    | { readonly row?: readonly Record<string, unknown>[] }
    | undefined;

  const head = headPart?.head;
  if (!head || head.length < 2) {
    return { totalCount: 0, rows: rowPart?.row ?? [] };
  }

  // head[0] = {list_total_count: N}, head[1] = {RESULT: {CODE, MESSAGE}}
  const totalCount = (head[0] as Record<string, unknown>)
    .list_total_count as number;
  const result = (head[1] as Record<string, unknown>).RESULT as {
    CODE: string;
    MESSAGE: string;
  };

  if (result.CODE !== "INFO-000") {
    const description =
      ASSEMBLY_ERROR_CODES[result.CODE] ?? result.MESSAGE;
    throw new Error(`API 오류 [${result.CODE}]: ${description}`);
  }

  return {
    totalCount: totalCount ?? 0,
    rows: rowPart?.row ?? [],
  };
}
