# CHANGES.md

## 2026-04-12 — v0.7.0 (국회예산정책처 NABO Open API 통합)

### 하이라이트

**입법 라이프사이클 완전 가이드** — 정부 입법계획(태동) → 입법예고(형성) → 국회 발의·심사
→ 행정예고·하위 법령(실행)으로 이어지는 엔드투엔드 입법 생애주기 전체를 단일 MCP 서버에서
관측할 수 있게 되었습니다. 자세한 설명은 [`docs/legislative-lifecycle.md`](docs/legislative-lifecycle.md)
를 참조하세요.

### nabo.go.kr 3개 API 통합

- **보고서 자료 검색** — `/api/v1/report.do`
- **정기간행물** — `/api/v1/periodical.do`
- **채용정보** — `/api/v1/recruitments.do`

세 엔드포인트를 `type` 파라미터로 스위칭하는 단일 진입점으로 통합했습니다. 응답 필드는
`subj`(제목) / `cdNm`(작성자) / `pubDt`(게시일) / `count`(조회수) / `detailUrl`(상세 링크)
/ `name`·`url`(첨부파일) 기준으로 한글 키로 정규화합니다.

### 추가된 MCP 도구

- `get_nabo` (Full 프로필 전용) — `type`: `report | periodical | recruitments`
  - 파라미터: `keyword`, `sort`(pubDt/subj), `order`(asc/desc), `page`, `page_size`
  - 에러 코드: `INVALID_KEY`, `NOT_APPROVED`, `EXPIRED`는 명시적 메시지로 변환

### 추가된 REST 엔드포인트

- `GET /api/nabo?type=report&keyword=...` (Full 프로필 전용)
- OpenAPI 3.1 스펙(`/openapi.json?profile=full`)에 `getNabo` operationId 포함 →
  ChatGPT GPTs Actions에서 바로 import 가능

### 도구 수 변경

| 프로필 | v0.2.1 | v0.7.0 | 변화 |
|--------|--------|--------|------|
| Lite   | 9      | 9      | 유지 |
| Full   | 18     | **19** | +1 (`get_nabo`) |

### API 소스 확장

| 축 | 이전 | v0.7.0 |
|----|------|-------|
| 국회 (open.assembly.go.kr) | 276 | 276 |
| 국민참여입법센터 (data.go.kr 경유) | 8 | 8 |
| 국회예산정책처 NABO (nabo.go.kr) | 0 | **3** |
| **합계** | 284 | **287** |

### 인증 체계

NABO는 열린국회정보·data.go.kr와 별개의 인증키를 사용하므로 `NABO_API_KEY` 환경 변수를
추가로 설정해야 합니다. 미설정 시 `get_nabo` / `/api/nabo`는 명확한 발급 안내 메시지와 함께
실패합니다.

- 발급 URL: https://www.nabo.go.kr/ko/api/apply.do?key=2509230004
- 인증 방식: SNS(Naver/Kakao) 로그인 → 관리자 승인 대기 → 인증키 발급
- 문의: iamnabo@nabo.go.kr / 02-2070-3114

### 코드 변경

- `src/api/client.ts` — `fetchNabo(resource, params)` + `parseNaboResponse()` + `NaboResult`/`NaboResource` 타입 추가
- `src/tools/nabo.ts` — 신규 `registerNaboTool`, 한글 필드 정규화(`normalizeNaboRow`)
- `src/openapi/handlers.ts` — `getNabo` REST 핸들러 추가
- `src/openapi/router.ts` — `/api/nabo` 라우트(Full 프로필 전용) 등록
- `src/openapi/spec.ts` — OpenAPI 3.1 스펙 `/api/nabo` 경로 추가, 버전 0.7.0 반영
- `src/server.ts` — `McpServer` 이름·버전 `0.7.0`, Full 프로필 블록에 `registerNaboTool` 추가
- `.env.example`, `README.md` — NABO 발급 가이드·환경 변수 문서화

### 문서

- `docs/legislative-lifecycle.md` — **신규**. 입법 태동→형성→심사→실행 4단계 각 구간에 어떤
  API가 매핑되는지, 왜 통합 관측이 전략적 가치가 있는지 설명
- `README.md` — Lite 9 / Full 19 도구 수, 287개 API 통합 배지, NABO 환경 변수 설명 갱신

---

## 2026-04-06 — v0.2.1 (품질 개선)

### 의원 사진 URL 추가
- `get_members`, `search_members`, `analyze_legislator` 응답에 `사진`(photo) 필드 추가
- `https://www.assembly.go.kr/photo/{MONA_CD}.jpg` 형식
- `의원코드`(memberCode) 필드도 함께 반환

### 의안 상세 조회 보완
- `get_bill_detail`: BILLINFODETAIL API가 주요 필드(PROPOSER, COMMITTEE 등)를 반환하지 않는 경우 MEMBER_BILLS API로 자동 보완 조회
- 제안이유, 주요내용, 심사경과 등 원시(raw) 필드 전체 반환

### 도구 응답 일관성 개선
- `search_members` 단건 결과: `item` → `items` 배열로 통일
- `get_bill_review`, `get_bill_history`: 클라이언트 측 필터링 추가 (API가 BILL_ID/BILL_NM 필터를 무시하는 경우 대응)

### 검색 안정성 강화
- `UNIT_CD` 파라미터 제거 — MEMBER_INFO API에서 형식 오류로 빈 결과가 반환되는 문제 수정
- `search_members` Full 프로필 등록 누락 수정

---

## 2026-04-04 — v0.2.0 (Lite 프로필)

### 프로필 기반 MCP 도구 통합

AI 에이전트 효율성 분석(MCP 생태계 리서치, Block/korean-law-mcp 사례)과 사용자 관점 토론을 거쳐
23개 개별 도구를 7개 통합 도구(Lite 프로필)로 재설계.

**Lite 프로필 (기본, 7개 도구)**
- `search_members` — 의원 검색+상세 (get_members+get_member_detail 병합)
- `search_bills` — 의안 검색+상세+상태필터 (5개 도구 흡수)
- `search_records` — 일정+회의록+표결 (type 파라미터, 3개 도구 통합)
- `analyze_legislator` — 의원 종합분석 체인 (3 API Promise.all)
- `track_legislation` — 주제별 법안 추적 체인 (다중 키워드+심사이력)
- `discover_apis` — 276개 API 검색 (기존 유지)
- `query_assembly` — 범용 API 호출 (기존 유지)

**Full 프로필 (MCP_PROFILE=full)**
- 기존 23개 도구 전부 유지 (하위 호환)

**효과**
- 토큰 소비 73% 절감 (~14,000 → ~3,800)
- Cursor 도구 슬롯 17.5% (23/40 → 7/40)
- 의원 분석 4회 → 1회, 법안 추적 5-10회 → 1회

### MCP 리소스 추가
- `assembly://tools-guide` — Lite/Full 도구 사용법 가이드

### HTML 테스터 전면 개편
- 3탭 구성: 도구 테스트 / 전체 API 검색 / 회의록
- Lite 도구 UI (search_members, search_bills 등)
- 전체 API 검색 (276개 discover + 즉시 호출)
- 회의록 검색+상세 모달 (5종: 위원회/본회의/국감/인사청문회/공청회)
- API 코드 수정 (검증된 코드로 교체)

### 테스트 강화
- 248개 테스트 (69 → 248, +179)
- 전체 커버리지 88.8% (31% → 88.8%)
- Lite 도구 99.7%, API 계층 91.6%

### 문서
- `docs/mcp-design-analysis.md` — MCP 도구 설계 분석 보고서
- ~~`docs/test-scenarios.md`~~ — 내부 테스트 시나리오 (git 추적 제외)

## 2026-04-04 — v0.1.0 (초기 릴리스)

### 프로젝트 생성

- TypeScript + `@modelcontextprotocol/sdk` 기반 MCP 서버 구축
- 열린국회정보 (open.assembly.go.kr) API 276개 대상
- Node.js 18+, vitest, dotenv 환경 구성

### MCP 도구 (23개)

**국회의원 (3개)**
- `get_members` — 국회의원 검색 (이름/정당/선거구)
- `get_member_detail` — 의원 상세 정보
- `search_member_activity` — 의원 의정활동 (발의법안 + 표결 병렬 조회)

**의안 (9개)**
- `search_bills` — 의안 검색 (의안명/제안자/위원회)
- `get_bill_detail` — 의안 상세 조회 (BILL_ID)
- `search_all_bills` — 의안 통합검색 (전 대수, TVBPMBILL11)
- `get_pending_bills` — 계류의안 (13,006건)
- `get_processed_bills` — 처리의안 (4,620건)
- `get_recent_bills` — 최근 본회의 처리 (1,201건)
- `get_bill_review` — 의안 심사정보 (BILLJUDGE, 35,329건)
- `get_bill_history` — 의안 접수/처리 이력 (BILLRCP, 118,682건)
- `get_plenary_votes` — 본회의 표결정보 (1,315건)

**일정 / 회의록 (2개)**
- `get_schedule` — 국회 통합 일정 (ALLSCHEDULE, 90,201건)
- `search_meeting_records` — 회의록 검색 (본회의/위원회/국감/인사청문회/공청회)

**위원회 / 표결 / 청원 / 입법예고 (4개)**
- `get_committees` — 위원회 현황 (356건)
- `get_vote_results` — 의안별 표결 결과 (1,352건)
- `search_petitions` — 청원 계류현황 (276건)
- `get_legislation_notices` — 진행중 입법예고 (265건)

**부속기관 (3개)**
- `search_library` — 국회도서관 자료 검색
- `get_budget_analysis` — 예산정책처 분석 자료
- `search_research_reports` — 입법조사처 보고서

**범용 (2개) — 276개 API 100% 커버**
- `discover_apis` — 276개 API 키워드 검색 (OPENSRVAPI 기반)
- `query_assembly` — 임의 API 코드 직접 호출

### MCP 리소스

- `assembly://parties` — 정당 목록
- `assembly://committees` — 상임위원회 목록
- `assembly://sessions` — 회기 정보
- `assembly://api-catalog` — 276개 API 동적 카탈로그

### MCP 프롬프트 템플릿

- `analyze_member_activity` — 의원 의정활동 분석
- `summarize_recent_bills` — 최근 처리 의안 요약
- `committee_report` — 위원회 활동 현황 보고

### CLI (11개 커맨드)

`members`, `activity`, `bills`, `bill-detail`, `votes`, `pending`, `processed`, `recent`, `plenary`, `meta`, `test`

### 인프라

- **이중 Transport**: stdio (Claude Desktop) + StreamableHTTP (원격)
- **인메모리 캐시**: TTL 기반, LRU 크기 제한 (500), 정적(24h)/동적(1h) 구분
- **API 모니터링**: 응답 시간 추적, 느린 호출 감지 (>3초)
- **Rate Limit 관리**: 월 10,000 요청 추적, 80% 임계치 경고
- **Docker**: Dockerfile + docker-compose.yml (HTTP 모드)
- **CI/CD**: GitHub Actions (빌드/테스트/린트)

### API 코드 발굴

- OPENSRVAPI 메타 API → Excel 스펙 다운로드 → 실제 코드 추출 방법 확립
- **31개 검증된 API 코드** (17개 기존 + 14개 신규 발굴)
- 일정(ALLSCHEDULE), 회의록(nzbyfwhwaoanttzje 외 7개), 위원회(nxrvzonlafugpqjuh), 청원(nvqbafvaajdiqhehi), 입법예고(nknalejkafmvgzmpt) 실제 코드 발견

### 문서

- `README.md` — 프로젝트 개요, 23개 도구 목록
- `QUICK_START.md` — 5분 빠른 시작 가이드
- `docs/api-catalog.md` — 국회 API 276개 전체 목록
- `docs/mcp-api.md` — MCP 도구 ↔ 국회 API 매핑
- `docs/discovered-codes.md` — 발굴된 API 코드 상세
- `examples/api-tester.html` — 브라우저 인터랙티브 테스터
- `examples/claude-desktop-config.json` — Claude Desktop 설정 예시
- `examples/vscode-settings.json` — VS Code MCP 설정 예시

### 테스트

- 60+ 단위 테스트 (vitest)
- 설정, API 클라이언트, 캐시, 도구 등록/실행 테스트
- 실제 API 키로 E2E 검증 (11/11 + 14/14 통과)
