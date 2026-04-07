/**
 * Lite 프로필 도구 통합 등록
 *
 * 6개 도구를 등록합니다:
 * - assembly_member (의원 검색+분석)
 * - assembly_bill (의안 검색+추적+통계)
 * - assembly_session (일정+회의록+표결)
 * - assembly_org (위원회+청원+입법예고)
 * - discover_apis (276개 API 탐색, 기존 재사용)
 * - query_assembly (범용 API 호출, 기존 재사용)
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../../config.js";
import { registerAssemblyMemberTool } from "./assembly-member.js";
import { registerAssemblyBillTool } from "./assembly-bill.js";
import { registerAssemblySessionTool } from "./assembly-session.js";
import { registerAssemblyOrgTool } from "./assembly-org.js";
import { registerDiscoverTools } from "../discover.js";
import { registerQueryTools } from "../query.js";

export function registerLiteTools(
  server: McpServer,
  config: AppConfig,
): void {
  // 통합 도구 (4개)
  registerAssemblyMemberTool(server, config);
  registerAssemblyBillTool(server, config);
  registerAssemblySessionTool(server, config);
  registerAssemblyOrgTool(server, config);

  // 범용 도구 (2개, 기존 재사용)
  registerDiscoverTools(server, config);
  registerQueryTools(server, config);
}
