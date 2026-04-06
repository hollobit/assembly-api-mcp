/**
 * 범용 국회 API 호출 도구
 *
 * - query_assembly: API 코드와 파라미터를 지정하여 어떤 국회 데이터든 조회
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient } from "../api/client.js";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerQueryTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "query_assembly",
    "API 코드로 국회 데이터를 직접 호출합니다. discover_apis로 찾은 코드를 사용하거나, 알려진 코드를 직접 입력. 전용 도구가 없는 276개 API에 접근하는 범용 도구입니다.",
    {
      api_code: z
        .string()
        .describe(
          "API 코드 (예: ALLSCHEDULE, nwvrqwxyaytdsfvhu, BILLRCP)",
        ),
      params: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional()
        .describe("API 파라미터 (예: {AGE: 22, BILL_NAME: '교육'})"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z
        .number()
        .optional()
        .describe("페이지 크기 (기본: 20)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {
          ...(params.params ?? {}),
        };

        if (params.page !== undefined) {
          queryParams.pIndex = params.page;
        }
        if (params.page_size !== undefined) {
          queryParams.pSize = Math.min(
            params.page_size,
            config.apiResponse.maxPageSize,
          );
        }

        const result = await api.fetchOpenAssembly(
          params.api_code,
          queryParams,
        );

        // Return raw rows with field names for maximum flexibility
        const fieldNames =
          result.rows.length > 0
            ? Object.keys(result.rows[0])
            : [];

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                api: params.api_code,
                total: result.totalCount,
                returned: result.rows.length,
                fields: fieldNames,
                items: result.rows,
              }),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = message.includes('API_KEY') ? 'AUTH_ERROR'
          : message.includes('rate') ? 'RATE_LIMIT'
          : message.includes('timeout') ? 'TIMEOUT'
          : 'UNKNOWN';
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: message, code }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
