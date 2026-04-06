/**
 * Lite 표결 결과 조회 도구
 *
 * 의안별 표결 결과 또는 전체 본회의 표결 목록을 조회합니다.
 * bill_id가 있으면 해당 의안의 의원별 표결 결과를, 없으면 전체 표결 목록을 반환합니다.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** 의안별 의원 표결 결과 포맷 */
function formatVoteByBillRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    의안ID: row.BILL_ID,
    의안명: row.BILL_NAME,
    의원명: row.HG_NM,
    표결결과: row.VOTE_RESULT,
  };
}

/** 본회의 전체 표결 목록 포맷 */
function formatVotePlenaryRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    의안ID: row.BILL_ID,
    의안명: row.BILL_NAME ?? row.BILL_NM,
    표결일: row.VOTE_DATE,
    찬성: row.YES_TCNT,
    반대: row.NO_TCNT,
    기권: row.BLANK_TCNT,
    결과: row.RESULT ?? row.VOTE_RESULT,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiteVoteTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "get_votes",
    "국회 표결 결과를 조회합니다. bill_id 없이 호출하면 최근 본회의 전체 표결 현황, bill_id 지정 시 해당 의안의 의원별 찬반 상세를 반환합니다.",
    {
      bill_id: z
        .string()
        .optional()
        .describe("의안 ID. 지정 시 해당 의안의 의원별 표결 결과 조회, 생략 시 전체 표결 목록 조회"),
      age: z
        .number()
        .optional()
        .describe(`대수 (기본: ${CURRENT_AGE} = 제${CURRENT_AGE}대 국회)`),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {
          AGE: params.age ?? CURRENT_AGE,
        };

        if (params.page) queryParams.pIndex = params.page;
        if (params.page_size) {
          queryParams.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);
        }

        let apiCode: string;
        let formatRow: (row: Readonly<Record<string, unknown>>) => Record<string, unknown>;

        if (params.bill_id) {
          // 의안별 의원 표결 결과
          apiCode = API_CODES.VOTE_BY_BILL;
          queryParams.BILL_ID = params.bill_id;
          formatRow = formatVoteByBillRow;
        } else {
          // 본회의 전체 표결 목록
          apiCode = API_CODES.VOTE_PLENARY;
          formatRow = formatVotePlenaryRow;
        }

        const result = await api.fetchOpenAssembly(apiCode, queryParams);
        const formatted = result.rows.map(formatRow);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ total: formatted.length, items: formatted }),
            },
          ],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
