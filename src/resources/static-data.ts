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
              description: "Lite 프로필 (9개 도구) — AI 에이전트 최적화, 토큰 73% 절감",
              tools: [
                {
                  name: "search_members",
                  description: "의원 검색+상세. 1건이면 자동 상세 반환",
                  example: { name: "이해민" },
                },
                {
                  name: "search_bills",
                  description: "의안 검색+상세+상태필터. bill_id로 상세, status로 계류/처리 구분",
                  example: { bill_name: "교육", status: "pending" },
                },
                {
                  name: "get_schedule",
                  description: "국회 일정 조회 (날짜/위원회/키워드)",
                  example: { date_from: "2026-04-01" },
                },
                {
                  name: "search_meetings",
                  description: "회의록 검색 (본회의/위원회/소위/국감/인사청문회/공청회)",
                  example: { meeting_type: "위원회", keyword: "교육" },
                },
                {
                  name: "get_votes",
                  description: "표결 조회 (전체 본회의 표결 또는 의안별 상세)",
                  example: { age: 22 },
                },
                {
                  name: "analyze_legislator",
                  description: "의원 종합분석 (인적+발의+표결 한 번에)",
                  example: { name: "이해민" },
                },
                {
                  name: "track_legislation",
                  description: "주제별 법안 추적 (다중 키워드, 심사이력)",
                  example: { keywords: "AI,인공지능", include_history: true },
                },
                {
                  name: "discover_apis",
                  description: "276개 국회 API 검색",
                  example: { keyword: "예산" },
                },
                {
                  name: "query_assembly",
                  description: "API 코드로 직접 호출 (위원회/청원/입법예고 등)",
                  example: { api_code: "nxrvzonlafugpqjuh", params: {} },
                },
              ],
            },
            full: {
              description: "Full 프로필 (18개 도구) — Lite 9개 + Full 전용 9개",
              toolCount: 18,
            },
            tips: [
              "Lite에서 위원회/청원/입법예고 조회 → query_assembly 사용",
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
