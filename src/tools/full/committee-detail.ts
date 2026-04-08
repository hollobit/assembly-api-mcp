/**
 * 위원회 통합 상세 도구 (Full 전용)
 *
 * - committee_detail: 위원회 현황 + 위원 명단 통합 조회
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

export function registerCommitteeDetailTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "committee_detail",
    "위원회 상세정보를 조회합니다. 위원회 현황, 위원 명단을 통합 반환.",
    {
      committee_name: z.string().optional().describe("위원회명 (생략 시 전체 목록)"),
      include_members: z.boolean().optional().describe("위원 명단 포함 여부 (committee_name 지정 시 기본: true)"),
      include_resources: z.boolean().optional().describe("위원회 부가정보 포함 여부"),
      age: z.number().optional().describe("대수 (예: 22)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 100, 최대: 100)"),
    },
    async (params) => {
      try {
        const pSize = Math.min(params.page_size ?? 100, config.apiResponse.maxPageSize);

        const committeeParams: Record<string, string | number> = { pSize };
        if (params.age) committeeParams.AGE = params.age;

        const committeeResult = await api.fetchOpenAssembly(
          API_CODES.COMMITTEE_INFO,
          committeeParams,
        );

        let committees = committeeResult.rows;

        if (params.committee_name) {
          const nameLower = params.committee_name.toLowerCase();
          committees = committees.filter((row) =>
            String(row.COMMITTEE_NAME ?? "").toLowerCase().includes(nameLower),
          );
        }

        const formatted = committees.map((row) => ({
          위원회구분: row.CMT_DIV_NM,
          위원회명: row.COMMITTEE_NAME,
          위원회코드: row.HR_DEPT_CD,
          위원장: row.HG_NM,
          간사: row.HG_NM_LIST,
          정원: row.LIMIT_CNT,
          현원: row.CURR_CNT,
        }));

        const shouldIncludeMembers = params.include_members
          ?? (params.committee_name !== undefined && committees.length > 0);

        let members: readonly Record<string, unknown>[] = [];
        let amendmentTargets: readonly Record<string, unknown>[] = [];

        // 위원회 지정 시 위원 명단 + 개정대상 법률 현황을 병렬 조회
        if (params.committee_name && committees.length > 0) {
          const parallelFetches: Promise<{ rows: readonly Record<string, unknown>[] }>[] = [];

          // 위원 명단
          if (shouldIncludeMembers) {
            parallelFetches.push(
              api.fetchOpenAssembly(API_CODES.COMMITTEE_MEMBERS, { pSize }),
            );
          } else {
            parallelFetches.push(Promise.resolve({ rows: [] }));
          }

          // 개정대상 법률 현황
          parallelFetches.push(
            api.fetchOpenAssembly("CLAWSTATE", { pSize })
              .catch(() => ({ rows: [] as readonly Record<string, unknown>[] })),
          );

          const [memberResult, amendmentResult] = await Promise.allSettled(parallelFetches);

          if (shouldIncludeMembers && memberResult.status === "fulfilled") {
            const committeeNames = new Set(
              committees.map((c) => String(c.COMMITTEE_NAME ?? "")),
            );
            const filteredMembers = memberResult.value.rows.filter((row) =>
              committeeNames.has(String(row.COMMITTEE_NAME ?? "")),
            );
            members = filteredMembers.map((row) => ({
              위원회: row.COMMITTEE_NAME,
              이름: row.HG_NM,
              정당: row.POLY_NM,
              선거구: row.ORIG_NM,
              직위: row.JOB_RES_NM,
            }));
          }

          if (amendmentResult.status === "fulfilled") {
            amendmentTargets = amendmentResult.value.rows;
          }
        } else if (shouldIncludeMembers && committees.length > 0) {
          const memberParams: Record<string, string | number> = { pSize };
          const memberResult = await api.fetchOpenAssembly(
            API_CODES.COMMITTEE_MEMBERS,
            memberParams,
          );
          members = memberResult.rows.map((row) => ({
            위원회: row.COMMITTEE_NAME,
            이름: row.HG_NM,
            정당: row.POLY_NM,
            선거구: row.ORIG_NM,
            직위: row.JOB_RES_NM,
          }));
        }

        // 위원회 자료실 (옵션)
        let resources: readonly Record<string, unknown>[] = [];
        if (params.include_resources && params.committee_name && committees.length > 0) {
          try {
            const resourceResult = await api.fetchOpenAssembly("nbiwfpqbaipwgkhfr", { pSize });
            resources = resourceResult.rows;
          } catch {
            /* 자료실 조회 실패 무시 */
          }
        }

        const response: Record<string, unknown> = {
          total: formatted.length,
          committees: formatted,
        };

        if (members.length > 0) {
          response.members = members;
          response.member_count = members.length;
        }
        if (amendmentTargets.length > 0) {
          response.amendment_targets = amendmentTargets;
        }
        if (resources.length > 0) {
          response.resources = resources;
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
