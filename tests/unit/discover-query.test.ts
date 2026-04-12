import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../src/config.js";
import { registerDiscoverTools } from "../../src/tools/discover.js";
import { registerQueryTools } from "../../src/tools/query.js";
import * as toolsIndex from "../../src/tools/index.js";

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
    server: { transport: "stdio" as const, port: 3000, logLevel: "info" as const },
    cache: { enabled: false, ttlStatic: 86400, ttlDynamic: 3600 },
    apiResponse: { defaultType: "json" as const, defaultPageSize: 20, maxPageSize: 100 },
    profile: "full" as const,
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

function mockFetchNetworkError(): void {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection refused"));
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockCatalogRows: readonly Record<string, unknown>[] = [
  { INF_ID: "1", INF_NM: "국회의원 정보", CATE_NM: "국회의원", ORG_NM: "국회", INF_EXP: "의원 인적사항" },
  { INF_ID: "2", INF_NM: "의안 목록", CATE_NM: "의정활동별 공개", ORG_NM: "국회", INF_EXP: "의안 검색" },
  { INF_ID: "3", INF_NM: "예산 분석", CATE_NM: "보고서", ORG_NM: "예산정책처", INF_EXP: "예산 보고서" },
];

// ---------------------------------------------------------------------------
// Tests — discover_apis
// ---------------------------------------------------------------------------

describe("discover_apis", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("필터 없이 호출하면 모든 결과를 반환한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({}, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content).toHaveLength(1);
    const parsed = JSON.parse(content[0].text);
    expect(parsed.matched).toBe(3);
    expect(content[0].text).toContain("국회의원 정보");
    expect(content[0].text).toContain("의안 목록");
    expect(content[0].text).toContain("예산 분석");
  });

  it("keyword 필터로 INF_NM 매칭 결과만 반환한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({ keyword: "의원" }, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain("국회의원 정보");
    expect(content[0].text).not.toContain("예산 분석");
  });

  it("keyword 필터로 INF_EXP 매칭 결과도 반환한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({ keyword: "보고서" }, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain("예산 분석");
    expect(content[0].text).not.toContain("국회의원 정보");
  });

  it("category 필터로 CATE_NM 매칭 결과만 반환한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({ category: "보고서" }, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain("예산 분석");
    expect(content[0].text).not.toContain("국회의원 정보");
    expect(content[0].text).not.toContain("의안 목록");
  });

  it("keyword + category 조합 필터를 적용한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler(
      { keyword: "의안", category: "의정활동" },
      {} as never,
    );
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain("의안 목록");
    expect(content[0].text).not.toContain("국회의원 정보");
    expect(content[0].text).not.toContain("예산 분석");
  });

  it("keyword + category 조합 시 양쪽 모두 불일치하면 빈 결과를 반환한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler(
      { keyword: "의원", category: "보고서" },
      {} as never,
    );
    const content = (result as { content: Array<{ text: string }> }).content;

    // "의원" matches "국회의원 정보" but its category is "국회의원", not "보고서"
    const parsed = JSON.parse(content[0].text);
    expect(parsed.matched).toBe(0);
  });

  it("page_size로 결과 수를 제한한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({ page_size: 2 }, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;

    const parsed = JSON.parse(content[0].text);
    expect(parsed.returned).toBe(2);
    // Should have the first 2 items, not the 3rd
    expect(content[0].text).toContain("국회의원 정보");
    expect(content[0].text).toContain("의안 목록");
    expect(content[0].text).not.toContain("예산 분석");
  });

  it("네트워크 오류 시 isError: true를 반환한다", async () => {
    mockFetchNetworkError();

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({}, {} as never);
    const response = result as { content: Array<{ text: string }>; isError?: boolean };

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("오류");
  });

  it("비-Error 예외도 올바르게 처리한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue("string error");

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({}, {} as never);
    const response = result as { content: Array<{ text: string }>; isError?: boolean };

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("오류");
    expect(response.content[0].text).toContain("string error");
  });

  it("결과에 INF_ID, INF_NM, CATE_NM, ORG_NM, INF_EXP 필드가 포함된다", async () => {
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", mockCatalogRows, 276));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({ page_size: 1 }, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;
    const parsed = JSON.parse(content[0].text);

    expect(parsed.items[0]).toEqual({
      INF_ID: "1",
      INF_NM: "국회의원 정보",
      CATE_NM: "국회의원",
      ORG_NM: "국회",
      INF_EXP: "의원 인적사항",
    });
  });

  it("keyword 필터는 대소문자를 구분하지 않는다", async () => {
    const rows = [
      { INF_ID: "10", INF_NM: "ABC Data", CATE_NM: "test", ORG_NM: "국회", INF_EXP: "abc info" },
    ];
    mockFetchSuccess(buildAssemblyResponse("OPENSRVAPI", rows, 1));

    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.discover_apis.handler({ keyword: "abc" }, {} as never);
    const content = (result as { content: Array<{ text: string }> }).content;

    expect(content[0].text).toContain("ABC Data");
  });

  it("도구 등록이 정상적으로 수행된다", () => {
    registerDiscoverTools(server, config);
    const tools = getRegisteredTools(server);
    expect(tools).toHaveProperty("discover_apis");
  });
});

// ---------------------------------------------------------------------------
// Tests — query_assembly
// ---------------------------------------------------------------------------

describe("query_assembly", () => {
  let server: McpServer;
  const config = createTestConfig();

  beforeEach(() => {
    vi.restoreAllMocks();
    server = createServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("단순 API 호출 시 raw rows와 필드 이름을 반환한다", async () => {
    const rows = [
      { BILL_ID: "PRC_001", BILL_NAME: "테스트법안", AGE: "22" },
    ];
    mockFetchSuccess(buildAssemblyResponse("BILLRCP", rows, 1));

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.query_assembly.handler(
      { api_code: "BILLRCP" },
      {} as never,
    );
    const content = (result as { content: Array<{ text: string }> }).content;

    const parsed = JSON.parse(content[0].text);
    expect(parsed.api).toBe("BILLRCP");
    expect(parsed.total).toBe(1);
    expect(parsed.returned).toBe(1);
    expect(parsed.fields).toContain("BILL_ID");
    expect(parsed.fields).toContain("BILL_NAME");
    expect(parsed.fields).toContain("AGE");
    expect(content[0].text).toContain("테스트법안");
  });

  it("params를 API에 전달한다", async () => {
    mockFetchSuccess(buildAssemblyResponse("BILLRCP", [], 0));

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    await tools.query_assembly.handler(
      { api_code: "BILLRCP", params: { AGE: "22", BILL_NAME: "교육" } },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("AGE=22");
    expect(calledUrl).toContain("BILL_NAME=%EA%B5%90%EC%9C%A1");
  });

  it("page와 page_size가 pIndex와 pSize로 변환된다", async () => {
    mockFetchSuccess(buildAssemblyResponse("BILLRCP", [], 0));

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    await tools.query_assembly.handler(
      { api_code: "BILLRCP", page: 3, page_size: 50 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("pIndex=3");
    expect(calledUrl).toContain("pSize=50");
  });

  it("page_size가 maxPageSize(100)를 초과하면 100으로 제한된다", async () => {
    mockFetchSuccess(buildAssemblyResponse("BILLRCP", [], 0));

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    await tools.query_assembly.handler(
      { api_code: "BILLRCP", page_size: 500 },
      {} as never,
    );

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("pSize=100");
    expect(calledUrl).not.toContain("pSize=500");
  });

  it("빈 결과 시 필드 목록이 비어있다", async () => {
    mockFetchSuccess(buildAssemblyResponse("BILLRCP", [], 0));

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.query_assembly.handler(
      { api_code: "BILLRCP" },
      {} as never,
    );
    const content = (result as { content: Array<{ text: string }> }).content;

    const parsed = JSON.parse(content[0].text);
    expect(parsed.returned).toBe(0);
    expect(parsed.fields).toEqual([]);
  });

  it("네트워크 오류 시 isError: true를 반환한다", async () => {
    mockFetchNetworkError();

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.query_assembly.handler(
      { api_code: "BILLRCP" },
      {} as never,
    );
    const response = result as { content: Array<{ text: string }>; isError?: boolean };

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("오류");
  });

  it("API 오류 메시지에 '오류'가 포함되면 도움말 텍스트를 추가한다", async () => {
    const errorBody = JSON.stringify({
      BADCODE: [
        {
          head: [
            { list_total_count: 0 },
            { RESULT: { CODE: "INFO-200", MESSAGE: "인증키 오류" } },
          ],
        },
        { row: [] },
      ],
    });
    mockFetchSuccess(errorBody);

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.query_assembly.handler(
      { api_code: "BADCODE" },
      {} as never,
    );
    const response = result as { content: Array<{ text: string }>; isError?: boolean };

    expect(response.isError).toBe(true);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.error).toContain("오류");
    expect(parsed.code).toBeDefined();
  });

  it("네트워크 오류 메시지에도 '오류' 키워드로 JSON error를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("timeout"));

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.query_assembly.handler(
      { api_code: "BILLRCP" },
      {} as never,
    );
    const response = result as { content: Array<{ text: string }>; isError?: boolean };

    expect(response.isError).toBe(true);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.error).toContain("오류");
    expect(parsed.code).toBe("TIMEOUT");
  });

  it("비-Error 예외도 올바르게 처리한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue("raw string");

    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    const result = await tools.query_assembly.handler(
      { api_code: "BILLRCP" },
      {} as never,
    );
    const response = result as { content: Array<{ text: string }>; isError?: boolean };

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("raw string");
  });

  it("도구 등록이 정상적으로 수행된다", () => {
    registerQueryTools(server, config);
    const tools = getRegisteredTools(server);
    expect(tools).toHaveProperty("query_assembly");
  });
});

// ---------------------------------------------------------------------------
// Tests — tools/index.ts exports
// ---------------------------------------------------------------------------

describe("tools/index.ts exports", () => {
  const expectedExports = [
    "registerMemberTools",
    "registerBillTools",
    "registerScheduleTools",
    "registerMeetingTools",
    "registerCommitteeTools",
    "registerVoteTools",
    "registerPetitionTools",
    "registerLegislationTools",
    "registerLibraryTools",
    "registerBudgetTools",
    "registerResearchTools",
    "registerSpeechTools",
    "registerBillExtraTools",
    "registerDiscoverTools",
    "registerQueryTools",
    "registerNaboTool",
  ];

  it.each(expectedExports)("%s가 export되어 있다", (name) => {
    expect(toolsIndex).toHaveProperty(name);
    expect(typeof (toolsIndex as Record<string, unknown>)[name]).toBe("function");
  });

  it("총 16개의 register 함수가 export된다", () => {
    const registerFns = Object.keys(toolsIndex).filter((k) =>
      k.startsWith("register"),
    );
    expect(registerFns).toHaveLength(16);
  });
});
