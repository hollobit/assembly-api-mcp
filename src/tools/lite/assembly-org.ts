/**
 * Lite 위원회·청원·입법예고 통합 도구
 *
 * get_committees + search_petitions + get_legislation_notices → assembly_org
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------

type OrgType = "committee" | "petition" | "legislation_notice";

interface OrgParams {
  readonly type?: OrgType;
  readonly committee_name?: string;
  readonly include_members?: boolean;
  readonly petition_id?: string;
  readonly petition_status?: "pending" | "processed" | "all";
  readonly bill_name?: string;
  readonly age?: number;
  readonly page?: number;
  readonly page_size?: number;
}

function detectType(params: OrgParams): OrgType {
  if (params.type) return params.type;
  if (params.committee_name) return "committee";
  if (params.petition_id) return "petition";
  if (params.bill_name && !params.committee_name) return "legislation_notice";
  return "committee";
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

  const result = await api.fetchOpenAssembly(API_CODES.COMMITTEE_INFO, queryParams);
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
      { pSize: 300 },
    );
    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const m of membersResult.rows) {
      const name = String(m.HR_DEPT_NM ?? "");
      const existing = grouped.get(name) ?? [];
      grouped.set(name, [...existing, { 이름: m.HG_NM, 정당: m.POLY_NM, 직책: m.JOB_RES_NM }]);
    }
    membersMap = grouped;
  }

  const formatted = rows.map((row) => {
    const base: Record<string, unknown> = {
      위원회명: row.COMMITTEE_NAME,
      위원회구분: row.CMT_DIV_NM,
      위원장: row.HG_NM,
      간사: row.HG_NM_LIST,
      현원: row.CURR_CNT,
      정원: row.LIMIT_CNT,
    };
    const cmtName = String(row.COMMITTEE_NAME ?? "");
    const members = membersMap.get(cmtName);
    if (members && members.length > 0) {
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
// Registration
// ---------------------------------------------------------------------------

export function registerAssemblyOrgTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "assembly_org",
    "위원회·청원·입법예고를 조회합니다. type=committee로 위원회, petition으로 청원, legislation_notice로 입법예고.",
    {
      type: z.enum(["committee", "petition", "legislation_notice"]).optional()
        .describe("조회 유형. 미지정 시 파라미터로 자동 감지"),
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
      age: z.number().optional().describe("대수 (예: 22)"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const resolvedType = detectType(params);
        const maxPageSize = config.apiResponse.maxPageSize;

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
