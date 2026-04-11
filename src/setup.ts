/**
 * 대화형 설치 마법사
 *
 * `npx assembly-api-mcp setup` 명령으로 실행됩니다.
 * API 키를 입력받고, 선택한 AI 클라이언트의 설정 파일에 자동으로 MCP 서버를 등록합니다.
 */

import { createInterface } from "node:readline/promises";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir, platform } from "node:os";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientConfig {
  readonly name: string;
  readonly configPath: string;
  readonly format: "mcpServers" | "servers";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDistIndexPath(): string {
  // dist/setup.js → dist/index.js
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "index.js");
}

function detectClients(): readonly ClientConfig[] {
  const home = homedir();
  const os = platform();

  const clients: ClientConfig[] = [];

  // Claude Desktop
  const claudeDesktopPaths: Record<string, string> = {
    darwin: resolve(home, "Library/Application Support/Claude/claude_desktop_config.json"),
    win32: resolve(process.env["APPDATA"] ?? resolve(home, "AppData/Roaming"), "Claude/claude_desktop_config.json"),
    linux: resolve(home, ".config/Claude/claude_desktop_config.json"),
  };
  const claudePath = claudeDesktopPaths[os];
  if (claudePath) {
    clients.push({ name: "Claude Desktop", configPath: claudePath, format: "mcpServers" });
  }

  // Claude Code (.mcp.json in cwd)
  clients.push({ name: "Claude Code (현재 디렉토리)", configPath: resolve(process.cwd(), ".mcp.json"), format: "mcpServers" });

  // Cursor
  const cursorPath = resolve(home, ".cursor/mcp.json");
  clients.push({ name: "Cursor", configPath: cursorPath, format: "mcpServers" });

  // VS Code
  const vscodePath = resolve(process.cwd(), ".vscode/mcp.json");
  clients.push({ name: "VS Code (현재 디렉토리)", configPath: vscodePath, format: "servers" });

  // Windsurf
  const windsurfPath = resolve(home, ".codeium/windsurf/mcp_config.json");
  clients.push({ name: "Windsurf", configPath: windsurfPath, format: "mcpServers" });

  // Gemini CLI
  const geminiPath = resolve(home, ".gemini/settings.json");
  clients.push({ name: "Gemini CLI", configPath: geminiPath, format: "mcpServers" });

  return clients;
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  if (!existsSync(path)) return {};
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function writeJsonFile(path: string, data: Record<string, unknown>): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function buildServerEntry(apiKey: string, profile: string, lawmakingOc?: string): Record<string, unknown> {
  const env: Record<string, string> = {
    ASSEMBLY_API_KEY: apiKey,
    MCP_TRANSPORT: "stdio",
    MCP_PROFILE: profile,
  };
  if (lawmakingOc) {
    env.LAWMKING_OC = lawmakingOc;
  }
  return {
    command: "npx",
    args: ["-y", "assembly-api-mcp"],
    env,
  };
}

// ---------------------------------------------------------------------------
// Main setup flow
// ---------------------------------------------------------------------------

export async function runSetup(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log("");
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║   국회 API MCP 서버 — 설치 마법사            ║");
    console.log("║   assembly-api-mcp setup                     ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log("");

    // Step 1: API 키 입력
    console.log("📋 Step 1: API 키 설정");
    console.log("   열린국회정보 API 키가 필요합니다.");
    console.log("   발급: https://open.assembly.go.kr → 회원가입 → 마이페이지 → OPEN API → 인증키 발급");
    console.log("   (테스트용으로 'sample' 입력 시 최대 10건 조회 가능)");
    console.log("");

    const apiKey = await rl.question("   API 키를 입력하세요: ");
    if (!apiKey.trim()) {
      console.log("\n   ⚠️  API 키가 입력되지 않았습니다. 'sample'을 사용합니다.");
    }
    const finalKey = apiKey.trim() || "sample";

    // Step 1.5: 국민참여입법센터 OC 키 (선택)
    console.log("");
    console.log("📋 Step 1.5: 국민참여입법센터 API 키 (선택)");
    console.log("   입법현황/예고, 행정예고, 법령해석례, 의견제시사례 API 사용 시 필요.");
    console.log("   발급: https://opinion.lawmaking.go.kr → 정보공개 서비스 신청 → OC 발급");
    console.log("   (미입력 시 해당 API는 사용할 수 없습니다)");
    console.log("");

    const lawmakingOc = await rl.question("   OC를 입력하세요 (Enter: 건너뛰기): ");
    const lawmakingOcValue = lawmakingOc.trim() || undefined;

    // Step 2: 프로필 선택
    console.log("");
    console.log("📋 Step 2: 프로필 선택");
    console.log("   1) lite — 6개 통합 도구 (기본, 권장)");
    console.log("   2) full — 10개 도구 (파워유저)");
    console.log("");

    const profileChoice = await rl.question("   선택 [1]: ");
    const profile = profileChoice.trim() === "2" ? "full" : "lite";
    console.log(`   → ${profile} 프로필 선택됨`);

    // Step 3: 클라이언트 선택
    console.log("");
    console.log("📋 Step 3: AI 클라이언트 설정");
    console.log("   설정할 클라이언트를 선택하세요 (복수 선택 가능, 쉼표 구분):");
    console.log("");

    const clients = detectClients();
    for (let i = 0; i < clients.length; i++) {
      const exists = existsSync(clients[i]!.configPath) ? " (설정 파일 존재)" : "";
      console.log(`   ${i + 1}) ${clients[i]!.name}${exists}`);
    }
    console.log("");

    const clientChoice = await rl.question("   선택 [1]: ");
    const selectedIndices = (clientChoice.trim() || "1")
      .split(",")
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < clients.length);

    if (selectedIndices.length === 0) {
      console.log("\n   ⚠️  유효한 선택이 없습니다. Claude Desktop(1)을 기본으로 설정합니다.");
      selectedIndices.push(0);
    }

    // Step 4: 설정 파일 업데이트
    console.log("");
    console.log("📋 Step 4: 설정 적용 중...");
    console.log("");

    const serverEntry = buildServerEntry(finalKey, profile, lawmakingOcValue);

    for (const idx of selectedIndices) {
      const client = clients[idx]!;
      try {
        const config = await readJsonFile(client.configPath);

        if (client.format === "servers") {
          // VS Code 형식
          const servers = (config["servers"] ?? {}) as Record<string, unknown>;
          servers["assembly-api"] = serverEntry;
          config["servers"] = servers;
        } else {
          // mcpServers 형식
          const mcpServers = (config["mcpServers"] ?? {}) as Record<string, unknown>;
          mcpServers["assembly-api"] = serverEntry;
          config["mcpServers"] = mcpServers;
        }

        await writeJsonFile(client.configPath, config);
        console.log(`   ✅ ${client.name}: ${client.configPath}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`   ❌ ${client.name}: ${message}`);
      }
    }

    // Step 5: 완료
    console.log("");
    console.log("═══════════════════════════════════════════════");
    console.log("✅ 설치 완료!");
    console.log("");
    console.log("다음 단계:");
    console.log("  • Claude Desktop → 완전 종료(Cmd+Q) 후 재시작");
    console.log("  • Cursor/VS Code → 재시작 또는 MCP 서버 새로고침");
    console.log("");
    console.log("사용 예시 (AI에게 질문):");
    console.log('  • "현재 국회의원 목록을 보여줘"');
    console.log('  • "교육 관련 의안을 검색해줘"');
    console.log('  • "이재명 의원의 의정활동을 분석해줘"');
    console.log("═══════════════════════════════════════════════");
    console.log("");
  } finally {
    rl.close();
  }
}
