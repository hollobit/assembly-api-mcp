import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../src/config.js";
import { registerBillExtraTools } from "../../src/tools/bill-extras.js";
import { registerBudgetTools } from "../../src/tools/budget.js";
import { registerCommitteeTools } from "../../src/tools/committees.js";
import { registerLegislationTools } from "../../src/tools/legislation.js";
import { registerLibraryTools } from "../../src/tools/library.js";
import { registerPetitionTools } from "../../src/tools/petitions.js";
import { registerResearchTools } from "../../src/tools/research.js";

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
    profile: "full",
  };
}

function createServer(): McpServer {
  return new McpServer({ name: "test-server", version: "0.0.1" });
}

function getRegisteredTools(
  server: McpServer,
): Record<string, { description: string; handler: (...args: unknown[]) => Promise<unknown>; enabled: boolean }> {
  return (server as any)._registeredTools;
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

function mockFetchSequence(...bodies: string[]): void {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const body of bodies) {
    spy.mockResolvedValueOnce(new Response(body, { status: 200 }));
  }
}

function mockFetchNetworkError(): void {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection refused"));
}

type ToolResult = { content: Array<{ text: string }>; isError?: boolean };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Full-mode MCP Tools", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // bill-extras.ts (7 tools)
  // =========================================================================

  describe("bill-extras", () => {
    // -- Registration --
    it("registerBillExtraTools는 2개 도구를 등록한다", () => {
      registerBillExtraTools(server, config);
      const tools = getRegisteredTools(server);
      const expected = [
        "get_bill_review",
        "get_bill_history",
      ];
      for (const name of expected) {
        expect(tools).toHaveProperty(name);
      }
      // 제거된 도구가 등록되지 않음을 확인
      expect(tools).not.toHaveProperty("get_pending_bills");
      expect(tools).not.toHaveProperty("get_processed_bills");
      expect(tools).not.toHaveProperty("get_recent_bills");
      expect(tools).not.toHaveProperty("get_plenary_votes");
      expect(tools).not.toHaveProperty("search_all_bills");
    });

    // -- get_bill_review --
    describe("get_bill_review", () => {
      it("의안 심사정보를 반환한다", async () => {
        mockFetchSuccess(buildAssemblyResponse("BILLJUDGE", [
          { BILL_NO: "2200003", BILL_NM: "심사법안", PPSR_KIND: "의원", PPSL_DT: "2024-01-01", JRCMIT_NM: "법제사법위원회" },
        ], 1));

        registerBillExtraTools(server, config);
        const tools = getRegisteredTools(server);
        const result = await tools.get_bill_review.handler(
          { bill_name: "심사법안" },
          {} as never,
        ) as ToolResult;

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.total).toBe(1);
        expect(parsed.items[0]).toMatchObject({ 의안명: "심사법안", 소관위원회: "법제사법위원회" });
      });
    });

    // -- get_bill_history --
    describe("get_bill_history", () => {
      it("의안 접수/처리 이력을 반환한다", async () => {
        mockFetchSuccess(buildAssemblyResponse("BILLRCP", [
          { BILL_NO: "2200006", BILL_NM: "이력법안", BILL_KIND: "법률안", PPSR_KIND: "의원", PPSL_DT: "2024-03-01", PROC_RSLT: "가결", LINK_URL: "https://example.com" },
        ], 1));

        registerBillExtraTools(server, config);
        const tools = getRegisteredTools(server);
        const result = await tools.get_bill_history.handler(
          { bill_no: "2200006" },
          {} as never,
        ) as ToolResult;

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.total).toBe(1);
        expect(parsed.items[0]).toMatchObject({ 의안명: "이력법안", 처리결과: "가결" });
      });

      it("네트워크 오류를 처리한다", async () => {
        mockFetchNetworkError();

        registerBillExtraTools(server, config);
        const tools = getRegisteredTools(server);
        const result = await tools.get_bill_history.handler(
          { bill_no: "2200006" },
          {} as never,
        ) as ToolResult;

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("오류");
      });
    });
  });

  // =========================================================================
  // budget.ts
  // =========================================================================

  describe("budget", () => {
    it("registerBudgetTools는 get_budget_analysis를 등록한다", () => {
      registerBudgetTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("get_budget_analysis");
    });

    it("예산정책처 분석 자료를 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("OZN379001174FW17905", [
        { TITLE: "2024 경제전망", CONTENT: "경제 분석 내용", PUB_DATE: "2024-01-15", LINK_URL: "https://example.com", CATEGORY: "경제" },
      ], 1));

      registerBudgetTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_budget_analysis.handler(
        { keyword: "경제" },
        {} as never,
      ) as ToolResult;

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items[0]).toMatchObject({ 제목: "2024 경제전망" });
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerBudgetTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_budget_analysis.handler({}, {} as never) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("오류");
    });
  });

  // =========================================================================
  // committees.ts
  // =========================================================================

  describe("committees", () => {
    it("registerCommitteeTools는 get_committees를 등록한다", () => {
      registerCommitteeTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("get_committees");
    });

    it("위원회 목록을 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nxrvzonlafugpqjuh", [
        { CMT_DIV_NM: "상임위원회", COMMITTEE_NAME: "법제사법위원회", HR_DEPT_CD: "9700001", HG_NM: "위원장", HG_NM_LIST: "간사1,간사2", LIMIT_CNT: 18, CURR_CNT: 18 },
      ], 1));

      registerCommitteeTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_committees.handler({}, {} as never) as ToolResult;

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items[0]).toMatchObject({ 위원회명: "법제사법위원회", 위원회구분: "상임위원회" });
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerCommitteeTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_committees.handler({}, {} as never) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("오류");
    });
  });

  // =========================================================================
  // legislation.ts
  // =========================================================================

  describe("legislation", () => {
    it("registerLegislationTools는 get_legislation_notices를 등록한다", () => {
      registerLegislationTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("get_legislation_notices");
    });

    it("입법예고 목록을 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nknalejkafmvgzmpt", [
        { BILL_NO: "2200010", BILL_NAME: "교육법개정안", AGE: "22", PROPOSER_KIND_CD: "의원", PROPOSER: "김교육", CURR_COMMITTEE: "교육위원회", NOTI_ED_DT: "2024-06-30", LINK_URL: "https://example.com" },
      ], 1));

      registerLegislationTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_legislation_notices.handler(
        { keyword: "교육" },
        {} as never,
      ) as ToolResult;

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items[0]).toMatchObject({ 법안명: "교육법개정안", 소관위원회: "교육위원회" });
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerLegislationTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.get_legislation_notices.handler({}, {} as never) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("오류");
    });
  });

  // =========================================================================
  // library.ts
  // =========================================================================

  describe("library", () => {
    it("registerLibraryTools는 search_library를 등록한다", () => {
      registerLibraryTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("search_library");
    });

    it("국회도서관 자료 검색 결과를 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nywrpgoaatcpoqbiy", [
        { TITLE: "헌법학개론", AUTHOR: "김헌법", PUBLISHER: "법문사", PUB_YEAR: "2023", LINK_URL: "https://example.com" },
      ], 1));

      registerLibraryTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_library.handler(
        { keyword: "헌법" },
        {} as never,
      ) as ToolResult;

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items[0]).toMatchObject({ 제목: "헌법학개론", 저자: "김헌법" });
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerLibraryTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_library.handler(
        { keyword: "헌법" },
        {} as never,
      ) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("오류");
    });
  });

  // =========================================================================
  // petitions.ts
  // =========================================================================

  describe("petitions", () => {
    it("registerPetitionTools는 search_petitions를 등록한다", () => {
      registerPetitionTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("search_petitions");
    });

    it("청원 검색 결과를 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("nvqbafvaajdiqhehi", [
        { BILL_NO: "2300001", BILL_NAME: "환경보호청원", PROPOSER: "시민단체", APPROVER: "환경의원", CURR_COMMITTEE: "환경노동위원회", PROPOSE_DT: "2024-05-01", LINK_URL: "https://example.com" },
      ], 1));

      registerPetitionTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_petitions.handler(
        { keyword: "환경" },
        {} as never,
      ) as ToolResult;

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items[0]).toMatchObject({ 청원명: "환경보호청원", 소관위원회: "환경노동위원회" });
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerPetitionTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_petitions.handler({}, {} as never) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("오류");
    });
  });

  // =========================================================================
  // research.ts
  // =========================================================================

  describe("research", () => {
    it("registerResearchTools는 search_research_reports를 등록한다", () => {
      registerResearchTools(server, config);
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty("search_research_reports");
    });

    it("입법조사처 보고서 검색 결과를 반환한다", async () => {
      mockFetchSuccess(buildAssemblyResponse("naaborihbkorknasp", [
        { TITLE: "AI 규제 동향", AUTHOR: "입법조사관", PUB_DATE: "2024-04-01", CATEGORY: "이슈와논점", LINK_URL: "https://example.com", ABSTRACT: "AI 관련 입법 동향 분석" },
      ], 1));

      registerResearchTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_research_reports.handler(
        { keyword: "AI" },
        {} as never,
      ) as ToolResult;

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.items[0]).toMatchObject({ 제목: "AI 규제 동향", 카테고리: "이슈와논점" });
    });

    it("네트워크 오류를 처리한다", async () => {
      mockFetchNetworkError();

      registerResearchTools(server, config);
      const tools = getRegisteredTools(server);
      const result = await tools.search_research_reports.handler({}, {} as never) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("오류");
    });
  });

  // speeches.ts와 votes.ts (Full 전용)은 Level 2에서 제거됨
  // search_member_activity → analyze_legislator(Lite)로 대체
  // get_vote_results → get_votes(Lite)로 대체
});
