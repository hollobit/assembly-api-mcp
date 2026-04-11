/**
 * OpenAPI REST 핸들러
 *
 * MCP 도구 로직을 REST API로 노출합니다.
 * 각 핸들러는 기존 createApiClient + API_CODES를 직접 사용하여
 * MCP 도구와 동일한 결과를 반환합니다.
 */

import { type AppConfig } from "../config.js";
import { createApiClient, type ApiClient } from "../api/client.js";
import { API_CODES, CURRENT_AGE } from "../api/codes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RestResponse {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

type QueryParams = Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(data: unknown, meta?: Record<string, unknown>): RestResponse {
  return {
    status: 200,
    body: { success: true, data, ...(meta ? { meta } : {}) },
  };
}

function sanitizeError(message: string): string {
  // API 키 관련 내부 정보를 숨김
  if (message.includes("API_KEY") || message.includes("인증키")) {
    return "API 인증에 실패했습니다. key 파라미터를 확인하세요.";
  }
  if (message.includes("rate") || message.includes("제한")) {
    return "요청 제한을 초과했습니다. 잠시 후 다시 시도하세요.";
  }
  if (message.includes("timeout") || message.includes("ECONNREFUSED")) {
    return "국회 API 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.";
  }
  return message;
}

function error(status: number, message: string): RestResponse {
  return { status, body: { success: false, error: sanitizeError(message) } };
}

function intParam(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

function clampPageSize(raw: string | undefined, max: number): number {
  return Math.min(intParam(raw, 20), max);
}

function buildPagination(
  params: QueryParams,
  maxPageSize: number,
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  const page = intParam(params.page, 0);
  if (page > 0) result.pIndex = page;
  const size = clampPageSize(params.page_size, maxPageSize);
  if (size > 0) result.pSize = size;
  return result;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export interface HandlerContext {
  readonly api: ApiClient;
  readonly config: AppConfig;
}

export type RouteHandler = (
  ctx: HandlerContext,
  params: QueryParams,
  pathParams?: Record<string, string>,
) => Promise<RestResponse>;

// ---------------------------------------------------------------------------
// Lite handlers
// ---------------------------------------------------------------------------

export const searchMembers: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.name) qp.HG_NM = params.name;
    if (params.party) qp.POLY_NM = params.party;
    if (params.district) qp.ORIG_NM = params.district;
    if (params.committee) qp.pSize = 300;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.MEMBER_INFO, qp);

    let rows = result.rows;
    if (params.committee) {
      const kw = params.committee.toLowerCase();
      rows = rows.filter((r) =>
        String(r.CMITS ?? "").toLowerCase().includes(kw),
      );
    }

    return ok(rows, { total: rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const searchBills: RouteHandler = async (ctx, params) => {
  try {
    const status = params.status ?? "all";
    const STATUS_API: Record<string, string> = {
      all: API_CODES.MEMBER_BILLS,
      pending: API_CODES.BILL_PENDING,
      processed: API_CODES.BILL_PROCESSED,
      recent: API_CODES.RECENT_PLENARY_BILLS,
    };
    const apiCode = STATUS_API[status] ?? API_CODES.MEMBER_BILLS;

    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (status !== "pending") {
      qp.AGE = intParam(params.age, CURRENT_AGE);
    }
    if (params.bill_name) qp.BILL_NAME = params.bill_name;
    if (params.proposer) qp.PROPOSER = params.proposer;
    if (params.committee) qp.COMMITTEE = params.committee;

    // bill_id → detail mode
    if (params.bill_id) {
      const detailQp: Record<string, string | number> = {
        BILL_ID: params.bill_id,
        AGE: intParam(params.age, CURRENT_AGE),
      };
      const detail = await ctx.api.fetchOpenAssembly(API_CODES.BILL_DETAIL, detailQp);
      return ok(detail.rows, { total: detail.totalCount });
    }

    const result = await ctx.api.fetchOpenAssembly(apiCode, qp);
    return ok(result.rows, { total: result.totalCount });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getSchedule: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.date_from && !params.date_to) qp.SCH_DT = params.date_from;
    if (params.committee) qp.CMIT_NM = params.committee;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.SCHEDULE_ALL, qp);

    let rows = result.rows;
    if (params.date_from && params.date_to) {
      rows = rows.filter((r) => {
        const dt = String(r.SCH_DT ?? "");
        return dt >= params.date_from! && dt <= params.date_to!;
      });
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      rows = rows.filter((r) =>
        String(r.SCH_CN ?? "").toLowerCase().includes(kw),
      );
    }

    return ok(rows, { total: rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const searchMeetings: RouteHandler = async (ctx, params) => {
  try {
    const age = intParam(params.age, CURRENT_AGE);
    const keyword = params.keyword;

    // keyword는 클라이언트 측 필터링 (API가 SUB_NAME 파라미터를 안정적으로 지원하지 않음)
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    // 키워드 검색 시 충분한 건수 확보
    if (keyword && !params.page_size) qp.pSize = 100;

    const MEETING_CODES: Record<string, string> = {
      "본회의": API_CODES.MEETING_PLENARY,
      "국정감사": API_CODES.MEETING_AUDIT,
      "인사청문회": API_CODES.MEETING_CONFIRMATION,
      "공청회": API_CODES.MEETING_PUBLIC_HEARING,
      "위원회": API_CODES.MEETING_COMMITTEE,
      "소위원회": API_CODES.MEETING_COMMITTEE,
    };

    const meetingType = params.meeting_type ?? "위원회";
    const apiCode = MEETING_CODES[meetingType] ?? API_CODES.MEETING_COMMITTEE;
    const confDateYear = params.date_from?.slice(0, 4);
    const usesConfDate = meetingType === "본회의" || meetingType === "위원회" || meetingType === "소위원회";

    if (usesConfDate) {
      qp.DAE_NUM = age;
      qp.CONF_DATE = confDateYear ?? String(new Date().getFullYear());
      if (params.committee && meetingType !== "본회의") qp.COMM_NAME = params.committee;
    } else {
      qp.ERACO = `제${age}대`;
    }

    let result: { totalCount: number; rows: readonly Record<string, unknown>[] };
    try {
      result = await ctx.api.fetchOpenAssembly(apiCode, qp);
    } catch {
      // sample 키 등으로 API 호출 실패 시 빈 결과 반환
      result = { totalCount: 0, rows: [] };
    }

    // 현재 연도 결과 부족 시 이전 연도 합산 (사용자 미지정 시만)
    if (usesConfDate && !confDateYear && qp.CONF_DATE) {
      const currentRows = result.rows;
      const needMore = keyword ? currentRows.length < 20 : currentRows.length === 0;
      if (needMore) {
        try {
          const prevYear = String(Number(qp.CONF_DATE) - 1);
          const prevResult = await ctx.api.fetchOpenAssembly(apiCode, { ...qp, CONF_DATE: prevYear });
          result = { ...result, rows: [...currentRows, ...prevResult.rows] };
        } catch {
          // 이전 연도 조회도 실패 시 현재 결과만 사용
        }
      }
    }

    // 키워드 클라이언트 측 필터링
    let rows = result.rows;
    if (keyword) {
      const kw = keyword.toLowerCase();
      rows = rows.filter((row) => {
        const subName = String(row.SUB_NAME ?? "").toLowerCase();
        const title = String(row.TITLE ?? "").toLowerCase();
        const commName = String(row.COMM_NAME ?? "").toLowerCase();
        return subName.includes(kw) || title.includes(kw) || commName.includes(kw);
      });
    }

    return ok(rows, { total: rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getVotes: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      AGE: intParam(params.age, CURRENT_AGE),
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };

    const apiCode = params.bill_id
      ? (qp.BILL_ID = params.bill_id, API_CODES.VOTE_BY_BILL)
      : API_CODES.VOTE_PLENARY;

    const result = await ctx.api.fetchOpenAssembly(apiCode, qp);
    return ok(result.rows, { total: result.rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const analyzeLegislator: RouteHandler = async (ctx, params, pathParams) => {
  try {
    const name = pathParams?.name ?? params.name;
    if (!name) return error(400, "name 파라미터가 필요합니다.");

    const age = intParam(params.age, CURRENT_AGE);

    const memberResult = await ctx.api.fetchOpenAssembly(
      API_CODES.MEMBER_INFO,
      { HG_NM: name, pSize: 1 },
    );
    if (memberResult.rows.length === 0) {
      return ok({ member: null, bills: [], votes: [] }, { total: 0 });
    }

    const [billsResult, votesResult] = await Promise.all([
      ctx.api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
        AGE: age, PROPOSER: name, pSize: 10,
      }),
      ctx.api.fetchOpenAssembly(API_CODES.VOTE_PLENARY, {
        AGE: age, pSize: 10,
      }),
    ]);

    const member = memberResult.rows[0];
    const monaCode = String(member.MONA_CD ?? "");

    return ok({
      member: {
        ...member,
        photo: monaCode ? `https://www.assembly.go.kr/photo/${monaCode}.jpg` : "",
      },
      bills: { total: billsResult.totalCount, items: billsResult.rows },
      votes: { total: votesResult.totalCount, items: votesResult.rows },
    });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const trackLegislation: RouteHandler = async (ctx, params) => {
  try {
    const keywords = params.keywords;
    if (!keywords) return error(400, "keywords 파라미터가 필요합니다.");

    const age = intParam(params.age, CURRENT_AGE);
    const pageSize = intParam(params.page_size, 10);
    const includeHistory = params.include_history === "true";

    const keywordList = keywords.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    if (keywordList.length === 0) return error(400, "검색 키워드를 입력해 주세요.");
    if (keywordList.length > 5) return error(400, "키워드는 최대 5개까지 입력 가능합니다.");

    const searchResults = await Promise.all(
      keywordList.map((kw) =>
        ctx.api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
          AGE: age, BILL_NAME: kw, pSize: pageSize,
        }),
      ),
    );

    const allBills = searchResults.flatMap((r) => r.rows);
    const seen = new Set<string>();
    const uniqueBills = allBills.filter((row) => {
      const billNo = String(row.BILL_NO ?? row.BILL_ID ?? "");
      if (!billNo || seen.has(billNo)) return false;
      seen.add(billNo);
      return true;
    });

    let histories: Record<string, readonly Record<string, unknown>[]> = {};
    if (includeHistory && uniqueBills.length > 0) {
      const top5 = uniqueBills.slice(0, 5);
      const historyResults = await Promise.all(
        top5.map((bill) =>
          ctx.api.fetchOpenAssembly(API_CODES.BILL_REVIEW, {
            BILL_NM: String(bill.BILL_NAME ?? bill.BILL_NM ?? ""),
          }).then((r) => ({ billNo: String(bill.BILL_NO ?? ""), rows: r.rows }))
            .catch(() => ({ billNo: String(bill.BILL_NO ?? ""), rows: [] as Record<string, unknown>[] })),
        ),
      );
      for (const { billNo, rows } of historyResults) {
        histories[billNo] = rows;
      }
    }

    return ok({
      keywords: keywordList,
      age,
      total: uniqueBills.length,
      items: uniqueBills,
      ...(Object.keys(histories).length > 0 ? { histories } : {}),
    });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const discoverApis: RouteHandler = async (ctx, params) => {
  try {
    const result = await ctx.api.fetchOpenAssembly(
      API_CODES.META_API_LIST,
      { pSize: 300 },
    );

    let filtered = result.rows;
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.INF_NM ?? "").toLowerCase().includes(kw) ||
        String(r.INF_EXP ?? "").toLowerCase().includes(kw),
      );
    }
    if (params.category) {
      const cat = params.category.toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.CATE_NM ?? "").toLowerCase().includes(cat),
      );
    }

    const limit = intParam(params.page_size, 20);
    const items = filtered.slice(0, limit);

    return ok(items, { total: result.totalCount, matched: filtered.length, returned: items.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const queryAssembly: RouteHandler = async (ctx, params, pathParams) => {
  try {
    const apiCode = pathParams?.api_code ?? params.api_code;
    if (!apiCode) return error(400, "api_code 파라미터가 필요합니다.");

    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };

    // Copy all non-system params as API params
    const reserved = new Set(["key", "profile", "page", "page_size", "api_code", "KEY", "Type", "pIndex", "pSize"]);
    for (const [k, v] of Object.entries(params)) {
      if (!reserved.has(k) && v !== undefined) {
        qp[k] = v;
      }
    }

    const result = await ctx.api.fetchOpenAssembly(apiCode, qp);
    return ok(result.rows, {
      api: apiCode,
      total: result.totalCount,
      returned: result.rows.length,
      fields: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
    });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

// ---------------------------------------------------------------------------
// Full-only handlers
// ---------------------------------------------------------------------------

export const getBillDetail: RouteHandler = async (ctx, params, pathParams) => {
  try {
    const billId = pathParams?.bill_id ?? params.bill_id;
    if (!billId) return error(400, "bill_id 파라미터가 필요합니다.");

    const age = intParam(params.age, CURRENT_AGE);
    const result = await ctx.api.fetchOpenAssembly(API_CODES.BILL_DETAIL, {
      BILL_ID: billId, AGE: age,
    });

    if (result.rows.length === 0) {
      // Supplementary lookup
      const sup = await ctx.api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
        BILL_ID: billId, AGE: age, pSize: 1,
      }).catch(() => ({ rows: [] as Record<string, unknown>[], totalCount: 0 }));
      return ok(sup.rows.length > 0 ? sup.rows[0] : null, { total: sup.rows.length });
    }

    return ok(result.rows[0], { total: 1 });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getBillReview: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.bill_id) qp.BILL_ID = params.bill_id;
    if (params.bill_name) qp.BILL_NM = params.bill_name;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.BILL_REVIEW, qp);

    let rows = result.rows;
    if (params.bill_id) {
      rows = rows.filter((r) => String(r.BILL_ID ?? "") === params.bill_id);
    }
    if (params.bill_name) {
      const kw = params.bill_name.toLowerCase();
      rows = rows.filter((r) => String(r.BILL_NM ?? "").toLowerCase().includes(kw));
    }

    return ok(rows, { total: rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getBillHistory: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.bill_name) qp.BILL_NM = params.bill_name;
    if (params.bill_no) qp.BILL_NO = params.bill_no;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.BILL_RECEIVED, qp);

    let rows = result.rows;
    if (params.bill_no) {
      rows = rows.filter((r) => String(r.BILL_NO ?? "") === params.bill_no);
    }
    if (params.bill_name) {
      const kw = params.bill_name.toLowerCase();
      rows = rows.filter((r) => String(r.BILL_NM ?? "").toLowerCase().includes(kw));
    }

    return ok(rows, { total: rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getCommittees: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.committee_type) qp.CMT_DIV_NM = params.committee_type;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.COMMITTEE_INFO, qp);
    return ok(result.rows, { total: result.totalCount });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const searchPetitions: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.keyword) qp.BILL_NAME = params.keyword;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.PETITION_PENDING, qp);

    let rows = result.rows;
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      rows = rows.filter((r) =>
        String(r.BILL_NAME ?? "").toLowerCase().includes(kw),
      );
    }

    return ok(rows, { total: rows.length });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getLegislationNotices: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.keyword) qp.BILL_NAME = params.keyword;
    if (params.date_from) qp.START_DT = params.date_from;
    if (params.date_to) qp.END_DT = params.date_to;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.LEGISLATION_ACTIVE, qp);
    return ok(result.rows, { total: result.totalCount });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const searchLibrary: RouteHandler = async (ctx, params) => {
  try {
    if (!params.keyword) return error(400, "keyword 파라미터가 필요합니다.");

    const qp: Record<string, string | number> = {
      KEYWORD: params.keyword,
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.type) qp.TYPE = params.type;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.LIBRARY_SEARCH, qp);
    return ok(result.rows, { total: result.totalCount });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const getBudgetAnalysis: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.keyword) qp.KEYWORD = params.keyword;
    if (params.year) qp.YEAR = params.year;
    if (params.category) qp.CATEGORY = params.category;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.BUDGET_ANALYSIS, qp);
    return ok(result.rows, { total: result.totalCount });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

export const searchResearchReports: RouteHandler = async (ctx, params) => {
  try {
    const qp: Record<string, string | number> = {
      ...buildPagination(params, ctx.config.apiResponse.maxPageSize),
    };
    if (params.keyword) qp.KEYWORD = params.keyword;
    if (params.type) qp.TYPE = params.type;

    const result = await ctx.api.fetchOpenAssembly(API_CODES.RESEARCH_REPORTS, qp);
    return ok(result.rows, { total: result.totalCount });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};

// ---------------------------------------------------------------------------
// NABO handlers (nabo.go.kr)
// ---------------------------------------------------------------------------

import { createNaboClient, type NaboApiType, type NaboItem } from "../api/nabo.js";

export const getNabo: RouteHandler = async (ctx, params) => {
  try {
    const type = (params.type ?? "report") as NaboApiType;
    if (!["report", "periodical", "recruitments"].includes(type)) {
      return error(400, "type은 report, periodical, recruitments 중 하나여야 합니다.");
    }

    const nabo = createNaboClient(ctx.config);

    const searchParams = {
      page: intParam(params.page, 1),
      size: clampPageSize(params.page_size, ctx.config.apiResponse.maxPageSize),
      scSort: params.sc_sort as "pubDt" | "subj" | undefined,
      scOrder: params.sc_order as "asc" | "desc" | undefined,
      scSw: params.sc_sw,
    };

    let result: { page: number; size: number; total: number; items: NaboItem[] };
    if (type === "report") {
      const res = await nabo.searchReports(searchParams);
      result = { page: res.page, size: res.size, total: res.total, items: [...res.items] };
    } else if (type === "periodical") {
      const res = await nabo.searchPeriodicals(searchParams);
      result = { page: res.page, size: res.size, total: res.total, items: [...res.items] };
    } else {
      const res = await nabo.searchRecruitments(searchParams);
      result = { page: res.page, size: res.size, total: res.total, items: [...res.items] };
    }

    const formatted = result.items.map((item) => ({
      제목: item.subj,
      작성부서: item.cdNm,
      게시일: item.pubDt,
      조회수: item.count,
      내용요약: item.text,
      상세URL: item.detailUrl,
      첨부파일명: item.name,
      첨부파일URL: item.url,
    }));

    return ok(formatted, { total: result.total, page: result.page, size: result.size, type });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : String(e));
  }
};
