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

  /** 요청 중복 제거: 동일 URL에 대해 진행 중인 Promise를 공유 */
  const inflight = new Map<string, Promise<ApiResult>>();

  /**
   * 열린국회정보 API 호출
   *
   * Base URL: https://open.assembly.go.kr/portal/openapi/{apiCode}
   * 인증: KEY 파라미터
   * 응답: JSON (Type=json)
   *
   * 성능 최적화:
   * - Stale-While-Revalidate: TTL 만료 시 stale 데이터 즉시 반환 + 백그라운드 갱신
   * - Request Deduplication: 동일 요청 동시 호출 시 Promise 공유
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
      // 1) 유효한 캐시 히트
      const cached = cache.get<ApiResult>(cacheKey);
      if (cached) return cached;

      // 2) Stale-While-Revalidate: 만료 캐시라도 즉시 반환, 백그라운드 갱신
      const fetchFresh = () => doFetch(apiCode, queryParams, cacheKey, cacheable);
      const stale = cache.getOrRevalidate<ApiResult>(cacheKey, fetchFresh, getTtl(apiCode));
      if (stale) return stale;
    }

    // 3) 캐시 미스 — 실제 fetch (중복 제거 적용)
    return doFetch(apiCode, queryParams, cacheKey, cacheable);
  }

  /** 실제 API 호출 + 중복 제거 */
  async function doFetch(
    apiCode: string,
    queryParams: Record<string, string | number>,
    cacheKey: string,
    cacheable: boolean,
  ): Promise<ApiResult> {
    // 요청 중복 제거: 동일 cacheKey에 대해 진행 중인 Promise 재사용
    const dedupeKey = cacheKey || `${apiCode}:${JSON.stringify(queryParams)}`;
    const existing = inflight.get(dedupeKey);
    if (existing) return existing;

    const promise = doFetchInner(apiCode, queryParams, cacheKey, cacheable);
    inflight.set(dedupeKey, promise);
    promise.finally(() => { inflight.delete(dedupeKey); });
    return promise;
  }

  async function doFetchInner(
    apiCode: string,
    queryParams: Record<string, string | number>,
    cacheKey: string,
    cacheable: boolean,
  ): Promise<ApiResult> {
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
   * 캐시 Warm-up — 정적 API를 사전 로드하여 첫 도구 호출도 캐시 히트
   * 서버 시작 직후 백그라운드에서 실행됩니다.
   */
  async function warmUp(): Promise<void> {
    const targets: Array<{ code: string; params: Record<string, string | number> }> = [
      { code: API_CODES.MEMBER_INFO, params: { pSize: 20 } },
      { code: API_CODES.COMMITTEE_INFO, params: {} },
      { code: API_CODES.META_API_LIST, params: { pSize: 300 } },
    ];

    const results = await Promise.allSettled(
      targets.map(({ code, params }) => fetchOpenAssembly(code, params)),
    );

    const loaded = results.filter((r) => r.status === "fulfilled").length;
    process.stderr.write(
      `[assembly-api-mcp] 캐시 warm-up 완료: ${loaded}/${targets.length} API 사전 로드\n`,
    );
  }

  return { fetchOpenAssembly, fetchDataGoKr, warmUp, cache, monitor, rateLimiter };
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
