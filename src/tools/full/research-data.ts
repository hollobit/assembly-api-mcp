/**
 * 국회 연구자료 통합 검색 도구 (Full 전용)
 *
 * - research_data: 국회도서관 + 입법조사처 + 예산정책처 통합 검색
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

const SOURCES = ["library", "research", "budget", "all"] as const;
type Source = (typeof SOURCES)[number];

export function registerResearchDataTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "research_data",
    "국회 연구자료를 통합 검색합니다. 국회도서관, 입법조사처, 예산정책처 자료를 한 번에.",
    {
      keyword: z.string().describe("검색 키워드 (필수)"),
      source: z
        .enum(SOURCES)
        .optional()
        .describe("검색 대상 (기본: all). library=도서관, research=입법조사처, budget=예산정책처"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const source: Source = params.source ?? "all";
        const pSize = Math.min(params.page_size ?? 20, config.apiResponse.maxPageSize);

        const shouldFetch = (s: Source): boolean =>
          source === "all" || source === s;

        const [libraryResult, researchResult, budgetResult] = await Promise.allSettled([
          shouldFetch("library")
            ? fetchLibrary(api, params.keyword, pSize)
            : Promise.resolve(undefined),
          shouldFetch("research")
            ? fetchResearch(api, params.keyword, pSize)
            : Promise.resolve(undefined),
          shouldFetch("budget")
            ? fetchBudget(api, params.keyword, pSize)
            : Promise.resolve(undefined),
        ]);

        const response: Record<string, unknown> = { keyword: params.keyword, source };

        if (libraryResult.status === "fulfilled" && libraryResult.value !== undefined) {
          response.library = libraryResult.value;
        } else if (libraryResult.status === "rejected") {
          response.library = { error: String(libraryResult.reason) };
        }

        if (researchResult.status === "fulfilled" && researchResult.value !== undefined) {
          response.research = researchResult.value;
        } else if (researchResult.status === "rejected") {
          response.research = { error: String(researchResult.reason) };
        }

        if (budgetResult.status === "fulfilled" && budgetResult.value !== undefined) {
          response.budget = budgetResult.value;
        } else if (budgetResult.status === "rejected") {
          response.budget = { error: String(budgetResult.reason) };
        }

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

async function fetchLibrary(
  api: Api,
  keyword: string,
  pSize: number,
): Promise<Record<string, unknown>> {
  const result = await api.fetchOpenAssembly(API_CODES.LIBRARY_SEARCH, {
    KEYWORD: keyword,
    pSize,
  });

  const items = result.rows.map((row) => ({
    제목: row.TITLE,
    저자: row.AUTHOR,
    출판사: row.PUBLISHER,
    발행연도: row.PUB_YEAR,
    링크: row.LINK_URL,
  }));

  return { total: result.totalCount, items };
}

async function fetchResearch(
  api: Api,
  keyword: string,
  pSize: number,
): Promise<Record<string, unknown>> {
  const result = await api.fetchOpenAssembly(API_CODES.RESEARCH_REPORTS, {
    KEYWORD: keyword,
    pSize,
  });

  const items = result.rows.map((row) => ({
    제목: row.TITLE,
    저자: row.AUTHOR,
    발행일: row.PUB_DATE,
    카테고리: row.CATEGORY,
    링크: row.LINK_URL,
    요약: row.ABSTRACT,
  }));

  return { total: result.totalCount, items };
}

async function fetchBudget(
  api: Api,
  keyword: string,
  pSize: number,
): Promise<Record<string, unknown>> {
  const result = await api.fetchOpenAssembly(API_CODES.BUDGET_ANALYSIS, {
    KEYWORD: keyword,
    pSize,
  });

  const items = result.rows.map((row) => ({
    제목: row.TITLE,
    내용: row.CONTENT,
    발행일: row.PUB_DATE,
    링크: row.LINK_URL,
    카테고리: row.CATEGORY,
  }));

  return { total: result.totalCount, items };
}
