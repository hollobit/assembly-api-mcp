/**
 * lawmaking API 디버그 스크립트
 */
import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { createLawmakingClient } from "../src/api/lawmaking.js";

async function main() {
  const client = createLawmakingClient(loadConfig());

  console.log("=== 1. 입법예고 목록 (notice) ===");
  const notice = await client.getLegislationNotices({ diff: "0" });
  const r = notice as Record<string, unknown>;
  const res = r.result as Record<string, unknown>;
  const list = res.list as Record<string, unknown>;
  const firstKey = Object.keys(list)[0];
  const arr = list[firstKey] as unknown[];
  console.log("firstKey:", firstKey, "arr length:", arr.length);
  console.log("notice rows:", JSON.stringify(notice).slice(0, 200));

  console.log("\n=== 2. 입법현황 목록 (status) ===");
  const status = await client.getLegislations({});
  console.log(JSON.stringify(status, null, 2).slice(0, 500));

  console.log("\n=== 3. 입법계획 목록 (plan) ===");
  const plan = await client.getLegislationPlan({ srchTxt: "교육" });
  console.log(JSON.stringify(plan, null, 2).slice(0, 500));
}

main().catch(console.error);
