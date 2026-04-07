/**
 * MCP Prompt Templates
 *
 * 국회 데이터 분석을 위한 프롬프트 템플릿을 제공합니다.
 * - analyze_member_activity: 의원 의정활동 종합 분석
 * - summarize_recent_bills: 최근 의안 요약
 * - committee_report: 위원회 활동 현황 보고
 */

import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "analyze_member_activity",
    "특정 의원의 의정활동을 종합 분석합니다",
    { member_name: z.string().describe("분석할 의원 이름") },
    async ({ member_name }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `다음 의원의 의정활동을 종합적으로 분석해주세요: ${member_name}`,
            "",
            "분석 항목:",
            "1. 기본 인적사항 (소속 정당, 선거구, 당선 횟수)",
            "2. 대표 발의 법안 목록과 주요 내용",
            "3. 소속 위원회 활동 현황",
            "4. 본회의 출석률 및 표결 참여율",
            "5. 최근 주요 의정활동 요약",
            "",
            "assembly_member(analyze=true), assembly_bill 도구를 활용하여 데이터를 수집한 후,",
            "객관적인 데이터를 기반으로 종합 분석 보고서를 작성해주세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "summarize_recent_bills",
    "최근 처리된 의안을 요약합니다",
    {
      age: z
        .string()
        .optional()
        .describe("대수 (기본: 22)"),
    },
    async ({ age }) => {
      const ageValue = age ?? "22";
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `제${ageValue}대 국회에서 최근 처리된 주요 의안을 요약해주세요.`,
              "",
              "요약 항목:",
              "1. 최근 가결된 주요 법안 목록",
              "2. 각 법안의 핵심 내용 요약 (1-2문장)",
              "3. 주요 쟁점이 되었던 법안과 쟁점 사항",
              "4. 현재 계류 중인 주목할 만한 법안",
              "",
              "assembly_bill 도구를 활용하여 데이터를 수집한 후,",
              "시민이 이해하기 쉬운 형태로 요약해주세요.",
            ].join("\n"),
          },
        }],
      };
    },
  );

  server.prompt(
    "committee_report",
    "특정 위원회의 활동 현황을 보고합니다",
    { committee_name: z.string().describe("위원회 이름") },
    async ({ committee_name }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `${committee_name}의 활동 현황 보고서를 작성해주세요.`,
            "",
            "보고서 항목:",
            "1. 위원회 기본 정보 (소관 부처, 위원장, 위원 수)",
            "2. 최근 심사한 주요 법안 목록",
            "3. 최근 개최된 회의 현황",
            "4. 주요 현안 및 쟁점 사항",
            "5. 소관 부처 관련 주요 이슈",
            "",
            "assembly_org(type='committee'), assembly_bill, assembly_session(type='meeting') 도구를 활용하여 데이터를 수집한 후,",
            "체계적인 위원회 활동 보고서를 작성해주세요.",
          ].join("\n"),
        },
      }],
    }),
  );
}
