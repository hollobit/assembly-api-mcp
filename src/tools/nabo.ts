/**
 * 국회예산정책처(NABO) Open API 통합 도구
 *
 * - get_nabo: 보고서 자료 / 정기간행물 / 채용정보 통합 조회
 *
 * NABO 공식 API 베이스: https://www.nabo.go.kr/api/v1/{report|periodical|recruitments}.do
 * 인증키 발급: https://www.nabo.go.kr/ko/api/apply.do?key=2509230004
 *
 * Lite/Full 도구와 독립된 NABO_API_KEY(선택)를 사용합니다.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient, type NaboResource } from "../api/client.js";

/**
 * NABO 응답 필드를 한글 공통 스키마로 정규화합니다.
 *
 * 실제 엔드포인트별로 필드명이 약간 다를 수 있으므로 우선 문서화된 report.do 기준을
 * 적용하고, 누락된 필드는 raw 객체에서 안전하게 추출합니다.
 */
function normalizeNaboRow(
  row: Record<string, unknown>,
  resource: NaboResource,
): Record<string, unknown> {
  const base = {
    제목: row.subj ?? row.title ?? row.name ?? null,
    작성자: row.cdNm ?? row.author ?? row.department ?? null,
    게시일: row.pubDt ?? row.regDt ?? row.date ?? null,
    조회수: row.count ?? row.hit ?? null,
    상세링크: row.detailUrl ?? row.url ?? null,
    첨부파일:
      row.name && row.url
        ? { 파일명: row.name, 다운로드: row.url }
        : row.attachments ?? null,
  };

  // Recruitments는 채용 기간·지원 경로 같은 부가 필드를 별도로 보존
  if (resource === "recruitments") {
    return {
      ...base,
      접수기간: row.applyPeriod ?? row.period ?? null,
      모집분야: row.field ?? row.category ?? null,
      raw: row,
    };
  }

  return { ...base, raw: row };
}

export function registerNaboTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "get_nabo",
    "국회예산정책처(NABO) Open API 통합 조회. type 파라미터로 보고서 자료(report), 정기간행물(periodical), 채용정보(recruitments)를 전환합니다. NABO_API_KEY(선택) 필요.",
    {
      type: z
        .enum(["report", "periodical", "recruitments"])
        .describe(
          "조회 대상: report(보고서 자료) | periodical(정기간행물) | recruitments(채용정보)",
        ),
      keyword: z
        .string()
        .optional()
        .describe("검색어 (scSw로 전달)"),
      sort: z
        .enum(["pubDt", "subj"])
        .optional()
        .describe("정렬 기준: pubDt(게시일) 또는 subj(제목)"),
      order: z
        .enum(["asc", "desc"])
        .optional()
        .describe("정렬 순서: asc(오름차순) 또는 desc(내림차순, 기본)"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z
        .number()
        .optional()
        .describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const resource = params.type;
        const queryParams: Record<string, string | number> = {};
        if (params.keyword) queryParams.scSw = params.keyword;
        if (params.sort) queryParams.scSort = params.sort;
        if (params.order) queryParams.scOrder = params.order;
        if (params.page) queryParams.page = params.page;
        if (params.page_size) {
          queryParams.size = Math.min(
            params.page_size,
            config.apiResponse.maxPageSize,
          );
        }

        const result = await api.fetchNabo(resource, queryParams);
        const items = result.items.map((row) => normalizeNaboRow(row, resource));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                type: resource,
                page: result.page,
                size: result.size,
                total: result.total,
                items,
              }),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = message.includes("NABO_API_KEY") || message.includes("INVALID_KEY")
          ? "AUTH_ERROR"
          : message.includes("NOT_APPROVED")
            ? "NOT_APPROVED"
            : message.includes("EXPIRED")
              ? "EXPIRED"
              : message.includes("timeout")
                ? "TIMEOUT"
                : "UNKNOWN";
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
