/**
 * 환경 변수 기반 설정 관리
 *
 * .env 파일 또는 시스템 환경 변수에서 인증키와 서버 설정을 로드합니다.
 * 필수 키가 없으면 명확한 에러 메시지와 발급 안내를 제공합니다.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyConfig {
  /** 열린국회정보 API 키 (필수) */
  readonly assemblyApiKey: string;
  /** 공공데이터포털 ServiceKey (선택) */
  readonly dataGoKrServiceKey: string | undefined;
  /** 국회도서관 API 키 (선택) */
  readonly nanetApiKey: string | undefined;
  /** 국회예산정책처 API 키 (선택) */
  readonly naboApiKey: string | undefined;
  /** 국민참여입법센터 OC (선택, 정보공개 서비스 신청 ID) */
  readonly lawmakingOc: string | undefined;
}

export interface ServerConfig {
  /** MCP 전송 모드 */
  readonly transport: "stdio" | "http";
  /** HTTP 모드 포트 */
  readonly port: number;
  /** 로그 레벨 */
  readonly logLevel: "debug" | "info" | "warn" | "error";
}

export interface CacheConfig {
  /** 캐시 활성화 여부 */
  readonly enabled: boolean;
  /** 정적 데이터 TTL (초) */
  readonly ttlStatic: number;
  /** 동적 데이터 TTL (초) */
  readonly ttlDynamic: number;
}

export interface ApiResponseConfig {
  /** 기본 응답 포맷 */
  readonly defaultType: "json" | "xml";
  /** 기본 페이지 크기 */
  readonly defaultPageSize: number;
  /** 최대 페이지 크기 */
  readonly maxPageSize: number;
}

export interface AppConfig {
  readonly apiKeys: ApiKeyConfig;
  readonly server: ServerConfig;
  readonly cache: CacheConfig;
  readonly apiResponse: ApiResponseConfig;
  /** MCP 도구 프로필: lite(6개 도구) 또는 full(11개 도구) */
  readonly profile: "lite" | "full";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string, guidance: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `환경 변수 ${name}이(가) 설정되지 않았습니다.\n` +
        `설정 방법: ${guidance}\n` +
        `자세한 내용은 .env.example 파일을 참조하세요.`,
    );
  }
  return value.trim();
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function envOrDefault(name: string, defaultValue: string): string {
  return optionalEnv(name) ?? defaultValue;
}

function envIntOrDefault(name: string, defaultValue: number): number {
  const raw = optionalEnv(name);
  if (raw === undefined) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`환경 변수 ${name}의 값 "${raw}"은(는) 유효한 정수가 아닙니다.`);
  }
  return parsed;
}

function envBoolOrDefault(name: string, defaultValue: boolean): boolean {
  const raw = optionalEnv(name);
  if (raw === undefined) return defaultValue;
  return raw === "true" || raw === "1";
}

function parseProfile(raw: string): "lite" | "full" {
  if (raw === "lite" || raw === "full") return raw;
  process.stderr.write(
    `[assembly-api-mcp] 경고: MCP_PROFILE="${raw}"은(는) 유효하지 않습니다. "lite" 또는 "full"만 가능합니다. 기본값 "lite"를 사용합니다.\n`,
  );
  return "lite";
}

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

export function loadConfig(): AppConfig {
  return {
    apiKeys: {
      assemblyApiKey: requireEnv(
        "ASSEMBLY_API_KEY",
        "https://open.assembly.go.kr → 회원가입 → 마이페이지 → OPEN API → 인증키 발급",
      ),
      dataGoKrServiceKey: optionalEnv("DATA_GO_KR_SERVICE_KEY"),
      nanetApiKey: optionalEnv("NANET_API_KEY"),
      naboApiKey: optionalEnv("NABO_API_KEY"),
      lawmakingOc: optionalEnv("LAWMKING_OC"),
    },
    server: {
      transport: envOrDefault("MCP_TRANSPORT", "stdio") as "stdio" | "http",
      port: envIntOrDefault("MCP_PORT", 3000),
      logLevel: envOrDefault("LOG_LEVEL", "info") as
        | "debug"
        | "info"
        | "warn"
        | "error",
    },
    cache: {
      enabled: envBoolOrDefault("CACHE_ENABLED", true),
      ttlStatic: envIntOrDefault("CACHE_TTL_STATIC", 86400),
      ttlDynamic: envIntOrDefault("CACHE_TTL_DYNAMIC", 3600),
    },
    apiResponse: {
      defaultType: envOrDefault("DEFAULT_RESPONSE_TYPE", "json") as
        | "json"
        | "xml",
      defaultPageSize: envIntOrDefault("DEFAULT_PAGE_SIZE", 20),
      maxPageSize: envIntOrDefault("MAX_PAGE_SIZE", 100),
    },
    profile: parseProfile(envOrDefault("MCP_PROFILE", "lite")),
  };
}

/**
 * 원격 서버 모드용 config 로더
 *
 * ASSEMBLY_API_KEY가 없어도 서버를 시작할 수 있습니다.
 * 사용자별 API 키는 URL 쿼리 파라미터로 세션 생성 시 전달됩니다.
 */
export function loadRemoteConfig(): AppConfig {
  return {
    apiKeys: {
      assemblyApiKey: optionalEnv("ASSEMBLY_API_KEY") ?? "sample",
      dataGoKrServiceKey: optionalEnv("DATA_GO_KR_SERVICE_KEY"),
      nanetApiKey: optionalEnv("NANET_API_KEY"),
      naboApiKey: optionalEnv("NABO_API_KEY"),
      lawmakingOc: optionalEnv("LAWMKING_OC"),
    },
    server: {
      transport: "http",
      port: envIntOrDefault("MCP_PORT", 3000),
      logLevel: envOrDefault("LOG_LEVEL", "info") as
        | "debug"
        | "info"
        | "warn"
        | "error",
    },
    cache: {
      enabled: envBoolOrDefault("CACHE_ENABLED", true),
      ttlStatic: envIntOrDefault("CACHE_TTL_STATIC", 86400),
      ttlDynamic: envIntOrDefault("CACHE_TTL_DYNAMIC", 3600),
    },
    apiResponse: {
      defaultType: envOrDefault("DEFAULT_RESPONSE_TYPE", "json") as
        | "json"
        | "xml",
      defaultPageSize: envIntOrDefault("DEFAULT_PAGE_SIZE", 20),
      maxPageSize: envIntOrDefault("MAX_PAGE_SIZE", 100),
    },
    profile: parseProfile(envOrDefault("MCP_PROFILE", "lite")),
  };
}

/**
 * 기존 config를 URL 쿼리 파라미터로 오버라이드하여 새 config를 생성합니다.
 * 원본 config를 변경하지 않습니다 (immutable).
 */
export function overrideConfigFromParams(
  base: AppConfig,
  params: { key?: string; profile?: string },
): AppConfig {
  return {
    ...base,
    apiKeys: {
      ...base.apiKeys,
      assemblyApiKey: params.key ?? base.apiKeys.assemblyApiKey,
    },
    profile: params.profile
      ? parseProfile(params.profile)
      : base.profile,
  };
}

// ---------------------------------------------------------------------------
// API Base URLs
// ---------------------------------------------------------------------------

export const API_BASE_URLS = {
  /** 열린국회정보 */
  openAssembly: "https://open.assembly.go.kr/portal/openapi",
  /** 공공데이터포털 -国会 */
  dataGoKr: "http://apis.data.go.kr/9710000",
  /** 국회도서관 */
  nanet: "https://www.nanet.go.kr",
  /** 국회예산정책처 */
  nabo: "https://www.nabo.go.kr",
  /** 국민참여입법센터 */
  lawmaking: "https://opinion.lawmaking.go.kr/rest",
} as const;

// ---------------------------------------------------------------------------
// Error Code Map
// ---------------------------------------------------------------------------

export const ASSEMBLY_ERROR_CODES: Record<string, string> = {
  "INFO-000": "정상 처리",
  "INFO-100": "인증키가 입력되지 않았습니다. ASSEMBLY_API_KEY를 확인하세요.",
  "INFO-200": "유효하지 않은 인증키입니다. 열린국회정보에서 키를 재발급하세요.",
  "INFO-300": "요청 제한 횟수를 초과했습니다. Rate limit: 개발계정 10,000/월",
  "ERROR-300": "필수 파라미터가 누락되었습니다.",
  "ERROR-331": "파라미터 타입이 올바르지 않습니다.",
  "ERROR-332": "파라미터 값이 유효하지 않습니다.",
  "ERROR-333": "조회 범위를 초과했습니다.",
  "ERROR-500": "서버 내부 오류가 발생했습니다.",
  "ERROR-600": "데이터베이스 오류가 발생했습니다.",
  "ERROR-601": "SQL 오류가 발생했습니다.",
  "DATA-000": "해당 조건의 데이터가 없습니다.",
  "DATA-001": "데이터 한계를 초과했습니다.",
};
