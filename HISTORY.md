# HISTORY.md —国会 API MCP 서버 (assembly-api-mcp)

---

## 2026-04-11: Phase 23-24 — 국민참여입법센터 Open API 통합 (v0.6.0)

### 배경

lawmaking.go.kr의 Open API를 assembly-api-mcp에 통합하여 입법예고/행정예고/법령해석례/의견제시까지 100% 커버.

### 구현 내용

| 카테고리 | 변경 |
|----------|------|
| 신규 파일 | `src/api/lawmaking.ts` (lawmaking.go.kr REST API 클라이언트) |
| API 추가 | 6개 엔드포인트: govLmSts, lmPln, ogLmPp, ptcpAdmPp, lsItptEmp, loLsExample |
| 도구 확장 | `assembly_org`에 `type="lawmaking"` + `category` 파라미터 추가 |
| codes.ts | lawmaking API 코드 6개 등록 |
| config 변경 | `lawmakingOc` 필드 추가, `API_BASE_URLS.lawmaking` 추가 |
| 의존성 | `fast-xml-parser` 추가 (XML → JSON 변환) |
| 설정 | `LAWMKING_OC` 환경 변수 추가 |

### assembly_org lawmaking 확장

```
assembly_org(type="lawmaking", category="legislation") // 입법현황/계획/예고
assembly_org(type="lawmaking", category="admin")       // 행정예고
assembly_org(type="lawmaking", category="interpretation") // 법령해석례
assembly_org(type="lawmaking", category="opinion")     // 의견제시사례
```

### lawmaking API 6개 엔드포인트

| API | endpoint | 용도 |
|-----|----------|------|
| 입법현황 | `govLmSts` | 입법현황 목록/상세 |
| 입법계획 | `lmPln` | 입법계획 목록/상세 |
| 입법예고 | `ogLmPp` | 입법예고 목록/상세 (진행/종료) |
| 행정예고 | `ptcpAdmPp` | 행정예고 목록/상세 (자치법규) |
| 법령해석례 | `lsItptEmp` | 법령해석례 검색/상세 |
| 의견제시사례 | `loLsExample` | 의견제시사례 목록/상세 |

### 수치 변화

| 항목 | v0.5.0 | v0.6.0 | 변화 |
|------|--------|--------|------|
| API 코드 등록 | 271 | **279** | +8 |
| API 소스 |国会 1개 | **国会+lawmaking 2개** | +1 |
| 커버 범위 |国会 276개 | **284개** | +8 |
| 토큰 소비 (Lite) | ~2,800 | **~2,880** | +80 |

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

1. **프로젝트 기획** —国会 API 276개 조사, MCP 서버 설계, Plans.md 생성
2. **Phase 1** (Lead 직접) — 스캐폴딩, API 클라이언트, 인증키 관리, 에러 처리, vitest
3. **Phase 2~5** (4 Worker 병렬) — 핵심 도구 14개, Resource, Prompt, 캐싱, HTTP Transport
4. **Phase 6** — 276개 API 메타 조사, 17개 작동 코드 식별, CLI 11커맨드, HTML 테스터
5. **환경 설정** — 실제 API 키 설정, E2E 검증 11/11 통과

### 주요 발견

1. **AGE 파라미터 필수**: 대부분国会 API는 `AGE`(대수) 없이 호출 시 0건 반환
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
