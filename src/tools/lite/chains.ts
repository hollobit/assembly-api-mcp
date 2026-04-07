/**
 * Lite 체인 도구 — 여러 API를 조합하여 종합 분석 결과를 반환
 *
 * analyze_legislator: 의원 인적사항 + 발의법안 + 표결 참여를 한 번에 조회
 * track_legislation: 키워드 기반 법안 추적 + 심사 이력 조회
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { type ApiResult } from "../../api/client.js";
import { formatToolError } from "../helpers.js";
import { mcpLogger } from "../../api/mcp-logger.js";

// ---------------------------------------------------------------------------
// Progress notification helper
// ---------------------------------------------------------------------------

interface ProgressSender {
  sendNotification: (notification: ServerNotification) => Promise<void>;
  _meta?: { progressToken?: string | number };
}

async function sendProgress(
  extra: ProgressSender,
  progress: number,
  total: number,
  message: string,
): Promise<void> {
  const token = extra._meta?.progressToken;
  if (token === undefined) return;

  try {
    await extra.sendNotification({
      method: "notifications/progress",
      params: { progressToken: token, progress, total, message },
    });
  } catch {
    // progress 알림 실패는 무시 (도구 실행에 영향 없음)
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberInfo {
  readonly name: string;
  readonly party: string;
  readonly district: string;
  readonly reelection: string;
  readonly committees: string;
  readonly photo: string;
  readonly memberCode: string;
}

interface BillSummary {
  readonly billNo: string;
  readonly billName: string;
  readonly status: string;
  readonly proposer: string;
  readonly proposeDate: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractMemberInfo(
  row: Readonly<Record<string, unknown>>,
): MemberInfo {
  const monaCode = String(row.MONA_CD ?? "");
  return {
    name: String(row.HG_NM ?? ""),
    party: String(row.POLY_NM ?? ""),
    district: String(row.ORIG_NM ?? ""),
    reelection: String(row.REELE_GBN_NM ?? ""),
    committees: String(row.CMITS ?? ""),
    photo: monaCode ? `https://www.assembly.go.kr/photo/${monaCode}.jpg` : "",
    memberCode: monaCode,
  };
}

function formatMemberSection(info: MemberInfo): string {
  return [
    "■ 의원 기본정보",
    `  이름: ${info.name} | 정당: ${info.party} | 선거구: ${info.district}`,
    `  당선: ${info.reelection} | 소속위원회: ${info.committees}`,
  ].join("\n");
}

function extractBillSummary(
  row: Readonly<Record<string, unknown>>,
): BillSummary {
  return {
    billNo: String(row.BILL_NO ?? row.BILL_ID ?? ""),
    billName: String(row.BILL_NAME ?? row.BILL_NM ?? ""),
    status: String(row.PROC_RESULT_CD ?? row.PROC_RESULT ?? row.RESULT ?? ""),
    proposer: String(row.PROPOSER ?? row.RST_PROPOSER ?? ""),
    proposeDate: String(row.PROPOSE_DT ?? row.PPSR_DT ?? ""),
  };
}

function formatBillList(
  bills: readonly BillSummary[],
  totalCount: number,
  sectionTitle: string,
): string {
  const header = `■ ${sectionTitle} (총 ${totalCount}건, 최근 ${bills.length}건)`;

  if (bills.length === 0) {
    return `${header}\n  조회 결과가 없습니다.`;
  }

  const lines = bills.map(
    (b) => `  - [${b.billNo}] ${b.billName} (${b.status || "상태 미상"})`,
  );

  return [header, ...lines].join("\n");
}

function formatVoteList(
  rows: readonly Record<string, unknown>[],
  totalCount: number,
  age: number,
): string {
  const header = `■ 본회의 표결 현황 (제${age}대, 총 ${totalCount}건)`;

  if (rows.length === 0) {
    return `${header}\n  조회 결과가 없습니다.`;
  }

  const lines = rows.map((row) => {
    const billNo = String(row.BILL_NO ?? row.BILL_ID ?? "");
    const billName = String(row.BILL_NAME ?? row.BILL_NM ?? "");
    const result = String(row.RESULT ?? row.PROC_RESULT ?? "");
    return `  - [${billNo}] ${billName} (${result || "결과 미상"})`;
  });

  return [header, ...lines].join("\n");
}

function deduplicateBills(
  allBills: readonly BillSummary[],
): readonly BillSummary[] {
  const seen = new Set<string>();
  const result: BillSummary[] = [];

  for (const bill of allBills) {
    if (bill.billNo && !seen.has(bill.billNo)) {
      seen.add(bill.billNo);
      result.push(bill);
    }
  }

  return result;
}

function formatTrackingResult(
  keywords: readonly string[],
  age: number,
  bills: readonly BillSummary[],
  histories: ReadonlyMap<string, readonly Record<string, unknown>[]>,
): string {
  const header = [
    `■ 법안 추적: "${keywords.join(", ")}" (제${age}대)`,
    `  검색 결과: 총 ${bills.length}건 (중복 제거)`,
  ].join("\n");

  if (bills.length === 0) {
    return `${header}\n\n  검색 결과가 없습니다.`;
  }

  const billLines = bills.map((bill, idx) => {
    const lines = [
      `  ${idx + 1}. [${bill.billNo}] ${bill.billName}`,
      `     제안자: ${bill.proposer || "미상"} | 제안일: ${bill.proposeDate || "미상"} | 상태: ${bill.status || "미상"}`,
    ];

    const history = histories.get(bill.billNo);
    if (history && history.length > 0) {
      for (const h of history) {
        const committeeName = String(h.CMIT_NM ?? h.COMMITTEE ?? "");
        const procResult = String(h.PROC_RESULT_CD ?? h.PROC_RESULT ?? "");
        const procDate = String(h.PROC_DT ?? h.PPSR_DT ?? "");
        if (committeeName || procResult) {
          lines.push(
            `     심사: ${committeeName} → ${procResult} (${procDate})`,
          );
        }
      }
    }

    return lines.join("\n");
  });

  return [
    header,
    "",
    "■ 관련 법안 목록",
    ...billLines,
    "",
    '💡 더 자세한 정보는 search_bills(bill_id: "...")로 조회하세요.',
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerLiteChainTools(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  // ── analyze_legislator ─────────────────────────────────────────────────
  server.tool(
    "analyze_legislator",
    "국회의원 의정활동 종합 분석. 인적사항, 발의법안, 표결참여를 한 번에 조회합니다. 특정 의원 활동을 파악할 때 사용하세요.",
    {
      name: z.string().describe("의원 이름"),
      age: z
        .number()
        .optional()
        .describe(`대수 (기본: ${CURRENT_AGE} = 제${CURRENT_AGE}대 국회)`),
    },
    async (params, extra) => {
      try {
        const age = params.age ?? CURRENT_AGE;

        // Step 1: 의원 인적사항 조회
        await sendProgress(extra, 1, 3, "의원 인적사항 조회 중...");
        const memberResult = await api.fetchOpenAssembly(
          API_CODES.MEMBER_INFO,
          { HG_NM: params.name, pSize: 1 },
        );

        if (memberResult.rows.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ total: 0, items: [], query: { name: params.name } }),
            }],
          };
        }

        const memberInfo = extractMemberInfo(memberResult.rows[0]);

        // Step 2: 발의법안 + 표결 병렬 조회
        await sendProgress(extra, 2, 3, "발의법안 및 표결 조회 중...");
        const [billsResult, votesResult] = await Promise.all([
          api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
            AGE: age,
            PROPOSER: params.name,
            pSize: 10,
          }),
          api.fetchOpenAssembly(API_CODES.VOTE_PLENARY, {
            AGE: age,
            pSize: 10,
          }),
        ]);
        await sendProgress(extra, 3, 3, "종합 분석 완료");

        const bills = billsResult.rows.map(extractBillSummary);

        // Step 3: 종합 보고서 생성 (pure JSON, items는 항상 배열)
        const billItems = Array.isArray(bills) ? bills : [];
        const voteItems = Array.isArray(votesResult.rows)
          ? votesResult.rows.map((row) => ({
              billNo: String(row.BILL_NO ?? row.BILL_ID ?? ""),
              billName: String(row.BILL_NAME ?? row.BILL_NM ?? ""),
              result: String(row.RESULT ?? row.PROC_RESULT ?? ""),
            }))
          : [];

        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            member: memberInfo,
            bills: {
              total: billsResult.totalCount ?? 0,
              items: billItems,
            },
            votes: {
              total: votesResult.totalCount ?? 0,
              age,
              items: voteItems,
            },
          }) }],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );

  // ── track_legislation ──────────────────────────────────────────────────
  server.tool(
    "track_legislation",
    "주제별 법안을 추적합니다. 키워드(쉼표 구분)로 관련 법안을 검색하고 심사 현황까지 확인. '교육 관련 법안', 'AI 입법 동향' 같은 주제 탐색에 최적.",
    {
      keywords: z
        .string()
        .describe('검색 키워드 (쉼표로 구분 가능, 예: "AI,인공지능")'),
      age: z
        .number()
        .optional()
        .describe(`대수 (기본: ${CURRENT_AGE} = 제${CURRENT_AGE}대 국회)`),
      include_history: z
        .boolean()
        .optional()
        .describe("심사 이력 포함 여부 (기본: false)"),
      page_size: z
        .number()
        .optional()
        .describe("키워드별 결과 수 (기본: 10)"),
    },
    async (params, extra) => {
      try {
        const age = params.age ?? CURRENT_AGE;
        const includeHistory = params.include_history ?? false;
        const pageSize = params.page_size ?? 10;
        const totalSteps = includeHistory ? 4 : 2;

        // Step 1: 키워드 분리 및 병렬 검색
        const keywordList = params.keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);

        if (keywordList.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ error: "검색 키워드를 입력해 주세요.", code: "INVALID_INPUT" }),
            }],
            isError: true,
          };
        }

        const MAX_KEYWORDS = 5;
        if (keywordList.length > MAX_KEYWORDS) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ error: `키워드는 최대 ${MAX_KEYWORDS}개까지 입력 가능합니다. (입력: ${keywordList.length}개)`, code: "INVALID_INPUT" }),
            }],
            isError: true,
          };
        }

        await sendProgress(extra, 1, totalSteps, `키워드 ${keywordList.length}개 법안 검색 중...`);
        const searchResults: readonly ApiResult[] = await Promise.all(
          keywordList.map((keyword) =>
            api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
              AGE: age,
              BILL_NAME: keyword,
              pSize: pageSize,
            }),
          ),
        );

        // Step 2: 결과 병합 및 중복 제거
        const allBills = searchResults.flatMap((r) =>
          r.rows.map(extractBillSummary),
        );
        const uniqueBills = deduplicateBills(allBills);

        await sendProgress(extra, 2, totalSteps, `법안 ${uniqueBills.length}건 발견, 정리 중...`);

        // Step 3: 심사 이력 + 위원회심사 회의 조회 (상위 5건, 옵션)
        const histories = new Map<string, readonly Record<string, unknown>[]>();
        const committeeConfs = new Map<string, readonly Record<string, unknown>[]>();

        if (includeHistory && uniqueBills.length > 0) {
          await sendProgress(extra, 3, totalSteps, "심사 이력 조회 중...");
          const top5 = uniqueBills.slice(0, 5);
          const historyResults = await Promise.all(
            top5.map((bill) =>
              api
                .fetchOpenAssembly(API_CODES.BILL_REVIEW, {
                  BILL_NM: bill.billName,
                })
                .then((result) => ({
                  billNo: bill.billNo,
                  rows: result.rows,
                }))
                .catch((err: unknown) => {
                  const msg = err instanceof Error ? err.message : String(err);
                  mcpLogger.log(
                    "warning",
                    "track-legislation",
                    `심사이력 조회 실패 [${bill.billNo}]: ${msg}`,
                  );
                  return {
                    billNo: bill.billNo,
                    rows: [] as readonly Record<string, unknown>[],
                  };
                }),
            ),
          );

          for (const { billNo, rows } of historyResults) {
            histories.set(billNo, rows);
          }

          // 위원회심사 회의정보도 함께 조회 (BILLJUDGECONF)
          const confResults = await Promise.all(
            top5.map((bill) =>
              api
                .fetchOpenAssembly(API_CODES.BILL_COMMITTEE_CONF, {
                  BILL_ID: bill.billNo,
                })
                .then((result) => ({
                  billNo: bill.billNo,
                  meetings: result.rows.map((r) => ({
                    회의일: r.CONF_DT ?? r.MEETTING_DATE,
                    위원회: r.CMIT_NM ?? r.COMMITTEE_NAME,
                    회의결과: r.PROC_RESULT_CD ?? r.CONF_RESULT,
                  })),
                }))
                .catch(() => ({
                  billNo: bill.billNo,
                  meetings: [] as Record<string, unknown>[],
                })),
            ),
          );

          for (const { billNo, meetings } of confResults) {
            if (meetings.length > 0) {
              committeeConfs.set(billNo, meetings);
            }
          }
        }

        await sendProgress(extra, totalSteps, totalSteps, "법안 추적 완료");

        // Step 4: 결과 포맷팅 (pure JSON)
        const historiesObj: Record<string, readonly Record<string, unknown>[]> = {};
        for (const [billNo, rows] of histories) {
          historiesObj[billNo] = rows;
        }
        const committeeConfsObj: Record<string, readonly Record<string, unknown>[]> = {};
        for (const [billNo, meetings] of committeeConfs) {
          committeeConfsObj[billNo] = meetings;
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            keywords: keywordList,
            age,
            total: uniqueBills.length,
            items: uniqueBills,
            histories: Object.keys(historiesObj).length > 0 ? historiesObj : undefined,
            committee_meetings: Object.keys(committeeConfsObj).length > 0 ? committeeConfsObj : undefined,
          }) }],
        };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
