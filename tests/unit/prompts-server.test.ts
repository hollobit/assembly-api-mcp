import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../src/config.js";
import { registerPrompts } from "../../src/prompts/templates.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestConfig(): AppConfig {
  return {
    apiKeys: { assemblyApiKey: "test-key", dataGoKrServiceKey: undefined, nanetApiKey: undefined, naboApiKey: undefined },
    server: { transport: "stdio" as const, port: 3000, logLevel: "info" as const },
    cache: { enabled: false, ttlStatic: 86400, ttlDynamic: 3600 },
    apiResponse: { defaultType: "json" as const, defaultPageSize: 20, maxPageSize: 100 },
    profile: "lite" as const,
  };
}

function createServer(): McpServer {
  return new McpServer({ name: "test-server", version: "0.0.1" });
}

function getRegisteredPrompts(server: McpServer): Record<string, { handler: (...args: unknown[]) => Promise<unknown> }> {
  return (server as any)._registeredPrompts;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

describe("registerPrompts", () => {
  it("3개 프롬프트를 등록한다", () => {
    const server = createServer();
    registerPrompts(server);
    const prompts = getRegisteredPrompts(server);
    expect(Object.keys(prompts)).toHaveLength(3);
    expect(prompts["analyze_member_activity"]).toBeDefined();
    expect(prompts["summarize_recent_bills"]).toBeDefined();
    expect(prompts["committee_report"]).toBeDefined();
  });

  it("analyze_member_activity 프롬프트가 의원 이름을 포함한다", async () => {
    const server = createServer();
    registerPrompts(server);
    const prompts = getRegisteredPrompts(server);
    const result = await prompts["analyze_member_activity"].callback({ member_name: "고민정" }, {});
    const text = JSON.stringify(result);
    expect(text).toContain("고민정");
    expect(text).toContain("의정활동");
  });

  it("summarize_recent_bills 프롬프트가 대수를 포함한다", async () => {
    const server = createServer();
    registerPrompts(server);
    const prompts = getRegisteredPrompts(server);
    const result = await prompts["summarize_recent_bills"].callback({ age: "21" }, {});
    const text = JSON.stringify(result);
    expect(text).toContain("제21대");
  });

  it("summarize_recent_bills 기본 대수는 22이다", async () => {
    const server = createServer();
    registerPrompts(server);
    const prompts = getRegisteredPrompts(server);
    const result = await prompts["summarize_recent_bills"].callback({}, {});
    const text = JSON.stringify(result);
    expect(text).toContain("제22대");
  });

  it("committee_report 프롬프트가 위원회 이름을 포함한다", async () => {
    const server = createServer();
    registerPrompts(server);
    const prompts = getRegisteredPrompts(server);
    const result = await prompts["committee_report"].callback({ committee_name: "교육위원회" }, {});
    const text = JSON.stringify(result);
    expect(text).toContain("교육위원회");
    expect(text).toContain("활동 현황");
  });
});

// ---------------------------------------------------------------------------
// Server buildMcpServer (profile branching)
// ---------------------------------------------------------------------------

describe("server profile branching", () => {
  it("buildMcpServer 함수가 export된다", async () => {
    const mod = await import("../../src/server.js");
    expect(mod.createServer).toBeDefined();
    expect(typeof mod.createServer).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Resources (static-data.ts)
// ---------------------------------------------------------------------------

describe("registerResources", () => {
  it("registerResources 함수가 export된다", async () => {
    const mod = await import("../../src/resources/static-data.js");
    expect(mod.registerResources).toBeDefined();
    expect(typeof mod.registerResources).toBe("function");
  });

  it("5개 리소스를 등록한다", async () => {
    const { registerResources } = await import("../../src/resources/static-data.js");
    const server = createServer();
    const config = createTestConfig();
    registerResources(server, config);
    const resources = (server as any)._registeredResources;
    expect(Object.keys(resources)).toHaveLength(5);
    expect(resources["assembly://api-catalog"]).toBeDefined();
    expect(resources["assembly://tools-guide"]).toBeDefined();
    expect(resources["assembly://parties"]).toBeDefined();
    expect(resources["assembly://committees"]).toBeDefined();
    expect(resources["assembly://sessions"]).toBeDefined();
  });

  it("parties 리소스가 정당 목록을 반환한다", async () => {
    const { registerResources } = await import("../../src/resources/static-data.js");
    const server = createServer();
    const config = createTestConfig();
    registerResources(server, config);
    const resources = (server as any)._registeredResources;
    const result = await resources["assembly://parties"].readCallback();
    const text = result.contents[0].text;
    expect(text).toContain("더불어민주당");
    expect(text).toContain("국민의힘");
  });

  it("committees 리소스가 위원회 목록을 반환한다", async () => {
    const { registerResources } = await import("../../src/resources/static-data.js");
    const server = createServer();
    const config = createTestConfig();
    registerResources(server, config);
    const resources = (server as any)._registeredResources;
    const result = await resources["assembly://committees"].readCallback();
    const text = result.contents[0].text;
    expect(text).toContain("법제사법위원회");
  });

  it("sessions 리소스가 회기 정보를 반환한다", async () => {
    const { registerResources } = await import("../../src/resources/static-data.js");
    const server = createServer();
    const config = createTestConfig();
    registerResources(server, config);
    const resources = (server as any)._registeredResources;
    const result = await resources["assembly://sessions"].readCallback();
    const text = result.contents[0].text;
    expect(text).toContain("제22대 국회");
    expect(text).toContain("currentAge");
  });

  it("tools-guide 리소스가 Lite 프로필 도구를 반환한다", async () => {
    const { registerResources } = await import("../../src/resources/static-data.js");
    const server = createServer();
    const config = createTestConfig();
    registerResources(server, config);
    const resources = (server as any)._registeredResources;
    const result = await resources["assembly://tools-guide"].readCallback();
    const text = result.contents[0].text;
    expect(text).toContain("assembly_member");
    expect(text).toContain("assembly_bill");
    expect(text).toContain("assembly_session");
  });
});
