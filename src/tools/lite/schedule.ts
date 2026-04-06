/**
 * Lite 국회 일정 조회 도구
 *
 * 국회 일정(본회의, 위원회 등)을 날짜/위원회/키워드로 검색합니다.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

function formatScheduleRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    일정종류: row.SCH_KIND,
    일자: row.SCH_DT,
    시간: row.SCH_TM,
    위원회: row.CMIT_NM,
    내용: row.SCH_CN,
    장소: row.EV_PLC,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiteScheduleTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "get_schedule",
    "국회 일정을 조회합니다. 날짜, 위원회, 키워드로 필터링. 날짜 범위 검색도 지원합니다.",
    {
      date_from: z
        .string()
        .optional()
        .describe("시작 날짜 (YYYY-MM-DD 형식). 단독 사용 시 해당 날짜의 일정 조회"),
      date_to: z
        .string()
        .optional()
        .describe("종료 날짜 (YYYY-MM-DD 형식). date_from과 함께 사용 시 날짜 범위 필터링"),
      keyword: z.string().optional().describe("검색 키워드 (일정 내용에서 검색)"),
      committee: z.string().optional().describe("위원회명"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {};

        const hasDateRange = params.date_from && params.date_to;
        if (params.date_from && !hasDateRange) {
          queryParams.SCH_DT = params.date_from;
        }
        if (params.committee) {
          queryParams.CMIT_NM = params.committee;
        }
        if (params.page) queryParams.pIndex = params.page;

        if (hasDateRange) {
          queryParams.pSize = Math.min(params.page_size ?? 100, config.apiResponse.maxPageSize);
        } else if (params.page_size) {
          queryParams.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);
        }

        const result = await api.fetchOpenAssembly(API_CODES.SCHEDULE_ALL, queryParams);

        let rows = result.rows;

        // 날짜 범위 + 키워드 post-fetch 필터링
        if (params.date_from && params.date_to) {
          rows = rows.filter((row) => {
            const dt = String(row.SCH_DT ?? "");
            return dt >= params.date_from! && dt <= params.date_to!;
          });
        }
        if (params.keyword) {
          const kw = params.keyword.toLowerCase();
          rows = rows.filter((row) =>
            String(row.SCH_CN ?? "").toLowerCase().includes(kw),
          );
        }

        const formatted = rows.map(formatScheduleRow);

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
