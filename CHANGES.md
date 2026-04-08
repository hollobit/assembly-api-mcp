# CHANGES.md

## 2026-04-09 — v0.5.0 (API 커버율 대폭 확장)

### 도구 구조 통합 (Breaking Change from v0.3)
- Lite 9개 → **6개** 도구 (도메인 엔티티 기반: member/bill/session/org)
- Full 19개 → **10개** 도구 (Lite 6 + 심층 4: bill_detail/committee_detail/petition_detail/research_data)
- 토큰 소비 73% 절감 (v0.2 대비), LLM 최적 구간(6개) 진입

### API 코드 일괄 발굴
- 자동 발굴 스크립트 (`scripts/discover-all-codes.ts`) 구현
- **271개 코드 발굴** (276개 중 98.2%)
- `codes.ts`에 전체 등록, `query_assembly`로 즉시 호출 가능

### API 커버율 확장 (Tier 1~3)
- **107개 API** 전용 도구 통합 (39% 커버율)
- Tier 1: 의원이력/표결/상임위/위원회경력 + 의안회의록/통계 + 예결산 + 청원심사 (12건)
- Tier 2: 보고서/SNS/영상 + 소위/예결위/특위/상세/설명서 + 개정법률 (14건)
- Tier 3: 역대국회(13)/국정감시(8)/영문(6)/통합API(6)/보도자료(2)/정당(1) (36건)
- ALLBILL 의안정보 통합 API — 심사경과(소관위→법사위→본회의→공포) 자동 포함

### 성능 개선 (11건)
- MCP Progress Notification (체인 도구 진행 알림)
- Stale-While-Revalidate 캐시 (만료 시 0ms 응답)
- 요청 중복 제거 (동일 API 동시 호출 시 Promise 공유)
- 캐시 Warm-up (서버 시작 시 정적 API 사전 로드)
- 백그라운드 주기 갱신 (30분마다 정적 API 리프레시)
- HTTP Keep-Alive 명시, DNS 프리워밍
- REST API gzip 압축 (60~90% 전송 절감)
- 예측 프리패치 (의원 검색→분석 패턴)
- Fly.dev Cold start 제거 (min_machines=1)
- MCP Logging primitive (클라이언트 진단 로그)

### 보안 강화
- Cache-Control: private, no-store for API key requests
- 인메모리 Map 크기 제한 (sessions=200, inflight=100, DNS=50)
- DNS 캐시 만료 엔트리 자동 정리

### 기타
- 웹 설정 도우미 랜딩 페이지 (`/`)
- Codex CLI 플러그인 메타데이터
- 영문 API 지원 (`lang="en"`)
- 역대 국회 데이터 (`scope="history"`)
- 정당 의석수 통계 (`mode="party_stats"`)

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
