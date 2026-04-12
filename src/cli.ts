#!/usr/bin/env node
/**
 * 국회 API CLI — MCP 서버 없이 터미널에서 직접 국회 데이터를 조회합니다.
 *
 * 사용법:
 *   npx tsx src/cli.ts members                    # 전체 의원 목록
 *   npx tsx src/cli.ts members --name 이재명       # 이름으로 검색
 *   npx tsx src/cli.ts members --party 국민의힘     # 정당으로 검색
 *   npx tsx src/cli.ts bills                       # 의안 목록
 *   npx tsx src/cli.ts bills --name 교육            # 의안명 검색
 *   npx tsx src/cli.ts bill-detail <BILL_ID>       # 의안 상세
 *   npx tsx src/cli.ts votes                       # 표결 목록
 *   npx tsx src/cli.ts pending                     # 계류 의안
 *   npx tsx src/cli.ts processed                   # 처리 의안
 *   npx tsx src/cli.ts recent                      # 최근 본회의 처리
 *   npx tsx src/cli.ts plenary                     # 본회의부의안건
 *   npx tsx src/cli.ts meta                        # 전체 API 목록
 *   npx tsx src/cli.ts test                        # 전체 API 작동 테스트
 *   npx tsx src/cli.ts lawmaking --type notice    # 국민참여입법센터 API
 */

import "dotenv/config";
import { loadConfig, type AppConfig } from "./config.js";
import { createApiClient } from "./api/client.js";
import { createLawmakingClient } from "./api/lawmaking.js";
import { createNaboClient } from "./api/nabo.js";
import { API_CODES, CURRENT_AGE } from "./api/codes.js";

// config와 api는 실제 명령 실행 시에만 초기화 (--help 시 불필요)
let _config: AppConfig | undefined;
let _api: ReturnType<typeof createApiClient> | undefined;

function getConfig(): AppConfig {
  if (!_config) _config = loadConfig();
  return _config;
}

function getApi(): ReturnType<typeof createApiClient> {
  if (!_api) _api = createApiClient(getConfig());
  return _api;
}

function getLawmaking(): ReturnType<typeof createLawmakingClient> {
  return createLawmakingClient(getConfig());
}

function getNabo(): ReturnType<typeof createNaboClient> {
  return createNaboClient(getConfig());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(args: string[]): { command: string; flags: Record<string, string> } {
  const command = args[0] ?? "help";
  const flags: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i]?.startsWith("--") && args[i + 1] && !args[i + 1].startsWith("--")) {
      flags[args[i].slice(2)] = args[i + 1]!;
      i++;
    } else if (!args[i]?.startsWith("--")) {
      flags._positional = args[i]!;
    }
  }
  return { command, flags };
}

function printTable(rows: readonly Record<string, unknown>[], columns: string[]): void {
  if (rows.length === 0) {
    console.log("  (데이터 없음)");
    return;
  }

  // Column widths
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
    for (const row of rows) {
      const val = String(row[col] ?? "");
      widths[col] = Math.max(widths[col]!, val.length > 40 ? 40 : val.length);
    }
  }

  // Header
  const header = columns.map((c) => c.padEnd(widths[c]!)).join(" | ");
  console.log(header);
  console.log(columns.map((c) => "-".repeat(widths[c]!)).join("-+-"));

  // Rows
  for (const row of rows) {
    const line = columns
      .map((c) => {
        const val = String(row[c] ?? "");
        return (val.length > 40 ? val.slice(0, 37) + "..." : val).padEnd(widths[c]!);
      })
      .join(" | ");
    console.log(line);
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdMembers(flags: Record<string, string>): Promise<void> {
  const params: Record<string, string | number> = {
    pSize: Number(flags.size ?? 20),
  };
  if (flags.name) params.HG_NM = flags.name;
  if (flags.party) params.POLY_NM = flags.party;
  if (flags.district) params.ORIG_NM = flags.district;

  const result = await getApi().fetchOpenAssembly(API_CODES.MEMBER_INFO, params);
  console.log(`\n국회의원 검색 결과 (총 ${result.totalCount}명)\n`);
  printTable(result.rows, ["HG_NM", "POLY_NM", "ORIG_NM", "REELE_GBN_NM", "CMITS", "TEL_NO"]);
}

async function cmdBills(flags: Record<string, string>): Promise<void> {
  const params: Record<string, string | number> = {
    AGE: Number(flags.age ?? CURRENT_AGE),
    pSize: Number(flags.size ?? 20),
  };
  if (flags["bill-no"]) params.BILL_NO = flags["bill-no"];
  if (flags.name) params.BILL_NAME = flags.name;
  if (flags.proposer) params.PROPOSER = flags.proposer;

  const result = await getApi().fetchOpenAssembly(API_CODES.MEMBER_BILLS, params);
  console.log(`\n의안 검색 결과 (총 ${result.totalCount}건)\n`);
  printTable(result.rows, ["BILL_NO", "BILL_NAME", "COMMITTEE", "PROPOSE_DT", "PROC_RESULT"]);
}

async function cmdBillDetail(flags: Record<string, string>): Promise<void> {
  const billId = flags._positional;
  if (!billId) {
    console.error("사용법: cli bill-detail <BILL_ID>");
    process.exit(1);
  }
  const result = await getApi().fetchOpenAssembly(API_CODES.BILL_DETAIL, { BILL_ID: billId });
  if (result.rows.length === 0) {
    console.log(`의안 ID "${billId}"를 찾을 수 없습니다.`);
    return;
  }
  console.log(`\n의안 상세정보\n`);
  for (const [k, v] of Object.entries(result.rows[0]!)) {
    console.log(`  ${k}: ${v}`);
  }
}

async function cmdVotes(flags: Record<string, string>): Promise<void> {
  const params: Record<string, string | number> = {
    AGE: Number(flags.age ?? CURRENT_AGE),
    pSize: Number(flags.size ?? 20),
  };
  const result = await getApi().fetchOpenAssembly(API_CODES.VOTE_BY_BILL, params);
  console.log(`\n의안별 표결 현황 (총 ${result.totalCount}건)\n`);
  printTable(result.rows, ["BILL_NO", "BILL_NAME", "PROC_DT", "CURR_COMMITTEE"]);
}

async function cmdPending(flags: Record<string, string>): Promise<void> {
  const result = await getApi().fetchOpenAssembly(API_CODES.BILL_PENDING, {
    pSize: Number(flags.size ?? 20),
  });
  console.log(`\n계류 의안 (총 ${result.totalCount}건)\n`);
  printTable(result.rows, ["BILL_NO", "BILL_NAME", "PROPOSER", "PROPOSER_KIND"]);
}

async function cmdProcessed(flags: Record<string, string>): Promise<void> {
  const result = await getApi().fetchOpenAssembly(API_CODES.BILL_PROCESSED, {
    AGE: Number(flags.age ?? CURRENT_AGE),
    pSize: Number(flags.size ?? 20),
  });
  console.log(`\n처리 의안 (총 ${result.totalCount}건)\n`);
  printTable(result.rows, ["BILL_NO", "BILL_NAME", "PROPOSER", "PROPOSER_KIND"]);
}

async function cmdRecent(flags: Record<string, string>): Promise<void> {
  const result = await getApi().fetchOpenAssembly("nxjuyqnxadtotdrbw", {
    AGE: Number(flags.age ?? CURRENT_AGE),
    pSize: Number(flags.size ?? 20),
  });
  console.log(`\n최근 본회의 처리 의안 (총 ${result.totalCount}건)\n`);
  printTable(result.rows, ["BILL_NO", "BILL_NAME", "PROPOSER", "PROPOSER_KIND"]);
}

async function cmdPlenary(flags: Record<string, string>): Promise<void> {
  const result = await getApi().fetchOpenAssembly(API_CODES.PLENARY_AGENDA, {
    pSize: Number(flags.size ?? 20),
  });
  console.log(`\n본회의 부의안건 (총 ${result.totalCount}건)\n`);
  printTable(result.rows, ["BILL_NO", "BILL_NAME", "CURR_COMMITTEE"]);
}

async function cmdActivity(flags: Record<string, string>): Promise<void> {
  const name = flags.name ?? flags._positional;
  if (!name) {
    console.error("사용법: cli activity --name <의원이름>");
    process.exit(1);
  }

  // 의원 기본정보
  const member = await getApi().fetchOpenAssembly(API_CODES.MEMBER_INFO, { HG_NM: name, pSize: 1 });
  if (member.rows.length === 0) {
    console.log(`"${name}" 의원을 찾을 수 없습니다.`);
    return;
  }
  const m = member.rows[0]!;
  console.log(`\n■ ${m.HG_NM} (${m.POLY_NM}, ${m.ORIG_NM})`);
  console.log(`  당선: ${m.REELE_GBN_NM} | 위원회: ${m.CMITS}\n`);

  // 발의 법안
  const bills = await getApi().fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
    AGE: Number(flags.age ?? CURRENT_AGE),
    PROPOSER: name,
    pSize: Number(flags.size ?? 10),
  });
  console.log(`■ 발의 법안 (총 ${bills.totalCount}건)\n`);
  printTable(bills.rows, ["BILL_NO", "BILL_NAME", "COMMITTEE", "PROC_RESULT"]);
}

async function cmdMeta(): Promise<void> {
  const result = await getApi().fetchOpenAssembly(API_CODES.META_API_LIST, { pSize: 300 });
  console.log(`\n열린국회정보 전체 API 목록 (${result.totalCount}개)\n`);
  printTable(result.rows, ["INF_ID", "INF_NM", "CATE_NM", "ORG_NM"]);
}

// lawmaking API 타입 (CLI에서 직접 지정)
type LawmakingApiType = "status" | "plan" | "notice" | "admin" | "interpretation" | "opinion";

// lawmaking API 응답에서 리스트 추출 헬퍼
function extractLawmakingRows(result: Record<string, unknown>): Record<string, unknown>[] {
  const res = (result as Record<string, unknown>).result as Record<string, unknown> | undefined;
  if (!res) return [];
  const list = res.list as Record<string, unknown> | undefined;
  if (!list) return [];
  const firstKey = Object.keys(list)[0];
  if (!firstKey) return [];
  const arr = list[firstKey];
  return Array.isArray(arr) ? arr as Record<string, unknown>[] : [];
}

async function cmdLawmaking(flags: Record<string, string>): Promise<void> {
  const type = (flags.type ?? "notice") as LawmakingApiType;
  const key = flags.key ?? undefined;
  const pageSize = Number(flags.size ?? 20);

  let result: Record<string, unknown>;

  switch (type) {
    case "status":
      result = await getLawmaking().getLegislations({});
      break;
    case "plan":
      result = await getLawmaking().getLegislationPlan({ srchTxt: key });
      break;
    case "notice":
      result = await getLawmaking().getLegislationNotices({
        diff: key ?? "0",
        lsNm: flags.keyword,
        lsClsCd: flags.ls,
        pntcNo: undefined,
        stYdFmt: flags.st,
        edYdFmt: flags.ed,
        cptOfiOrgCd: undefined,
      });
      break;
    case "admin":
      result = await getLawmaking().getAdminNotices({
        lsClsCd: flags.ls,
        closing: flags.closing,
        asndOfiNm: undefined,
        stYdFmt: flags.st,
        edYdFmt: flags.ed,
        admRulNm: key,
      });
      break;
    case "interpretation":
      result = await getLawmaking().getInterpretations({
        schKeyword: key,
        prdFrDay: flags.fr,
        prdToDay: flags.to,
        lsCptOrg: flags.org,
      });
      break;
    case "opinion":
      result = await getLawmaking().getOpinionCases({
        scFmDt: flags.fr,
        scToDt: flags.to,
        scTextType: flags.searchType as "caseNm" | "caseNo" | "reqOrgNm" | undefined,
        scText: key,
      });
      break;
    default:
      console.error(`알 수 없는 타입: ${type}`);
      process.exit(1);
  }

  const rows = extractLawmakingRows(result);
  console.log(`\n국민참여입법센터 API: ${type} (총 ${rows.length}건)\n`);
  printTable(rows.slice(0, pageSize), Object.keys(rows[0] ?? {}));
}

// ---------------------------------------------------------------------------
// NABO CLI
// ---------------------------------------------------------------------------

type NaboCliType = "report" | "periodical" | "recruitments";

async function cmdNabo(flags: Record<string, string>): Promise<void> {
  const type = (flags.type ?? "report") as NaboCliType;
  const key = flags.key ?? undefined;
  const page = Number(flags.page ?? 1);
  const pageSize = Number(flags.size ?? 20);

  let result: import("./api/nabo.js").NaboApiResult;

  switch (type) {
    case "report":
      result = await getNabo().searchReports({ page, size: pageSize, scSw: key });
      break;
    case "periodical":
      result = await getNabo().searchPeriodicals({ page, size: pageSize, scSw: key });
      break;
    case "recruitments":
      result = await getNabo().searchRecruitments({ page, size: pageSize, scSw: key });
      break;
    default:
      console.error(`알 수 없는 타입: ${type}`);
      process.exit(1);
  }

  console.log(`\nNABO API: ${type} (총 ${result.total}건, ${result.page}/${Math.ceil(result.total / result.size)}페이지)\n`);
  printTable(result.items as unknown as Record<string, unknown>[], ["subj", "cdNm", "pubDt", "count"]);
}

async function cmdCross(flags: Record<string, string>): Promise<void> {
  const keyword = flags.keyword ?? flags._positional;
  if (!keyword) {
    console.error("사용법: cli cross --keyword <검색어> [--sources assembly,lawmaking,nabo] [--size 5]");
    process.exit(1);
  }

  const size = Number(flags.size ?? 5);
  const sourceFlag = flags.sources ?? "all";
  const sources = sourceFlag === "all"
    ? ["assembly", "lawmaking", "nabo"] as const
    : sourceFlag.split(",").map((s) => s.trim()) as ("assembly" | "lawmaking" | "nabo")[];

  console.log(`\n=== "${keyword}" 교차 검색 (${sources.join(", ")}) ===\n`);

  const promises: Promise<{ source: string; result: unknown; error?: string }>[] = [];

  if (sources.includes("assembly")) {
    promises.push(
      getApi()
        .fetchOpenAssembly(API_CODES.MEMBER_BILLS, {
          AGE: 22,
          BILL_NAME: keyword,
          pSize: size,
        })
        .then((r) => ({ source: "국회(assembly)", result: r }))
        .catch((e: unknown) => ({ source: "국회(assembly)", result: null, error: e instanceof Error ? e.message : String(e) })),
    );
  }

  if (sources.includes("lawmaking")) {
    promises.push(
      getLawmaking()
        .getLegislationNotices({ lsNm: keyword })
        .then((r) => ({ source: "국민참여입법센터(lawmaking)", result: r }))
        .catch((e: unknown) => ({ source: "국민참여입법센터(lawmaking)", result: null, error: e instanceof Error ? e.message : String(e) })),
    );
  }

  if (sources.includes("nabo")) {
    promises.push(
      getNabo()
        .searchReports({ page: 1, size, scSw: keyword })
        .then((r) => ({ source: "NABO(nabo.go.kr)", result: r }))
        .catch((e: unknown) => ({ source: "NABO(nabo.go.kr)", result: null, error: e instanceof Error ? e.message : String(e) })),
    );
  }

  const settled = await Promise.allSettled(promises);
  let hasResults = false;

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      console.log(`[오류] ${outcome.reason}`);
      continue;
    }
    const { source, result, error } = outcome.value;

    if (error) {
      console.log(`[${source}] 오류: ${error}\n`);
      continue;
    }

    if (source === "국회(assembly)" && result && typeof result === "object" && "totalCount" in result) {
      const r = result as { totalCount: number; rows: readonly Record<string, unknown>[] };
      console.log(`[${source}] 의안 검색 (총 ${r.totalCount}건)`);
      if (r.rows.length > 0) {
        printTable(r.rows.slice(0, size), ["BILL_NO", "BILL_NAME", "COMMITTEE", "PROC_RESULT"]);
      }
      console.log();
      hasResults = true;
    } else if (source === "국민참여입법센터(lawmaking)" && result && typeof result === "object") {
      const rows = extractLawmakingRows(result as Record<string, unknown>);
      console.log(`[${source}] 입법예고 (총 ${rows.length}건)`);
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]!).filter((k) => !k.startsWith("@_"));
        printTable(rows.slice(0, size), cols.slice(0, 5));
      }
      console.log();
      hasResults = true;
    } else if (source === "NABO(nabo.go.kr)" && result && typeof result === "object" && "total" in result) {
      const r = result as { total: number; items: readonly { subj: string; cdNm: string; pubDt: string }[] };
      console.log(`[${source}] NABO 보고서 (총 ${r.total}건)`);
      if (r.items.length > 0) {
        printTable(r.items.slice(0, size) as unknown as Record<string, unknown>[], ["subj", "cdNm", "pubDt"]);
      }
      console.log();
      hasResults = true;
    }
  }

  if (!hasResults) {
    console.log("검색 결과가 없습니다.");
  }
}

async function cmdTest(): Promise<void> {
  console.log("\n=== 전체 API 작동 테스트 ===\n");

  const tests: [string, string, Record<string, string | number>][] = [
    [API_CODES.MEMBER_INFO, "의원 인적사항", {}],
    [API_CODES.MEMBER_BILLS, "의원 발의법률안", { AGE: CURRENT_AGE }],
    [API_CODES.BILL_SEARCH, "의안 통합검색", { AGE: CURRENT_AGE }],
    [API_CODES.BILL_RECEIVED, "의안 접수목록", {}],
    [API_CODES.BILL_REVIEW, "의안 심사정보", {}],
    [API_CODES.BILL_PENDING, "계류의안", {}],
    [API_CODES.BILL_PROCESSED, "처리의안", { AGE: CURRENT_AGE }],
    [API_CODES.PLENARY_AGENDA, "본회의부의안건", {}],
    [API_CODES.VOTE_BY_BILL, "의안별 표결", { AGE: CURRENT_AGE }],
    [API_CODES.VOTE_PLENARY, "본회의 표결", { AGE: CURRENT_AGE }],
    [API_CODES.META_API_LIST, "메타 API", {}],
  ];

  let ok = 0;
  for (const [code, name, params] of tests) {
    try {
      const r = await getApi().fetchOpenAssembly(code, { pSize: 1, ...params });
      const status = r.totalCount > 0 ? "✓" : "·";
      if (r.totalCount > 0) ok++;
      console.log(`${status} ${name.padEnd(18)} ${String(r.totalCount).padStart(8)}건`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${name.padEnd(18)} ERR: ${msg.slice(0, 50)}`);
    }
  }
  console.log(`\n결과: ${ok}/${tests.length} API 정상 작동`);
}

function printHelp(): void {
  console.log(`
국회 API CLI — assembly-api-mcp

사용법:
  npx tsx src/cli.ts <command> [options]

명령어:
  members              국회의원 검색
    --name <이름>       의원 이름
    --party <정당>      정당명
    --district <선거구>  선거구

  bills                의안 검색
    --bill-no <번호>    의안번호 (예: 2204567)
    --name <의안명>     의안명 검색
    --proposer <제안자>  제안자 이름
    --age <대수>        대수 (기본: 22)

  activity             의원 의정활동 검색
    --name <이름>       의원 이름 (필수)

  bill-detail <ID>     의안 상세 (BILL_ID 필요)
  votes                의안별 표결 현황
  pending              계류 의안
  processed            처리 의안
  recent               최근 본회의 처리
  plenary              본회의 부의안건
  meta                 전체 API 목록 (276개)
  test                 전체 API 작동 테스트
  lawmaking            국민참여입법센터 API
    --type <type>      notice(기본)|status|plan|admin|interpretation|opinion
    --key <값>         검색어 또는 차수 (diff)
    --keyword <단어>    법령명 검색어
    --ls <코드>         법령분류코드
    --st <날짜>        시작일자 (YYYY.MM.DD)
    --ed <날짜>        종료일자 (YYYY.MM.DD)
    --fr <날짜>        검색기간 시작
    --to <날짜>        검색기간 종료
    --org <코드>        소관기관 코드
    --closing <Y|N>     마감여부 (admin)
    --diff <차수>       예고 차수
    --searchType <유형>  검색구분 (opinion: caseNm|caseNo|reqOrgNm)

  nabo               国会예산정책처 NABO API
    --type <type>      report(기본)|periodical|recruitments
    --key <검색어>      검색어
    --page <숫자>       페이지 번호 (기본: 1)
    --size <숫자>       결과 수 (기본: 20)

  cross                교차 검색 (2~3개 API 소스 통합)
    --keyword <검색어>  필수: 검색어
    --sources <sources> 소스 선택 (기본: all, 예: assembly,lawmaking)
    --size <숫자>       소스당 결과 수 (기본: 5)
    예: npx tsx src/cli.ts cross --keyword 교육 --sources assembly,nabo

공통 옵션:
  --size <N>           결과 수 (기본: 20)
  --age <N>            대수 (기본: 22)
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  try {
    switch (command) {
      case "members":
        return cmdMembers(flags);
      case "bills":
        return cmdBills(flags);
      case "activity":
        return cmdActivity(flags);
      case "bill-detail":
        return cmdBillDetail(flags);
      case "votes":
        return cmdVotes(flags);
      case "pending":
        return cmdPending(flags);
      case "processed":
        return cmdProcessed(flags);
      case "recent":
        return cmdRecent(flags);
      case "plenary":
        return cmdPlenary(flags);
      case "meta":
        return cmdMeta();
      case "lawmaking":
        return cmdLawmaking(flags);
      case "nabo":
        return cmdNabo(flags);
      case "cross":
        return cmdCross(flags);
      case "test":
        return cmdTest();
      case "help":
      case "--help":
      case "-h":
        return printHelp();
      default:
        console.error(`알 수 없는 명령어: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n오류: ${message}`);
    process.exit(1);
  }
}

main();
