/**
 * Lite 의안 통합 도구
 *
 * search_bills + get_bill_detail + status filtering(pending/processed/recent)을
 * 단일 도구로 통합합니다.
 *
 * - bill_id 제공 시: 상세 조회 모드 (BILLINFODETAIL)
 * - status 필터에 따라 다른 API 코드 사용:
 *   - "all" / undefined → MEMBER_BILLS (AGE 필요)
 *   - "pending"         → BILL_PENDING (AGE 불필요)
 *   - "processed"       → BILL_PROCESSED (AGE 필요)
 *   - "recent"          → 본회의부의안건 (AGE 필요)
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type BillStatus = "all" | "pending" | "processed" | "recent";

/** status별 API 코드 매핑 */
const STATUS_API_MAP: Readonly<Record<BillStatus, string>> = {
  all: API_CODES.MEMBER_BILLS,
  pending: API_CODES.BILL_PENDING,
  processed: API_CODES.BILL_PROCESSED,
  recent: API_CODES.RECENT_PLENARY_BILLS,
};

/** AGE 파라미터가 불필요한 status 목록 */
const AGE_NOT_REQUIRED: ReadonlySet<BillStatus> = new Set(["pending"]);

/** status별 결과 라벨 */
const STATUS_LABELS: Readonly<Record<BillStatus, string>> = {
  all: "의안 검색",
  pending: "계류의안",
  processed: "처리의안",
  recent: "최근 본회의 처리의안",
};

// ---------------------------------------------------------------------------
// Formatters (immutable — always return new objects)
// ---------------------------------------------------------------------------

function formatSearchRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    의안ID: row.BILL_ID ?? null,
    의안번호: row.BILL_NO ?? null,
    의안명: row.BILL_NAME ?? null,
    제안자: row.PROPOSER ?? null,
    제안자구분: row.PROPOSER_KIND ?? null,
    대수: row.AGE ?? null,
    소관위원회: row.COMMITTEE ?? null,
    제안일: row.PROPOSE_DT ?? null,
    처리상태: row.PROC_RESULT ?? null,
    처리일: row.PROC_DT ?? null,
    상세링크: row.DETAIL_LINK ?? null,
  };
}

function formatDetailRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    의안ID: row.BILL_ID ?? null,
    의안번호: row.BILL_NO ?? null,
    의안명: row.BILL_NAME ?? row.BILL_NM ?? null,
    제안자: row.PROPOSER ?? null,
    제안자구분: row.PROPOSER_KIND ?? null,
    대수: row.AGE ?? null,
    소관위원회: row.COMMITTEE ?? row.COMMITTEE_NM ?? null,
    제안일: row.PROPOSE_DT ?? null,
    처리상태: row.PROC_RESULT ?? null,
    처리일: row.PROC_DT ?? null,
    제안이유: row.RSN ?? null,
    주요내용: row.DETAIL_CONTENT ?? null,
    상세링크: row.DETAIL_LINK ?? row.LINK_URL ?? null,
  };
}

// ---------------------------------------------------------------------------
// Search handler
// ---------------------------------------------------------------------------

interface SearchParams {
  readonly bill_name?: string;
  readonly proposer?: string;
  readonly committee?: string;
  readonly status?: BillStatus;
  readonly age?: number;
  readonly page?: number;
  readonly page_size?: number;
}

function buildSearchQuery(
  params: SearchParams,
  maxPageSize: number,
): { readonly apiCode: string; readonly queryParams: Record<string, string | number> } {
  const status: BillStatus = params.status ?? "all";
  const apiCode = STATUS_API_MAP[status];

  const queryParams: Record<string, string | number> = {};

  if (!AGE_NOT_REQUIRED.has(status)) {
    queryParams.AGE = params.age ?? CURRENT_AGE;
  }

  if (params.bill_name) queryParams.BILL_NAME = params.bill_name;
  if (params.proposer) queryParams.PROPOSER = params.proposer;
  if (params.committee) queryParams.COMMITTEE = params.committee;
  if (params.page) queryParams.pIndex = params.page;
  if (params.page_size) {
    queryParams.pSize = Math.min(params.page_size, maxPageSize);
  }

  return { apiCode, queryParams };
}

// ---------------------------------------------------------------------------
// Detail handler
// ---------------------------------------------------------------------------

interface DetailParams {
  readonly bill_id: string;
  readonly age?: number;
}

function buildDetailQuery(
  params: DetailParams,
): Record<string, string | number> {
  return {
    BILL_ID: params.bill_id,
    AGE: params.age ?? CURRENT_AGE,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiteBillTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "search_bills",
    "의안(법률안) 검색 및 상세 조회. 의안명/제안자/위원회/상태(계류·처리·최근)로 검색하거나, bill_id로 상세 조회. 주제별 법안 추적에는 track_legislation을 사용하세요.",
    {
      bill_name: z
        .string()
        .optional()
        .describe("의안명 (부분 일치 검색)"),
      bill_id: z
        .string()
        .optional()
        .describe("의안 ID (지정 시 상세 조회 모드)"),
      proposer: z
        .string()
        .optional()
        .describe("제안자/대표발의자 이름"),
      committee: z
        .string()
        .optional()
        .describe("소관위원회명"),
      status: z
        .enum(["all", "pending", "processed", "recent"])
        .optional()
        .describe(
          "상태 필터: all(전체), pending(계류), processed(처리완료), recent(최근 본회의). 기본: all",
        ),
      age: z
        .number()
        .optional()
        .describe(`대수 (예: 22 = 제22대 국회, 기본: ${CURRENT_AGE})`),
      page: z
        .number()
        .optional()
        .describe("페이지 번호 (기본: 1)"),
      page_size: z
        .number()
        .optional()
        .describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        // ── 상세 조회 모드 ──
        if (params.bill_id) {
          const queryParams = buildDetailQuery({
            bill_id: params.bill_id,
            age: params.age,
          });

          const result = await api.fetchOpenAssembly(
            API_CODES.BILL_DETAIL,
            queryParams,
          );

          if (result.rows.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({ total: 0, items: [], query: { bill_id: params.bill_id } }),
                },
              ],
            };
          }

          const detail = formatDetailRow(result.rows[0]);

          // 공동발의자 자동 포함 (상위 5명, 백그라운드 실패 무시)
          try {
            const proposerResult = await api.fetchOpenAssembly(
              API_CODES.BILL_PROPOSERS,
              { BILL_ID: params.bill_id, pSize: 20 },
            );
            if (proposerResult.rows.length > 0) {
              const proposers = proposerResult.rows.map((r) => ({
                이름: r.HG_NM ?? r.RST_PROPOSER,
                정당: r.POLY_NM,
                선거구: r.ORIG_NM,
              }));
              (detail as Record<string, unknown>)["공동발의자"] = proposers.slice(0, 5);
              (detail as Record<string, unknown>)["공동발의자_총수"] = proposerResult.totalCount;
            }
          } catch {
            // 제안자 조회 실패는 무시 — 나머지 상세 정보는 정상 반환
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ total: 1, items: [detail] }),
              },
            ],
          };
        }

        // ── 목록 검색 모드 ──
        const { apiCode, queryParams } = buildSearchQuery(
          {
            bill_name: params.bill_name,
            proposer: params.proposer,
            committee: params.committee,
            status: params.status as BillStatus | undefined,
            age: params.age,
            page: params.page,
            page_size: params.page_size,
          },
          config.apiResponse.maxPageSize,
        );

        const result = await api.fetchOpenAssembly(apiCode, queryParams);

        const status: BillStatus = (params.status as BillStatus) ?? "all";
        const label = STATUS_LABELS[status];
        const formatted = result.rows.map(formatSearchRow);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ total: result.totalCount, items: formatted }),
            },
          ],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
