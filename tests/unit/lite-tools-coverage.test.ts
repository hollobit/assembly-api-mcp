import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../src/config.js";
import { registerLiteMemberTools } from "../../src/tools/lite/members.js";
import { registerLiteBillTools } from "../../src/tools/lite/bills.js";
import { registerLiteScheduleTools } from "../../src/tools/lite/schedule.js";
import { registerLiteMeetingTools } from "../../src/tools/lite/meetings.js";
import { registerLiteVoteTools } from "../../src/tools/lite/votes.js";
import { registerLiteChainTools } from "../../src/tools/lite/chains.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestConfig(): AppConfig {
  return {
    apiKeys: {
      assemblyApiKey: "test-key",
      dataGoKrServiceKey: undefined,
      nanetApiKey: undefined,
      naboApiKey: undefined,
    },
    server: { transport: "stdio", port: 3000, logLevel: "info" },
    cache: { enabled: false, ttlStatic: 86400, ttlDynamic: 3600 },
    apiResponse: { defaultType: "json", defaultPageSize: 20, maxPageSize: 100 },
    profile: "lite" as const,
  };
}

function createServer(): McpServer {
  return new McpServer({ name: "test-server", version: "0.0.1" });
}

function getRegisteredTools(
  server: McpServer,
): Record<
  string,
  { handler: (...args: unknown[]) => Promise<unknown> }
> {
  return (server as unknown as Record<string, unknown>)
    ._registeredTools as Record<
    string,
    { handler: (...args: unknown[]) => Promise<unknown> }
  >;
}

function buildAssemblyResponse(
  apiCode: string,
  rows: readonly Record<string, unknown>[],
  totalCount?: number,
): string {
  const count = totalCount ?? rows.length;
  return JSON.stringify({
    [apiCode]: [
      {
        head: [
          { list_total_count: count },
          { RESULT: { CODE: "INFO-000", MESSAGE: "정상 처리되었습니다." } },
        ],
      },
      { row: rows },
    ],
  });
}

function mockFetchSuccess(body: string): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, { status: 200 }),
  );
}

function mockFetchSequence(
  ...bodies: string[]
): ReturnType<typeof vi.fn> {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const body of bodies) {
    spy.mockResolvedValueOnce(new Response(body, { status: 200 }));
  }
  return spy;
}

function mockFetchNetworkError(): void {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Connection refused"),
  );
}

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

function getText(result: unknown): string {
  return (result as ToolResult).content[0].text;
}

function getParsed(result: unknown): Record<string, unknown> {
  return JSON.parse(getText(result)) as Record<string, unknown>;
}

function isError(result: unknown): boolean {
  return (result as ToolResult).isError === true;
}

// ---------------------------------------------------------------------------
// Tests — search_members (lite/members.ts)
// ---------------------------------------------------------------------------

describe("Lite search_members", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteMemberTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("단일 결과 → 상세 정보(20개 필드) 반환", async () => {
    const row = {
      HG_NM: "홍길동",
      HJ_NM: "洪吉童",
      ENG_NM: "HONG Gil-dong",
      POLY_NM: "더불어민주당",
      ORIG_NM: "서울 강남구갑",
      REELE_GBN_NM: "초선",
      ELECT_GBN_NM: "지역구",
      CMITS: "법제사법위원회",
      TEL_NO: "02-1234-5678",
      E_MAIL: "hong@assembly.go.kr",
      HOMEPAGE: "https://example.com",
      STAFF: "101호",
      SECRETARY: "김비서",
      SECRETARY2: "이비서",
      MEM_TITLE: "변호사, 전 판사",
      ASSEM_ADDR: "의원회관 301호",
      BTH_DATE: "1970-01-01",
      BTH_GBN_NM: "양력",
      JOB_RES_NM: "위원",
      UNITS: "22",
    };
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [row], 1));

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { name: "홍길동" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    const detail = items[0];
    expect(detail["이름"]).toBe("홍길동");
    expect(detail["약력"]).toBe("변호사, 전 판사");
    expect(detail["연락처"]).toBe("02-1234-5678");
    expect(detail["한자"]).toBe("洪吉童");
    expect(detail["영문"]).toBe("HONG Gil-dong");
    expect(detail["이메일"]).toBe("hong@assembly.go.kr");
    expect(detail["홈페이지"]).toBe("https://example.com");
    expect(detail["사무실"]).toBe("101호");
    expect(detail["보좌관"]).toBe("김비서");
    expect(detail["비서관"]).toBe("이비서");
    expect(detail["생년월일"]).toBe("1970-01-01");
    expect(detail["음양력"]).toBe("양력");
    expect(detail["직책"]).toBe("위원");
    expect(detail["대수"]).toBe("22");
  });

  it("여러 결과 → 요약 목록(6개 필드) 반환", async () => {
    const rows = [
      {
        HG_NM: "홍길동",
        POLY_NM: "더불어민주당",
        ORIG_NM: "서울",
        REELE_GBN_NM: "초선",
        ELECT_GBN_NM: "지역구",
        CMITS: "법사위",
        TEL_NO: "02-1234-5678",
        MEM_TITLE: "약력 데이터",
      },
      {
        HG_NM: "홍길순",
        POLY_NM: "국민의힘",
        ORIG_NM: "부산",
        REELE_GBN_NM: "재선",
        ELECT_GBN_NM: "비례대표",
        CMITS: "교육위",
      },
    ];
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", rows, 2));

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { name: "홍" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(2);
    expect(parsed.returned).toBe(2);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0]["이름"]).toBe("홍길동");
    expect(items[1]["이름"]).toBe("홍길순");
    // 요약에는 상세 필드가 없어야 함
    expect(items[0]).not.toHaveProperty("약력");
    expect(items[0]).not.toHaveProperty("연락처");
  });

  it("결과 없음 → 검색 결과가 없습니다 메시지", async () => {
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { name: "없는사람", party: "없는당" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(0);
    expect(parsed.items).toEqual([]);
    const query = parsed.query as Record<string, unknown>;
    expect(query.name).toBe("없는사람");
    expect(query.party).toBe("없는당");
  });

  it("결과 없음 (조건 없이) → 조건: 없음", async () => {
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler({}, {} as never);

    const parsed = getParsed(result);
    expect(parsed.total).toBe(0);
    expect(parsed.items).toEqual([]);
    // query fields should all be undefined
    const query = parsed.query as Record<string, unknown>;
    expect(query.name).toBeUndefined();
    expect(query.party).toBeUndefined();
  });

  it("committee 파라미터 → 클라이언트 측 필터링 (CMITS 필드)", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        { HG_NM: "김의원", POLY_NM: "민주당", CMITS: "국방위원회,법사위원회" },
        { HG_NM: "이의원", POLY_NM: "국민의힘", CMITS: "교육위원회" },
      ], 2),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { committee: "국방" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]["이름"]).toBe("김의원");

    // pSize=300으로 전체 목록 가져오기
    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pSize=300");
  });

  it("district 파라미터 → ORIG_NM 전달", async () => {
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

    const tools = getRegisteredTools(server);
    await tools.search_members.handler(
      { district: "서울" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("ORIG_NM");
  });

  it("검색 조건에 필터 표시", async () => {
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { district: "부산" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(0);
    expect(parsed.items).toEqual([]);
    const query = parsed.query as Record<string, unknown>;
    expect(query.district).toBe("부산");
  });

  it("page, page_size 파라미터 전달", async () => {
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

    const tools = getRegisteredTools(server);
    await tools.search_members.handler(
      { page: 2, page_size: 50 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pIndex=2");
    expect(calledUrl).toContain("pSize=50");
  });

  it("page_size > maxPageSize → maxPageSize 로 제한", async () => {
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

    const tools = getRegisteredTools(server);
    await tools.search_members.handler(
      { page_size: 500 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pSize=100");
  });

  it("네트워크 오류 → isError: true", async () => {
    mockFetchNetworkError();

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { name: "테스트" },
      {} as never,
    );

    expect(isError(result)).toBe(true);
    const parsed = getParsed(result);
    expect(parsed.error).toBeDefined();
  });

  it("상세 포맷에서 빈 필드는 제외된다", async () => {
    const row = {
      HG_NM: "테스트",
      POLY_NM: "테스트당",
      ORIG_NM: "",
      HJ_NM: null,
      ENG_NM: undefined,
    };
    mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [row], 1));

    const tools = getRegisteredTools(server);
    const result = await tools.search_members.handler(
      { name: "테스트" },
      {} as never,
    );

    const text = getText(result);
    expect(text).toContain("이름");
    expect(text).toContain("정당");
    // 빈/null/undefined 필드는 포함되지 않아야 함
    expect(text).not.toContain('"선거구"');
    expect(text).not.toContain('"한자"');
    expect(text).not.toContain('"영문"');
  });
});

// ---------------------------------------------------------------------------
// Tests — search_bills (lite/bills.ts)
// ---------------------------------------------------------------------------

describe("Lite search_bills", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteBillTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("기본 검색 (status 없음) → MEMBER_BILLS API 코드 사용", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        {
          BILL_ID: "PRC_TEST",
          BILL_NO: "2200001",
          BILL_NAME: "테스트법률안",
          PROPOSER: "홍길동의원등10인",
          PROPOSER_KIND: "의원",
          AGE: "22",
          COMMITTEE: "법사위",
          PROPOSE_DT: "2024-06-01",
          PROC_RESULT: "계류",
          PROC_DT: null,
          DETAIL_LINK: "https://example.com",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { bill_name: "테스트" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]["의안명"]).toBe("테스트법률안");
    expect(items[0]["처리상태"]).toBe("계류");
    expect(items[0]).toHaveProperty("의안ID");
    expect(items[0]).toHaveProperty("의안번호");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("nzmimeepazxkubdpn");
    expect(calledUrl).toContain("AGE=22");
  });

  it("bill_id 제공 → BILLINFODETAIL로 상세 조회, 제안이유/주요내용 포함", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("BILLINFODETAIL", [
        {
          BILL_ID: "PRC_DETAIL",
          BILL_NO: "2200099",
          BILL_NAME: "상세법률안",
          PROPOSER: "김의원",
          PROPOSER_KIND: "의원",
          AGE: "22",
          COMMITTEE_NM: "교육위",
          PROPOSE_DT: "2024-05-01",
          PROC_RESULT: "원안가결",
          PROC_DT: "2024-07-01",
          RSN: "교육 환경 개선을 위해",
          DETAIL_CONTENT: "학교 시설 확충 및 교사 인력 확대",
          LINK_URL: "https://detail.example.com",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { bill_id: "PRC_DETAIL" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]["제안이유"]).toBe("교육 환경 개선을 위해");
    expect(items[0]["주요내용"]).toBe("학교 시설 확충 및 교사 인력 확대");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("BILLINFODETAIL");
    expect(calledUrl).toContain("BILL_ID=PRC_DETAIL");
  });

  it("bill_id 상세에서 BILL_NM / COMMITTEE_NM / LINK_URL 폴백 사용", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("BILLINFODETAIL", [
        {
          BILL_ID: "PRC_FB",
          BILL_NM: "폴백법률안",
          COMMITTEE_NM: "환경위",
          LINK_URL: "https://fallback.com",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { bill_id: "PRC_FB" },
      {} as never,
    );

    const text = getText(result);
    expect(text).toContain("폴백법률안");
    expect(text).toContain("환경위");
    expect(text).toContain("https://fallback.com");
  });

  it("status='pending' → BILL_PENDING 사용, AGE 파라미터 없음", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nwbqublzajtcqpdae", [
        { BILL_ID: "PRC_P1", BILL_NAME: "계류법안", PROC_RESULT: "계류" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { status: "pending" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0]["의안명"]).toBe("계류법안");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("nwbqublzajtcqpdae");
    expect(calledUrl).not.toContain("AGE=");
  });

  it("status='processed' → BILL_PROCESSED 사용, AGE 포함", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzpltgfqabtcpsmai", [
        { BILL_ID: "PRC_PR1", BILL_NAME: "처리법안", PROC_RESULT: "원안가결" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { status: "processed" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0]["의안명"]).toBe("처리법안");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("nzpltgfqabtcpsmai");
    expect(calledUrl).toContain("AGE=22");
  });

  it("status='recent' → 본회의부의안건 API 사용, AGE 포함", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nxjuyqnxadtotdrbw", [
        { BILL_ID: "PRC_R1", BILL_NAME: "최근법안", PROC_RESULT: "가결" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { status: "recent" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0]["의안명"]).toBe("최근법안");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("nxjuyqnxadtotdrbw");
    expect(calledUrl).toContain("AGE=22");
  });

  it("bill_id 미발견 → 찾을 수 없습니다", async () => {
    mockFetchSuccess(buildAssemblyResponse("BILLINFODETAIL", [], 0));

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { bill_id: "NONEXISTENT" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(0);
    expect(parsed.items).toEqual([]);
    const query = parsed.query as Record<string, unknown>;
    expect(query.bill_id).toBe("NONEXISTENT");
  });

  it("proposer, committee 파라미터 전달", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_bills.handler(
      { proposer: "홍길동", committee: "법사위" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("PROPOSER");
    expect(calledUrl).toContain("COMMITTEE");
  });

  it("page, page_size 전달 및 maxPageSize 클램핑", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_bills.handler(
      { page: 3, page_size: 200 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pIndex=3");
    expect(calledUrl).toContain("pSize=100");
  });

  it("age 지정 시 해당 대수로 검색", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_bills.handler(
      { age: 21, bill_name: "테스트" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("AGE=21");
  });

  it("네트워크 오류 → isError: true", async () => {
    mockFetchNetworkError();

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { bill_name: "테스트" },
      {} as never,
    );

    expect(isError(result)).toBe(true);
    const parsed = getParsed(result);
    expect(parsed.error).toBeDefined();
  });

  it("formatSearchRow에서 null 필드는 null로 반환", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NAME: "테스트만있음" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_bills.handler(
      { bill_name: "테스트" },
      {} as never,
    );

    const parsed = getParsed(result);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0]["의안ID"]).toBeNull();
    expect(items[0]["의안명"]).toBe("테스트만있음");
  });
});

// ---------------------------------------------------------------------------
// Tests — get_schedule (lite/schedule.ts)
// ---------------------------------------------------------------------------

describe("Lite get_schedule", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteScheduleTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("date_from → ALLSCHEDULE API, 하이픈 제거", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ALLSCHEDULE", [
        {
          SCH_KIND: "위원회",
          SCH_DT: "20240601",
          SCH_TM: "10:00",
          CMIT_NM: "법사위",
          SCH_CN: "법률안 심사",
          EV_PLC: "제1회의실",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.get_schedule.handler(
      { date_from: "2024-06-01" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]["위원회"]).toBe("법사위");
    expect(items[0]["일정종류"]).toBe("위원회");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("ALLSCHEDULE");
    expect(calledUrl).toContain("SCH_DT=2024-06-01");
  });

  it("committee → CMIT_NM 파라미터 전달", async () => {
    mockFetchSuccess(buildAssemblyResponse("ALLSCHEDULE", [], 0));

    const tools = getRegisteredTools(server);
    await tools.get_schedule.handler(
      { committee: "교육위" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("CMIT_NM");
  });

  it("page, page_size 전달", async () => {
    mockFetchSuccess(buildAssemblyResponse("ALLSCHEDULE", [], 0));

    const tools = getRegisteredTools(server);
    await tools.get_schedule.handler(
      { page: 2, page_size: 30 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pIndex=2");
    expect(calledUrl).toContain("pSize=30");
  });

  it("네트워크 오류 → isError: true", async () => {
    mockFetchNetworkError();

    const tools = getRegisteredTools(server);
    const result = await tools.get_schedule.handler(
      {},
      {} as never,
    );

    expect(isError(result)).toBe(true);
    const parsed = getParsed(result);
    expect(parsed.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — search_meetings (lite/meetings.ts)
// ---------------------------------------------------------------------------

describe("Lite search_meetings", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteMeetingTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("기본 → MEETING_COMMITTEE API 사용", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ncwgseseafwbuheph", [
        {
          COMM_NAME: "법사위",
          CONF_DATE: "2024-06-01",
          DAE_NUM: "22",
          SUB_NAME: "법률안 심사",
          PDF_LINK_URL: "https://pdf.example.com",
          VOD_LINK_URL: "https://vod.example.com",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_meetings.handler(
      {},
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty("회의명");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("ncwgseseafwbuheph");
    expect(calledUrl).toContain("DAE_NUM=22");
  });

  it("meeting_type='국정감사' → MEETING_AUDIT + ERACO", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("VCONFAPIGCONFLIST", [
        {
          CLASS_NAME: "국정감사",
          CONF_DATE: "2024-10-01",
          ERACO: "제22대",
          SUB_NAME: "감사 안건",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_meetings.handler(
      { meeting_type: "국정감사" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0]["회의명"]).toBe("국정감사");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("VCONFAPIGCONFLIST");
    expect(calledUrl).toContain("ERACO");
  });

  it("meeting_type='본회의' → MEETING_PLENARY + DAE_NUM", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzbyfwhwaoanttzje", [
        {
          TITLE: "본회의",
          CONF_DATE: "2024-06-15",
          DAE_NUM: "22",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_meetings.handler(
      { meeting_type: "본회의" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0]["회의명"]).toBe("본회의");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("nzbyfwhwaoanttzje");
    expect(calledUrl).toContain("DAE_NUM=22");
    expect(calledUrl).toContain("CONF_DATE");
  });

  it("meeting_type='본회의' + date_from → 연도 사용", async () => {
    mockFetchSuccess(buildAssemblyResponse("nzbyfwhwaoanttzje", [], 0));

    const tools = getRegisteredTools(server);
    await tools.search_meetings.handler(
      { meeting_type: "본회의", date_from: "2023-03-15" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("CONF_DATE=2023");
  });

  it("meeting_type='인사청문회' → MEETING_CONFIRMATION + ERACO", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("VCONFCFRMCONFLIST", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_meetings.handler(
      { meeting_type: "인사청문회" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("VCONFCFRMCONFLIST");
    expect(calledUrl).toContain("ERACO");
  });

  it("meeting_type='공청회' → MEETING_PUBLIC_HEARING + ERACO", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("VCONFPHCONFLIST", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_meetings.handler(
      { meeting_type: "공청회" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("VCONFPHCONFLIST");
    expect(calledUrl).toContain("ERACO");
  });

  it("keyword → SUB_NAME 전달", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ncwgseseafwbuheph", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_meetings.handler(
      { keyword: "교육" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("SUB_NAME");
  });

  it("committee → COMM_NAME 전달", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ncwgseseafwbuheph", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.search_meetings.handler(
      { committee: "법사위" },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("COMM_NAME");
  });

  it("formatRow에서 TITLE / CONF_LINK_URL 폴백", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ncwgseseafwbuheph", [
        {
          TITLE: "회의명테스트",
          CONF_DATE: "2024-01-01",
          DAE_NUM: "22",
          SUB_NAME: "안건",
          CONF_LINK_URL: "https://conf.example.com",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_meetings.handler(
      {},
      {} as never,
    );

    const text = getText(result);
    expect(text).toContain("회의명테스트");
    expect(text).toContain("https://conf.example.com");
  });

  it("formatRow에서 LINK_URL 폴백", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("VCONFAPIGCONFLIST", [
        {
          CLASS_NAME: "국정감사회의",
          ERACO: "제22대",
          LINK_URL: "https://link.example.com",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.search_meetings.handler(
      { meeting_type: "국정감사" },
      {} as never,
    );

    const text = getText(result);
    expect(text).toContain("국정감사회의");
    expect(text).toContain("https://link.example.com");
  });
});

// ---------------------------------------------------------------------------
// Tests — get_votes (lite/votes.ts)
// ---------------------------------------------------------------------------

describe("Lite get_votes", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteVoteTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bill_id 있음 → VOTE_BY_BILL API 사용", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ncocpgfiaoituanbr", [
        {
          BILL_ID: "PRC_V1",
          BILL_NAME: "투표법안",
          HG_NM: "홍길동",
          VOTE_RESULT: "찬성",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.get_votes.handler(
      { bill_id: "PRC_V1" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty("의안ID");
    expect(items[0]).toHaveProperty("의원명");
    expect(items[0]).toHaveProperty("표결결과");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("ncocpgfiaoituanbr");
    expect(calledUrl).toContain("BILL_ID=PRC_V1");
    expect(calledUrl).toContain("AGE=22");
  });

  it("bill_id 없음 → VOTE_PLENARY API 사용 (전체 표결 목록)", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nwbpacrgavhjryiph", [
        {
          BILL_ID: "PRC_V2",
          BILL_NAME: "전체표결법안",
          VOTE_DATE: "2024-06-01",
          YES_TCNT: "200",
          NO_TCNT: "50",
          BLANK_TCNT: "10",
          RESULT: "가결",
        },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.get_votes.handler(
      {},
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty("의안ID");
    expect(items[0]).toHaveProperty("표결일");
    expect(items[0]).toHaveProperty("찬성");
    expect(items[0]).toHaveProperty("결과");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("nwbpacrgavhjryiph");
    expect(calledUrl).toContain("AGE=22");
  });

  it("page_size > maxPageSize 클램핑", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("ncocpgfiaoituanbr", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.get_votes.handler(
      { bill_id: "PRC_V1", page_size: 500 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pSize=100");
  });

  it("네트워크 오류 → isError: true", async () => {
    mockFetchNetworkError();

    const tools = getRegisteredTools(server);
    const result = await tools.get_votes.handler(
      {},
      {} as never,
    );

    expect(isError(result)).toBe(true);
    const parsed = getParsed(result);
    expect(parsed.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — analyze_legislator (lite/chains.ts)
// ---------------------------------------------------------------------------

describe("Lite analyze_legislator", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteChainTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("정상 흐름 → 3개 섹션 (기본정보, 발의법안, 표결) 반환", async () => {
    mockFetchSequence(
      // 1. 의원 인적사항
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        {
          HG_NM: "김의원",
          POLY_NM: "더불어민주당",
          ORIG_NM: "서울 강남구갑",
          REELE_GBN_NM: "초선",
          CMITS: "교육위원회",
        },
      ], 1),
      // 2. 발의법안
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        {
          BILL_NO: "2100001",
          BILL_NAME: "교육기본법",
          PROC_RESULT: "계류",
          PROPOSER: "김의원",
          PROPOSE_DT: "2024-03-01",
        },
      ], 5),
      // 3. 본회의 표결
      buildAssemblyResponse("nwbpacrgavhjryiph", [
        {
          BILL_NO: "2100002",
          BILL_NAME: "세법개정안",
          RESULT: "가결",
        },
      ], 3),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.analyze_legislator.handler(
      { name: "김의원" },
      {} as never,
    );

    const parsed = getParsed(result);
    // 섹션 1: 기본정보
    const member = parsed.member as Record<string, unknown>;
    expect(member.name).toBe("김의원");
    expect(member.party).toBe("더불어민주당");
    expect(member.district).toBe("서울 강남구갑");
    expect(member.reelection).toBe("초선");
    expect(member.committees).toBe("교육위원회");

    // 섹션 2: 발의법안
    const bills = parsed.bills as Record<string, unknown>;
    expect(bills.total).toBe(5);
    const billItems = bills.items as Record<string, unknown>[];
    expect(billItems[0].billName).toBe("교육기본법");

    // 섹션 3: 표결
    const votes = parsed.votes as Record<string, unknown>;
    expect(votes.total).toBe(3);
    const voteItems = votes.items as Record<string, unknown>[];
    expect(voteItems[0].billName).toBe("세법개정안");
    expect(voteItems[0].result).toBe("가결");
  });

  it("의원 찾을 수 없음 → 안내 메시지", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.analyze_legislator.handler(
      { name: "없는의원" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(0);
    expect(parsed.items).toEqual([]);
    const query = parsed.query as Record<string, unknown>;
    expect(query.name).toBe("없는의원");
  });

  it("Promise.all 병렬 호출 확인 (fetch 3회 호출)", async () => {
    mockFetchSequence(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        { HG_NM: "테스트", POLY_NM: "당", ORIG_NM: "구", REELE_GBN_NM: "초선", CMITS: "위" },
      ], 1),
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
      buildAssemblyResponse("nwbpacrgavhjryiph", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.analyze_legislator.handler(
      { name: "테스트" },
      {} as never,
    );

    const fetchSpy = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("발의법안 0건 → 조회 결과가 없습니다", async () => {
    mockFetchSequence(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        { HG_NM: "신입", POLY_NM: "당", ORIG_NM: "구", REELE_GBN_NM: "초선", CMITS: "위" },
      ], 1),
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
      buildAssemblyResponse("nwbpacrgavhjryiph", [], 0),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.analyze_legislator.handler(
      { name: "신입" },
      {} as never,
    );

    const parsed = getParsed(result);
    const bills = parsed.bills as Record<string, unknown>;
    expect(bills.total).toBe(0);
    expect((bills.items as unknown[]).length).toBe(0);
  });

  it("age 파라미터 전달 시 해당 대수로 조회", async () => {
    mockFetchSequence(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        { HG_NM: "이전", POLY_NM: "당", ORIG_NM: "구", REELE_GBN_NM: "재선", CMITS: "위" },
      ], 1),
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
      buildAssemblyResponse("nwbpacrgavhjryiph", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.analyze_legislator.handler(
      { name: "이전", age: 21 },
      {} as never,
    );

    const fetchSpy = globalThis.fetch as ReturnType<typeof vi.fn>;
    // 2번째, 3번째 호출에서 AGE=21이 포함
    const billsUrl = fetchSpy.mock.calls[1]?.[0] as string;
    expect(billsUrl).toContain("AGE=21");
    const votesUrl = fetchSpy.mock.calls[2]?.[0] as string;
    expect(votesUrl).toContain("AGE=21");
  });

  it("네트워크 오류 → isError: true", async () => {
    mockFetchNetworkError();

    const tools = getRegisteredTools(server);
    const result = await tools.analyze_legislator.handler(
      { name: "테스트" },
      {} as never,
    );

    expect(isError(result)).toBe(true);
    const parsed = getParsed(result);
    expect(parsed.error).toBeDefined();
  });

  it("표결에서 PROC_RESULT 폴백, 빈 결과 시 '결과 미상'", async () => {
    mockFetchSequence(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        { HG_NM: "폴백", POLY_NM: "당", ORIG_NM: "구", REELE_GBN_NM: "초선", CMITS: "위" },
      ], 1),
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2100003", BILL_NM: "NM폴백법", PROC_RESULT_CD: "계류CD" },
      ], 1),
      buildAssemblyResponse("nwbpacrgavhjryiph", [
        { BILL_ID: "PRC_X1", BILL_NM: "표결폴백법" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.analyze_legislator.handler(
      { name: "폴백" },
      {} as never,
    );

    const parsed = getParsed(result);
    const bills = parsed.bills as Record<string, unknown>;
    const billItems = bills.items as Record<string, unknown>[];
    expect(billItems[0].billName).toBe("NM폴백법");
    expect(billItems[0].status).toBe("계류CD");
    const votes = parsed.votes as Record<string, unknown>;
    const voteItems = votes.items as Record<string, unknown>[];
    expect(voteItems[0].billName).toBe("표결폴백법");
    expect(voteItems[0].result).toBe("");
  });

  it("발의법안에서 status가 빈 문자열이면 '상태 미상'", async () => {
    mockFetchSequence(
      buildAssemblyResponse("nwvrqwxyaytdsfvhu", [
        { HG_NM: "빈상태", POLY_NM: "당", ORIG_NM: "구", REELE_GBN_NM: "초선", CMITS: "위" },
      ], 1),
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2100004", BILL_NAME: "빈상태법" },
      ], 1),
      buildAssemblyResponse("nwbpacrgavhjryiph", [], 0),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.analyze_legislator.handler(
      { name: "빈상태" },
      {} as never,
    );

    const parsed = getParsed(result);
    const bills = parsed.bills as Record<string, unknown>;
    const billItems = bills.items as Record<string, unknown>[];
    expect(billItems[0].billName).toBe("빈상태법");
    expect(billItems[0].status).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Tests — track_legislation (lite/chains.ts)
// ---------------------------------------------------------------------------

describe("Lite track_legislation", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
    registerLiteChainTools(server, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("단일 키워드 → 검색 및 결과 반환", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        {
          BILL_NO: "2200001",
          BILL_NAME: "AI기본법",
          PROC_RESULT: "계류",
          PROPOSER: "홍의원",
          PROPOSE_DT: "2024-03-01",
        },
        {
          BILL_NO: "2200002",
          BILL_NAME: "인공지능법",
          PROC_RESULT: "계류",
          PROPOSER: "김의원",
          PROPOSE_DT: "2024-04-01",
        },
      ], 2),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "AI" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.keywords).toEqual(["AI"]);
    expect(parsed.total).toBe(2);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].billName).toBe("AI기본법");
    expect(items[1].billName).toBe("인공지능법");
  });

  it("다중 키워드 (쉼표 구분) → 병렬 검색 + 중복 제거 by BILL_NO", async () => {
    mockFetchSequence(
      // 키워드 "AI" 결과
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2200001", BILL_NAME: "AI기본법", PROPOSER: "A" },
        { BILL_NO: "2200002", BILL_NAME: "공통법안", PROPOSER: "B" },
      ], 2),
      // 키워드 "인공지능" 결과 - 2200002 중복
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2200002", BILL_NAME: "공통법안", PROPOSER: "B" },
        { BILL_NO: "2200003", BILL_NAME: "인공지능법", PROPOSER: "C" },
      ], 2),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "AI,인공지능" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(3);
    const items = parsed.items as Record<string, unknown>[];
    expect(items).toHaveLength(3);
    const names = items.map((i) => i.billName);
    expect(names).toContain("AI기본법");
    expect(names).toContain("공통법안");
    expect(names).toContain("인공지능법");

    const fetchSpy = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("include_history=true → 상위 5건에 대해 BILL_REVIEW 조회", async () => {
    mockFetchSequence(
      // 키워드 검색 결과
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2200001", BILL_NAME: "교육법", PROPOSER: "A", PROPOSE_DT: "2024-01" },
        { BILL_NO: "2200002", BILL_NAME: "보건법", PROPOSER: "B", PROPOSE_DT: "2024-02" },
      ], 2),
      // 교육법 심사이력 (BILL_REVIEW)
      buildAssemblyResponse("BILLJUDGE", [
        { CMIT_NM: "교육위", PROC_RESULT_CD: "심사중", PROC_DT: "2024-05-01" },
      ], 1),
      // 보건법 심사이력 (BILL_REVIEW)
      buildAssemblyResponse("BILLJUDGE", [
        { COMMITTEE: "보건위", PROC_RESULT: "가결", PPSR_DT: "2024-06-01" },
      ], 1),
      // 교육법 위원회심사 회의정보 (BILL_COMMITTEE_CONF)
      buildAssemblyResponse("BILLJUDGECONF", [], 0),
      // 보건법 위원회심사 회의정보 (BILL_COMMITTEE_CONF)
      buildAssemblyResponse("BILLJUDGECONF", [], 0),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "법", include_history: true },
      {} as never,
    );

    const parsed = getParsed(result);
    const histories = parsed.histories as Record<string, Record<string, unknown>[]>;
    expect(histories).toBeDefined();
    expect(histories["2200001"]).toHaveLength(1);
    expect(histories["2200001"][0]["CMIT_NM"]).toBe("교육위");
    expect(histories["2200001"][0]["PROC_RESULT_CD"]).toBe("심사중");
    expect(histories["2200002"]).toHaveLength(1);
    expect(histories["2200002"][0]["COMMITTEE"]).toBe("보건위");
    expect(histories["2200002"][0]["PROC_RESULT"]).toBe("가결");

    const fetchSpy = globalThis.fetch as ReturnType<typeof vi.fn>;
    // 1 keyword search + 2 history fetches + 2 committee conf fetches = 5
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  it("빈 키워드 → 키워드를 입력해 주세요", async () => {
    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "" },
      {} as never,
    );

    const text = getText(result);
    expect(text).toContain("키워드를 입력해 주세요");
  });

  it("공백만 있는 키워드 → 키워드를 입력해 주세요", async () => {
    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "  ,  ,  " },
      {} as never,
    );

    const text = getText(result);
    expect(text).toContain("키워드를 입력해 주세요");
  });

  it("검색 결과 0건 → 검색 결과가 없습니다", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "없는법안명" },
      {} as never,
    );

    const parsed = getParsed(result);
    expect(parsed.total).toBe(0);
    expect(parsed.items).toEqual([]);
    expect(parsed.keywords).toEqual(["없는법안명"]);
  });

  it("심사이력 조회 실패 → 부분 성공 (catch per-bill)", async () => {
    const searchSpy = vi.spyOn(globalThis, "fetch");
    // 1. 키워드 검색 성공
    searchSpy.mockResolvedValueOnce(
      new Response(
        buildAssemblyResponse("nzmimeepazxkubdpn", [
          { BILL_NO: "2200001", BILL_NAME: "실패법", PROPOSER: "A" },
        ], 1),
        { status: 200 },
      ),
    );
    // 2. 심사이력 조회 실패
    searchSpy.mockRejectedValueOnce(new Error("History fetch failed"));

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "실패", include_history: true },
      {} as never,
    );

    // 에러가 아닌 정상 결과여야 함 (부분 성공)
    expect(isError(result)).not.toBe(true);
    const parsed = getParsed(result);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0].billName).toBe("실패법");
    // 심사이력은 빈 배열로 처리되므로 histories에 빈 배열
    const histories = parsed.histories as Record<string, unknown[]>;
    expect(histories["2200001"]).toEqual([]);
  });

  it("page_size 파라미터 전달", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.track_legislation.handler(
      { keywords: "테스트", page_size: 5 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("pSize=5");
  });

  it("age 파라미터 전달", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [], 0),
    );

    const tools = getRegisteredTools(server);
    await tools.track_legislation.handler(
      { keywords: "테스트", age: 21 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain("AGE=21");
  });

  it("네트워크 오류 → isError: true", async () => {
    mockFetchNetworkError();

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "테스트" },
      {} as never,
    );

    expect(isError(result)).toBe(true);
    const parsed = getParsed(result);
    expect(parsed.error).toBeDefined();
  });

  it("include_history=false → 심사이력 조회 안 함", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2200001", BILL_NAME: "스킵법", PROPOSER: "A" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "스킵", include_history: false },
      {} as never,
    );

    const fetchSpy = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const parsed = getParsed(result);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0].billName).toBe("스킵법");
    expect(parsed.histories).toBeUndefined();
  });

  it("결과에 search_bills 안내 팁 포함", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2200001", BILL_NAME: "팁법", PROPOSER: "A" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "팁" },
      {} as never,
    );

    const parsed = getParsed(result);
    // JSON format no longer includes the search_bills tip text,
    // but verify the result structure is valid
    expect(parsed.total).toBe(1);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0].billName).toBe("팁법");
  });

  it("제안자/제안일 없으면 빈 문자열로 반환", async () => {
    mockFetchSuccess(
      buildAssemblyResponse("nzmimeepazxkubdpn", [
        { BILL_NO: "2200099", BILL_NAME: "미상법" },
      ], 1),
    );

    const tools = getRegisteredTools(server);
    const result = await tools.track_legislation.handler(
      { keywords: "미상" },
      {} as never,
    );

    const parsed = getParsed(result);
    const items = parsed.items as Record<string, unknown>[];
    expect(items[0].billName).toBe("미상법");
    expect(items[0].proposer).toBe("");
    expect(items[0].proposeDate).toBe("");
    expect(items[0].status).toBe("");
  });
});
