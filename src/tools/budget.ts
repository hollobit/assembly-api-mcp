/**
 * 예산정책처 분석 자료 도구
 *
 * - get_budget_analysis: 예산정책처 분석 자료 조회
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient } from "../api/client.js";
import { API_CODES } from "../api/codes.js";

export function registerBudgetTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "get_budget_analysis",
    "국회예산정책처(NABO)의 경제·재정 분석 자료를 조회합니다. 키워드, 연도, 카테고리로 필터링할 수 있습니다.",
    {
      keyword: z.string().optional().describe("검색 키워드"),
      year: z.string().optional().describe("발행 연도 (예: 2024)"),
      category: z.string().optional().describe("자료 카테고리"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {};
        if (params.keyword) queryParams.KEYWORD = params.keyword;
        if (params.year) queryParams.YEAR = params.year;
        if (params.category) queryParams.CATEGORY = params.category;
        if (params.page) queryParams.pIndex = params.page;
        if (params.page_size) queryParams.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);

        const result = await api.fetchOpenAssembly(
          API_CODES.BUDGET_ANALYSIS,
          queryParams,
        );

        const formatted = result.rows.map((row) => ({
          제목: row.TITLE,
          내용: row.CONTENT,
          발행일: row.PUB_DATE,
          링크: row.LINK_URL,
          카테고리: row.CATEGORY,
        }));

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ total: result.totalCount, items: formatted }),
          }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = message.includes('API_KEY') ? 'AUTH_ERROR'
          : message.includes('rate') ? 'RATE_LIMIT'
          : message.includes('timeout') ? 'TIMEOUT'
          : 'UNKNOWN';
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, code }) }],
          isError: true,
        };
      }
    },
  );
}
