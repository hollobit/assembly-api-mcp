#!/usr/bin/env npx tsx
/**
 * 국회 API 코드 일괄 발굴 스크립트
 *
 * OPENSRVAPI 메타 API → Excel 스펙 다운로드 → 요청주소에서 코드 추출
 *
 * 사용법:
 *   ASSEMBLY_API_KEY=your-key npx tsx scripts/discover-all-codes.ts
 *   ASSEMBLY_API_KEY=your-key npx tsx scripts/discover-all-codes.ts --update-codes
 */

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.ASSEMBLY_API_KEY;
if (!API_KEY || API_KEY === "sample") {
  console.error("ERROR: 실제 ASSEMBLY_API_KEY가 필요합니다 (sample 키 불가)");
  console.error("사용법: ASSEMBLY_API_KEY=your-key npx tsx scripts/discover-all-codes.ts");
  process.exit(1);
}

const BASE_URL = "https://open.assembly.go.kr/portal/openapi";
const SPEC_DOWNLOAD_URL = "https://open.assembly.go.kr/portal/data/openapi/downloadOpenApiSpec.do";
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 15000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_PATH = resolve(__dirname, "../docs/discovered-all-codes.json");
const UPDATE_CODES = process.argv.includes("--update-codes");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiEntry {
  readonly infId: string;
  readonly name: string;
  readonly category: string;
  readonly orgName: string;
  readonly code: string | null;
  readonly status: "discovered" | "failed" | "no_code";
  readonly error?: string;
}

interface DiscoveryResult {
  readonly discoveredAt: string;
  readonly apiKey: string;
  readonly total: number;
  readonly discovered: number;
  readonly failed: number;
  readonly noCode: number;
  readonly apis: readonly ApiEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    if (text.trim().startsWith("<")) throw new Error("XML response");
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function downloadExcel(infId: string): Promise<Buffer | null> {
  const url = `${SPEC_DOWNLOAD_URL}?infId=${encodeURIComponent(infId)}&infSeq=2`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractCodeFromExcel(buffer: Buffer): string | null {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
      for (const row of data) {
        const values = Object.values(row);
        for (const cell of values) {
          const cellStr = String(cell ?? "");
          // 패턴 1: /portal/openapi/{CODE}?
          const match1 = cellStr.match(/\/portal\/openapi\/([A-Za-z0-9_]+)\??/);
          if (match1?.[1] && match1[1] !== "openapi") return match1[1];
          // 패턴 2: 요청주소 필드에 코드만 있는 경우
          const match2 = cellStr.match(/^(https?:\/\/[^/]+)?\/portal\/openapi\/([A-Za-z0-9_]+)/);
          if (match2?.[2] && match2[2] !== "openapi") return match2[2];
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  국회 API 코드 일괄 발굴 스크립트               ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log("");

  // Step 1: OPENSRVAPI에서 전체 API 목록 수집
  console.log("Step 1: OPENSRVAPI 전체 목록 조회 중...");
  const metaUrl = `${BASE_URL}/OPENSRVAPI?Type=json&pSize=300&KEY=${API_KEY}`;
  const metaRaw = await fetchJson(metaUrl) as Record<string, unknown>;

  const metaData = metaRaw["OPENSRVAPI"] as readonly Record<string, unknown>[] | undefined;
  if (!metaData || !Array.isArray(metaData) || metaData.length < 2) {
    console.error("ERROR: OPENSRVAPI 응답 파싱 실패");
    process.exit(1);
  }

  const head = (metaData[0] as Record<string, unknown>).head as readonly Record<string, unknown>[];
  const totalCount = (head[0] as Record<string, unknown>).list_total_count as number;
  const rows = (metaData[1] as Record<string, unknown>).row as readonly Record<string, unknown>[];

  console.log(`  → ${totalCount}개 API 발견 (${rows.length}개 로드됨)`);
  console.log("");

  // Step 2: 각 API의 Excel 스펙 다운로드 + 코드 추출
  console.log(`Step 2: Excel 스펙 다운로드 + 코드 추출 (배치 ${BATCH_SIZE}개씩)...`);
  console.log("");

  const results: ApiEntry[] = [];
  let discovered = 0;
  let failed = 0;
  let noCode = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (row): Promise<ApiEntry> => {
        const infId = String(row.INF_ID ?? "");
        const name = String(row.INF_NM ?? "");
        const category = String(row.CATE_NM ?? "");
        const orgName = String(row.ORG_NM ?? "");

        if (!infId) {
          return { infId, name, category, orgName, code: null, status: "failed", error: "no INF_ID" };
        }

        const excelBuffer = await downloadExcel(infId);
        if (!excelBuffer || excelBuffer.length < 100) {
          return { infId, name, category, orgName, code: null, status: "failed", error: "download failed" };
        }

        const code = extractCodeFromExcel(excelBuffer);
        if (!code) {
          return { infId, name, category, orgName, code: null, status: "no_code" };
        }

        return { infId, name, category, orgName, code, status: "discovered" };
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        const entry = result.value;
        results.push(entry);
        if (entry.status === "discovered") discovered++;
        else if (entry.status === "failed") failed++;
        else noCode++;

        const icon = entry.status === "discovered" ? "✓" : entry.status === "no_code" ? "·" : "✗";
        const codeStr = entry.code ? entry.code.substring(0, 20) : entry.error ?? "코드 없음";
        process.stdout.write(
          `  ${icon} ${String(results.length).padStart(3)}/${rows.length} ${entry.name.padEnd(30).substring(0, 30)} ${codeStr}\n`,
        );
      } else {
        results.push({
          infId: "unknown",
          name: "batch error",
          category: "",
          orgName: "",
          code: null,
          status: "failed",
          error: String(result.reason),
        });
        failed++;
      }
    }

    // Rate limit 보호
    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════════════");

  // Step 3: 카테고리별 통계
  const categories = new Map<string, { total: number; discovered: number; failed: number; noCode: number }>();
  for (const entry of results) {
    const cat = entry.category || "(미분류)";
    const stats = categories.get(cat) ?? { total: 0, discovered: 0, failed: 0, noCode: 0 };
    stats.total++;
    if (entry.status === "discovered") stats.discovered++;
    else if (entry.status === "failed") stats.failed++;
    else stats.noCode++;
    categories.set(cat, stats);
  }

  console.log("");
  console.log(`${"카테고리".padEnd(25)} ${"전체".padStart(5)} ${"발굴".padStart(5)} ${"실패".padStart(5)} ${"코드없음".padStart(7)}`);
  console.log("─".repeat(52));
  for (const [cat, stats] of [...categories.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(
      `${cat.padEnd(25).substring(0, 25)} ${String(stats.total).padStart(5)} ${String(stats.discovered).padStart(5)} ${String(stats.failed).padStart(5)} ${String(stats.noCode).padStart(7)}`,
    );
  }
  console.log("─".repeat(52));
  console.log(
    `${"합계".padEnd(25)} ${String(results.length).padStart(5)} ${String(discovered).padStart(5)} ${String(failed).padStart(5)} ${String(noCode).padStart(7)}`,
  );

  // Step 4: JSON 저장
  const output: DiscoveryResult = {
    discoveredAt: new Date().toISOString(),
    apiKey: `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`,
    total: results.length,
    discovered,
    failed,
    noCode,
    apis: results,
  };

  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log("");
  console.log(`결과 저장: ${OUTPUT_PATH}`);
  console.log(`신규 발굴: ${discovered}개 (기존 44 → ${discovered})`);

  // Step 5: codes.ts 업데이트 (옵션)
  if (UPDATE_CODES) {
    console.log("");
    console.log("Step 5: codes.ts 업데이트 중...");

    const codesPath = resolve(__dirname, "../src/api/codes.ts");
    const existingCodes = readFileSync(codesPath, "utf-8");

    // 기존 codes.ts에 이미 등록된 코드값 추출
    const registeredValues = new Set<string>();
    const codeMatches = existingCodes.matchAll(/"([^"]+)"/g);
    for (const m of codeMatches) {
      registeredValues.add(m[1]);
    }

    // 신규 발굴 코드 중 미등록 코드 식별
    const newCodes = results
      .filter((e) => e.status === "discovered" && e.code && !registeredValues.has(e.code))
      .map((e) => ({ code: e.code!, name: e.name, category: e.category }));

    if (newCodes.length === 0) {
      console.log("  → 신규 등록할 코드 없음 (전부 등록됨)");
    } else {
      console.log(`  → 신규 ${newCodes.length}개 코드 발견`);

      // 카테고리별로 그룹핑하여 codes.ts 하단에 추가할 텍스트 생성
      const grouped = new Map<string, Array<{ code: string; name: string }>>();
      for (const c of newCodes) {
        const cat = c.category || "기타";
        const arr = grouped.get(cat) ?? [];
        arr.push({ code: c.code, name: c.name });
        grouped.set(cat, arr);
      }

      const lines: string[] = ["\n  // ── 자동 발굴 코드 ─────────────────────────────────"];
      for (const [cat, codes] of grouped) {
        lines.push(`  // ${cat}`);
        for (const { code, name } of codes) {
          const key = name
            .replace(/[^a-zA-Z0-9가-힣\s]/g, "")
            .replace(/\s+/g, "_")
            .toUpperCase()
            .substring(0, 30);
          lines.push(`  /** ${name} */`);
          lines.push(`  DISCOVERED_${key}: "${code}",`);
        }
      }

      // codes.ts의 } as const 앞에 삽입
      const insertPoint = existingCodes.lastIndexOf("} as const");
      if (insertPoint > 0) {
        const updated = existingCodes.substring(0, insertPoint) + lines.join("\n") + "\n" + existingCodes.substring(insertPoint);
        writeFileSync(codesPath, updated, "utf-8");
        console.log(`  → codes.ts에 ${newCodes.length}개 코드 추가됨`);
      }
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log(`완료! 발굴율: ${Math.round((discovered / results.length) * 100)}%`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
