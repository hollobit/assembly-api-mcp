/**
 * NABO 도구 —国会예산정책처 보고서/정기간행물/채용정보 조회
 *
 * MCP 도구:
 * - get_nabo: 보고서/정기간행물/채용정보 통합 검색 (Full 프로필)
 *
 * REST API: GET /api/nabo?type=report&sc_sw=예산&page=1&page_size=20
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createNaboClient, type NaboApiType } from "../api/nabo.js";

export function registerNaboTools(
  server: McpServer,
  config: AppConfig,
): void {
  const nabo = createNaboClient(config);

  /**
   * get_nabo — NABO 보고서/정기간행물/채용정보 검색
   *
   * type별 검색:
   * - report: NABO 분석보고서 (경제전망, 세제분석, 예산분석 등 1,687건+)
   * - periodical: NABO 정기간행물
   * - recruitments:nabO 채용공고
   */
  server.tool(
    "get_nabo",
    "국회예산정책처(NABO) 보고서/정기간행물/채용정보를 검색합니다. type으로 대상을 선택하고, 검색어로 필터링할 수 있습니다.",
    {
      type: z
        .enum(["report", "periodical", "recruitments"])
        .optional()
        .default("report")
        .describe("검색 대상: report(보고서), periodical(정기간행물), recruitments(채용정보)"),
      keyword: z
        .string()
        .optional()
        .describe("검색어 (scSw 파라미터)"),
      page: z
        .number()
        .optional()
        .default(1)
        .describe("페이지 번호 (기본: 1)"),
      page_size: z
        .number()
        .optional()
        .default(20)
        .describe("페이지 크기 (기본: 20, 최대: 100)"),
      sc_sort: z
        .enum(["pubDt", "subj"])
        .optional()
        .default("pubDt")
        .describe("정렬 기준: pubDt(게시일), subj(제목)"),
      sc_order: z
        .enum(["asc", "desc"])
        .optional()
        .default("desc")
        .describe("정렬 방향: asc(오름차순), desc(내림차순)"),
    },
    async (params) => {
      const apiType = (params.type ?? "report") as NaboApiType;

      try {
        let result: Awaited<ReturnType<typeof nabo.searchReports>>;
        if (apiType === "report") {
          result = await nabo.searchReports({
            page: params.page,
            size: Math.min(params.page_size, 100),
            scSort: params.sc_sort,
            scOrder: params.sc_order,
            scSw: params.keyword,
          });
        } else if (apiType === "periodical") {
          result = await nabo.searchPeriodicals({
            page: params.page,
            size: Math.min(params.page_size, 100),
            scSort: params.sc_sort,
            scOrder: params.sc_order,
            scSw: params.keyword,
          });
        } else {
          result = await nabo.searchRecruitments({
            page: params.page,
            size: Math.min(params.page_size, 100),
            scSort: params.sc_sort,
            scOrder: params.sc_order,
            scSw: params.keyword,
          });
        }

        const formatted = result.items.map((item) => ({
          제목: item.subj,
          작성부서: item.cdNm,
          게시일: item.pubDt,
          조회수: item.count,
          내용요약: item.text,
          상세URL: item.detailUrl,
          첨부파일명: item.name,
          첨부파일URL: item.url,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                total: result.total,
                page: result.page,
                size: result.size,
                type: apiType,
                items: formatted,
              }),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = message.includes("INVALID_KEY") || message.includes("NOT_APPROVED")
          ? "AUTH_ERROR"
          : message.includes("rate") || message.includes("제한")
            ? "RATE_LIMIT"
            : message.includes("timeout") || message.includes("ECONNREFUSED")
              ? "NETWORK_ERROR"
              : "UNKNOWN";

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, code }) }],
          isError: true,
        };
      }
    },
  );
}
