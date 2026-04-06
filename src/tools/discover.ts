/**
 * API 탐색 도구
 *
 * - discover_apis: 국회 열린데이터 276개 API를 키워드/카테고리로 검색
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient, type ApiResult } from "../api/client.js";
import { API_CODES } from "../api/codes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiCatalogEntry {
  readonly INF_ID: string;
  readonly INF_NM: string;
  readonly CATE_NM: string;
  readonly ORG_NM: string;
  readonly INF_EXP: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesKeyword(
  row: Record<string, unknown>,
  keyword: string,
): boolean {
  const lower = keyword.toLowerCase();
  const name = String(row.INF_NM ?? "").toLowerCase();
  const description = String(row.INF_EXP ?? "").toLowerCase();
  return name.includes(lower) || description.includes(lower);
}

function matchesCategory(
  row: Record<string, unknown>,
  category: string,
): boolean {
  const lower = category.toLowerCase();
  const cate = String(row.CATE_NM ?? "").toLowerCase();
  return cate.includes(lower);
}

function toEntry(row: Record<string, unknown>): ApiCatalogEntry {
  return {
    INF_ID: String(row.INF_ID ?? ""),
    INF_NM: String(row.INF_NM ?? ""),
    CATE_NM: String(row.CATE_NM ?? ""),
    ORG_NM: String(row.ORG_NM ?? ""),
    INF_EXP: String(row.INF_EXP ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerDiscoverTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "discover_apis",
    "국회 276개 API를 키워드/카테고리로 탐색합니다. 전용 도구가 없는 데이터(청원, 의안통계, 위원회 위원 명단 등)의 API 코드를 찾아 query_assembly로 호출할 수 있습니다.",
    {
      keyword: z
        .string()
        .optional()
        .describe("검색 키워드 (예: 회의록, 청원, 예산)"),
      category: z
        .string()
        .optional()
        .describe("카테고리 필터 (예: 국회의원, 의정활동별 공개, 보고서)"),
      page_size: z.number().optional().describe("결과 수 (기본: 20)"),
    },
    async (params) => {
      try {
        // Fetch full API catalog via OPENSRVAPI meta API
        const pageSize = Math.min(
          params.page_size ?? 300,
          300,
        );
        const result: ApiResult = await api.fetchOpenAssembly(
          API_CODES.META_API_LIST,
          { pSize: pageSize },
        );

        // Filter rows by keyword and/or category
        const filtered = result.rows.filter((row) => {
          const keywordMatch = params.keyword
            ? matchesKeyword(row, params.keyword)
            : true;
          const categoryMatch = params.category
            ? matchesCategory(row, params.category)
            : true;
          return keywordMatch && categoryMatch;
        });

        // Limit output to requested page_size (default 20)
        const limit = params.page_size ?? 20;
        const entries = filtered.slice(0, limit).map(toEntry);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                total: result.totalCount,
                matched: filtered.length,
                returned: entries.length,
                items: entries,
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
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, code }) }],
          isError: true,
        };
      }
    },
  );
}
