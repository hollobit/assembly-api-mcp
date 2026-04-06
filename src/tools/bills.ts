/**
 * 의안 정보 도구
 *
 * - search_bills: 의안 검색
 * - get_bill_detail: 의안 상세 조회
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient } from "../api/client.js";
import { API_CODES, CURRENT_AGE } from "../api/codes.js";

/**
 * Full 전용: get_bill_detail만 등록 (search_bills는 Lite에서 등록)
 */
export function registerBillDetailTool(
  server: McpServer,
  config: AppConfig,
): void {
  _registerBillDetail(server, config);
}

/**
 * @deprecated Full 모드에서 사용하지 않음. 테스트 호환용.
 * search_bills(Full) + get_bill_detail을 모두 등록합니다.
 */
export function registerBillTools(
  server: McpServer,
  config: AppConfig,
): void {
  _registerBillDetail(server, config);
}

function _registerBillDetail(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "get_bill_detail",
    "특정 의안의 상세 정보를 조회합니다. 의안ID로 검색하여 심사경과, 제안이유, 주요내용 등을 반환합니다.",
    {
      bill_id: z.string().describe("의안 ID"),
      age: z.number().optional().describe("대수 (예: 22)"),
    },
    async (params) => {
      try {
        const age = params.age ?? CURRENT_AGE;
        const queryParams: Record<string, string | number> = {
          BILL_ID: params.bill_id,
          AGE: age,
        };

        const result = await api.fetchOpenAssembly(
          API_CODES.BILL_DETAIL,
          queryParams,
        );

        if (result.rows.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ total: 0, items: [], query: { bill_id: params.bill_id } }),
            }],
          };
        }

        // 원시 필드 전체 반환 (제안이유, 주요내용, 심사경과 등 포함)
        const row = result.rows[0];
        const detail: Record<string, unknown> = {
          BILL_ID: row.BILL_ID,
          BILL_NO: row.BILL_NO,
          BILL_NAME: row.BILL_NAME,
          PROPOSER: row.PROPOSER,
          PROPOSE_DT: row.PROPOSE_DT,
          COMMITTEE: row.COMMITTEE,
          CURR_COMMITTEE: row.CURR_COMMITTEE,
          PROC_RESULT_CD: row.PROC_RESULT_CD,
          PROC_DT: row.PROC_DT,
          DETAIL_LINK: row.DETAIL_LINK,
          LINK_URL: row.LINK_URL,
          RST_PROPOSER: row.RST_PROPOSER,
          PUBL_PROPOSER: row.PUBL_PROPOSER,
          LAW_PROC_DT: row.LAW_PROC_DT,
          LAW_SUBMIT_DT: row.LAW_SUBMIT_DT,
          CMT_PRESENT_DT: row.CMT_PRESENT_DT,
          CMT_PROC_DT: row.CMT_PROC_DT,
          CMT_PROC_RESULT_CD: row.CMT_PROC_RESULT_CD,
          LAW_PRESENT_DT: row.LAW_PRESENT_DT,
          LAW_PROC_RESULT_CD: row.LAW_PROC_RESULT_CD,
          RGS_PROC_DT: row.RGS_PROC_DT,
          // 모든 원시 필드도 포함
          ...row,
        };

        // BILLINFODETAIL이 주요 필드(PROPOSER, COMMITTEE 등)를 반환하지 않는 경우
        // MEMBER_BILLS API로 보완 조회
        const missingKey = !detail.PROPOSER && !detail.COMMITTEE && !detail.PROPOSE_DT;
        if (missingKey) {
          try {
            const supplementResult = await api.fetchOpenAssembly(
              API_CODES.MEMBER_BILLS,
              { BILL_ID: params.bill_id, AGE: age, pSize: 1 },
            );
            if (supplementResult.rows.length > 0) {
              const sup = supplementResult.rows[0];
              // 보완 필드를 병합 (기존 값이 없는 경우만 덮어씀)
              if (!detail.PROPOSER) detail.PROPOSER = sup.PROPOSER;
              if (!detail.COMMITTEE) detail.COMMITTEE = sup.COMMITTEE;
              if (!detail.PROPOSE_DT) detail.PROPOSE_DT = sup.PROPOSE_DT;
              if (!detail.PROC_RESULT_CD) detail.PROC_RESULT_CD = sup.PROC_RESULT;
              if (!detail.PROC_DT) detail.PROC_DT = sup.PROC_DT;
              if (!detail.DETAIL_LINK) detail.DETAIL_LINK = sup.DETAIL_LINK;
              if (!detail.BILL_NO) detail.BILL_NO = sup.BILL_NO;
              if (!detail.BILL_NAME) detail.BILL_NAME = sup.BILL_NAME;
            }
          } catch {
            // 보완 조회 실패 시 BILLINFODETAIL 결과만 반환
          }
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ total: 1, items: [detail] }),
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
