/**
 * 의안 통합 상세 도구 (Full 전용)
 *
 * - bill_detail: 의안 상세 + 심사 + 이력 + 제안자 + 회의정보 통합 조회
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

const ALL_FIELDS = ["detail", "review", "history", "proposers", "meetings", "lifecycle"] as const;
type BillField = (typeof ALL_FIELDS)[number];

export function registerBillDetailTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "bill_detail",
    "의안 1건의 모든 정보를 한 번에 조회합니다. 상세, 심사, 이력, 제안자, 회의정보를 통합 반환.",
    {
      bill_id: z.string().describe("의안 ID (필수)"),
      fields: z
        .array(z.enum(ALL_FIELDS))
        .optional()
        .describe("조회 항목 (기본: 전체). detail, review, history, proposers, meetings, lifecycle"),
      age: z.number().optional().describe("대수 (예: 22)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 100, 최대: 100)"),
    },
    async (params) => {
      try {
        const age = params.age ?? CURRENT_AGE;
        const pSize = Math.min(params.page_size ?? 100, config.apiResponse.maxPageSize);
        const selected: ReadonlySet<BillField> = new Set(
          params.fields ?? [...ALL_FIELDS],
        );

        const tasks: Record<BillField, Promise<unknown>> = {
          detail: selected.has("detail")
            ? fetchDetail(api, params.bill_id, age)
            : Promise.resolve(undefined),
          review: selected.has("review")
            ? fetchReview(api, params.bill_id, pSize)
            : Promise.resolve(undefined),
          history: selected.has("history")
            ? fetchHistory(api, params.bill_id, pSize)
            : Promise.resolve(undefined),
          proposers: selected.has("proposers")
            ? fetchProposers(api, params.bill_id, pSize)
            : Promise.resolve(undefined),
          meetings: selected.has("meetings")
            ? fetchMeetings(api, params.bill_id)
            : Promise.resolve(undefined),
          lifecycle: selected.has("lifecycle")
            ? fetchLifecycle(api, params.bill_id)
            : Promise.resolve(undefined),
        };

        // 예결산 관련 추가 API
        const budgetTasks = {
          budget_review: api.fetchOpenAssembly("BUDGETJUDGE", { BILL_ID: params.bill_id })
            .catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
          budget_preliminary: api.fetchOpenAssembly("BUDGETADJUDGE", { BILL_ID: params.bill_id })
            .catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
        };

        const [mainResults, budgetResults] = await Promise.all([
          Promise.allSettled(Object.values(tasks)),
          Promise.allSettled(Object.values(budgetTasks)),
        ]);

        const results = mainResults;
        const keys = Object.keys(tasks) as BillField[];

        const response: Record<string, unknown> = { bill_id: params.bill_id };
        keys.forEach((key, idx) => {
          const result = results[idx];
          if (result.status === "fulfilled" && result.value !== undefined) {
            response[key] = result.value;
          } else if (result.status === "rejected") {
            response[key] = { error: String(result.reason) };
          }
        });

        // 예결산 심사정보
        const budgetKeys = Object.keys(budgetTasks) as (keyof typeof budgetTasks)[];
        budgetKeys.forEach((key, idx) => {
          const result = budgetResults[idx];
          if (result.status === "fulfilled" && result.value.rows.length > 0) {
            response[key] = {
              total: result.value.totalCount,
              items: result.value.rows,
            };
          }
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response),
          }],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}

// -- fetchers ----------------------------------------------------------------

type Api = ReturnType<typeof createApiClient>;

async function fetchDetail(
  api: Api,
  billId: string,
  age: number,
): Promise<Record<string, unknown>> {
  const result = await api.fetchOpenAssembly(API_CODES.BILL_DETAIL, {
    BILL_ID: billId,
    AGE: age,
  });

  if (result.rows.length === 0) {
    return { total: 0, items: [] };
  }

  const row = result.rows[0];
  const detail: Record<string, unknown> = {
    BILL_ID: row.BILL_ID,
    BILL_NO: row.BILL_NO,
    BILL_NAME: row.BILL_NAME,
    PROPOSER: row.PROPOSER,
    PROPOSE_DT: row.PROPOSE_DT,
    COMMITTEE: row.COMMITTEE,
    CURR_COMMITTEE: row.CURR_COMMITTEE,
    PROC_RESULT_CD: row.PROC_RESULT_CD,
    RSN: row.RSN,
    DETAIL_CONTENT: row.DETAIL_CONTENT,
    DETAIL_LINK: row.DETAIL_LINK,
    LINK_URL: row.LINK_URL,
    ...row,
  };

  // 의안 웹 열람 + 문서 다운로드 링크
  const effectiveBillId = String(row.BILL_ID ?? billId);
  if (!detail.LINK_URL && effectiveBillId) {
    detail.LINK_URL = `https://likms.assembly.go.kr/bill/billDetail.do?billId=${effectiveBillId}`;
  }
  if (effectiveBillId) {
    detail["의안문서_ZIP"] = `https://likms.assembly.go.kr/bill/bi/bill/detail/downloadDtlZip.do?billId=${effectiveBillId}&billKindCd=${encodeURIComponent("법률안")}`;
  }

  return detail;
}

async function fetchReview(
  api: Api,
  billId: string,
  pSize: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await api.fetchOpenAssembly(API_CODES.BILL_REVIEW, { pSize });

  const filtered = result.rows.filter(
    (row) => String(row.BILL_ID ?? "") === billId,
  );

  return filtered.map((row) => ({
    의안번호: row.BILL_NO,
    의안명: row.BILL_NM,
    제안자구분: row.PPSR_KIND,
    제안일: row.PPSL_DT,
    소관위원회: row.JRCMIT_NM,
  }));
}

async function fetchHistory(
  api: Api,
  billId: string,
  pSize: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await api.fetchOpenAssembly(API_CODES.BILL_RECEIVED, { pSize });

  const filtered = result.rows.filter(
    (row) => String(row.BILL_ID ?? "") === billId,
  );

  return filtered.map((row) => ({
    의안번호: row.BILL_NO,
    의안명: row.BILL_NM,
    의안종류: row.BILL_KIND,
    제안자구분: row.PPSR_KIND,
    제안일: row.PPSL_DT,
    처리결과: row.PROC_RSLT,
    상세링크: row.LINK_URL,
  }));
}

async function fetchProposers(
  api: Api,
  billId: string,
  pSize: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await api.fetchOpenAssembly(API_CODES.BILL_PROPOSERS, {
    BILL_ID: billId,
    pSize,
  });

  return result.rows.map((row) => ({
    이름: row.PPSR_NM ?? row.HG_NM ?? "",
    정당: row.PPSR_POLY_NM ?? row.POLY_NM ?? "",
    대표구분: row.REP_DIV ?? "",
    역할: row.PPSR_ROLE ?? "",
    의원코드: row.NASS_CD ?? row.MONA_CD ?? "",
  }));
}

async function fetchMeetings(
  api: Api,
  billId: string,
): Promise<Record<string, unknown>> {
  const [confResult, lawConfResult] = await Promise.allSettled([
    api.fetchOpenAssembly(API_CODES.BILL_COMMITTEE_CONF, { BILL_ID: billId }),
    api.fetchOpenAssembly(API_CODES.BILL_LAW_COMMITTEE_CONF, { BILL_ID: billId }),
  ]);

  const committeeConf = confResult.status === "fulfilled"
    ? confResult.value.rows.map((r) => ({
        회의일: r.CONF_DT ?? r.MEETTING_DATE,
        위원회: r.CMIT_NM ?? r.COMMITTEE_NAME,
        결과: r.PROC_RESULT_CD ?? r.CONF_RESULT,
      }))
    : [];

  const lawCommitteeConf = lawConfResult.status === "fulfilled"
    ? lawConfResult.value.rows.map((r) => ({
        회의일: r.CONF_DT ?? r.MEETTING_DATE,
        결과: r.PROC_RESULT_CD ?? r.CONF_RESULT,
      }))
    : [];

  return {
    committee_meetings: committeeConf,
    law_committee_meetings: lawCommitteeConf,
  };
}

async function fetchLifecycle(
  api: Api,
  billId: string,
): Promise<Record<string, unknown> | undefined> {
  // ALLBILL은 BILL_NO가 필수 → 먼저 BILL_NO를 확보
  // BILL_ID에서 직접 BILL_NO를 알 수 없으므로 BILLINFODETAIL에서 추출
  const detailResult = await api.fetchOpenAssembly(API_CODES.BILL_DETAIL, {
    BILL_ID: billId,
  });
  const billNo = detailResult.rows[0]?.BILL_NO;
  if (!billNo) return undefined;

  const result = await api.fetchOpenAssembly("ALLBILL", {
    BILL_NO: String(billNo),
    pSize: 1,
  });
  if (result.rows.length === 0) return undefined;

  const lc = result.rows[0];
  return {
    의안번호: lc.BILL_NO,
    의안명: lc.BILL_NM,
    의안종류: lc.BILL_KND,
    제안자구분: lc.PPSR_KND,
    제안자: lc.PPSR_NM,
    제안일: lc.PPSL_DT,
    소관위원회: lc.JRCMIT_NM,
    소관위_회부일: lc.JRCMIT_CMMT_DT,
    소관위_상정일: lc.JRCMIT_PRSNT_DT,
    소관위_처리일: lc.JRCMIT_PROC_DT,
    소관위_처리결과: lc.JRCMIT_PROC_RSLT,
    법사위_회부일: lc.LAW_CMMT_DT,
    법사위_상정일: lc.LAW_PRSNT_DT,
    법사위_처리일: lc.LAW_PROC_DT,
    법사위_처리결과: lc.LAW_PROC_RSLT,
    본회의_상정일: lc.RGS_PRSNT_DT,
    본회의_의결일: lc.RGS_RSLN_DT,
    본회의_회의명: lc.RGS_CONF_NM,
    본회의_결과: lc.RGS_CONF_RSLT,
    정부이송일: lc.GVRN_TRSF_DT,
    공포법률명: lc.PROM_LAW_NM,
    공포일: lc.PROM_DT,
    공포번호: lc.PROM_NO,
    링크: lc.LINK_URL,
  };
}
