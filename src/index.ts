#!/usr/bin/env node
/**
 * 국회 API MCP 서버 진입점
 *
 * StdioServerTransport를 통해 MCP 클라이언트(Claude Desktop, VS Code 등)와 통신합니다.
 * 환경 변수 로드 → 설정 검증 → MCP 서버 시작 순으로 초기화됩니다.
 */

import "dotenv/config";
import { createServer } from "./server.js";
import { loadConfig, loadRemoteConfig } from "./config.js";

async function main(): Promise<void> {
  // 서브커맨드 감지
  const command = process.argv[2];

  // setup 명령: npx assembly-api-mcp setup
  if (command === "setup") {
    const { runSetup } = await import("./setup.js");
    await runSetup();
    return;
  }

  // remote 명령: 원격 서버 모드 (API 키 없이 시작, 사용자가 URL로 전달)
  const isRemote = command === "remote";

  let config;
  try {
    config = isRemote ? loadRemoteConfig() : loadConfig();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[assembly-api-mcp] 설정 오류: ${message}\n`);
    process.exit(1);
  }

  try {
    await createServer(config);
    if (isRemote) {
      const { port } = config.server;
      process.stderr.write(
        `[assembly-api-mcp] 원격 MCP 서버가 시작되었습니다.\n` +
        `  엔드포인트: http://localhost:${port}/mcp?key=YOUR_API_KEY&profile=lite\n`,
      );
    } else {
      process.stderr.write("[assembly-api-mcp] MCP 서버가 시작되었습니다.\n");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[assembly-api-mcp] 서버 시작 실패: ${message}\n`);
    process.exit(1);
  }
}

main();
