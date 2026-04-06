/**
 * Lite 회의록 검색 도구
 *
 * 국회 회의록(본회의, 위원회, 국정감사, 인사청문회, 공청회)을 검색합니다.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

function formatMeetingRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    회의명: row.TITLE ?? row.COMM_NAME ?? row.CLASS_NAME,
    회의일: row.CONF_DATE,
    대수: row.DAE_NUM ?? row.ERACO,
    안건: row.SUB_NAME,
    회의록URL: row.PDF_LINK_URL ?? row.CONF_LINK_URL ?? row.LINK_URL,
    영상URL: row.VOD_LINK_URL,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiteMeetingTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "search_meetings",
    "국회 회의록을 검색합니다. 본회의·위원회·소위원회·국정감사·인사청문회·공청회 유형별로 검색 가능.",
    {
      keyword: z.string().optional().describe("검색 키워드 (안건명에서 검색)"),
      committee: z.string().optional().describe("위원회명 (meeting_type이 '위원회'일 때 사용)"),
      date_from: z
        .string()
        .optional()
        .describe("연도 (YYYY 형식). 회의록 API는 연도 단위만 지원합니다"),
      age: z
        .number()
        .optional()
        .describe(`대수 (기본: ${CURRENT_AGE} = 제${CURRENT_AGE}대 국회)`),
      meeting_type: z
        .enum(["본회의", "위원회", "소위원회", "국정감사", "인사청문회", "공청회"])
        .optional()
        .describe("회의 종류 (기본: 위원회)"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const age = params.age ?? CURRENT_AGE;
        const queryParams: Record<string, string | number> = {};

        if (params.keyword) queryParams.SUB_NAME = params.keyword;
        if (params.page) queryParams.pIndex = params.page;
        if (params.page_size) {
          queryParams.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);
        }

        let apiCode: string;

        switch (params.meeting_type) {
          case "본회의":
            apiCode = API_CODES.MEETING_PLENARY;
            queryParams.DAE_NUM = age;
            queryParams.CONF_DATE =
              params.date_from?.slice(0, 4) ?? String(new Date().getFullYear());
            break;
          case "국정감사":
            apiCode = API_CODES.MEETING_AUDIT;
            queryParams.ERACO = `제${age}대`;
            break;
          case "인사청문회":
            apiCode = API_CODES.MEETING_CONFIRMATION;
            queryParams.ERACO = `제${age}대`;
            break;
          case "공청회":
            apiCode = API_CODES.MEETING_PUBLIC_HEARING;
            queryParams.ERACO = `제${age}대`;
            break;
          case "소위원회":
            apiCode = API_CODES.MEETING_COMMITTEE;
            queryParams.DAE_NUM = age;
            queryParams.CONF_DATE =
              params.date_from?.slice(0, 4) ?? String(new Date().getFullYear());
            if (params.committee) queryParams.COMM_NAME = params.committee;
            break;
          default:
            apiCode = API_CODES.MEETING_COMMITTEE;
            queryParams.DAE_NUM = age;
            queryParams.CONF_DATE =
              params.date_from?.slice(0, 4) ?? String(new Date().getFullYear());
            if (params.committee) queryParams.COMM_NAME = params.committee;
            break;
        }

        const result = await api.fetchOpenAssembly(apiCode, queryParams);
        const formatted = result.rows.map(formatMeetingRow);

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
