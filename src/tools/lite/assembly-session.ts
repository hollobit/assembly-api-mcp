/**
 * 국회 일정/회의록/표결 통합 도구
 *
 * get_schedule, search_meetings, get_votes를 하나의 assembly_session 도구로 통합합니다.
 * type 파라미터로 모드를 선택하거나, 파라미터 조합으로 자동 감지합니다.
 */
import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { createApiClient } from "../../api/client.js";
import { API_CODES, CURRENT_AGE } from "../../api/codes.js";
import { formatToolError } from "../helpers.js";

type SessionType = "schedule" | "meeting" | "vote";
type Row = Readonly<Record<string, unknown>>;

interface ApiClient {
  fetchOpenAssembly: (
    code: string,
    params: Record<string, string | number>,
  ) => Promise<{ rows: readonly Row[] }>;
}

// -- Formatters ---------------------------------------------------------------

function formatScheduleRow(row: Row): Record<string, unknown> {
  return {
    일정종류: row.SCH_KIND, 일자: row.SCH_DT, 시간: row.SCH_TM,
    위원회: row.CMIT_NM, 내용: row.SCH_CN, 장소: row.EV_PLC,
  };
}

function formatMeetingRow(row: Row): Record<string, unknown> {
  return {
    회의명: row.TITLE ?? row.COMM_NAME ?? row.CLASS_NAME,
    회의일: row.CONF_DATE, 대수: row.DAE_NUM ?? row.ERACO,
    안건: row.SUB_NAME,
    회의록URL: row.PDF_LINK_URL ?? row.CONF_LINK_URL ?? row.LINK_URL,
    영상URL: row.VOD_LINK_URL,
  };
}

function formatVoteByBillRow(row: Row): Record<string, unknown> {
  return { 의안ID: row.BILL_ID, 의안명: row.BILL_NAME, 의원명: row.HG_NM, 표결결과: row.VOTE_RESULT };
}

function formatVotePlenaryRow(row: Row): Record<string, unknown> {
  return {
    의안ID: row.BILL_ID, 의안명: row.BILL_NAME ?? row.BILL_NM,
    표결일: row.VOTE_DATE, 찬성: row.YES_TCNT, 반대: row.NO_TCNT,
    기권: row.BLANK_TCNT, 결과: row.RESULT ?? row.VOTE_RESULT,
  };
}

// -- Auto-detection -----------------------------------------------------------

function detectType(params: {
  type?: SessionType; bill_id?: string; vote_type?: string; meeting_type?: string; conf_id?: string;
}): SessionType {
  if (params.type) return params.type;
  if (params.bill_id || params.vote_type) return "vote";
  if (params.meeting_type || params.conf_id) return "meeting";
  return "schedule";
}

// -- Schedule handler ---------------------------------------------------------

async function handleSchedule(
  api: ApiClient,
  params: { date_from?: string; date_to?: string; keyword?: string; committee?: string; lang?: string; page?: number; page_size?: number },
  config: AppConfig,
): Promise<Record<string, unknown>[]> {
  const q: Record<string, string | number> = {};
  const hasRange = params.date_from && params.date_to;
  if (params.date_from && !hasRange) q.SCH_DT = params.date_from;
  if (params.committee) q.CMIT_NM = params.committee;
  if (params.page) q.pIndex = params.page;
  // 클라이언트 필터(committee/keyword) 적용 시 충분한 건수 확보
  const needsClientFilter = !!(params.committee || params.keyword);
  const defaultSize = needsClientFilter ? 100 : (params.page_size ?? config.apiResponse.defaultPageSize);
  q.pSize = hasRange
    ? Math.min(params.page_size ?? 100, config.apiResponse.maxPageSize)
    : Math.min(defaultSize, config.apiResponse.maxPageSize);

  const scheduleApiCode = params.lang === "en" ? "ENSCHEDULENOTICE" : API_CODES.SCHEDULE_ALL;
  const result = await api.fetchOpenAssembly(scheduleApiCode, q);
  let rows = result.rows;
  if (hasRange) {
    rows = rows.filter((r) => {
      const dt = String(r.SCH_DT ?? "");
      return dt >= params.date_from! && dt <= params.date_to!;
    });
  }
  // 위원회 클라이언트 필터 (API가 CMIT_NM 파라미터를 무시하므로)
  if (params.committee) {
    const cmtKw = params.committee.toLowerCase();
    rows = rows.filter((r) => {
      const cmit = String(r.CMIT_NM ?? "").toLowerCase();
      const content = String(r.SCH_CN ?? "").toLowerCase();
      return cmit.includes(cmtKw) || content.includes(cmtKw);
    });
  }
  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    rows = rows.filter((r) => {
      const cn = String(r.SCH_CN ?? "").toLowerCase();
      const kind = String(r.SCH_KIND ?? "").toLowerCase();
      const cmit = String(r.CMIT_NM ?? "").toLowerCase();
      return cn.includes(kw) || kind.includes(kw) || cmit.includes(kw);
    });
  }
  return rows.map(formatScheduleRow);
}

// -- Meeting handler ----------------------------------------------------------

async function handleMeeting(
  api: ApiClient,
  params: { meeting_type?: string; keyword?: string; committee?: string; date_from?: string; age?: number; page?: number; page_size?: number; conf_id?: string; include_explanations?: boolean },
  config: AppConfig,
): Promise<Record<string, unknown>[] | Record<string, unknown>> {
  const age = params.age ?? CURRENT_AGE;

  // 회의록 상세 조회 (conf_id 제공 시)
  if (params.conf_id) {
    const [detailSettled, billListSettled, agendaListSettled, appendixSettled, writtenQaSettled, videoSettled] =
      await Promise.allSettled([
        api.fetchOpenAssembly("VCONFDETAIL", { CONF_ID: params.conf_id }),
        api.fetchOpenAssembly("VCONFBILLLIST", { CONF_ID: params.conf_id }),
        api.fetchOpenAssembly("VCONFBLLLIST", { CONF_ID: params.conf_id }),
        api.fetchOpenAssembly("VCONFATTAPPENDIXLIST", { CONF_ID: params.conf_id }),
        api.fetchOpenAssembly("VCONFATTQNALIST", { CONF_ID: params.conf_id }),
        api.fetchOpenAssembly("WEBCASTVCONF", { CONF_ID: params.conf_id }),
      ]);

    const detailRows = detailSettled.status === "fulfilled" ? detailSettled.value.rows : [];
    const response: Record<string, unknown> = {
      detail: detailRows.length > 0 ? detailRows[0] : null,
      total: detailRows.length,
    };

    if (billListSettled.status === "fulfilled" && billListSettled.value.rows.length > 0) {
      response.bill_list = billListSettled.value.rows;
    }
    if (agendaListSettled.status === "fulfilled" && agendaListSettled.value.rows.length > 0) {
      response.agenda_list = agendaListSettled.value.rows;
    }
    if (appendixSettled.status === "fulfilled" && appendixSettled.value.rows.length > 0) {
      response.appendix = appendixSettled.value.rows;
    }
    if (writtenQaSettled.status === "fulfilled" && writtenQaSettled.value.rows.length > 0) {
      response.written_qa = writtenQaSettled.value.rows;
    }
    if (videoSettled.status === "fulfilled" && videoSettled.value.rows.length > 0) {
      response.video = videoSettled.value.rows;
    }

    return response;
  }

  const confDateYear = params.date_from?.slice(0, 4);
  const currentYear = String(new Date().getFullYear());
  const usesConfDate = !["국정감사", "인사청문회", "공청회", "소위원회", "예결위", "특별위", "국정조사", "시정연설", "인사청문", "토론회"].includes(params.meeting_type ?? "");
  const q: Record<string, string | number> = {};
  if (params.page) q.pIndex = params.page;
  q.pSize = Math.min(params.page_size ?? config.apiResponse.defaultPageSize, config.apiResponse.maxPageSize);
  // 키워드 → API SUB_NAME 파라미터로 서버 측 검색
  if (params.keyword) q.SUB_NAME = params.keyword;

  let apiCode: string;
  switch (params.meeting_type) {
    case "본회의":
      apiCode = API_CODES.MEETING_PLENARY;
      q.DAE_NUM = age;
      q.CONF_DATE = confDateYear ?? currentYear;
      break;
    case "국정감사":
      apiCode = API_CODES.MEETING_AUDIT;
      q.ERACO = `제${age}대`;
      break;
    case "인사청문회":
      apiCode = API_CODES.MEETING_CONFIRMATION;
      q.ERACO = `제${age}대`;
      break;
    case "공청회":
      apiCode = API_CODES.MEETING_PUBLIC_HEARING;
      q.ERACO = `제${age}대`;
      break;
    case "소위원회":
      apiCode = "VCONFSUBCCONFLIST";
      q.ERACO = `제${age}대`;
      break;
    case "예결위":
      apiCode = "VCONFBUDGETCONFLIST";
      q.ERACO = `제${age}대`;
      break;
    case "특별위":
      apiCode = "VCONFSPCCONFLIST";
      q.ERACO = `제${age}대`;
      break;
    case "국정조사":
      apiCode = "VCONFPIPCONFLIST";
      q.ERACO = `제${age}대`;
      break;
    case "시정연설":
      apiCode = "VCONFSNACONFLIST";
      q.ERACO = `제${age}대`;
      break;
    case "인사청문":
      apiCode = "nrvsawtaauyihadij";
      q.pSize = Math.min(params.page_size ?? config.apiResponse.defaultPageSize, config.apiResponse.maxPageSize);
      break;
    case "토론회":
      apiCode = "nyioaasianxlkcqxs";
      q.pSize = Math.min(params.page_size ?? config.apiResponse.defaultPageSize, config.apiResponse.maxPageSize);
      break;
    default: // 위원회
      apiCode = API_CODES.MEETING_COMMITTEE;
      q.DAE_NUM = age;
      q.CONF_DATE = confDateYear ?? currentYear;
      if (params.committee) q.COMM_NAME = params.committee;
      break;
  }

  let result = await api.fetchOpenAssembly(apiCode, q);
  // 연도 폴백: 현재 연도 결과 부족 시 이전 연도 병합
  if (usesConfDate && !confDateYear && q.CONF_DATE) {
    const prevYear = String(Number(q.CONF_DATE) - 1);
    if (result.rows.length === 0) {
      result = await api.fetchOpenAssembly(apiCode, { ...q, CONF_DATE: prevYear });
    } else if (result.rows.length < 20) {
      const prev = await api.fetchOpenAssembly(apiCode, { ...q, CONF_DATE: prevYear });
      result = { rows: [...result.rows, ...prev.rows] };
    }
  }

  let rows = result.rows;
  // SUB_NAME이 지원되지 않는 API의 경우 클라이언트 측 폴백 필터링
  if (params.keyword && !q.SUB_NAME) {
    const kw = params.keyword.toLowerCase();
    rows = rows.filter((r) => {
      const fields = [r.SUB_NAME, r.TITLE, r.COMM_NAME].map((v) => String(v ?? "").toLowerCase());
      return fields.some((f) => f.includes(kw));
    });
  }

  const meetingItems = rows.map(formatMeetingRow);

  // 부가 데이터: 제안설명서 목록, 국감 결과보고서
  const extras: Record<string, unknown> = {};

  const extraFetches: Promise<void>[] = [];

  if (params.include_explanations) {
    extraFetches.push(
      api.fetchOpenAssembly("VCONFATTEXPLANLIST", q)
        .then((r) => { if (r.rows.length > 0) extras.explanations = r.rows; })
        .catch(() => { /* 제안설명서 조회 실패 무시 */ }),
    );
  }

  if (params.meeting_type === "국정감사") {
    extraFetches.push(
      api.fetchOpenAssembly("AUDITREPORTRESULT", { ERACO: `제${age}대` })
        .then((r) => { if (r.rows.length > 0) extras.audit_reports = r.rows; })
        .catch(() => { /* 국감 결과보고서 조회 실패 무시 */ }),
    );
    extraFetches.push(
      api.fetchOpenAssembly("VCONFATTATBLIST", { ERACO: `제${age}대` })
        .then((r) => { if (r.rows.length > 0) extras.correction_reports = r.rows; })
        .catch(() => { /* 시정조치 결과보고서 조회 실패 무시 */ }),
    );
    extraFetches.push(
      api.fetchOpenAssembly("AUDITREPORTVISIBILIT", { ERACO: `제${age}대` })
        .then((r) => { if (r.rows.length > 0) extras.requirement_reports = r.rows; })
        .catch(() => { /* 시정/처리 요구 결과보고서 조회 실패 무시 */ }),
    );
  }

  if (params.meeting_type === "국정조사") {
    extraFetches.push(
      api.fetchOpenAssembly("INVESTREPORTRESULT", { ERACO: `제${age}대` })
        .then((r) => { if (r.rows.length > 0) extras.investigation_reports = r.rows; })
        .catch(() => { /* 국정조사 결과보고서 조회 실패 무시 */ }),
    );
  }

  if (params.meeting_type === "토론회") {
    extraFetches.push(
      api.fetchOpenAssembly("NABOPBLMDCSNREPORT", { pSize: q.pSize })
        .then((r) => { if (r.rows.length > 0) extras.discussion_reports = r.rows; })
        .catch(() => { /* 토론회 결과보고서 조회 실패 무시 */ }),
    );
  }

  if (extraFetches.length > 0) {
    await Promise.allSettled(extraFetches);
  }

  if (Object.keys(extras).length > 0) {
    return { items: meetingItems, ...extras } as unknown as Record<string, unknown>[];
  }

  return meetingItems;
}

// -- Vote handler -------------------------------------------------------------

const VOTE_TYPE_MAP: Record<string, string> = {
  "법률안": API_CODES.PLENARY_LAW,
  "예산안": API_CODES.PLENARY_BUDGET,
  "결산": API_CODES.PLENARY_BUDGET,
  "기타": API_CODES.PLENARY_ETC,
};

async function handleVote(
  api: ApiClient,
  params: { bill_id?: string; vote_type?: string; age?: number; page?: number; page_size?: number },
  config: AppConfig,
): Promise<Record<string, unknown>[]> {
  const q: Record<string, string | number> = { AGE: params.age ?? CURRENT_AGE };
  if (params.page) q.pIndex = params.page;
  if (params.page_size) q.pSize = Math.min(params.page_size, config.apiResponse.maxPageSize);

  let apiCode: string;
  let formatRow: (row: Row) => Record<string, unknown>;
  if (params.bill_id) {
    apiCode = API_CODES.VOTE_BY_BILL;
    q.BILL_ID = params.bill_id;
    formatRow = formatVoteByBillRow;
  } else {
    apiCode = (params.vote_type && VOTE_TYPE_MAP[params.vote_type]) ?? API_CODES.VOTE_PLENARY;
    formatRow = formatVotePlenaryRow;
  }

  const result = await api.fetchOpenAssembly(apiCode, q);
  return result.rows.map(formatRow);
}

// -- Registration -------------------------------------------------------------

export function registerAssemblySessionTool(server: McpServer, config: AppConfig): void {
  const api = createApiClient(config);

  server.tool(
    "assembly_session",
    "국회 일정·회의록·표결을 조회합니다. type=schedule로 일정, meeting으로 회의록, vote로 표결. 자동 감지 가능.",
    {
      type: z.enum(["schedule", "meeting", "vote"]).optional()
        .describe("조회 유형. 생략 시 파라미터로 자동 감지"),
      date_from: z.string().optional()
        .describe("시작 날짜 (YYYY-MM-DD) 또는 연도 (YYYY). schedule: 날짜 필터, meeting: 연도 필터"),
      date_to: z.string().optional()
        .describe("종료 날짜 (YYYY-MM-DD). schedule 모드에서 범위 검색 시 사용"),
      meeting_type: z.enum(["본회의", "위원회", "소위원회", "국정감사", "인사청문회", "공청회", "예결위", "특별위", "국정조사", "시정연설", "인사청문", "토론회"]).optional()
        .describe("회의 종류 (meeting 모드)"),
      conf_id: z.string().optional().describe("회의록 ID (meeting 모드: 상세 조회)"),
      include_explanations: z.boolean().optional().describe("제안설명서 목록 포함 여부 (meeting 모드, 기본: false)"),
      keyword: z.string().optional()
        .describe("검색 키워드. schedule: 일정 내용, meeting: 안건명/회의명"),
      committee: z.string().optional().describe("위원회명 (schedule/meeting 모드)"),
      bill_id: z.string().optional().describe("의안 ID (vote 모드: 의원별 표결 상세)"),
      vote_type: z.enum(["법률안", "예산안", "결산", "기타"]).optional()
        .describe("본회의 처리안건 유형 (vote 모드)"),
      lang: z.enum(["en"]).optional().describe("언어: en이면 영문 API 사용 (schedule 모드만 지원)"),
      age: z.number().optional().describe(`대수 (기본: ${CURRENT_AGE} = 제${CURRENT_AGE}대 국회)`),
      page: z.number().optional().describe("페이지 번호 (기본: 1)"),
      page_size: z.number().optional().describe("페이지 크기 (기본: 20, 최대: 100)"),
    },
    async (params) => {
      try {
        const mode = detectType(params);
        switch (mode) {
          case "schedule": {
            const items = await handleSchedule(api, params, config);
            return { content: [{ type: "text" as const, text: JSON.stringify({ mode, total: items.length, items }) }] };
          }
          case "meeting": {
            const meetingResult = await handleMeeting(api, params, config);
            // conf_id 상세 조회 또는 extras가 포함된 객체 형태
            if (!Array.isArray(meetingResult)) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ mode, ...meetingResult }) }] };
            }
            return { content: [{ type: "text" as const, text: JSON.stringify({ mode, total: meetingResult.length, items: meetingResult }) }] };
          }
          case "vote": {
            const items = await handleVote(api, params, config);
            return { content: [{ type: "text" as const, text: JSON.stringify({ mode, total: items.length, items }) }] };
          }
        }
      } catch (err: unknown) {
        return formatToolError(err);
      }
    },
  );
}
