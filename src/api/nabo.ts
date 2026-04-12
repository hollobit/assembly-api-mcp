/**
 * nabo.go.kr REST API 클라이언트
 *
 *国会예산정책처(NABO) nabo.go.kr의 3개 API:
 * - /api/v1/report.do       — 보고서 자료 검색
 * - /api/v1/periodical.do   — 정기간행물
 * - /api/v1/recruitments.do — 채용정보
 *
 * Base URL: https://www.nabo.go.kr
 * 인증: key 파라미터 (정보공개 서비스 신청 ID)
 * 응답: XML (기본값) 또는 JSON
 */

import { type AppConfig, API_BASE_URLS } from "../config.js";
import { mcpLogger } from "./mcp-logger.js";

// fast-xml-parser for XML responses
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** NABO 3개 API 공통 응답 필드 */
export interface NaboItem {
  readonly subj: string;      // 게시물 제목
  readonly cdNm: string;      // 작성자/작성부서
  readonly pubDt: string;     // 게시일
  readonly count: string;     // 조회수
  readonly text: string;      // 게시물 내용
  readonly detailUrl: string; // 상세 페이지 URL
  readonly name: string;     // 첨부파일명
  readonly url: string;      // 첨부파일 다운로드 URL
}

export interface NaboListResponse {
  readonly page: string;
  readonly size: string;
  readonly total: string;
  readonly item?: NaboItem[] | NaboItem;  // XML responses use "item"
  readonly list?: NaboItem[] | NaboItem;   // JSON responses use "list"
}

export interface NaboApiResult {
  readonly page: number;
  readonly size: number;
  readonly total: number;
  readonly items: readonly NaboItem[];
}

/** NABO API 타입 */
export type NaboApiType = "report" | "periodical" | "recruitments";

/** NABO API 엔드포인트 매핑 */
const NABO_ENDPOINTS: Record<NaboApiType, string> = {
  report: "/api/v1/report.do",
  periodical: "/api/v1/periodical.do",
  recruitments: "/api/v1/recruitments.do",
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createNaboClient(config: AppConfig) {
  const apiKey = config.apiKeys.naboApiKey;

  /**
   * NABO API 호출 (XML → JSON)
   *
   * @param endpoint  — /api/v1/report.do 등
   * @param params    — page, size, scSort, scOrder, scSw
   */
  async function fetchNabo(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<NaboListResponse> {
    if (!apiKey) {
      throw new Error(
        "NABO_API_KEY가 설정되지 않았습니다.\n" +
          "설정 방법: https://www.nabo.go.kr/ko/api/apply.do?key=2509230004 에서 인증키를 발급받아 " +
          "NABO_API_KEY 환경변수로 설정하세요.",
      );
    }

    const filtered = Object.fromEntries(
      Object.entries({ key: apiKey, ...params }).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );

    const entries = Object.entries(filtered)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    const url = `${API_BASE_URLS.nabo}${endpoint}?${entries}`;

    mcpLogger.log("debug", "nabo", `API 호출: ${endpoint}?${entries.slice(0, 80)}…`);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "assembly-api-mcp/0.7.0",
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`NABO API 네트워크 오류: ${message}`);
    }

    if (!response.ok) {
      throw new Error(`NABO API HTTP 오류: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let parsed: NaboListResponse;

    // NABO API returns JSON by default (not XML)
    // Detect JSON by checking for leading '{' or '['
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      parsed = JSON.parse(text) as NaboListResponse;
    } else {
      parsed = parser.parse(text) as NaboListResponse;
    }

    // エラーコード応答チェック
    const errCode = (parsed as unknown as Record<string, unknown>).RESULT as string | undefined;
    if (errCode && errCode !== "INFO-000") {
      const ERROR_MESSAGES: Record<string, string> = {
        INVALID_KEY: "유효하지 않은 NABO API Key입니다.",
        NOT_APPROVED: "NABO API Key가 승인되지 않았습니다.",
        NOT_YET_VALID: "NABO API Key 사용 시작 전입니다.",
        EXPIRED: "NABO API Key 사용 기간이 만료되었습니다.",
      };
      throw new Error(`NABO API 오류 [${errCode}]: ${ERROR_MESSAGES[errCode] ?? errCode}`);
    }

    return parsed as NaboListResponse;
  }

  /**
   * NABO API 응답을 표준形式に変換
   */
  function normalizeResponse(raw: NaboListResponse): NaboApiResult {
    const page = parseInt(String(raw.page ?? "1"), 10);
    const size = parseInt(String(raw.size ?? "20"), 10);
    const total = parseInt(String(raw.total ?? "0"), 10);

    // NABO API는 item(XML) 또는 list(JSON)로 데이터를 반환할 수 있음
    const rawItems = raw.item ?? raw.list;
    const items: readonly NaboItem[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems as NaboItem]
        : [];

    return { page, size, total, items };
  }

  // ---------------------------------------------------------------------------
  // Public API methods
  // ---------------------------------------------------------------------------

  /**
   * 보고서 자료 검색
   *
   * @param params.page      — 페이지 번호 (기본: 1)
   * @param params.size      — 페이지 사이즈 (기본: 20)
   * @param params.scSort    — 정렬: pubDt(게시일) 또는 subj(제목)
   * @param params.scOrder   — asc 또는 desc (기본: desc)
   * @param params.scSw      — 검색어
   */
  async function searchReports(
    params: {
      page?: number;
      size?: number;
      scSort?: string;
      scOrder?: string;
      scSw?: string;
    } = {},
  ): Promise<NaboApiResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.page) queryParams.page = params.page;
    if (params.size) queryParams.size = params.size;
    if (params.scSort) queryParams.scSort = params.scSort;
    if (params.scOrder) queryParams.scOrder = params.scOrder;
    if (params.scSw) queryParams.scSw = params.scSw;

    const raw = await fetchNabo(NABO_ENDPOINTS.report, queryParams);
    return normalizeResponse(raw);
  }

  /**
   * 정기간행물 조회
   *
   * @param params.page      — 페이지 번호 (기본: 1)
   * @param params.size      — 페이지 사이즈 (기본: 20)
   * @param params.scSort    — 정렬: pubDt(게시일) 또는 subj(제목)
   * @param params.scOrder   — asc 또는 desc (기본: desc)
   * @param params.scSw      — 검색어
   */
  async function searchPeriodicals(
    params: {
      page?: number;
      size?: number;
      scSort?: string;
      scOrder?: string;
      scSw?: string;
    } = {},
  ): Promise<NaboApiResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.page) queryParams.page = params.page;
    if (params.size) queryParams.size = params.size;
    if (params.scSort) queryParams.scSort = params.scSort;
    if (params.scOrder) queryParams.scOrder = params.scOrder;
    if (params.scSw) queryParams.scSw = params.scSw;

    const raw = await fetchNabo(NABO_ENDPOINTS.periodical, queryParams);
    return normalizeResponse(raw);
  }

  /**
   * 채용정보 조회
   *
   * @param params.page      — 페이지 번호 (기본: 1)
   * @param params.size      — 페이지 사이즈 (기본: 20)
   * @param params.scSort    — 정렬: pubDt(게시일) 또는 subj(제목)
   * @param params.scOrder   — asc 또는 desc (기본: desc)
   * @param params.scSw      — 검색어
   */
  async function searchRecruitments(
    params: {
      page?: number;
      size?: number;
      scSort?: string;
      scOrder?: string;
      scSw?: string;
    } = {},
  ): Promise<NaboApiResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.page) queryParams.page = params.page;
    if (params.size) queryParams.size = params.size;
    if (params.scSort) queryParams.scSort = params.scSort;
    if (params.scOrder) queryParams.scOrder = params.scOrder;
    if (params.scSw) queryParams.scSw = params.scSw;

    const raw = await fetchNabo(NABO_ENDPOINTS.recruitments, queryParams);
    return normalizeResponse(raw);
  }

  return {
    searchReports,
    searchPeriodicals,
    searchRecruitments,
  };
}

/** createNaboClient 반환 타입 */
export type NaboClient = ReturnType<typeof createNaboClient>;
