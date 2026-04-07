/**
 * 의안 추가 도구 (Full 전용)
 *
 * - get_bill_review: 의안 심사정보
 * - get_bill_history: 의안 접수/처리 이력
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient } from "../api/client.js";
import { API_CODES } from "../api/codes.js";

export function registerBillExtraTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  // ── 1. 의안 심사정보 ──────────────────────────────────────────

  server.tool(
    "get_bill_review",
    "의안의 심사 경과 정보를 조회합니다. 의안ID 또는 의안명으로 검색할 수 있습니다.",
    {
      bill_id: z.string().optional().describe("의안 ID"),
      bill_name: z.string().optional().describe("의안명 (부분 일치 검색)"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {};
        if (params.bill_id) queryParams.BILL_ID = params.bill_id;
        if (params.bill_name) queryParams.BILL_NM = params.bill_name;
        if (params.page) queryParams.pIndex = params.page;
        if (params.page_size) queryParams.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);

        const result = await api.fetchOpenAssembly(
          API_CODES.BILL_REVIEW,
          queryParams,
        );

        // API가 BILL_ID/BILL_NM 필터를 무시할 수 있으므로 클라이언트에서 필터링
        let filteredRows = result.rows;
        if (params.bill_id) {
          filteredRows = filteredRows.filter(
            (row) => String(row.BILL_ID ?? "") === params.bill_id,
          );
        }
        if (params.bill_name && filteredRows.length === 0) {
          // bill_id 필터 결과가 없으면 bill_name 부분 일치로 재시도
          const nameLower = params.bill_name.toLowerCase();
          filteredRows = result.rows.filter(
            (row) => String(row.BILL_NM ?? "").toLowerCase().includes(nameLower),
          );
        } else if (params.bill_name && !params.bill_id) {
          const nameLower = params.bill_name.toLowerCase();
          filteredRows = filteredRows.filter(
            (row) => String(row.BILL_NM ?? "").toLowerCase().includes(nameLower),
          );
        }

        const formatted = filteredRows.map((row) => ({
          의안번호: row.BILL_NO,
          의안명: row.BILL_NM,
          제안자구분: row.PPSR_KIND,
          제안일: row.PPSL_DT,
          소관위원회: row.JRCMIT_NM,
        }));

        // 위원회심사 회의정보 + 법사위 회의정보 추가 조회 (bill_id 있을 때만)
        let committeeConf: Record<string, unknown>[] = [];
        let lawCommitteeConf: Record<string, unknown>[] = [];

        if (params.bill_id) {
          const [confResult, lawConfResult] = await Promise.allSettled([
            api.fetchOpenAssembly(API_CODES.BILL_COMMITTEE_CONF, { BILL_ID: params.bill_id }),
            api.fetchOpenAssembly(API_CODES.BILL_LAW_COMMITTEE_CONF, { BILL_ID: params.bill_id }),
          ]);

          if (confResult.status === "fulfilled") {
            committeeConf = confResult.value.rows.map((r) => ({
              회의일: r.CONF_DT ?? r.MEETTING_DATE,
              위원회: r.CMIT_NM ?? r.COMMITTEE_NAME,
              결과: r.PROC_RESULT_CD ?? r.CONF_RESULT,
            }));
          }
          if (lawConfResult.status === "fulfilled") {
            lawCommitteeConf = lawConfResult.value.rows.map((r) => ({
              회의일: r.CONF_DT ?? r.MEETTING_DATE,
              결과: r.PROC_RESULT_CD ?? r.CONF_RESULT,
            }));
          }
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              total: formatted.length,
              items: formatted,
              committee_meetings: committeeConf.length > 0 ? committeeConf : undefined,
              law_committee_meetings: lawCommitteeConf.length > 0 ? lawCommitteeConf : undefined,
              note: formatted.length === 0 && result.rows.length > 0
                ? "API 결과에서 해당 의안을 찾지 못했습니다. bill_id 또는 bill_name을 확인해 주세요."
                : undefined,
            }),
          }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, code: message.includes('API_KEY') ? 'AUTH_ERROR' : message.includes('rate') ? 'RATE_LIMIT' : message.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN' }) }],
          isError: true,
        };
      }
    },
  );

  // ── 2. 의안 접수/처리 이력 ─────────────────────────────────────

  server.tool(
    "get_bill_history",
    "의안의 접수 및 처리 이력을 조회합니다. 의안명 또는 의안번호로 검색할 수 있습니다.",
    {
      bill_name: z.string().optional().describe("의안명 (부분 일치 검색)"),
      bill_no: z.string().optional().describe("의안번호"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {};
        if (params.bill_name) queryParams.BILL_NM = params.bill_name;
        if (params.bill_no) queryParams.BILL_NO = params.bill_no;
        if (params.page) queryParams.pIndex = params.page;
        if (params.page_size) queryParams.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);

        const result = await api.fetchOpenAssembly(
          API_CODES.BILL_RECEIVED,
          queryParams,
        );

        // API가 BILL_NO/BILL_NM 필터를 무시할 수 있으므로 클라이언트에서 필터링
        let filteredRows = result.rows;
        if (params.bill_no) {
          filteredRows = filteredRows.filter(
            (row) => String(row.BILL_NO ?? "") === params.bill_no,
          );
        }
        if (params.bill_name) {
          const nameLower = params.bill_name.toLowerCase();
          filteredRows = filteredRows.filter(
            (row) => String(row.BILL_NM ?? "").toLowerCase().includes(nameLower),
          );
        }

        const formatted = filteredRows.map((row) => ({
          의안번호: row.BILL_NO,
          의안명: row.BILL_NM,
          의안종류: row.BILL_KIND,
          제안자구분: row.PPSR_KIND,
          제안일: row.PPSL_DT,
          처리결과: row.PROC_RSLT,
          상세링크: row.LINK_URL,
        }));

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ total: formatted.length, items: formatted }),
          }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, code: message.includes('API_KEY') ? 'AUTH_ERROR' : message.includes('rate') ? 'RATE_LIMIT' : message.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN' }) }],
          isError: true,
        };
      }
    },
  );

  // ── 3. 의안 제안자 상세 ─────────────────────────────────────

  server.tool(
    "get_bill_proposers",
    "의안의 제안자(공동발의 의원) 전체 목록을 조회합니다. 의안ID로 검색합니다.",
    {
      bill_id: z.string().describe("의안 ID (필수)"),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 100, 최대: 100)"),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string | number> = {
          BILL_ID: params.bill_id,
          pSize: Math.min(params.page_size ?? 100, config.apiResponse.maxPageSize),
        };
        if (params.page) queryParams.pIndex = params.page;

        const result = await api.fetchOpenAssembly(
          API_CODES.BILL_PROPOSERS,
          queryParams,
        );

        const formatted = result.rows.map((row) => ({
          이름: row.HG_NM ?? row.RST_PROPOSER,
          정당: row.POLY_NM,
          선거구: row.ORIG_NM,
          의원코드: row.MONA_CD,
        }));

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              total: result.totalCount,
              items: formatted,
              bill_id: params.bill_id,
            }),
          }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, code: message.includes('API_KEY') ? 'AUTH_ERROR' : message.includes('rate') ? 'RATE_LIMIT' : message.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN' }) }],
          isError: true,
        };
      }
    },
  );
}
