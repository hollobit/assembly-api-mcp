/**
 * Lite 위원회·청원·입법예고·보도자료·입법통합 도구
 *
 * get_committees + search_petitions + get_legislation_notices + assembly_lawmaking → assembly_org
 *
 * lawmaking.go.kr (국민참여입법센터) 통합:
 * - type="lawmaking" + category="legislation" — 입법현황/계획/예고
 * - type="lawmaking" + category="admin"       — 행정예고
 * - type="lawmaking" + category="interpretation" — 법령해석례
 * - type="lawmaking" + category="opinion"     — 의견제시사례
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { createLawmakingClient, type Interpretation, type OpinionCase } from "../../api/lawmaking.js";
import { API_CODES } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// lawmaking API 응답에서 리스트 추출 헬퍼
function extractLawmakingRows(result: Record<string, unknown>): Record<string, unknown>[] {
  const res = (result as Record<string, unknown>).result as Record<string, unknown> | undefined;
  if (!res) return [];
  const list = res.list as Record<string, unknown> | undefined;
  if (!list) return [];
  const firstKey = Object.keys(list)[0];
  if (!firstKey) return [];
  const arr = list[firstKey];
  return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------

type OrgType = "committee" | "petition" | "legislation_notice" | "press" | "lawmaking";
type LawmakingCategory = "legislation" | "admin" | "interpretation" | "opinion";

interface OrgParams {
  readonly type?: OrgType;
  readonly category?: LawmakingCategory;
  readonly committee_name?: string;
  readonly include_members?: boolean;
  readonly petition_id?: string;
  readonly petition_status?: "pending" | "processed" | "all";
  readonly bill_name?: string;
  readonly lang?: string;
  readonly age?: number;
  readonly page?: number;
  readonly page_size?: number;
  // lawmaking 공통
  readonly keyword?: string;
  readonly diff?: string;
  readonly closing?: string;
  readonly ls_cls_cd?: string;
  readonly cpt_ofi_org_cd?: string;
  readonly st_dt_fmt?: string;
  readonly ed_dt_fmt?: string;
  readonly prd_fr_day?: string;
  readonly prd_to_day?: string;
  readonly ls_cpt_org?: string;
  readonly sc_fm_dt?: string;
  readonly sc_to_dt?: string;
  readonly sc_text_type?: string;
  readonly sc_text?: string;
  // lawmaking legislation-specific
  readonly lm_pln_yy?: string;
  readonly pmt_cls_cd?: string;
  readonly search_knd?: string;
  readonly srch_txt?: string;
  // lawmaking notice/plan detail ID
  readonly detail_seq?: string;
}

function detectType(params: OrgParams): OrgType {
  if (params.type) return params.type;
  if (params.lang === "en") return "press";
  if (params.committee_name) return "committee";
  if (params.petition_id) return "petition";
  if (params.bill_name && !params.committee_name) return "legislation_notice";
  return "committee";
}

function detectLawmakingCategory(params: OrgParams): LawmakingCategory {
  if (params.category) return params.category;
  if (params.sc_text_type || params.sc_fm_dt) return "opinion";
  if (params.prd_fr_day || params.ls_cpt_org) return "interpretation";
  if (params.closing || params.ls_cls_cd) return "admin";
  return "legislation";
}

// ---------------------------------------------------------------------------
// Committee handler
// ---------------------------------------------------------------------------

async function handleCommittee(
  params: OrgParams,
  api: ReturnType<typeof createApiClient>,
  maxPageSize: number,
) {
  const queryParams: Record<string, string | number> = {};
  if (params.page) queryParams.pIndex = params.page;
  if (params.page_size) queryParams.pSize = Math.min(params.page_size, maxPageSize);

  const committeeApiCode = params.lang === "en" ? "ENCMITINFO" : API_CODES.COMMITTEE_INFO;
  const result = await api.fetchOpenAssembly(committeeApiCode, queryParams);
  let rows = result.rows;

  if (params.committee_name) {
    const kw = params.committee_name.toLowerCase();
    rows = rows.filter((row) =>
      String(row.COMMITTEE_NAME ?? "").toLowerCase().includes(kw),
    );
  }

  let membersMap: ReadonlyMap<string, readonly Record<string, unknown>[]> = new Map();

  if (params.include_members && params.committee_name && rows.length > 0) {
    const membersResult = await api.fetchOpenAssembly(
      API_CODES.COMMITTEE_MEMBERS,
      { pSize: 600 },
    );
    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const m of membersResult.rows) {
      const name = String(m.DEPT_NM ?? m.HR_DEPT_NM ?? "");
      const existing = grouped.get(name) ?? [];
      grouped.set(name, [...existing, {
        이름: m.HG_NM, 정당: m.POLY_NM, 선거구: m.ORIG_NM,
        직위: m.JOB_RES_NM, 의원코드: m.MONA_CD,
      }]);
    }
    membersMap = grouped;
  }

  const formatted = rows.map((row) => {
    const cmtName = String(row.COMMITTEE_NAME ?? "");
    const members = membersMap.get(cmtName) ?? [];
    const chairName = String(row.HG_NM ?? "");
    const chairMember = members.find((m) => m["이름"] === chairName);
    const chairDisplay = chairMember
      ? `${chairName} (${chairMember["정당"] ?? ""})`
      : chairName;
    const base: Record<string, unknown> = {
      위원회명: cmtName,
      위원회구분: row.CMT_DIV_NM,
      위원장: chairDisplay,
      간사: row.HG_NM_LIST,
      현원: row.CURR_CNT,
      정원: row.LIMIT_CNT,
    };
    if (members.length > 0) {
      return { ...base, 위원목록: members };
    }
    return base;
  });

  return { total: formatted.length, items: formatted };
}

// ---------------------------------------------------------------------------
// Petition handler
// ---------------------------------------------------------------------------

async function handlePetition(
  params: OrgParams,
  api: ReturnType<typeof createApiClient>,
  maxPageSize: number,
) {
  if (params.petition_id) {
    const detail = await api.fetchOpenAssembly(
      API_CODES.PETITION_DETAIL,
      { PTT_ID: params.petition_id },
    );
    const row = detail.rows[0];
    if (!row) return { total: 0, items: [] };
    return {
      total: 1,
      items: [{
        청원번호: row.BILL_NO,
        청원명: row.BILL_NAME,
        청원인: row.PROPOSER,
        소개의원: row.APPROVER,
        제출일: row.PROPOSE_DT,
        소관위: row.CURR_COMMITTEE,
        처리상태: row.PROC_RESULT_CD,
        링크: row.LINK_URL,
      }],
    };
  }

  const apiCode = params.petition_status === "all"
    ? API_CODES.PETITION_LIST
    : API_CODES.PETITION_PENDING;

  const queryParams: Record<string, string | number> = {};
  if (params.petition_status === "all") queryParams.ERACO = "제22대";
  if (params.page) queryParams.pIndex = params.page;
  if (params.page_size) queryParams.pSize = Math.min(params.page_size, maxPageSize);

  const result = await api.fetchOpenAssembly(apiCode, queryParams);

  const formatted = result.rows.map((row) => ({
    청원번호: row.BILL_NO,
    청원명: row.BILL_NAME,
    청원인: row.PROPOSER,
    소개의원: row.APPROVER,
    제출일: row.PROPOSE_DT,
    소관위: row.CURR_COMMITTEE,
  }));

  return { total: result.totalCount, items: formatted };
}

// ---------------------------------------------------------------------------
// Legislation notice handler
// ---------------------------------------------------------------------------

async function handleLegislation(
  params: OrgParams,
  api: ReturnType<typeof createApiClient>,
  maxPageSize: number,
) {
  const queryParams: Record<string, string | number> = {};
  if (params.page) queryParams.pIndex = params.page;
  if (params.page_size) queryParams.pSize = Math.min(params.page_size, maxPageSize);

  const result = await api.fetchOpenAssembly(API_CODES.LEGISLATION_ACTIVE, queryParams);

  let rows = result.rows;
  if (params.bill_name) {
    const kw = params.bill_name.toLowerCase();
    rows = rows.filter((row) =>
      String(row.BILL_NAME ?? "").toLowerCase().includes(kw),
    );
  }

  const formatted = rows.map((row) => ({
    의안번호: row.BILL_NO,
    법률안명: row.BILL_NAME,
    제안자구분: row.PROPOSER_KIND_CD,
    소관위: row.CURR_COMMITTEE,
    게시종료일: row.NOTI_ED_DT,
  }));

  return { total: formatted.length, items: formatted };
}

// ---------------------------------------------------------------------------
// Press handler
// ---------------------------------------------------------------------------

async function handlePress(
  params: OrgParams,
  api: ReturnType<typeof createApiClient>,
  maxPageSize: number,
) {
  const queryParams: Record<string, string | number> = {};
  if (params.page) queryParams.pIndex = params.page;
  queryParams.pSize = Math.min(params.page_size ?? 20, maxPageSize);

  const apiCode = params.lang === "en" ? "ENPRESS" : "ninnagrlaelvtzfnt";

  const result = await api.fetchOpenAssembly(apiCode, queryParams);

  const formatted = result.rows.map((row) => ({
    제목: row.TITLE ?? row.SUBJECT,
    등록일: row.REG_DATE ?? row.WRITE_DATE,
    내용미리보기: row.CONTENT ? String(row.CONTENT).slice(0, 200) : undefined,
    링크: row.LINK_URL ?? row.URL,
  }));

  return { total: formatted.length, items: formatted };
}

// ---------------------------------------------------------------------------
// Lawmaking handler (国民참여입법센터)
// ---------------------------------------------------------------------------

async function handleLawmaking(
  params: OrgParams,
  lawmaking: ReturnType<typeof createLawmakingClient>,
) {
  const category = detectLawmakingCategory(params);
  const detailSeq = params.detail_seq;

  // 상세 조회 모드: detail_seq가 있으면 상세 API 호출
  if (detailSeq) {
    switch (category) {
      case "legislation": {
        // mode 파라미터로 세 분기: status(기본) / plan / notice
        const mode = params.keyword ? "plan" : (params.diff ? "notice" : "status");
        if (mode === "plan") {
          const result = await lawmaking.getLegislationPlanDetail(detailSeq);
          return { total: 1, items: [(result as Record<string, unknown>).result ?? result] };
        } else if (mode === "notice") {
          const result = await lawmaking.getLegislationNoticeDetail(detailSeq);
          return { total: 1, items: [(result as Record<string, unknown>).result ?? result] };
        } else {
          const result = await lawmaking.getLegislationDetail(detailSeq);
          return { total: 1, items: [(result as Record<string, unknown>).result ?? result] };
        }
      }
      case "admin": {
        const result = await lawmaking.getAdminNoticeDetail(detailSeq);
        return { total: 1, items: [(result as Record<string, unknown>).result ?? result] };
      }
      case "interpretation": {
        const result = await lawmaking.getInterpretationDetail(detailSeq);
        return { total: 1, items: [(result as Record<string, unknown>).result ?? result] };
      }
      case "opinion": {
        const result = await lawmaking.getOpinionCaseDetail(detailSeq);
        return { total: 1, items: [(result as Record<string, unknown>).result ?? result] };
      }
    }
  }

  // 목록 조회 모드
  switch (category) {
    case "legislation": {
      // mode: keyword 있음 → plan / diff 있음 → notice / 없음 → status (govLmSts)
      const mode = params.keyword ? "plan" : (params.diff !== undefined ? "notice" : "status");

      if (mode === "plan") {
        // 입법계획
        const result = await lawmaking.getLegislationPlan({
          lmPlnYy: params.lm_pln_yy,
          pmtClsCd: params.pmt_cls_cd,
          cptOfiOrgCd: params.cpt_ofi_org_cd,
          searchKnd: params.search_knd,
          srchTxt: params.srch_txt ?? params.keyword,
        });
        const rows = extractLawmakingRows(result);
        return {
          total: rows.length,
          items: rows.map((row) => ({
            planSeq: row.lmPlnSeq,
            법령명: row.lsNm,
            소관부처: row.cptOfiOrgNm,
            입법사유: row.srcNm,
            추진단계: row.lbPrcStsNm,
            추진일자: row.mgtDt,
          })),
        };
      } else if (mode === "notice") {
        // 입법예고 (ogLmPp)
        const result = await lawmaking.getLegislationNotices({
          lsClsCd: params.ls_cls_cd,
          cptOfiOrgCd: params.cpt_ofi_org_cd,
          diff: params.diff,
          pntcNo: undefined,
          stYdFmt: params.st_dt_fmt,
          edYdFmt: params.ed_dt_fmt,
          lsNm: params.keyword,
        });
        const rows = extractLawmakingRows(result);
        return {
          total: rows.length,
          items: rows.map((row) => ({
            noticeSeq: row.ogLmPpSeq,
            법령명: row.lsNm,
            법령분류: row.lsClsNm,
            소관부처: row.asndOfiNm,
            공고번호: row.pntcNo,
            공고일자: row.pntcDt,
            시작일자: row.stYd,
            종료일자: row.edYd,
            파일링크: row.FileDownLink,
            조회수: row.readCnt,
          })),
        };
      } else {
        // 입법현황 (govLmSts)
        const result = await lawmaking.getLegislations({
          lsKndCd: params.ls_cls_cd,
          cptOfiOrgCd: params.cpt_ofi_org_cd,
          stDtFmt: params.st_dt_fmt,
          edDtFmt: params.ed_dt_fmt,
          lsNmKo: params.keyword,
        });
        const rows = extractLawmakingRows(result);
        return {
          total: rows.length,
          items: rows.map((row) => ({
            lawSeq: row.lbicId,
            법령명: row.lsNmKo,
            법령종류: row.lsKndNm,
            제개정구분: row.rrFrNm,
            소관부처: row.cptOfiOrgNm,
            추진현황: row.lbPrcStsNm,
            추진일자: row.lbPrcStsDt,
          })),
        };
      }
    }

    case "admin": {
      // 행정예고
      const result = await lawmaking.getAdminNotices({
        lsClsCd: params.ls_cls_cd,
        closing: params.closing,
        asndOfiNm: params.keyword,
        stYdFmt: params.st_dt_fmt,
        edYdFmt: params.ed_dt_fmt,
      });
      const rows = extractLawmakingRows(result);
      return {
        total: rows.length,
        items: rows.map((row) => ({
          adminSeq: row.ogAdmPpSeq,
          행정예고명: row.admRulNm,
          행정규칙종류: row.lsClsNm,
          기관명: row.asndOfiNm,
          공고번호: row.pntcNo,
          공고일자: row.pntcDt,
          시작일자: row.stYd,
          종료일자: row.edYd,
          파일링크: row.FileDownLink,
        })),
      };
    }

    case "interpretation": {
      // 법령해석례
      const result = await lawmaking.getInterpretations({
        prdFrDay: params.prd_fr_day,
        prdToDay: params.prd_to_day,
        lsCptOrg: params.ls_cpt_org,
        schKeyword: params.keyword,
      });
      const rows = extractLawmakingRows(result);
      return {
        total: rows.length,
        items: rows.map((row) => ({
          interpSeq: row.itmSeq,
          안건명: row.itmNm,
          관련법령: row.tgLsNm,
          조문: row.joCts,
          분야: row.catNm,
          소관기관: row.lsCptOrgNm,
        })),
      };
    }

    case "opinion": {
      // 의견제시사례
      const result = await lawmaking.getOpinionCases({
        scFmDt: params.sc_fm_dt,
        scToDt: params.sc_to_dt,
        scTextType: params.sc_text_type,
        scText: params.sc_text ?? params.keyword,
      });
      const rows = extractLawmakingRows(result);
      return {
        total: rows.length,
        items: rows.map((row) => ({
          caseSeq: row.caseSeq,
          안건명: row.caseNm,
          안건번호: row.caseNo,
          요청기관: row.reqOrgNm,
          소속부처: row.reqOrgAsndofiNm,
          회신일자: row.cdtDt,
        })),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerAssemblyOrgTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);
  // lawmaking 클라이언트는 lazy init — OC 미설정 시 에러를 도구 호출 시점에 발생
  let lawmaking: ReturnType<typeof createLawmakingClient> | undefined;

  server.tool(
    "assembly_org",
    "위원회·청원·입법예고·보도자료·입법통합(국민참여입법센터)을 조회합니다. type=committee(위원회), petition(청원), legislation_notice(국회 입법예고), press(보도자료), lawmaking(국민참여입법센터). lawmaking category=legislation(입법현황/계획/예고), admin(행정예고), interpretation(법령해석례), opinion(의견제시사례).",
    {
      type: z.enum(["committee", "petition", "legislation_notice", "press", "lawmaking"]).optional()
        .describe("조회 유형. lawmaking 선택 시 category로 세부 유형 지정"),
      category: z.enum(["legislation", "admin", "interpretation", "opinion"]).optional()
        .describe("lawmaking 세부 유형. legislation(입법현황/계획/예고), admin(행정예고), interpretation(법령해석례), opinion(의견제시사례)"),
      committee_name: z.string().optional()
        .describe("위원회명 (부분 일치). 지정 시 type=committee 자동 설정"),
      include_members: z.boolean().optional()
        .describe("위원회 위원 명단 포함 여부 (committee_name 지정 시)"),
      petition_id: z.string().optional()
        .describe("청원 ID (상세 조회). 지정 시 type=petition 자동 설정"),
      petition_status: z.enum(["pending", "processed", "all"]).optional()
        .describe("청원 상태 필터 (기본: pending)"),
      bill_name: z.string().optional()
        .describe("입법예고 법안명 검색 (부분 일치)"),
      lang: z.enum(["en"]).optional()
        .describe("언어: en이면 영문 API 사용 (committee/press 모드 지원)"),
      age: z.number().optional().describe("대수 (예: 22)"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
      // lawmaking 공통
      keyword: z.string().optional()
        .describe("검색 키워드 (lawmaking 모든 카테고리 공통, UTF-8 인코딩)"),
      // lawmaking legislation
      diff: z.string().optional()
        .describe("예고상태 (lawmaking legislation): 0=진행중, 1=종료"),
      ls_cls_cd: z.string().optional()
        .describe("법령분류코드: AA0101(법률), AA0102(대통령령), AA0103~AA0106(시행령/규칙 등)"),
      cpt_ofi_org_cd: z.string().optional()
        .describe("소관부처 코드 (예: 1741000=행안부)"),
      st_dt_fmt: z.string().optional()
        .describe("시작일자 (YYYY.MM.DD 형식)"),
      ed_dt_fmt: z.string().optional()
        .describe("종료일자 (YYYY.MM.DD 형식)"),
      lm_pln_yy: z.string().optional()
        .describe("입법계획 연도 (YYYY 형식, lawmaking legislation plan 모드)"),
      pmt_cls_cd: z.string().optional()
        .describe("계획구분코드: AB0201(연초), AB0202(추가)"),
      search_knd: z.string().optional()
        .describe("검색구분: schLsNm(법령명), schDs(소관부처), schKwrd(키워드)"),
      srch_txt: z.string().optional()
        .describe("검색어 (search_knd와 함께 사용)"),
      // lawmaking notice/plan detail ID (상세 조회 모드)
      detail_seq: z.string().optional()
        .describe("상세 조회 시 일련번호 (legislation/notice/plan 구분은 mode 파라미터 참고)"),
      // lawmaking admin
      closing: z.string().optional()
        .describe("마감여부 (lawmaking admin): N=진행, Y=종료"),
      // lawmaking interpretation
      prd_fr_day: z.string().optional()
        .describe("검색기간 시작 (YYYY.MM.DD, lawmaking interpretation)"),
      prd_to_day: z.string().optional()
        .describe("검색기간 종료 (YYYY.MM.DD, lawmaking interpretation)"),
      ls_cpt_org: z.string().optional()
        .describe("소관기관 코드 (lawmaking interpretation)"),
      // lawmaking opinion
      sc_fm_dt: z.string().optional()
        .describe("시작일자 (YYYY.MM.DD, lawmaking opinion)"),
      sc_to_dt: z.string().optional()
        .describe("종료일자 (YYYY.MM.DD, lawmaking opinion)"),
      sc_text_type: z.enum(["caseNm", "caseNo", "reqOrgNm"]).optional()
        .describe("검색구분 (lawmaking opinion): caseNm(안건명), caseNo(안건번호), reqOrgNm(요청기관)"),
      sc_text: z.string().optional()
        .describe("검색어 (sc_text_type과 함께 사용)"),
    },
    async (params) => {
      try {
        const resolvedType = detectType(params);
        const maxPageSize = config.apiResponse.maxPageSize;

        // lawmaking 타입인 경우에만 클라이언트 초기화
        if (resolvedType === "lawmaking") {
          if (!lawmaking) {
            lawmaking = createLawmakingClient(config);
          }
          const data = await handleLawmaking(params, lawmaking);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ type: resolvedType, category: detectLawmakingCategory(params), ...data }),
            }],
          };
        }

        let data: { total: number; items: readonly Record<string, unknown>[] };

        switch (resolvedType) {
          case "committee":
            data = await handleCommittee(params, api, maxPageSize);
            break;
          case "petition":
            data = await handlePetition(params, api, maxPageSize);
            break;
          case "legislation_notice":
            data = await handleLegislation(params, api, maxPageSize);
            break;
          case "press":
            data = await handlePress(params, api, maxPageSize);
            break;
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ type: resolvedType, ...data }),
          }],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
