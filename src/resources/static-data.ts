/**
 * MCP Resources - 정적 데이터
 *
 * 국회 관련 정적 참조 데이터를 MCP 리소스로 제공합니다.
 * - assembly://parties — 현재 정당 목록
 * - assembly://committees — 상임위원회 목록
 * - assembly://sessions — 회기 정보
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type AppConfig } from "../config.js";
import { createApiClient } from "../api/client.js";
import { API_CODES } from "../api/codes.js";

// ---------------------------------------------------------------------------
// Static data (22대 국회 기준)
// ---------------------------------------------------------------------------

const PARTIES = [
  "더불어민주당",
  "국민의힘",
  "조국혁신당",
  "개혁신당",
  "진보당",
  "기본소득당",
  "사회민주당",
  "무소속",
] as const;

const COMMITTEES = [
  "국회운영위원회",
  "법제사법위원회",
  "정무위원회",
  "기획재정위원회",
  "교육위원회",
  "과학기술정보방송통신위원회",
  "외교통일위원회",
  "국방위원회",
  "행정안전위원회",
  "문화체육관광위원회",
  "농림축산식품해양수산위원회",
  "산업통상자원중소벤처기업위원회",
  "보건복지위원회",
  "환경노동위원회",
  "국토교통위원회",
  "정보위원회",
  "여성가족위원회",
  "예산결산특별위원회",
] as const;

const SESSIONS = [
  { age: 22, term: "2024-05-30 ~ 2028-05-29", description: "제22대 국회" },
  { age: 21, term: "2020-05-30 ~ 2024-05-29", description: "제21대 국회" },
  { age: 20, term: "2016-05-30 ~ 2020-05-29", description: "제20대 국회" },
] as const;

// ---------------------------------------------------------------------------
// Resource registration
// ---------------------------------------------------------------------------

export function registerResources(
  server: McpServer,
  config: AppConfig,
): void {
  // 동적 리소스: API 카탈로그 (OPENSRVAPI 호출)
  const api = createApiClient(config);

  server.resource(
    "api-catalog",
    "assembly://api-catalog",
    {
      description: "국회 열린데이터 276개 API 전체 목록 (OPENSRVAPI에서 동적으로 조회)",
      mimeType: "application/json",
    },
    async () => {
      const result = await api.fetchOpenAssembly(
        API_CODES.META_API_LIST,
        { pSize: 300 },
      );

      const catalog = result.rows.map((row) => ({
        INF_ID: row.INF_ID,
        INF_NM: row.INF_NM,
        CATE_NM: row.CATE_NM,
        ORG_NM: row.ORG_NM,
        INF_EXP: row.INF_EXP,
      }));

      return {
        contents: [{
          uri: "assembly://api-catalog",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              description: "국회 열린데이터 API 전체 목록",
              totalCount: result.totalCount,
              apis: catalog,
            },
            null,
            2,
          ),
        }],
      };
    },
  );

  server.resource(
    "tools-guide",
    "assembly://tools-guide",
    {
      description: "MCP 도구 사용 가이드 — Lite/Full 프로필 도구 목록과 사용법",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "assembly://tools-guide",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            description: "국회 API MCP 서버 도구 가이드",
            profile: config.profile,
            lite: {
              description: "Lite 프로필 (6개 도구) — 도메인 엔티티 기반 통합, 토큰 최적화",
              tools: [
                {
                  name: "assembly_member",
                  description: "의원 검색+분석. 이름 1건이면 자동 상세+발의+표결 분석",
                  example: { name: "이해민", analyze: true },
                },
                {
                  name: "assembly_bill",
                  description: "의안 검색+추적+통계. keywords로 추적, mode=stats로 통계",
                  example: { bill_name: "교육", status: "pending" },
                },
                {
                  name: "assembly_session",
                  description: "일정+회의록+표결. type으로 구분 또는 자동 감지",
                  example: { type: "meeting", keyword: "인공지능" },
                },
                {
                  name: "assembly_org",
                  description: "위원회+청원+입법예고. type으로 구분",
                  example: { type: "committee", committee_name: "국토교통위원회" },
                },
                {
                  name: "discover_apis",
                  description: "276개 국회 API 검색",
                  example: { keyword: "예산" },
                },
                {
                  name: "query_assembly",
                  description: "API 코드로 직접 호출",
                  example: { api_code: "nxrvzonlafugpqjuh", params: {} },
                },
              ],
            },
            full: {
              description: "Full 프로필 (11개 도구) — Lite 6개 + 심층 5개",
              toolCount: 10,
              additionalTools: [
                "bill_detail — 의안 1건의 모든 정보 (상세+심사+이력+제안자+회의)",
                "committee_detail — 위원회 상세 + 위원명단",
                "petition_detail — 청원 상세 조회",
                "research_data — 도서관+입법조사처+예산정책처 통합 검색",
              ],
            },
            tips: [
              "Lite에서 위원회/청원/입법예고 → assembly_org(type=...)",
              "의안 통계 → assembly_bill(mode='stats')",
              "API 코드를 모르면 → discover_apis로 검색",
              "환경변수 MCP_PROFILE=full로 전환 가능",
            ],
          },
          null,
          2,
        ),
      }],
    }),
  );

  server.resource(
    "parties",
    "assembly://parties",
    {
      description: "현재 국회에 의석을 보유한 정당 목록 (22대 국회 기준)",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "assembly://parties",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            description: "22대 국회 정당 목록",
            parties: PARTIES,
            updatedAt: "2024-05-30",
          },
          null,
          2,
        ),
      }],
    }),
  );

  server.resource(
    "committees",
    "assembly://committees",
    {
      description: "22대 국회 상임위원회 및 특별위원회 목록",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "assembly://committees",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            description: "22대 국회 위원회 목록",
            committees: COMMITTEES,
            updatedAt: "2024-05-30",
          },
          null,
          2,
        ),
      }],
    }),
  );

  server.resource(
    "sessions",
    "assembly://sessions",
    {
      description: "최근 국회 회기 정보 (20대~22대)",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "assembly://sessions",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            description: "국회 회기 정보",
            sessions: SESSIONS,
            currentAge: 22,
          },
          null,
          2,
        ),
      }],
    }),
  );
}
