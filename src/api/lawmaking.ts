/**
 * lawmaking.go.kr REST API 클라이언트
 *
 * 국민참여입법센터 API:
 * - 입법현황 (govLmSts)
 * - 입법계획 (lmPln)
 * - 입법예고 (ogLmPp)
 * - 행정예고 (ptcpAdmPp)
 * - 법령해석례 (lsItptEmp)
 * - 의견제시사례 (loLsExample)
 *
 * Base URL: https://www.lawmaking.go.kr/rest
 * 인증: OC (정보공개 서비스 신청 ID)
 */

import { type AppConfig, API_BASE_URLS } from "../config.js";
import { mcpLogger } from "./mcp-logger.js";

// XML parsing with fast-xml-parser
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LawmakingLegislationsResponse {
  readonly [key: string]: unknown;
}

export interface LawmakingPlanResponse {
  readonly [key: string]: unknown;
}

export interface LawmakingLegislationNoticeResponse {
  readonly [key: string]: unknown;
}

export interface LawmakingAdminNoticeResponse {
  readonly [key: string]: unknown;
}

export interface LawmakingInterpretationResponse {
  readonly [key: string]: unknown;
}

export interface LawmakingOpinionResponse {
  readonly [key: string]: unknown;
}

/** govLmSts (입법현황) 단일 항목 */
export interface LegislationStatus {
  readonly lbicId: string;
  readonly lsNmKo: string;
  readonly lsKndNm: string;
  readonly rrFrNm: string;
  readonly cptOfiOrgNm: string;
  readonly lbPrcStsNm: string;
  readonly lbPrcStsDt: string;
}

/** lmPln (입법계획) 단일 항목 */
export interface LegislationPlan {
  readonly lmPlnSeq: string;
  readonly lsNm: string;
  readonly cptOfiOrgNm: string;
  readonly srcNm: string;
  readonly lbPrcStsNm: string;
  readonly mgtDt: string;
}

/** ogLmPp (입법예고) 단일 항목 */
export interface LegislationNotice {
  readonly ogLmPpSeq: string;
  readonly lsNm: string;
  readonly lsClsNm: string;
  readonly asndOfiNm: string;
  readonly pntcNo: string;
  readonly pntcDt: string;
  readonly stYd: string;
  readonly edYd: string;
  readonly FileDownLink: string;
  readonly readCnt: string;
}

/** ptcpAdmPp (행정예고) 단일 항목 */
export interface AdminNotice {
  readonly ogAdmPpSeq: string;
  readonly admRulNm: string;
  readonly lsClsNm: string;
  readonly asndOfiNm: string;
  readonly pntcNo: string;
  readonly pntcDt: string;
  readonly stYd: string;
  readonly edYd: string;
  readonly FileDownLink: string;
  readonly readCnt: string;
}

/** lsItptEmp (법령해석례) 단일 항목 */
export interface Interpretation {
  readonly itmSeq: string;
  readonly itmNm: string;
  readonly tgLsNm: string;
  readonly joCts: string;
  readonly catNm: string;
  readonly lsCptOrgNm: string;
}

/** loLsExample (의견제시사례) 단일 항목 */
export interface OpinionCase {
  readonly caseSeq: string;
  readonly caseNm: string;
  readonly caseNo: string;
  readonly reqOrgNm: string;
  readonly reqOrgAsndofiNm: string;
  readonly cdtDt: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createLawmakingClient(config: AppConfig) {
  const ocKey = config.apiKeys.lawmakingOc;

  if (!ocKey) {
    throw new Error(
      "LAWMKING_OC가 설정되지 않았습니다. opinion.lawmaking.go.kr에서 정보공개 서비스를 신청하세요.",
    );
  }

  /**
   * lawmaking.go.kr API 호출
   *
   * Base URL: https://www.lawmaking.go.kr/rest/{endpoint}.xml
   * 인증: OC 파라미터 (정보공개 서비스 신청 ID)
   * 응답: XML
   */
  async function fetchLawmaking<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    const filtered = Object.fromEntries(
      Object.entries({ OC: ocKey as string, ...params }).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );

    const entries = Object.entries(filtered)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    const url = `${API_BASE_URLS.lawmaking}${endpoint}.xml?${entries}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "assembly-api-mcp/0.7.0",
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`네트워크 오류: ${message}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const parsed = parser.parse(text);
    return parsed as T;
  }

  // ---------------------------------------------------------------------------
  // API methods
  // ---------------------------------------------------------------------------

  /**
   * 입법현황 조회
   *
   * @param params lsKndCd(법령종류), cptOfiOrgCd(소관부처코드), stDtFmt/edDtFmt(일자),
   *               lbPrcStsCdGrp(추진현황코드그룹), lsNmKo(법령명)
   */
  async function getLegislations(
    params: {
      lsKndCd?: string;
      cptOfiOrgCd?: string;
      stDtFmt?: string;
      edDtFmt?: string;
      lbPrcStsCdGrp?: string;
      lsNmKo?: string;
    } = {},
  ): Promise<LawmakingLegislationsResponse> {
    mcpLogger.log("debug", "lawmaking", `입법현황 조회: ${JSON.stringify(params)}`);
    return fetchLawmaking<LawmakingLegislationsResponse>("/govLmSts", params);
  }

  /**
   * 입법계획 조회
   *
   * @param params lmPlnYy(계획년도), pmtClsCd(예산코드), cptOfiOrgCd(소관부처코드),
   *               searchKnd(검색구분), srchTxt(검색어)
   */
  async function getLegislationPlan(
    params: {
      lmPlnYy?: string;
      pmtClsCd?: string;
      cptOfiOrgCd?: string;
      searchKnd?: string;
      srchTxt?: string;
    } = {},
  ): Promise<LawmakingPlanResponse> {
    mcpLogger.log("debug", "lawmaking", `입법계획 조회: ${JSON.stringify(params)}`);
    return fetchLawmaking<LawmakingPlanResponse>("/lmPln", params);
  }

  /**
   * 입법예고 조회
   *
   * @param params lsClsCd(법령분류코드), cptOfiOrgCd(소관부처코드), diff(차수),
   *               pntcNo(공고번호), stYdFmt/edYdFmt(시작/종료일자), lsNm(법령명)
   */
  async function getLegislationNotices(
    params: {
      lsClsCd?: string;
      cptOfiOrgCd?: string;
      diff?: string;
      pntcNo?: string;
      stYdFmt?: string;
      edYdFmt?: string;
      lsNm?: string;
    } = {},
  ): Promise<LawmakingLegislationNoticeResponse> {
    mcpLogger.log("debug", "lawmaking", `입법예고 조회: ${JSON.stringify(params)}`);
    return fetchLawmaking<LawmakingLegislationNoticeResponse>("/ogLmPp", params);
  }

  /**
   * 입법예고 상세 조회
   *
   * @param seq 입법예고 일련번호
   * @param mappingLbicId 입법현황 연계 ID (선택)
   * @param announceType 공고 유형 (선택, 기본: "NN")
   */
  async function getLegislationNoticeDetail(
    seq: string,
    mappingLbicId?: string,
    announceType = "NN",
  ): Promise<Record<string, unknown>> {
    mcpLogger.log("debug", "lawmaking", `입법예고 상세: ${seq}`);
    return fetchLawmaking<Record<string, unknown>>(
      `/ogLmPp/${seq}/${mappingLbicId ?? ""}/${announceType}`,
      {},
    );
  }

  /**
   * 행정예고 조회
   *
   * @param params lsClsCd(법령분류코드), closing(마감여부), asndOfiNm(소관부처명),
   *               stYdFmt/edYdFmt(시작/종료일자), admRulNm(행정규칙명)
   */
  async function getAdminNotices(
    params: {
      lsClsCd?: string;
      closing?: string;
      asndOfiNm?: string;
      stYdFmt?: string;
      edYdFmt?: string;
      admRulNm?: string;
    } = {},
  ): Promise<LawmakingAdminNoticeResponse> {
    mcpLogger.log("debug", "lawmaking", `행정예고 조회: ${JSON.stringify(params)}`);
    return fetchLawmaking<LawmakingAdminNoticeResponse>("/ptcpAdmPp", params);
  }

  /**
   * 법령해석례 조회
   *
   * @param params prdFrDay/prdToDay(검색기간), lsCptOrg(소관기관), schKeyword(검색키워드)
   */
  async function getInterpretations(
    params: {
      prdFrDay?: string;
      prdToDay?: string;
      lsCptOrg?: string;
      schKeyword?: string;
    } = {},
  ): Promise<LawmakingInterpretationResponse> {
    mcpLogger.log("debug", "lawmaking", `법령해석례 조회: ${JSON.stringify(params)}`);
    return fetchLawmaking<LawmakingInterpretationResponse>("/lsItptEmp", params);
  }

  /**
   * 의견제시사례 조회
   *
   * @param params scFmDt/scToDt(검색기간), scTextType(의견유형), scText(검색어)
   */
  async function getOpinionCases(
    params: {
      scFmDt?: string;
      scToDt?: string;
      scTextType?: string;
      scText?: string;
    } = {},
  ): Promise<LawmakingOpinionResponse> {
    mcpLogger.log("debug", "lawmaking", `의견제시사례 조회: ${JSON.stringify(params)}`);
    return fetchLawmaking<LawmakingOpinionResponse>("/loLsExample", params);
  }

  /**
   * 행정예고 상세 조회
   *
   * @param seq 행정예고 일련번호
   */
  async function getAdminNoticeDetail(
    seq: string,
  ): Promise<Record<string, unknown>> {
    mcpLogger.log("debug", "lawmaking", `행정예고 상세: ${seq}`);
    return fetchLawmaking<Record<string, unknown>>(`/ptcpAdmPp/${seq}`, {});
  }

  /**
   * 법령해석례 상세 조회
   *
   * @param seq 해석례 일련번호
   */
  async function getInterpretationDetail(
    seq: string,
  ): Promise<Record<string, unknown>> {
    mcpLogger.log("debug", "lawmaking", `법령해석례 상세: ${seq}`);
    return fetchLawmaking<Record<string, unknown>>(`/lsItptEmp/${seq}`, {});
  }

  /**
   * 의견제시사례 상세 조회
   *
   * @param seq 의견제시사례 일련번호
   */
  async function getOpinionCaseDetail(
    seq: string,
  ): Promise<Record<string, unknown>> {
    mcpLogger.log("debug", "lawmaking", `의견제시사례 상세: ${seq}`);
    return fetchLawmaking<Record<string, unknown>>(`/loLsExample/${seq}`, {});
  }

  /**
   * 입법현황 상세 조회
   *
   * @param seq 입법현황 일련번호
   */
  async function getLegislationDetail(
    seq: string,
  ): Promise<Record<string, unknown>> {
    mcpLogger.log("debug", "lawmaking", `입법현황 상세: ${seq}`);
    return fetchLawmaking<Record<string, unknown>>(`/govLmSts/${seq}`, {});
  }

  /**
   * 입법계획 상세 조회
   *
   * @param seq 입법계획 일련번호
   */
  async function getLegislationPlanDetail(
    seq: string,
  ): Promise<Record<string, unknown>> {
    mcpLogger.log("debug", "lawmaking", `입법계획 상세: ${seq}`);
    return fetchLawmaking<Record<string, unknown>>(`/lmPln/${seq}`, {});
  }

  return {
    fetchLawmaking,
    getLegislations,
    getLegislationDetail,
    getLegislationPlan,
    getLegislationPlanDetail,
    getLegislationNotices,
    getLegislationNoticeDetail,
    getAdminNotices,
    getAdminNoticeDetail,
    getInterpretations,
    getInterpretationDetail,
    getOpinionCases,
    getOpinionCaseDetail,
  };
}

/** createLawmakingClient 반환 타입 */
export type LawmakingClient = ReturnType<typeof createLawmakingClient>;
