import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../src/config.js";
import { registerMemberTools } from "../../src/tools/members.js";
import { registerBillDetailTool } from "../../src/tools/bills.js";
import { registerScheduleTools } from "../../src/tools/schedule.js";
import { registerMeetingTools } from "../../src/tools/meetings.js";
import { registerLiteBillTools } from "../../src/tools/lite/bills.js";
import { registerLiteScheduleTools } from "../../src/tools/lite/schedule.js";
import { registerLiteMeetingTools } from "../../src/tools/lite/meetings.js";
import { registerLiteMemberTools } from "../../src/tools/lite/members.js";

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
  };
}

function createServer(): McpServer {
  return new McpServer({ name: "test-server", version: "0.0.1" });
}

/** Access internal tool registry (private field). */
function getRegisteredTools(
  server: McpServer,
): Record<string, { description: string; handler: (...args: unknown[]) => Promise<unknown>; enabled: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (server as any)._registeredTools;
}

/** Build a mock Open Assembly API JSON response. */
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

/** Build an error response from the Assembly API. */
function buildAssemblyErrorResponse(apiCode: string, code: string, message: string): string {
  return JSON.stringify({
    [apiCode]: [
      {
        head: [
          { list_total_count: 0 },
          { RESULT: { CODE: code, MESSAGE: message } },
        ],
      },
      { row: [] },
    ],
  });
}

function mockFetchSuccess(body: string): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, { status: 200 }),
  );
}

function mockFetchNetworkError(): void {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection refused"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MCP Tool Registration", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  describe("tool registration", () => {
    it("registerMemberTools는 get_members와 get_member_detail을 등록한다", () => {
      registerMemberTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("get_members");
      expect(tools).toHaveProperty("get_member_detail");
    });

    it("registerBillDetailTool은 get_bill_detail을 등록한다", () => {
      registerBillDetailTool(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("get_bill_detail");
    });

    it("registerLiteBillTools는 search_bills를 등록한다", () => {
      registerLiteBillTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("search_bills");
    });

    it("registerScheduleTools는 get_schedule을 등록한다", () => {
      registerScheduleTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("get_schedule");
    });

    it("registerMeetingTools는 search_meeting_records를 등록한다", () => {
      registerMeetingTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("search_meeting_records");
    });

    it("Lite 도구와 Full 전용 도구를 한 서버에 등록할 수 있다", () => {
      registerLiteMemberTools(server, config);
      registerLiteBillTools(server, config);
      registerLiteScheduleTools(server, config);
      registerLiteMeetingTools(server, config);
      registerBillDetailTool(server, config);
      const tools = getRegisteredTools(server);

      const expectedNames = [
        "search_members",
        "search_bills",
        "get_bill_detail",
        "get_schedule",
        "search_meetings",
      ];
      for (const name of expectedNames) {
        expect(tools).toHaveProperty(name);
      }
    });

    it("같은 도구를 두 번 등록하면 에러를 던진다", () => {
      registerBillDetailTool(server, config);
      expect(() => registerBillDetailTool(server, config)).toThrow(
        "already registered",
      );
    });
  });

  // -----------------------------------------------------------------------
  // get_members
  // -----------------------------------------------------------------------

  describe("search_members (Lite)", () => {
    it("성공적인 의원 목록을 반환한다 (1건이면 상세)", async () => {
      const rows = [
        {
          HG_NM: "홍길동",
          HJ_NM: "洪吉童",
          ENG_NM: "HONG Gil-dong",
          POLY_NM: "테스트당",
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
        },
      ];
      mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", rows, 1));

      registerLiteMemberTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_members.handler({ name: "홍길동" }, {} as never);
      const content = (result as { content: Array<{ text: string }> }).content;

      expect(content).toHaveLength(1);
      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items).toHaveLength(1);
      // 1건이므로 상세(DETAIL_FIELDS) 반환 — 한글 키
      expect(parsed.items[0]["이름"]).toBe("홍길동");
      expect(parsed.items[0]["정당"]).toBe("테스트당");
    });

    it("API 에러를 올바르게 처리한다", async () => {
      mockFetchSuccess(
        buildAssemblyErrorResponse("nwvrqwxyaytdsfvhu", "INFO-200", "인증키 오류"),
      );

      registerLiteMemberTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_members.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerLiteMemberTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_members.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });

    it("의원을 찾을 수 없으면 안내 메시지를 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

      registerLiteMemberTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_members.handler(
        { name: "없는사람" },
        {} as never,
      );
      const content = (result as { content: Array<{ text: string }> }).content;

      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.items).toEqual([]);
      expect(parsed.query.name).toBe("없는사람");
    });
  });

  // -----------------------------------------------------------------------
  // search_bills
  // -----------------------------------------------------------------------

  describe("search_bills (Lite)", () => {
    it("성공적인 의안 검색 결과를 반환한다", async () => {
      const rows = [
        {
          BILL_ID: "PRC_B2E2A0K9",
          BILL_NO: "2200001",
          BILL_NAME: "테스트법률안",
          PROPOSER: "홍길동의원등10인",
          AGE: "22",
          COMMITTEE: "법제사법위원회",
          PROPOSE_DT: "2024-06-01",
          PROC_RESULT: "계류",
          PROC_DT: null,
          DETAIL_LINK: "https://example.com/bill",
        },
      ];
      mockFetchSuccess(buildAssemblyResponse("nzmimeepazxkubdpn", rows, 1));

      registerLiteBillTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_bills.handler(
        { bill_name: "테스트", age: 22 },
        {} as never,
      );
      const content = (result as { content: Array<{ text: string }> }).content;

      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0]["의안명"]).toBe("테스트법률안");
      expect(parsed.items[0]["처리상태"]).toBe("계류");
    });

    it("API 에러를 올바르게 처리한다", async () => {
      mockFetchSuccess(
        buildAssemblyErrorResponse("nzmimeepazxkubdpn", "INFO-300", "요청 제한 초과"),
      );

      registerLiteBillTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_bills.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerLiteBillTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_bills.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });
  });

  // -----------------------------------------------------------------------
  // get_bill_detail
  // -----------------------------------------------------------------------

  describe("get_bill_detail", () => {
    it("의안 상세 정보를 반환한다", async () => {
      const rows = [
        {
          BILL_ID: "PRC_B2E2A0K9",
          BILL_NAME: "테스트법률안",
          PROPOSER: "홍길동의원등10인",
          SUMMARY: "테스트 요약",
        },
      ];
      mockFetchSuccess(buildAssemblyResponse("BILLINFODETAIL", rows, 1));

      registerBillDetailTool(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_bill_detail.handler(
        { bill_id: "PRC_B2E2A0K9" },
        {} as never,
      );
      const content = (result as { content: Array<{ text: string }> }).content;

      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].BILL_ID).toBe("PRC_B2E2A0K9");
    });

    it("의안을 찾을 수 없으면 안내 메시지를 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("BILLINFODETAIL", [], 0));

      registerBillDetailTool(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_bill_detail.handler(
        { bill_id: "NONEXISTENT" },
        {} as never,
      );
      const content = (result as { content: Array<{ text: string }> }).content;

      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.items).toEqual([]);
      expect(parsed.query.bill_id).toBe("NONEXISTENT");
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerBillDetailTool(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_bill_detail.handler(
        { bill_id: "PRC_B2E2A0K9" },
        {} as never,
      );
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });
  });

  // -----------------------------------------------------------------------
  // get_schedule
  // -----------------------------------------------------------------------

  describe("get_schedule (Lite)", () => {
    it("통합 일정을 반환한다", async () => {
      const rows = [
        {
          SCH_KIND: "위원회",
          SCH_DT: "20240601",
          SCH_TM: "10:00",
          CMIT_NM: "법제사법위원회",
          SCH_CN: "법률안 심사",
          EV_PLC: "제1회의실",
        },
      ];
      mockFetchSuccess(buildAssemblyResponse("ALLSCHEDULE", rows, 1));

      registerLiteScheduleTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_schedule.handler(
        { date_from: "2024-06-01" },
        {} as never,
      );
      const content = (result as { content: Array<{ text: string }> }).content;

      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0]["위원회"]).toBe("법제사법위원회");
    });

    it("통합 일정 API (ALLSCHEDULE)를 사용한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("ALLSCHEDULE", [], 0));

      registerLiteScheduleTools(server, config);
      const tools = getRegisteredTools(server);
      await tools.get_schedule.handler(
        {},
        {} as never,
      );

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("ALLSCHEDULE");
    });

    it("API 에러를 처리한다", async () => {
      mockFetchSuccess(
        buildAssemblyErrorResponse("ALLSCHEDULE", "INFO-200", "인증키 오류"),
      );

      registerLiteScheduleTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_schedule.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerLiteScheduleTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_schedule.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });
  });

  // -----------------------------------------------------------------------
  // search_meeting_records
  // -----------------------------------------------------------------------

  describe("search_meetings (Lite)", () => {
    it("위원회 회의록 검색 결과를 반환한다", async () => {
      const rows = [
        {
          COMM_NAME: "법제사법위원회",
          CONF_DATE: "2024-06-01",
          DAE_NUM: "22",
          TITLE: "법률안 심사",
          SUB_NAME: "법률안 심사 안건",
          PDF_LINK_URL: "https://example.com/record",
          VOD_LINK_URL: "https://example.com/vod",
        },
      ];
      mockFetchSuccess(buildAssemblyResponse("ncwgseseafwbuheph", rows, 1));

      registerLiteMeetingTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_meetings.handler(
        { keyword: "법률안" },
        {} as never,
      );
      const content = (result as { content: Array<{ text: string }> }).content;

      const parsed = JSON.parse(content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0]["회의명"]).toBe("법률안 심사");
    });

    it("본회의 회의록을 요청하면 올바른 API 코드를 사용한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nzbyfwhwaoanttzje", [], 0));

      registerLiteMeetingTools(server, config);
      const tools = getRegisteredTools(server);
      await tools.search_meetings.handler(
        { meeting_type: "본회의" },
        {} as never,
      );

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("nzbyfwhwaoanttzje");
    });

    it("국정감사 회의록을 요청하면 올바른 API 코드를 사용한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("VCONFAPIGCONFLIST", [], 0));

      registerLiteMeetingTools(server, config);
      const tools = getRegisteredTools(server);
      await tools.search_meetings.handler(
        { meeting_type: "국정감사" },
        {} as never,
      );

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("VCONFAPIGCONFLIST");
    });

    it("인사청문회 회의록을 요청하면 올바른 API 코드를 사용한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("VCONFCFRMCONFLIST", [], 0));

      registerLiteMeetingTools(server, config);
      const tools = getRegisteredTools(server);
      await tools.search_meetings.handler(
        { meeting_type: "인사청문회" },
        {} as never,
      );

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("VCONFCFRMCONFLIST");
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerLiteMeetingTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_meetings.handler({}, {} as never);
      const response = result as { content: Array<{ text: string }>; isError?: boolean };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain("오류");
    });
  });

  // -----------------------------------------------------------------------
  // page_size clamping
  // -----------------------------------------------------------------------

  describe("page_size 제한", () => {
    it("page_size가 maxPageSize를 초과하면 maxPageSize로 제한된다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nwvrqwxyaytdsfvhu", [], 0));

      registerLiteMemberTools(server, config);
      const tools = getRegisteredTools(server);
      await tools.search_members.handler(
        { page_size: 500 },
        {} as never,
      );

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("pSize=100");
      expect(calledUrl).not.toContain("pSize=500");
    });
  });
});
