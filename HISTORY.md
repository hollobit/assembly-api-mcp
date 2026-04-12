# HISTORY.md — 국회 API MCP 서버 (assembly-api-mcp)

---

## 2026-04-12: 세션 5 — v0.7.0 국회예산정책처 NABO Open API 통합

### 배경

국회(276 API)와 국민참여입법센터(8 API) 위에 **국회예산정책처(NABO)**를 세 번째 축으로
합쳐, 입법 태동→형성→심사→실행으로 이어지는 엔드투엔드(End-to-End) 입법 라이프사이클을
하나의 MCP 서버에서 관측할 수 있게 하는 것이 목표. NABO는 SNS 인증 + 관리자 승인이 필요한
별도 Open API이므로 기존 `ASSEMBLY_API_KEY`/`DATA_GO_KR_SERVICE_KEY`와 독립된 인증
체계(`NABO_API_KEY`)를 도입.

### 구현 내용

| 카테고리 | 변경 |
|----------|------|
| API 클라이언트 | `src/api/client.ts` — `fetchNabo(resource, params)` 추가. `report`/`periodical`/`recruitments` 세 엔드포인트를 단일 메서드로 분기. `parseNaboResponse()`로 NABO 고유 응답 구조(`page`/`size`/`total`/`items`) 정규화. `INVALID_KEY`/`NOT_APPROVED`/`EXPIRED` 에러를 명시적 한글 메시지로 변환. |
| 신규 MCP 도구 | `src/tools/nabo.ts` — `get_nabo` (Full 프로필 전용). `type` enum으로 세 리소스 선택, `keyword`/`sort`/`order`/`page`/`page_size` 파라미터. `normalizeNaboRow`로 응답을 한글 키(`제목`/`작성자`/`게시일`/`상세링크`/`첨부파일`)로 노출. |
| 서버 등록 | `src/server.ts` — `McpServer` 이름·버전 `0.2.0` → `0.7.0`. Full 프로필 블록에 `registerNaboTool` 추가(Lite는 유지). `src/tools/index.ts`에서 re-export. |
| REST API | `src/openapi/handlers.ts` — `getNabo` 핸들러 추가(입력 검증 + `fetchNabo` 호출 + 페이지네이션 메타 반환). `src/openapi/router.ts`에 `/api/nabo` 라우트(Full 프로필 전용, `CACHE_DYNAMIC`) 등록. |
| OpenAPI 스펙 | `src/openapi/spec.ts` — `/api/nabo` 경로 정의 추가(operationId `getNabo`, `type`/`keyword`/`sort`/`order`/`page`/`page_size` 파라미터). 최상위 `info.version` 0.2.1 → 0.7.0. |
| 환경 변수 | `.env.example` — NABO 섹션 확장: 발급 URL(`/ko/api/apply.do?key=2509230004`), 인증 방식(SNS + 관리자 승인), 엔드포인트 3종, MCP 도구·REST 경로 매핑 문서화. `MCP_PROFILE` 안내의 도구 수 갱신(Full 19개). |
| 문서 | `docs/legislative-lifecycle.md` **신규 작성** — 4단계(태동·형성·심사·실행)별 API 매핑 표, 선제적 정책 설계 전환·국제 표준 정합성·이해관계자 충돌 예측 등 통합 관측의 전략적 가치 정리. 3개 기관 인증키가 필요한 현실적 제약을 명시. `README.md`·`CHANGES.md`·`HISTORY.md` 동기화. |

### 수치 변화

| 항목 | v0.2.1 | v0.7.0 | 변화 |
|------|--------|--------|------|
| MCP 도구 (Lite) | 9 | 9 | 유지 |
| MCP 도구 (Full) | 18 | **19** | +1 |
| 통합된 공식 API 수 | 284 | **287** | +3 |
| API 소스 기관 | 2 | **3** | +1 (NABO) |
| 필수 인증키(ENV) | `ASSEMBLY_API_KEY` | `ASSEMBLY_API_KEY` + `NABO_API_KEY`(선택) | 분리 |
| 문서 | — | `docs/legislative-lifecycle.md` 추가 | +1 |

### 설계 결정

1. **NABO는 Full 프로필 전용** — Lite는 LLM 토큰 최적화 목적이므로 선택적 기능은 Full에만 노출.
2. **단일 `get_nabo` 도구로 3개 엔드포인트 흡수** — Block Square·korean-law-mcp Lite의 "도구 병합" 패턴을 계승. AI 에이전트가 `type` 파라미터만 바꿔 3개 리소스에 접근.
3. **한글 필드 정규화 + `raw` 보존** — 일반 사용자는 한글 키로, 고급 사용자는 `raw` 필드로 원본에 접근할 수 있도록 이중 노출.
4. **NABO 에러 코드의 명시적 변환** — `INVALID_KEY`/`NOT_APPROVED`/`EXPIRED`는 MCP 서버에서 발급 안내 메시지로 변환해 운영 부담 최소화.
5. **legislative-lifecycle.md를 별도 문서로** — README 본문이 비대해지지 않도록 라이프사이클 전략 담론은 별도 파일로 분리하고 README에서 링크.

### 알려진 제약

- NABO `periodical.do`·`recruitments.do`의 구체적 파라미터 명세가 공식 문서에서는 report.do만 공개됨. 세 엔드포인트가 동일한 `scSw`/`scSort`/`scOrder` 패턴을 공유한다는 합리적 가정 하에 통합 구현함. 실제 운영 시 엔드포인트별 파라미터 편차가 발견되면 `normalizeNaboRow` 또는 `fetchNabo` 경로 매핑을 확장할 것.
- 사용자는 여전히 3개 사이트(open.assembly.go.kr, data.go.kr, nabo.go.kr)에서 각각 인증키를 발급받아야 함. 정부 차원의 공공데이터 단일 인증 체계가 정착되기 전까지의 현실적 절충.

---

## 2026-04-04: 세션 4 — 프로젝트 리네이밍 및 저장소 이전

### 변경 내용

프로젝트 식별자를 `cong`에서 `assembly-api`로 변경하고, GitHub 저장소를 `hollobit/assembly-api-mcp`로 이전.

| 카테고리 | 변경 |
|----------|------|
| 저장소 URL | `jonghongjeon/cong` → `hollobit/assembly-api-mcp` |
| MCP 서버 키 | `"cong"` → `"assembly-api"` (설정 파일의 서버 식별자) |
| 디렉토리명 | 문서 내 `cong/` → `assembly-api/` / `assembly-api-mcp/` |
| 변경 파일 | `README.md`, `QUICK_START.md`, `CONTRIBUTING.md`, `examples/claude-desktop-config.json`, `examples/vscode-settings.json` |
| 미변경 | `HISTORY.md` (과거 기록 보존), `Dockerfile` 비루트 사용자 `cong` (런타임 내부), `package.json` (이미 `assembly-api-mcp`) |

---

## 2026-04-04: 세션 3 — Phase 12: 프로필 기반 통합 MCP 인터페이스 (7개 도구)

### 배경

MCP 생태계 리서치 + AI 에이전트/사용자 관점 토론을 통해 최적 도구 설계를 결정.
- 도구 30개 초과 시 LLM 정확도 저하 (Docker 벤치마크)
- Cursor 40개 하드 리미트, 토큰 비용 도구당 400-800
- Block Square (200+ API → 3개 도구), korean-law-mcp (89→14 Lite) 사례 참고

### 결정 과정

1. **AI 에이전트 관점**: 8개 도구 (토큰 최소화, LLM이 체이닝)
2. **사용자 관점**: 15개 도구 (첫 시도 완전 응답, 복합 분석 도구)
3. **토론 결과**: 7개 하이브리드 (핵심 3 + 체인 2 + 범용 2)

### 구현 내용

| 카테고리 | 변경 |
|----------|------|
| 신규 도구 | `search_members`, `search_bills`, `search_records`, `analyze_legislator`, `track_legislation` (Lite 전용 5개) |
| 기존 유지 | `discover_apis`, `query_assembly` (양쪽 공용) |
| 신규 파일 | `src/tools/lite/` (members.ts, bills.ts, records.ts, chains.ts, index.ts) |
| 설정 변경 | config.ts에 `profile` 추가, server.ts에 Lite/Full 분기 |
| Resource | `assembly://tools-guide` 추가 (도구 사용법 가이드) |
| 테스트 | `tests/unit/lite-tools.test.ts` (9개 테스트) |
| 문서 | `docs/mcp-design-analysis.md` (설계 분석 보고서) |

### 수치 변화

| 항목 | 세션 2 | 세션 3 | 변화 |
|------|--------|--------|------|
| MCP 도구 (Lite) | 23개 | **7개** | -70% |
| 토큰 소비 | ~14,000 | **~3,800** | -73% |
| 단위 테스트 | 60개 | **69개** | +9 |
| 소스 파일 | 28개 | **33개** | +5 |
| MCP Resource | 4개 | **5개** | +1 |
| Plans 태스크 | 52/56 | **58/62** | +6 완료 |

---

## 2026-04-04: 세션 2 — Phase 7~11 완료, 전체 프로젝트 완성

### 진행 경과

1. **Phase 7: 코드 품질 강화** (Lead 직접 실행)
   - 7.1: `search_member_activity`의 발의법안+표결 조회를 `Promise.all`로 병렬화 → 응답 시간 ~50% 단축
   - 7.2: CLI의 `loadConfig()`을 `getConfig()` 지연 초기화로 변경 → `--help` 시 API 키 불필요
   - 7.3: 캐시에 LRU 크기 제한 추가 (`maxEntries=500`, `evictOldest()`)
   - 7.4: `client.ts`에서 `buildCacheKey`를 1회만 호출하도록 리팩토링 (기존 2회 → 1회)

2. **Phase 8: 미매핑 API 도구화** (Worker 병렬 실행)
   - `src/tools/bill-extras.ts`에 7개 도구 일괄 추가
   - `get_pending_bills` (13,006건), `get_processed_bills` (4,620건), `get_recent_bills` (1,201건)
   - `get_bill_review` (35,329건), `get_plenary_votes` (1,315건)
   - `search_all_bills` (17,626건), `get_bill_history` (118,682건)

3. **Phase 10: 배포 및 운영** (Worker 병렬 실행)
   - `Dockerfile` — 멀티스테이지 빌드 (node:22-alpine), 비루트 사용자 `cong`
   - `docker-compose.yml` — 포트 3000, .env 연동, 헬스체크
   - `.github/workflows/ci.yml` — push/PR 자동 빌드·테스트·린트
   - `src/api/monitor.ts` — API 응답 시간 추적, 3초 초과 느린 호출 감지
   - `src/api/rate-limiter.ts` — 월 10,000 요청 추적, 80% 임계치 경고
   - `client.ts`에 모니터링/Rate Limit 통합

4. **Phase 11: 단일 MCP 통합 인터페이스** (Worker 병렬 실행)
   - `src/tools/discover.ts` — `discover_apis` 도구 (OPENSRVAPI 기반 276개 API 키워드 검색)
   - `src/tools/query.ts` — `query_assembly` 범용 도구 (임의 API 코드 직접 호출)
   - `src/resources/static-data.ts`에 `assembly://api-catalog` 동적 리소스 추가

5. **API 코드 발굴** (백그라운드 Worker, 10분 소요)
   - OPENSRVAPI → Excel 스펙 다운로드 → "요청주소" 필드 파싱으로 실제 API 코드 추출
   - **14개 신규 코드 발견** (일정, 회의록, 위원회, 청원, 입법예고)
   - 가짜 코드 5개 제거, 실제 코드로 교체 (`schedule.ts`, `meetings.ts`, `committees.ts`, `petitions.ts`, `legislation.ts`)
   - `docs/discovered-codes.md` 작성

6. **코드 리뷰** (harness-review)
   - 4관점 (Security, Performance, Quality, Accessibility) 검토
   - **verdict: APPROVE** — critical 0, major 0, minor 6, recommendation 4

7. **문서 작성**
   - `README.md` — 프로젝트 개요, 23개 도구 목록, CLI, Claude Desktop 연동 가이드
   - `QUICK_START.md` — 5분 빠른 시작 (korean-law-mcp 참고 패턴 적용)
   - `CHANGES.md` — v0.1.0 변경사항 총정리
   - Plans.md 축약 (300줄 → 55줄, 완료 Phase는 1줄 요약)

### 변경 사항 요약

| 카테고리 | 변경 내용 |
|----------|----------|
| 신규 도구 +9 | `discover_apis`, `query_assembly`, `get_pending_bills`, `get_processed_bills`, `get_recent_bills`, `get_bill_review`, `get_plenary_votes`, `search_all_bills`, `get_bill_history` |
| 코드 수정 | `speeches.ts` (병렬화), `cli.ts` (지연초기화), `cache.ts` (LRU), `client.ts` (모니터링+Rate Limit+캐시최적화) |
| API 코드 교체 | `schedule.ts` (ALLSCHEDULE), `meetings.ts` (5개 코드), `committees.ts` (nxrvzonlafugpqjuh), `petitions.ts` (nvqbafvaajdiqhehi), `legislation.ts` (nknalejkafmvgzmpt) |
| 신규 파일 | `bill-extras.ts`, `discover.ts`, `query.ts`, `monitor.ts`, `rate-limiter.ts`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.dockerignore` |
| 문서 | `README.md`, `QUICK_START.md`, `CHANGES.md`, `discovered-codes.md` |

### 수치 변화

| 항목 | 세션 1 | 세션 2 | 변화 |
|------|--------|--------|------|
| MCP 도구 | 14개 | **23개** | +9 |
| 검증된 API | 17개 | **31개** | +14 |
| 단위 테스트 | 45개 | **60개** | +15 |
| 소스 파일 | 22개 | **28개** | +6 |
| 소스 코드 | ~4,500줄 | **~6,500줄** | +2,000 |
| Plans 태스크 | 30/30 | **52/56** | +22 완료 |

---

## 2026-04-04: 세션 1 — Phase 1~6 구축

### 진행 경과

1. **프로젝트 기획** — 국회 API 276개 조사, MCP 서버 설계, Plans.md 생성
2. **Phase 1** (Lead 직접) — 스캐폴딩, API 클라이언트, 인증키 관리, 에러 처리, vitest
3. **Phase 2~5** (4 Worker 병렬) — 핵심 도구 14개, Resource, Prompt, 캐싱, HTTP Transport
4. **Phase 6** — 276개 API 메타 조사, 17개 작동 코드 식별, CLI 11커맨드, HTML 테스터
5. **환경 설정** — 실제 API 키 설정, E2E 검증 11/11 통과

### 주요 발견

1. **AGE 파라미터 필수**: 대부분 국회 API는 `AGE`(대수) 없이 호출 시 0건 반환
2. **INF_ID ≠ API 코드**: 메타 API의 `INF_ID`는 레지스트리 식별자이며 실제 엔드포인트 코드와 다름
3. **코드 발견 방법**: OPENSRVAPI → `downloadOpenApiSpec.do`로 Excel 다운로드 → "요청주소" 필드에서 추출

### 프로젝트 구조 (세션 1 시점)

```
cong/
├── src/
│   ├── index.ts, server.ts, config.ts, cli.ts
│   ├── api/ (client.ts, cache.ts, codes.ts)
│   ├── tools/ (8개 파일, 14개 도구)
│   ├── resources/, prompts/
├── tests/unit/ (3파일, 45 테스트)
├── examples/ (api-tester.html)
├── docs/ (api-catalog.md, mcp-api.md)
└── .env.example, Plans.md
```

### 미완료 (세션 2에서 해결)

- [x] 일정/회의록/위원회/청원/입법예고 실제 API 코드 확인 → **14개 발굴**
- [x] 캐싱 레이어 → **LRU 캐시 구현**
- [x] StreamableHTTP Transport → **듀얼 Transport**
- [x] Claude Desktop 연동 설정 → **QUICK_START.md**
- [x] npm 패키지 배포 → **README + LICENSE + package.json**
- [x] 매핑 안 된 API 7개 도구 구현 → **bill-extras.ts**
