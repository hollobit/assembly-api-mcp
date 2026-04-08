/**
 * 국민동의청원 통합 도구 (Full 전용)
 *
 * - petition_detail: 청원 검색 + 상세 조회 통합
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

export function registerPetitionDetailTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "petition_detail",
    "국민동의청원을 검색하고 상세 조회합니다. 청원ID로 상세, status로 계류/처리 구분.",
    {
      petition_id: z.string().optional().describe("청원 ID (상세 조회 모드)"),
      mode: z.enum(["search", "stats"]).optional().describe("모드: search(검색/상세, 기본), stats(청원 통계)"),
      status: z
        .enum(["pending", "processed", "all"])
        .optional()
        .describe("처리상태 필터 (기본: pending). pending=계류, processed=처리완료, all=전체"),
      keyword: z.string().optional().describe("청원명 검색 키워드"),
      age: z.number().optional().describe("대수 (예: 22)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        if (params.mode === "stats") {
          return await fetchPetitionStats(api);
        }

        if (params.petition_id) {
          return await fetchPetitionDetail(api, params.petition_id);
        }

        return await fetchPetitionList(api, config, params);
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}

// -- helpers -----------------------------------------------------------------

type Api = ReturnType<typeof createApiClient>;

interface ListParams {
  readonly status?: "pending" | "processed" | "all";
  readonly keyword?: string;
  readonly age?: number;
  readonly page_size?: number;
}

async function fetchPetitionDetail(api: Api, petitionId: string) {
  const [detailResult, reviewResult, sponsorsResult] = await Promise.allSettled([
    api.fetchOpenAssembly(API_CODES.PETITION_DETAIL, { PTT_ID: petitionId }),
    api.fetchOpenAssembly("PTTJUDGE", { BILL_ID: petitionId })
      .catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
    api.fetchOpenAssembly("PTTINFOPPSR", { PTT_ID: petitionId })
      .catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
  ]);

  const detail = detailResult.status === "fulfilled" ? detailResult.value : { rows: [], totalCount: 0 };

  if (detail.rows.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ total: 0, items: [], petition_id: petitionId }),
      }],
    };
  }

  const response: Record<string, unknown> = {
    total: 1,
    items: detail.rows,
    petition_id: petitionId,
  };

  const reviewData = reviewResult.status === "fulfilled" ? reviewResult.value : { rows: [] };
  const sponsorsData = sponsorsResult.status === "fulfilled" ? sponsorsResult.value : { rows: [] };

  if (reviewData.rows.length > 0) {
    response.review = reviewData.rows;
  }
  if (sponsorsData.rows.length > 0) {
    response.sponsors = sponsorsData.rows;
  }

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(response),
    }],
  };
}

async function fetchPetitionStats(api: Api) {
  const result = await api.fetchOpenAssembly("PTTCNTMAIN", {})
    .catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 }));

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        mode: "stats",
        total: result.totalCount,
        items: result.rows,
      }),
    }],
  };
}

async function fetchPetitionList(
  api: Api,
  config: AppConfig,
  params: ListParams,
) {
  const status = params.status ?? "pending";
  const pSize = Math.min(params.page_size ?? 20, config.apiResponse.maxPageSize);
  const age = params.age ?? CURRENT_AGE;

  const useAllList = status === "all" || status === "processed";
  const apiCode = useAllList ? API_CODES.PETITION_LIST : API_CODES.PETITION_PENDING;

  const queryParams: Record<string, string | number> = { pSize };
  if (useAllList) {
    queryParams.ERACO = `제${age}대`;
  }

  const result = await api.fetchOpenAssembly(apiCode, queryParams);

  let rows = result.rows;
  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    rows = rows.filter((row) =>
      String(row.BILL_NAME ?? row.PTT_NAME ?? "").toLowerCase().includes(kw),
    );
  }

  const formatted = rows.map((row) => ({
    청원번호: row.BILL_NO ?? row.PTT_NO,
    청원명: row.BILL_NAME ?? row.PTT_NAME,
    청원인: row.PROPOSER,
    소개의원: row.APPROVER,
    소관위원회: row.CURR_COMMITTEE,
    제출일: row.PROPOSE_DT,
    링크: row.LINK_URL,
  }));

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        total: formatted.length,
        items: formatted,
        status,
      }),
    }],
  };
}
