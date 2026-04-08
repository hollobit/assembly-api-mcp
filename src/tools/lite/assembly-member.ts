/**
 * 국회의원 통합 검색 + 의정활동 분석 도구
 *
 * search_members + analyze_legislator를 하나의 assembly_member로 통합.
 * 검색 결과가 1건이면 자동으로 상세 + 발의법안 + 표결을 반환합니다.
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

// ---------------------------------------------------------------------------
// Progress helper
// ---------------------------------------------------------------------------

interface ProgressSender {
  sendNotification: (notification: ServerNotification) => Promise<void>;
  _meta?: { progressToken?: string | number };
}

async function sendProgress(
  extra: ProgressSender, progress: number, total: number, message: string,
): Promise<void> {
  const token = extra._meta?.progressToken;
  if (token === undefined) return;
  try {
    await extra.sendNotification({
      method: "notifications/progress",
      params: { progressToken: token, progress, total, message },
    });
  } catch { /* progress 알림 실패는 무시 */ }
}

// ---------------------------------------------------------------------------
// Field mappings
// ---------------------------------------------------------------------------

type FieldMap = ReadonlyArray<readonly [string, string]>;

const SUMMARY_FIELDS: FieldMap = [
  ["HG_NM", "이름"], ["POLY_NM", "정당"], ["ORIG_NM", "선거구"],
  ["REELE_GBN_NM", "당선횟수"], ["ELECT_GBN_NM", "당선방법"], ["CMITS", "소속위원회"],
] as const;

const DETAIL_FIELDS: FieldMap = [
  ["HG_NM", "이름"], ["HJ_NM", "한자"], ["ENG_NM", "영문"],
  ["POLY_NM", "정당"], ["ORIG_NM", "선거구"],
  ["REELE_GBN_NM", "당선횟수"], ["ELECT_GBN_NM", "당선방법"], ["CMITS", "소속위원회"],
  ["TEL_NO", "연락처"], ["E_MAIL", "이메일"], ["HOMEPAGE", "홈페이지"],
  ["STAFF", "사무실"], ["SECRETARY", "보좌관"], ["SECRETARY2", "비서관"],
  ["MEM_TITLE", "약력"], ["ASSEM_ADDR", "사무실주소"],
  ["BTH_DATE", "생년월일"], ["BTH_GBN_NM", "음양력"],
  ["JOB_RES_NM", "직책"], ["UNITS", "대수"],
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Row = Readonly<Record<string, unknown>>;

function formatRow(row: Row, fields: FieldMap): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, label] of fields) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== "") result[label] = v;
  }
  return result;
}

function photoUrl(row: Row): string {
  const code = String(row.MONA_CD ?? "");
  return code ? `https://www.assembly.go.kr/photo/${code}.jpg` : "";
}

function extractBill(row: Row) {
  return {
    billNo: String(row.BILL_NO ?? row.BILL_ID ?? ""),
    billName: String(row.BILL_NAME ?? row.BILL_NM ?? ""),
    status: String(row.PROC_RESULT_CD ?? row.PROC_RESULT ?? row.RESULT ?? ""),
    proposer: String(row.PROPOSER ?? row.RST_PROPOSER ?? ""),
    proposeDate: String(row.PROPOSE_DT ?? row.PPSR_DT ?? ""),
  };
}

function extractVote(row: Row) {
  return {
    billNo: String(row.BILL_NO ?? row.BILL_ID ?? ""),
    billName: String(row.BILL_NAME ?? row.BILL_NM ?? ""),
    result: String(row.PROC_RESULT_CD ?? row.RESULT ?? row.PROC_RESULT ?? ""),
    yesCount: row.YES_TCNT ?? null,
    noCount: row.NO_TCNT ?? null,
    abstainCount: row.BLANK_TCNT ?? null,
  };
}

function buildQueryParams(
  params: { readonly name?: string; readonly party?: string; readonly district?: string;
    readonly committee?: string; readonly page?: number; readonly page_size?: number },
  maxPageSize: number,
): Record<string, string | number> {
  const q: Record<string, string | number> = {};
  if (params.name) q.HG_NM = params.name;
  if (params.party) q.POLY_NM = params.party;
  if (params.district) q.ORIG_NM = params.district;
  if (params.page) q.pIndex = params.page;
  if (params.committee) { q.pSize = 300; }
  else if (params.page_size) { q.pSize = Math.min(params.page_size, maxPageSize); }
  return q;
}

// ---------------------------------------------------------------------------
// Historical API codes (역대국회)
// ---------------------------------------------------------------------------

const HISTORY_API_CODES = {
  /** 역대 의원 인적사항 (main search) */
  MEMBER_PROFILE: "npffdutiapkzbfyvr",
  /** 역대 의원 현황 */
  MEMBER_STATUS: "nprlapfmaufmqytet",
  /** 역대 의원 이력 */
  MEMBER_CAREER: "nfzegpkvaclgtscxt",
  /** 역대 위원회 경력 */
  COMMITTEE_CAREER: "nqbeopthavwwfbekw",
  /** 역대 재선 현황 */
  REELECTION_STATUS: "ngdeoqgoablceakpp",
  /** 역대 여성 의원 현황 */
  WOMEN_MEMBERS: "nmkjkjpwaxfhwdnjl",
  /** 역대 선거일/정수/임기 */
  ELECTION_INFO: "nokivirranikoinnk",
  /** 역대 정당별 지역분포 */
  PARTY_REGION: "nvarpwrqaklzxcmmp",
  /** 역대 정당별 선거결과 */
  PARTY_ELECTION_RESULT: "nedjqrnlavrvcycue",
  /** 역대 의장단 정보 */
  SPEAKER_INFO: "nubbgpxmawmzkclkc",
  /** 국회의장 주요일정 */
  SPEAKER_SCHEDULE: "nhedurlwawoquyxwn",
  /** 의장단 주요일정 */
  SPEAKER_GROUP_SCHEDULE: "SPGRPSCHEDULE",
  /** 의장단 보도자료 */
  SPEAKER_GROUP_PRESS: "SPGRPPRESS",
} as const;

/** 정당 및 교섭단체 의석수 현황 */
const PARTY_STATS_API = "nepjpxkkabqiqpbvk";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerAssemblyMemberTool(
  server: McpServer, config: AppConfig,
): void {
  const api = createApiClient(config);

  server.tool(
    "assembly_member",
    "국회의원을 검색하고 의정활동을 분석합니다. 이름·정당·선거구·위원회로 검색, 1명이면 자동 상세 반환. analyze=true면 발의법안+표결 종합분석. scope='history'면 역대국회 데이터 조회. mode='party_stats'면 정당별 의석수 현황.",
    {
      name: z.string().optional().describe("의원 이름 (부분 일치 검색)"),
      party: z.string().optional().describe("정당명"),
      district: z.string().optional().describe("선거구명"),
      committee: z.string().optional().describe("소속위원회명 (부분 일치)"),
      analyze: z.boolean().optional().describe("true면 발의법안+표결 종합분석 포함 (기본: false)"),
      lang: z.enum(["en"]).optional().describe("언어: en이면 영문 API 사용 (검색 모드만 지원)"),
      age: z.number().optional().describe(`대수 (기본: ${CURRENT_AGE} = 제${CURRENT_AGE}대 국회)`),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
      scope: z.enum(["current", "history"]).optional().describe("current=현재 국회(기본), history=역대국회 데이터 조회"),
      mode: z.enum(["party_stats"]).optional().describe("party_stats=정당 및 교섭단체 의석수 현황 조회"),
    },
    async (params, extra) => {
      try {
        // ----- mode: party_stats → 정당별 의석수 현황 조회 후 즉시 반환 -----
        if (params.mode === "party_stats") {
          const partyResult = await api.fetchOpenAssembly(PARTY_STATS_API, {
            ...(params.age ? { AGE: params.age } : {}),
          });
          return { content: [{ type: "text" as const, text: JSON.stringify({
            mode: "party_stats", items: partyResult.rows,
          }) }] };
        }

        const age = params.age ?? CURRENT_AGE;
        const shouldAnalyze = params.analyze ?? false;
        const isHistory = params.scope === "history";
        const queryParams = buildQueryParams(params, config.apiResponse.maxPageSize);

        // scope/lang에 따라 다른 API 사용
        const searchApiCode = params.lang === "en"
          ? "ENNAMEMBER"
          : isHistory
            ? HISTORY_API_CODES.MEMBER_PROFILE
            : API_CODES.MEMBER_INFO;
        const memberResult = await api.fetchOpenAssembly(searchApiCode, queryParams);
        let rows = memberResult.rows;

        // 소속위원회 클라이언트 측 필터링 (API가 서버 측 필터 미지원)
        if (params.committee) {
          const kw = params.committee.toLowerCase();
          rows = rows.filter((r) => String(r.CMITS ?? "").toLowerCase().includes(kw));
        }

        if (rows.length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({
            total: 0, items: [],
            query: { name: params.name, party: params.party, district: params.district, committee: params.committee },
          }) }] };
        }

        // 단일 결과 또는 analyze 모드 → 상세 + 의정활동 분석
        const isSingle = rows.length === 1;
        if (isSingle || shouldAnalyze) {
          const target = rows[0];
          const memberName = String(target.HG_NM ?? "");
          const detail = formatRow(target, DETAIL_FIELDS);
          const photo = photoUrl(target);

          await sendProgress(extra, 1, 3, "의원 인적사항 조회 완료");
          await sendProgress(extra, 2, 3, "발의법안 및 표결 조회 중...");

          const monaCode = String(target.MONA_CD ?? "");

          const [billsResult, votesResult, careerResult, voteDetailResult, committeeActivityResult, committeeCareerResult, reportsResult, snsResult, speechesResult, petitionsResult] = await Promise.allSettled([
            api.fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
              AGE: age, PROPOSER: memberName, pSize: 10,
            }),
            api.fetchOpenAssembly(API_CODES.VOTE_PLENARY, {
              AGE: age, pSize: 10,
            }),
            api.fetchOpenAssembly("nexgtxtmaamffofof", {
              ...(monaCode ? { MONA_CD: monaCode } : { HG_NM: memberName }),
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("nojepdqqaweusdfbi", {
              AGE: age, HG_NM: memberName, pSize: 10,
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("nuvypcdgahexhvrjt", {
              HG_NM: memberName,
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("nyzrglyvagmrypezq", {
              ...(monaCode ? { MONA_CD: monaCode } : { HG_NM: memberName }),
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("nmfcjtvmajsbhhckf", {
              HG_NM: memberName,
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("negnlnyvatsjwocar", {
              HG_NM: memberName,
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("npeslxqbanwkimebr", {
              HG_NM: memberName,
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
            api.fetchOpenAssembly("NAMEMBERLEGIPTT", {
              HG_NM: memberName,
            }).catch(() => ({ rows: [] as readonly Record<string, unknown>[], totalCount: 0 })),
          ]);

          // ----- 역대국회 추가 API 호출 (scope=history) -----
          let historyData: Record<string, readonly Record<string, unknown>[]> | undefined;
          if (isHistory) {
            const hq: Record<string, string | number> = {};
            if (memberName) hq.HG_NM = memberName;
            if (age) hq.AGE = age;

            const emptyResult = { rows: [] as readonly Record<string, unknown>[], totalCount: 0 };
            const [
              hStatusResult, hCareerResult, hCommCareerResult, hReelectionResult,
              hWomenResult, hElectionResult, hPartyRegionResult, hPartyElectionResult,
              hSpeakerResult, hSpeakerScheduleResult, hGroupScheduleResult, hGroupPressResult,
            ] = await Promise.allSettled([
              api.fetchOpenAssembly(HISTORY_API_CODES.MEMBER_STATUS, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.MEMBER_CAREER, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.COMMITTEE_CAREER, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.REELECTION_STATUS, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.WOMEN_MEMBERS, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.ELECTION_INFO, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.PARTY_REGION, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.PARTY_ELECTION_RESULT, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.SPEAKER_INFO, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.SPEAKER_SCHEDULE, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.SPEAKER_GROUP_SCHEDULE, hq).catch(() => emptyResult),
              api.fetchOpenAssembly(HISTORY_API_CODES.SPEAKER_GROUP_PRESS, hq).catch(() => emptyResult),
            ]);

            const extractRows = (r: PromiseSettledResult<{ rows: readonly Record<string, unknown>[] }>) =>
              r.status === "fulfilled" ? r.value.rows : [];

            historyData = {
              member_status: extractRows(hStatusResult),
              member_career: extractRows(hCareerResult),
              committee_career: extractRows(hCommCareerResult),
              reelection_status: extractRows(hReelectionResult),
              women_members: extractRows(hWomenResult),
              election_info: extractRows(hElectionResult),
              party_region: extractRows(hPartyRegionResult),
              party_election_result: extractRows(hPartyElectionResult),
              speaker_info: extractRows(hSpeakerResult),
              speaker_schedule: extractRows(hSpeakerScheduleResult),
              speaker_group_schedule: extractRows(hGroupScheduleResult),
              speaker_group_press: extractRows(hGroupPressResult),
            };
          }

          await sendProgress(extra, 3, 3, "종합 분석 완료");

          const billsData = billsResult.status === "fulfilled" ? billsResult.value : { rows: [], totalCount: 0 };
          const votesData = votesResult.status === "fulfilled" ? votesResult.value : { rows: [], totalCount: 0 };
          const careerData = careerResult.status === "fulfilled" ? careerResult.value : { rows: [] };
          const voteDetailData = voteDetailResult.status === "fulfilled" ? voteDetailResult.value : { rows: [] };
          const committeeActivityData = committeeActivityResult.status === "fulfilled" ? committeeActivityResult.value : { rows: [] };
          const committeeCareerData = committeeCareerResult.status === "fulfilled" ? committeeCareerResult.value : { rows: [] };
          const reportsData = reportsResult.status === "fulfilled" ? reportsResult.value : { rows: [] };
          const snsData = snsResult.status === "fulfilled" ? snsResult.value : { rows: [] };
          const speechesData = speechesResult.status === "fulfilled" ? speechesResult.value : { rows: [] };
          const petitionsData = petitionsResult.status === "fulfilled" ? petitionsResult.value : { rows: [] };

          const response: Record<string, unknown> = {
            total: isSingle ? 1 : rows.length,
            member: { ...detail, photo },
            bills: { total: billsData.totalCount ?? 0, items: (billsData.rows as readonly Row[]).map(extractBill) },
            votes: { total: votesData.totalCount ?? 0, age, items: (votesData.rows as readonly Row[]).map(extractVote) },
          };

          if (careerData.rows.length > 0) {
            response.career = careerData.rows;
          }
          if (voteDetailData.rows.length > 0) {
            response.vote_detail = voteDetailData.rows;
          }
          if (committeeActivityData.rows.length > 0) {
            response.committee_activity = committeeActivityData.rows;
          }
          if (committeeCareerData.rows.length > 0) {
            response.committee_career = committeeCareerData.rows;
          }
          if (reportsData.rows.length > 0) {
            response.reports = reportsData.rows;
          }
          if (snsData.rows.length > 0) {
            response.sns = snsData.rows;
          }
          if (speechesData.rows.length > 0) {
            response.speeches = speechesData.rows;
          }
          if (petitionsData.rows.length > 0) {
            response.petitions = petitionsData.rows;
          }
          if (historyData) {
            response.history = historyData;
          }

          return { content: [{ type: "text" as const, text: JSON.stringify(response) }] };
        }

        // 여러 건이면 요약 목록 반환
        const summaries = rows.map((r) => formatRow(r, SUMMARY_FIELDS));
        return { content: [{ type: "text" as const, text: JSON.stringify({
          total: rows.length, returned: rows.length, items: summaries,
        }) }] };
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
