/**
 * OpenAPI 3.1 스펙 생성
 *
 * Lite/Full 프로필에 따라 동적으로 OpenAPI 스펙을 생성합니다.
 * ChatGPT GPTs Actions에서 import하여 사용할 수 있습니다.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParamDef {
  readonly name: string;
  readonly in: "query" | "path";
  readonly description: string;
  readonly required?: boolean;
  readonly schema: Record<string, unknown>;
}

interface PathDef {
  readonly summary: string;
  readonly description: string;
  readonly operationId: string;
  readonly parameters: readonly ParamDef[];
  readonly profile: "lite" | "full";
}

// ---------------------------------------------------------------------------
// Shared parameter definitions
// ---------------------------------------------------------------------------

const PAGE_PARAM: ParamDef = {
  name: "page",
  in: "query",
  description: "페이지 번호 (기본: 1)",
  schema: { type: "integer", default: 1 },
};

const PAGE_SIZE_PARAM: ParamDef = {
  name: "page_size",
  in: "query",
  description: "페이지 크기 (기본: 20, 최대: 100)",
  schema: { type: "integer", default: 20, maximum: 100 },
};

const AGE_PARAM: ParamDef = {
  name: "age",
  in: "query",
  description: "대수 (예: 22 = 제22대 국회)",
  schema: { type: "integer", default: 22 },
};

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const ROUTES: Record<string, Record<string, PathDef>> = {
  "/api/members": {
    get: {
      summary: "국회의원 검색",
      description: "현재 국회의원을 이름, 정당, 선거구, 소속위원회로 검색합니다.",
      operationId: "searchMembers",
      profile: "lite",
      parameters: [
        { name: "name", in: "query", description: "의원 이름 (부분 일치)", schema: { type: "string" } },
        { name: "party", in: "query", description: "정당명", schema: { type: "string" } },
        { name: "district", in: "query", description: "선거구명", schema: { type: "string" } },
        { name: "committee", in: "query", description: "소속위원회명 (부분 일치)", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/bills": {
    get: {
      summary: "의안 검색",
      description: "의안(법률안)을 검색합니다. 의안명, 제안자, 위원회, 상태로 필터링하거나 bill_id로 상세 조회합니다.",
      operationId: "searchBills",
      profile: "lite",
      parameters: [
        { name: "bill_name", in: "query", description: "의안명 (부분 일치 검색)", schema: { type: "string" } },
        { name: "bill_id", in: "query", description: "의안 ID (지정 시 상세 조회)", schema: { type: "string" } },
        { name: "proposer", in: "query", description: "제안자/대표발의자", schema: { type: "string" } },
        { name: "committee", in: "query", description: "소관위원회명", schema: { type: "string" } },
        { name: "status", in: "query", description: "상태: all, pending(계류), processed(처리), recent(최근 본회의)", schema: { type: "string", enum: ["all", "pending", "processed", "recent"] } },
        AGE_PARAM,
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/schedule": {
    get: {
      summary: "국회 일정 조회",
      description: "국회 일정(본회의, 위원회 등)을 날짜, 위원회, 키워드로 검색합니다.",
      operationId: "getSchedule",
      profile: "lite",
      parameters: [
        { name: "date_from", in: "query", description: "시작 날짜 (YYYY-MM-DD)", schema: { type: "string" } },
        { name: "date_to", in: "query", description: "종료 날짜 (YYYY-MM-DD)", schema: { type: "string" } },
        { name: "keyword", in: "query", description: "검색 키워드", schema: { type: "string" } },
        { name: "committee", in: "query", description: "위원회명", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/meetings": {
    get: {
      summary: "회의록 검색",
      description: "국회 회의록(본회의, 위원회, 국정감사, 인사청문회, 공청회)을 검색합니다.",
      operationId: "searchMeetings",
      profile: "lite",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드 (안건명)", schema: { type: "string" } },
        { name: "committee", in: "query", description: "위원회명", schema: { type: "string" } },
        { name: "date_from", in: "query", description: "연도 (YYYY 형식)", schema: { type: "string" } },
        { name: "meeting_type", in: "query", description: "회의 종류", schema: { type: "string", enum: ["본회의", "위원회", "소위원회", "국정감사", "인사청문회", "공청회"] } },
        AGE_PARAM,
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/votes": {
    get: {
      summary: "표결 결과 조회",
      description: "국회 표결 결과를 조회합니다. bill_id 없이 호출하면 전체 표결 현황, 지정 시 의원별 찬반 상세를 반환합니다.",
      operationId: "getVotes",
      profile: "lite",
      parameters: [
        { name: "bill_id", in: "query", description: "의안 ID (지정 시 의원별 표결 상세)", schema: { type: "string" } },
        AGE_PARAM,
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/legislators/{name}/analysis": {
    get: {
      summary: "의원 의정활동 종합분석",
      description: "국회의원의 인적사항, 발의법안, 표결참여를 한 번에 조회합니다.",
      operationId: "analyzeLegislator",
      profile: "lite",
      parameters: [
        { name: "name", in: "path", description: "의원 이름", required: true, schema: { type: "string" } },
        AGE_PARAM,
      ],
    },
  },
  "/api/legislation/track": {
    get: {
      summary: "주제별 법안 추적",
      description: "키워드(쉼표 구분)로 관련 법안을 검색하고 심사 현황까지 확인합니다.",
      operationId: "trackLegislation",
      profile: "lite",
      parameters: [
        { name: "keywords", in: "query", description: "검색 키워드 (쉼표 구분, 예: AI,인공지능)", required: true, schema: { type: "string" } },
        { name: "include_history", in: "query", description: "심사 이력 포함 여부 (true/false)", schema: { type: "string", enum: ["true", "false"] } },
        AGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/discover": {
    get: {
      summary: "API 탐색",
      description: "국회 276개 API를 키워드/카테고리로 탐색합니다.",
      operationId: "discoverApis",
      profile: "lite",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드 (예: 회의록, 청원, 예산)", schema: { type: "string" } },
        { name: "category", in: "query", description: "카테고리 필터", schema: { type: "string" } },
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/query/{api_code}": {
    get: {
      summary: "범용 API 호출",
      description: "API 코드로 국회 데이터를 직접 호출합니다. discover에서 찾은 코드를 사용하세요.",
      operationId: "queryAssembly",
      profile: "lite",
      parameters: [
        { name: "api_code", in: "path", description: "API 코드 (예: ALLSCHEDULE)", required: true, schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  // --- Full-only ---
  "/api/bills/{bill_id}": {
    get: {
      summary: "의안 상세 조회",
      description: "특정 의안의 상세 정보(심사경과, 제안이유, 주요내용)를 조회합니다.",
      operationId: "getBillDetail",
      profile: "full",
      parameters: [
        { name: "bill_id", in: "path", description: "의안 ID", required: true, schema: { type: "string" } },
        AGE_PARAM,
      ],
    },
  },
  "/api/bills/review": {
    get: {
      summary: "의안 심사정보",
      description: "의안의 심사 경과 정보를 조회합니다.",
      operationId: "getBillReview",
      profile: "full",
      parameters: [
        { name: "bill_id", in: "query", description: "의안 ID", schema: { type: "string" } },
        { name: "bill_name", in: "query", description: "의안명 (부분 일치)", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/bills/history": {
    get: {
      summary: "의안 접수/처리 이력",
      description: "의안의 접수 및 처리 이력을 조회합니다.",
      operationId: "getBillHistory",
      profile: "full",
      parameters: [
        { name: "bill_name", in: "query", description: "의안명 (부분 일치)", schema: { type: "string" } },
        { name: "bill_no", in: "query", description: "의안번호", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/committees": {
    get: {
      summary: "위원회 목록",
      description: "국회 위원회(상임위, 특별위) 목록을 조회합니다.",
      operationId: "getCommittees",
      profile: "full",
      parameters: [
        { name: "committee_type", in: "query", description: "위원회 유형 (예: 상임위원회, 특별위원회)", schema: { type: "string" } },
        AGE_PARAM,
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/petitions": {
    get: {
      summary: "청원 검색",
      description: "국민동의청원을 검색합니다.",
      operationId: "searchPetitions",
      profile: "full",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드 (청원 제목)", schema: { type: "string" } },
        { name: "status", in: "query", description: "처리상태", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/legislation/notices": {
    get: {
      summary: "입법예고 조회",
      description: "진행중인 입법예고를 조회합니다.",
      operationId: "getLegislationNotices",
      profile: "full",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드 (법안명)", schema: { type: "string" } },
        { name: "date_from", in: "query", description: "시작일 (YYYY-MM-DD)", schema: { type: "string" } },
        { name: "date_to", in: "query", description: "종료일 (YYYY-MM-DD)", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/library": {
    get: {
      summary: "국회도서관 자료 검색",
      description: "국회도서관 자료(도서, 논문, 간행물)를 검색합니다.",
      operationId: "searchLibrary",
      profile: "full",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드 (필수)", required: true, schema: { type: "string" } },
        { name: "type", in: "query", description: "자료 유형 (도서, 논문, 간행물)", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/budget": {
    get: {
      summary: "예산정책처 분석 자료",
      description: "국회예산정책처(NABO)의 경제·재정 분석 자료를 조회합니다.",
      operationId: "getBudgetAnalysis",
      profile: "full",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드", schema: { type: "string" } },
        { name: "year", in: "query", description: "발행 연도 (예: 2024)", schema: { type: "string" } },
        { name: "category", in: "query", description: "자료 카테고리", schema: { type: "string" } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
  "/api/research": {
    get: {
      summary: "입법조사처 보고서 검색",
      description: "국회입법조사처의 보고서를 검색합니다.",
      operationId: "searchResearchReports",
      profile: "full",
      parameters: [
        { name: "keyword", in: "query", description: "검색 키워드", schema: { type: "string" } },
        { name: "type", in: "query", description: "보고서 유형 (이슈와논점, 현안분석, 입법정책보고서)", schema: { type: "string", enum: ["이슈와논점", "현안분석", "입법정책보고서"] } },
        PAGE_PARAM,
        PAGE_SIZE_PARAM,
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Response schema (shared)
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
  "200": {
    description: "성공",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { description: "응답 데이터" },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer", description: "전체 결과 수" },
              },
            },
          },
        },
      },
    },
  },
  "400": {
    description: "잘못된 요청",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", enum: [false] },
            error: { type: "string" },
          },
        },
      },
    },
  },
  "500": {
    description: "서버 오류",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", enum: [false] },
            error: { type: "string" },
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Spec generator
// ---------------------------------------------------------------------------

export function generateOpenApiSpec(
  baseUrl: string,
  profile: "lite" | "full",
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const [path, methods] of Object.entries(ROUTES)) {
    for (const [method, def] of Object.entries(methods)) {
      // Filter by profile: lite shows only lite, full shows all
      if (profile === "lite" && def.profile === "full") continue;

      if (!paths[path]) paths[path] = {};
      paths[path][method] = {
        summary: def.summary,
        description: def.description,
        operationId: def.operationId,
        parameters: [
          ...def.parameters,
          // key is always available as query param
          {
            name: "key",
            in: "query",
            description: "열린국회정보 API 키",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: RESPONSE_SCHEMA,
      };
    }
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "대한민국 국회 API",
      description: "대한민국 국회 열린국회정보 API — 국회의원, 의안, 일정, 회의록, 표결, 청원 등 국회 데이터를 REST API로 제공합니다.",
      version: "0.2.1",
      contact: {
        name: "assembly-api-mcp",
        url: "https://github.com/hollobit/assembly-api-mcp",
      },
    },
    servers: [{ url: baseUrl, description: "국회 API 서버" }],
    paths,
  };
}
