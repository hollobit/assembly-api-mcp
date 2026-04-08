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

const SOURCES = ["library", "research", "budget", "publications", "future", "all_integrated", "all"] as const;
type Source = (typeof SOURCES)[number];

// 국회미래연구원 개별 API codes
const FUTURE_API_CODES = ["RESREPORT", "BRIEF", "FORUM", "ANUREPORT"] as const;

// 통합 API codes
const INTEGRATED_API_CODES = {
  library: "ALLNANETPBLM",
  research: "ALLNARSPBLM",
  budget: "ALLNABOPBLM",
  future: "ALLNAFIPBLM",
} as const;

export function registerResearchDataTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "research_data",
    "국회 연구자료를 통합 검색합니다. 국회도서관, 입법조사처, 예산정책처, 국회발간물, 국회미래연구원 자료를 한 번에.",
    {
      keyword: z.string().describe("검색 키워드 (필수)"),
      source: z
        .enum(SOURCES)
        .optional()
        .describe("검색 대상 (기본: all). library=도서관, research=입법조사처, budget=예산정책처, publications=국회발간물, future=국회미래연구원, all_integrated=4개 기관 통합API"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const source: Source = params.source ?? "all";
        const pSize = Math.min(params.page_size ?? 20, config.apiResponse.maxPageSize);

        const response: Record<string, unknown> = { keyword: params.keyword, source };

        if (source === "publications") {
          // 국회발간물 통합 API
          const result = await fetchGeneric(api, "ALLNASPBLM", params.keyword, pSize);
          response.publications = result;
        } else if (source === "future") {
          // 국회미래연구원 4개 API 병렬 호출
          const futureResults = await Promise.allSettled(
            FUTURE_API_CODES.map((code) => fetchGeneric(api, code, params.keyword, pSize)),
          );
          const futureKeys = ["research_reports", "briefs", "forums", "annual_reports"] as const;
          for (let i = 0; i < futureResults.length; i++) {
            const r = futureResults[i];
            if (r.status === "fulfilled") {
              response[futureKeys[i]] = r.value;
            } else {
              response[futureKeys[i]] = { error: String(r.reason) };
            }
          }
        } else if (source === "all_integrated") {
          // 4개 기관 통합 API 병렬 호출
          const integratedEntries = Object.entries(INTEGRATED_API_CODES) as readonly [string, string][];
          const integratedResults = await Promise.allSettled(
            integratedEntries.map(([, code]) => fetchGeneric(api, code, params.keyword, pSize)),
          );
          for (let i = 0; i < integratedEntries.length; i++) {
            const [key] = integratedEntries[i];
            const r = integratedResults[i];
            if (r.status === "fulfilled") {
              response[`${key}_integrated`] = r.value;
            } else {
              response[`${key}_integrated`] = { error: String(r.reason) };
            }
          }
        } else {
          // "all" 또는 개별 source (library/research/budget)
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

async function fetchGeneric(
  api: Api,
  apiCode: string,
  keyword: string,
  pSize: number,
): Promise<Record<string, unknown>> {
  const result = await api.fetchOpenAssembly(apiCode, {
    KEYWORD: keyword,
    pSize,
  });

  return { total: result.totalCount, items: result.rows };
}

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
