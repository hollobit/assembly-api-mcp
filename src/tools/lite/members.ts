/**
 * Lite 국회의원 통합 검색 도구
 *
 * get_members + get_member_detail을 하나의 search_members로 통합.
 * 이름 검색 결과가 1건이면 자동으로 전체 상세 정보를 반환합니다.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Field mappings
// ---------------------------------------------------------------------------

/** 목록용 요약 필드 */
const SUMMARY_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ["HG_NM", "이름"],
  ["POLY_NM", "정당"],
  ["ORIG_NM", "선거구"],
  ["REELE_GBN_NM", "당선횟수"],
  ["ELECT_GBN_NM", "당선방법"],
  ["CMITS", "소속위원회"],
] as const;

/** 상세용 전체 필드 */
const DETAIL_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ["HG_NM", "이름"],
  ["HJ_NM", "한자"],
  ["ENG_NM", "영문"],
  ["POLY_NM", "정당"],
  ["ORIG_NM", "선거구"],
  ["REELE_GBN_NM", "당선횟수"],
  ["ELECT_GBN_NM", "당선방법"],
  ["CMITS", "소속위원회"],
  ["TEL_NO", "연락처"],
  ["E_MAIL", "이메일"],
  ["HOMEPAGE", "홈페이지"],
  ["STAFF", "사무실"],
  ["SECRETARY", "보좌관"],
  ["SECRETARY2", "비서관"],
  ["MEM_TITLE", "약력"],
  ["ASSEM_ADDR", "사무실주소"],
  ["BTH_DATE", "생년월일"],
  ["BTH_GBN_NM", "음양력"],
  ["JOB_RES_NM", "직책"],
  ["UNITS", "대수"],
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRow(
  row: Readonly<Record<string, unknown>>,
  fields: ReadonlyArray<readonly [string, string]>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, label] of fields) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      result[label] = value;
    }
  }
  return result;
}

function buildQueryParams(params: {
  readonly name?: string;
  readonly party?: string;
  readonly district?: string;
  readonly committee?: string;
  readonly page?: number;
  readonly page_size?: number;
}, maxPageSize: number): Record<string, string | number> {
  const queryParams: Record<string, string | number> = {};

  if (params.name) queryParams.HG_NM = params.name;
  if (params.party) queryParams.POLY_NM = params.party;
  if (params.district) queryParams.ORIG_NM = params.district;
  // MEMBER_INFO API는 현재 의원만 반환
  if (params.page) queryParams.pIndex = params.page;

  // committee 필터 사용 시 전체 목록을 가져와서 클라이언트 측 필터링
  if (params.committee) {
    queryParams.pSize = 300;
  } else if (params.page_size) {
    queryParams.pSize = Math.min(params.page_size, maxPageSize);
  }

  return queryParams;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiteMemberTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "search_members",
    "현재 국회의원을 검색합니다. 이름, 정당, 선거구, 소속위원회로 필터링 가능. 결과가 1명이면 약력·연락처 등 상세 정보를 자동 반환합니다.",
    {
      name: z.string().optional().describe("의원 이름 (부분 일치 검색)"),
      party: z.string().optional().describe("정당명"),
      district: z.string().optional().describe("선거구명"),
      committee: z.string().optional().describe("소속위원회명 (부분 일치). 클라이언트 측 필터링으로 처리"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams = buildQueryParams(params, config.apiResponse.maxPageSize);

        const result = await api.fetchOpenAssembly(
          API_CODES.MEMBER_INFO,
          queryParams,
        );

        let rows = result.rows;

        // 소속위원회 클라이언트 측 필터링 (API가 서버 측 필터 미지원)
        if (params.committee) {
          const kw = params.committee.toLowerCase();
          rows = rows.filter((row) =>
            String(row.CMITS ?? "").toLowerCase().includes(kw),
          );
        }

        if (rows.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ total: 0, items: [], query: { name: params.name, party: params.party, district: params.district, committee: params.committee } }),
            }],
          };
        }

        // 결과가 1건이면 상세 정보 반환 (items 배열로 통일)
        if (rows.length === 1) {
          const detail = formatRow(rows[0], DETAIL_FIELDS);
          const memberName = String(rows[0].HG_NM ?? "");

          // 예측 프리패치: analyze_legislator에서 필요한 발의법안+표결을 백그라운드 로드
          if (memberName) {
            void Promise.allSettled([
              api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
                AGE: CURRENT_AGE, PROPOSER: memberName, pSize: 10,
              }),
              api.fetchOpenAssembly(API_CODES.VOTE_PLENARY, {
                AGE: CURRENT_AGE, pSize: 10,
              }),
            ]);
          }

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ total: 1, items: [detail] }),
            }],
          };
        }

        // 여러 건이면 요약 목록 반환
        const summaries = rows.map((row) => formatRow(row, SUMMARY_FIELDS));
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ total: rows.length, returned: rows.length, items: summaries }),
          }],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
