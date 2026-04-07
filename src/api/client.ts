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

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createApiClient(config: AppConfig) {
  const { assemblyApiKey } = config.apiKeys;
  const cache: Cache = createCache(config.cache);
  const monitor: Monitor = createMonitor();
  const rateLimiter: RateLimiter = createRateLimiter();

  /** MEMBER_INFO는 정적 데이터 — ttlStatic 사용 */
  const STATIC_API_CODES: ReadonlySet<string> = new Set([
    API_CODES.MEMBER_INFO,
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

  return { fetchOpenAssembly, fetchDataGoKr, cache, monitor, rateLimiter };
}

/** createApiClient 반환 타입 */
export type ApiClient = ReturnType<typeof createApiClient>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchWithErrorHandling(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`네트워크 오류: ${message}`);
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
