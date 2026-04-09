/**
 * Lite 의안 통합 도구 — assembly_bill
 *
 * search_bills + track_legislation + stats를 단일 도구로 통합합니다.
 *
 * 모드 자동 감지:
 * - bill_id 제공 → detail (BILL_DETAIL + BILL_PROPOSERS)
 * - keywords 제공 → track (키워드 병렬 검색 + 심사 이력)
 * - mode="stats"  → stats (5개 통계 API 병렬 호출)
 * - 그 외         → search (status별 API 코드 매핑)
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { type AppConfig } from "../../config.js";
import { createApiClient, type ApiResult } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";
import { mcpLogger } from "../../api/mcp-logger.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type BillStatus = "all" | "pending" | "processed" | "recent";
type BillMode = "search" | "track" | "stats";

const STATUS_API_MAP: Readonly<Record<BillStatus, string>> = {
  all: API_CODES.MEMBER_BILLS,
  pending: API_CODES.BILL_PENDING,
  processed: API_CODES.BILL_PROCESSED,
  recent: API_CODES.RECENT_PLENARY_BILLS,
};

const AGE_NOT_REQUIRED: ReadonlySet<BillStatus> = new Set(["pending"]);

const STATS_API_CODES: readonly { readonly key: string; readonly code: string }[] = [
  { key: "main", code: API_CODES.BILL_STATS_MAIN },
  { key: "committee", code: API_CODES.BILL_STATS_COMMITTEE },
  { key: "proposer", code: API_CODES.BILL_STATS_PROPOSER },
  { key: "law_division", code: API_CODES.BILL_STATS_LAW_DIV },
  { key: "law_committee", code: API_CODES.BILL_STATS_LAW_COMMITTEE },
];

const MAX_KEYWORDS = 5;
const MAX_CO_PROPOSERS = 5;
const TRACK_TOP_N = 5;

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
    // progress 알림 실패는 무시
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillSummary {
  readonly billNo: string;
  readonly billName: string;
  readonly status: string;
  readonly proposer: string;
  readonly proposeDate: string;
  readonly coProposers?: string;
}

// ---------------------------------------------------------------------------
// Formatters (immutable)
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
    대표발의자: row.RST_PROPOSER ?? null,
    공동발의자: row.PUBL_PROPOSER ?? null,
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

function extractBillSummary(
  row: Readonly<Record<string, unknown>>,
): BillSummary {
  return {
    billNo: String(row.BILL_NO ?? row.BILL_ID ?? ""),
    billName: String(row.BILL_NAME ?? row.BILL_NM ?? ""),
    status: String(row.PROC_RESULT_CD ?? row.PROC_RESULT ?? row.RESULT ?? ""),
    proposer: String(row.PROPOSER ?? row.RST_PROPOSER ?? ""),
    proposeDate: String(row.PROPOSE_DT ?? row.PPSR_DT ?? ""),
    coProposers: String(row.PUBL_PROPOSER ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function detectMode(params: {
  readonly bill_id?: string;
  readonly keywords?: string;
  readonly mode?: string;
  readonly bill_type?: string;
}): BillMode | "detail" {
  if (params.bill_id) return "detail";
  if (params.keywords) return "track";
  if (params.mode === "stats") return "stats";
  return "search";
}

function buildSearchQuery(
  params: {
    readonly bill_name?: string;
    readonly proposer?: string;
    readonly committee?: string;
    readonly status?: BillStatus;
    readonly age?: number;
    readonly page?: number;
    readonly page_size?: number;
  },
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
// Mode handlers
// ---------------------------------------------------------------------------

async function handleDetail(
  api: ReturnType<typeof createApiClient>,
  params: { readonly bill_id: string; readonly age?: number },
): Promise<{ content: { type: "text"; text: string }[] }> {
  const queryParams: Record<string, string | number> = {
    BILL_ID: params.bill_id,
    AGE: params.age ?? CURRENT_AGE,
  };

  const result = await api.fetchOpenAssembly(API_CODES.BILL_DETAIL, queryParams);

  if (result.rows.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ total: 0, items: [], query: { bill_id: params.bill_id } }),
      }],
    };
  }

  const detail = formatDetailRow(result.rows[0]);

  // 의안 웹 열람 + 문서 다운로드 링크
  const billId = String(result.rows[0].BILL_ID ?? params.bill_id);
  if (billId) {
    if (!(detail as Record<string, unknown>)["LINK_URL"]) {
      (detail as Record<string, unknown>)["LINK_URL"] = `https://likms.assembly.go.kr/bill/billDetail.do?billId=${billId}`;
    }
    (detail as Record<string, unknown>)["의안문서_ZIP"] = `https://likms.assembly.go.kr/bill/bi/bill/detail/downloadDtlZip.do?billId=${billId}&billKindCd=${encodeURIComponent("법률안")}`;
  }

  // 공동발의자 + ALLBILL 심사경과를 병렬 호출
  const billNo = String(result.rows[0].BILL_NO ?? "");
  const [proposerSettled, lifecycleSettled] = await Promise.allSettled([
    // 공동발의자 (상위 5명)
    api.fetchOpenAssembly(API_CODES.BILL_PROPOSERS, { BILL_ID: params.bill_id, pSize: 20 }),
    // ALLBILL 심사경과 (BILL_NO 필수)
    billNo ? api.fetchOpenAssembly("ALLBILL", { BILL_NO: billNo, pSize: 1 }) : Promise.reject("no BILL_NO"),
  ]);

  if (proposerSettled.status === "fulfilled" && proposerSettled.value.rows.length > 0) {
    const proposers = proposerSettled.value.rows.map((r) => ({
      이름: r.PPSR_NM ?? r.HG_NM ?? "",
      정당: r.PPSR_POLY_NM ?? r.POLY_NM ?? "",
      대표구분: r.REP_DIV ?? "",
    }));
    (detail as Record<string, unknown>)["공동발의자"] = proposers.slice(0, MAX_CO_PROPOSERS);
    (detail as Record<string, unknown>)["공동발의자_총수"] = proposerSettled.value.totalCount;
  }

  if (lifecycleSettled.status === "fulfilled" && lifecycleSettled.value.rows.length > 0) {
    const lc = lifecycleSettled.value.rows[0];
    (detail as Record<string, unknown>)["심사경과"] = {
      소관위원회: lc.JRCMIT_NM ?? null,
      소관위_회부일: lc.JRCMIT_CMMT_DT ?? null,
      소관위_상정일: lc.JRCMIT_PRSNT_DT ?? null,
      소관위_처리일: lc.JRCMIT_PROC_DT ?? null,
      소관위_처리결과: lc.JRCMIT_PROC_RSLT ?? null,
      법사위_회부일: lc.LAW_CMMT_DT ?? null,
      법사위_상정일: lc.LAW_PRSNT_DT ?? null,
      법사위_처리일: lc.LAW_PROC_DT ?? null,
      법사위_처리결과: lc.LAW_PROC_RSLT ?? null,
      본회의_상정일: lc.RGS_PRSNT_DT ?? null,
      본회의_의결일: lc.RGS_RSLN_DT ?? null,
      본회의_결과: lc.RGS_CONF_RSLT ?? null,
      정부이송일: lc.GVRN_TRSF_DT ?? null,
      공포일: lc.PROM_DT ?? null,
      공포번호: lc.PROM_NO ?? null,
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({ total: 1, items: [detail] }),
    }],
  };
}

async function handleSearch(
  api: ReturnType<typeof createApiClient>,
  params: {
    readonly bill_name?: string;
    readonly proposer?: string;
    readonly committee?: string;
    readonly status?: BillStatus;
    readonly age?: number;
    readonly page?: number;
    readonly page_size?: number;
    readonly bill_type?: string;
    readonly lang?: string;
  },
  maxPageSize: number,
): Promise<{ content: { type: "text"; text: string }[] }> {
  // bill_type="alternative" → 위원회안/대안 API
  if (params.bill_type === "alternative") {
    const altParams: Record<string, string | number> = {
      AGE: params.age ?? CURRENT_AGE,
    };
    if (params.page) altParams.pIndex = params.page;
    if (params.page_size) altParams.pSize = Math.min(params.page_size, maxPageSize);
    const result = await api.fetchOpenAssembly("nxtkyptyaolzcbfwl", altParams);
    const formatted = result.rows.map(formatSearchRow);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ total: result.totalCount, items: formatted }),
      }],
    };
  }

  // committee + status="pending" → 위원회 계류법률안 API
  if (params.committee && params.status === "pending") {
    const pendingParams: Record<string, string | number> = {};
    if (params.page) pendingParams.pIndex = params.page;
    if (params.page_size) pendingParams.pSize = Math.min(params.page_size, maxPageSize);
    else pendingParams.pSize = 100;
    const result = await api.fetchOpenAssembly("ndiwuqmpambgvnfsj", pendingParams);
    const cmtKw = params.committee.toLowerCase();
    const filteredRows = result.rows.filter((r) => {
      const cmit = String(r.COMMITTEE ?? r.COMMITTEE_NM ?? "").toLowerCase();
      return cmit.includes(cmtKw);
    });
    const formatted = filteredRows.map(formatSearchRow);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ total: formatted.length, items: formatted }),
      }],
    };
  }

  const { apiCode: baseApiCode, queryParams } = buildSearchQuery(params, maxPageSize);
  // lang="en" + status="recent" → 영문 최신 처리 의안 API
  const apiCode = (params.lang === "en" && (params.status ?? "all") === "recent")
    ? "ENBCONFBILL"
    : baseApiCode;
  const result = await api.fetchOpenAssembly(apiCode, queryParams);
  const formatted = result.rows.map(formatSearchRow);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({ total: result.totalCount, items: formatted }),
    }],
  };
}

async function handleTrack(
  api: ReturnType<typeof createApiClient>,
  params: {
    readonly keywords: string;
    readonly age?: number;
    readonly include_history?: boolean;
    readonly page_size?: number;
  },
  extra: ProgressSender,
): Promise<{ content: { type: "text"; text: string }[]; isError?: true }> {
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

  if (keywordList.length > MAX_KEYWORDS) {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: `키워드는 최대 ${MAX_KEYWORDS}개까지 입력 가능합니다. (입력: ${keywordList.length}개)`,
          code: "INVALID_INPUT",
        }),
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
  const allBills = searchResults.flatMap((r) => r.rows.map(extractBillSummary));
  const uniqueBills = deduplicateBills(allBills);

  await sendProgress(extra, 2, totalSteps, `법안 ${uniqueBills.length}건 발견, 정리 중...`);

  // Step 3: 심사 이력 + 위원회심사 회의 조회 (상위 5건, 옵션)
  const histories = new Map<string, readonly Record<string, unknown>[]>();
  const committeeConfs = new Map<string, readonly Record<string, unknown>[]>();
  const billMeetingsMap = new Map<string, readonly Record<string, unknown>[]>();

  if (includeHistory && uniqueBills.length > 0) {
    await sendProgress(extra, 3, totalSteps, "심사 이력 조회 중...");
    const top5 = uniqueBills.slice(0, TRACK_TOP_N);

    const historyResults = await Promise.all(
      top5.map((bill) =>
        api
          .fetchOpenAssembly(API_CODES.BILL_REVIEW, { BILL_NM: bill.billName })
          .then((result) => ({ billNo: bill.billNo, rows: result.rows }))
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            mcpLogger.log(
              "warning",
              "assembly-bill-track",
              `심사이력 조회 실패 [${bill.billNo}]: ${msg}`,
            );
            return { billNo: bill.billNo, rows: [] as readonly Record<string, unknown>[] };
          }),
      ),
    );

    for (const { billNo, rows } of historyResults) {
      histories.set(billNo, rows);
    }

    // 위원회심사 회의정보
    const confResults = await Promise.all(
      top5.map((bill) =>
        api
          .fetchOpenAssembly(API_CODES.BILL_COMMITTEE_CONF, { BILL_ID: bill.billNo })
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

    // 의안별 회의록 목록 조회 (상위 5건)
    const billMeetingResults = await Promise.all(
      top5.map((bill) =>
        api
          .fetchOpenAssembly("VCONFBILLCONFLIST", { BILL_ID: bill.billNo })
          .then((result) => ({
            billNo: bill.billNo,
            records: result.rows,
          }))
          .catch(() => ({
            billNo: bill.billNo,
            records: [] as readonly Record<string, unknown>[],
          })),
      ),
    );

    for (const { billNo, records } of billMeetingResults) {
      if (records.length > 0) {
        billMeetingsMap.set(billNo, records);
      }
    }
  }

  await sendProgress(extra, totalSteps, totalSteps, "법안 추적 완료");

  // Step 4: 결과 포맷팅
  const historiesObj: Record<string, readonly Record<string, unknown>[]> = {};
  for (const [billNo, rows] of histories) {
    historiesObj[billNo] = rows;
  }
  const committeeConfsObj: Record<string, readonly Record<string, unknown>[]> = {};
  for (const [billNo, meetings] of committeeConfs) {
    committeeConfsObj[billNo] = meetings;
  }
  const billMeetingsObj: Record<string, readonly Record<string, unknown>[]> = {};
  for (const [billNo, records] of billMeetingsMap) {
    billMeetingsObj[billNo] = records;
  }

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        keywords: keywordList,
        age,
        total: uniqueBills.length,
        items: uniqueBills,
        histories: Object.keys(historiesObj).length > 0 ? historiesObj : undefined,
        committee_meetings: Object.keys(committeeConfsObj).length > 0 ? committeeConfsObj : undefined,
        bill_meetings: Object.keys(billMeetingsObj).length > 0 ? billMeetingsObj : undefined,
      }),
    }],
  };
}

async function handleStats(
  api: ReturnType<typeof createApiClient>,
  params: { readonly age?: number },
): Promise<{ content: { type: "text"; text: string }[] }> {
  const age = params.age ?? CURRENT_AGE;

  const results = await Promise.all(
    STATS_API_CODES.map(({ key, code }) =>
      api
        .fetchOpenAssembly(code, { AGE: age })
        .then((result) => ({
          key,
          total: result.totalCount,
          rows: result.rows,
        }))
        .catch(() => ({
          key,
          total: 0,
          rows: [] as readonly Record<string, unknown>[],
        })),
    ),
  );

  // 추가 통계 API: 계류의안 통계 + 역대 의안 통계
  const [pendingStatsResult, historicalStatsResult] = await Promise.allSettled([
    api.fetchOpenAssembly("BILLCNTRSVT", { AGE: age }),
    api.fetchOpenAssembly("nzivskufaliivfhpb", { AGE: age }),
  ]);

  const stats: Record<string, unknown> = { age };
  for (const { key, total, rows } of results) {
    stats[key] = { total, items: rows };
  }

  if (pendingStatsResult.status === "fulfilled" && pendingStatsResult.value.rows.length > 0) {
    stats.pending_stats = {
      total: pendingStatsResult.value.totalCount,
      items: pendingStatsResult.value.rows,
    };
  }
  if (historicalStatsResult.status === "fulfilled" && historicalStatsResult.value.rows.length > 0) {
    stats.historical_stats = {
      total: historicalStatsResult.value.totalCount,
      items: historicalStatsResult.value.rows,
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(stats),
    }],
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerAssemblyBillTool(
  server: McpServer,
  config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "assembly_bill",
    "국회 의안을 검색·추적·분석합니다. 의안명/제안자로 검색, bill_id로 상세, keywords로 주제 추적, mode=stats로 통계 조회.",
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
      bill_type: z
        .enum(["alternative"])
        .optional()
        .describe("의안 유형: alternative(위원회안/대안)"),
      keywords: z
        .string()
        .optional()
        .describe('검색 키워드 (쉼표로 구분, 예: "AI,인공지능") — 지정 시 track 모드'),
      mode: z
        .enum(["search", "track", "stats"])
        .optional()
        .describe("모드: search(검색), track(추적), stats(통계). 기본: 파라미터로 자동 감지"),
      include_history: z
        .boolean()
        .optional()
        .describe("심사 이력 포함 여부 (track 모드, 기본: false)"),
      lang: z
        .enum(["en"])
        .optional()
        .describe("언어: en이면 영문 API 사용 (status=recent 검색 모드만 지원)"),
      age: z
        .number()
        .optional()
        .describe(`대수 (예: 22 = 제22대 국회, 기본: ${CURRENT_AGE})`),
      page: z
        .number()
        .optional()
        .describe("페이지 번호 (기본: 1, search 모드)"),
      page_size: z
        .number()
        .optional()
        .describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params, extra) => {
      try {
        const resolvedMode = detectMode({
          bill_id: params.bill_id,
          keywords: params.keywords,
          mode: params.mode,
          bill_type: params.bill_type,
        });

        switch (resolvedMode) {
          case "detail":
            return handleDetail(api, {
              bill_id: params.bill_id!,
              age: params.age,
            });

          case "track":
            return handleTrack(
              api,
              {
                keywords: params.keywords!,
                age: params.age,
                include_history: params.include_history,
                page_size: params.page_size,
              },
              extra as ProgressSender,
            );

          case "stats":
            return handleStats(api, { age: params.age });

          case "search":
            return handleSearch(
              api,
              {
                bill_name: params.bill_name,
                proposer: params.proposer,
                committee: params.committee,
                status: params.status as BillStatus | undefined,
                age: params.age,
                page: params.page,
                page_size: params.page_size,
                bill_type: params.bill_type,
                lang: params.lang,
              },
              config.apiResponse.maxPageSize,
            );
        }
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
