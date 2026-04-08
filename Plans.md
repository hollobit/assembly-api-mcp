# 국회 API MCP 서버 (assembly-api-mcp) Plans.md

작성일: 2026-04-04 | 최종 업데이트: 2026-04-04

---

## 완료된 Phase (59/63 태스크)

| Phase | 내용 | 태스크 | 상태 |
|-------|------|--------|------|
| 1 | 프로젝트 기반 (스캐폴딩, API 클라이언트, 인증, 에러, 테스트) | 5/5 | cc:完了 |
| 2 | 핵심 도구 (의원, 의안, 일정, 회의록) + 통합 테스트 | 5/5 | cc:完了 |
| 3 | 확장 도구 (위원회, 표결, 청원, 입법예고, 의원활동) | 5/5 | cc:完了 |
| 4 | 부속기관 (도서관, 예산정책처, 입법조사처) + 통합 테스트 | 4/4 | cc:完了 |
| 5 | 고급 기능 (Resource, Prompt, 캐싱, HTTP, Claude Desktop, npm) | 6/6 | cc:完了 |
| 6 | API 검증 및 CLI (276개 조사, 31개 검증, CLI 11커맨드, HTML 테스터) | 5/5 | cc:完了 |
| 7 | 코드 품질 (Promise.all, CLI 지연초기화, LRU 캐시, 캐시키 최적화) | 5/5 | cc:完了 |
| 8 | 미매핑 API 도구화 (계류/처리/최근/심사/표결/통합/이력 7개) | 7/7 | cc:完了 |
| 10 | 배포 (Docker, CI/CD, 모니터링, Rate Limit) | 4/5 | 10.5 미완 |
| 11 | 통합 인터페이스 (discover_apis, query_assembly, 동적 카탈로그) | 6/6 | cc:完了 |
| 13 | 리네이밍 (cong→assembly-api, 저장소 hollobit/assembly-api-mcp 이전) | 1/1 | cc:完了 |

---

## 미완료 태스크 (4건)

### Phase 9: data.go.kr 및 부속기관 연동 (Optional)

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 9.1 | data.go.kr 국회 API 연동 | REST API 4종이 open.assembly.go.kr과 완전 중복 확인 — 스킵 | 1.2 | cc:중복확인 |
| 9.2 | 국회도서관 법률통계 API | argos.nanet.go.kr 연동 | Phase 1 | blocked (NANET_API_KEY 미발급) |
| 9.3 | 국회예산정책처 통계 시스템 | nabostats.go.kr 연동 | Phase 1 | blocked (NABO_API_KEY 미발급) |

### Phase 10: 배포 (잔여)

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 10.5 | Smithery MCP 마켓플레이스 등록 | smithery.ai에 MCP 서버 등록 | 5.6 | cc:完了 (14.4와 통합) |

### Phase 12: 프로필 기반 통합 MCP 인터페이스 (7개 도구)

AI 에이전트 vs 사용자 관점 토론 결과 반영: 7개 Lite 도구로 최종 결정.
- Lite 프로필(기본): 핵심 3개 + 체인 2개 + 범용 2개 = **7개 도구** (~3,800 토큰)
- Full 프로필: 기존 23개 전부 유지 (파워유저/자체호스팅)
- 근거: 토큰 73% 절감, Cursor 슬롯 17.5%, 사용자 TOP 질문 1회 호출 해결

Lite 도구 구성:
1. `search_members` — 의원 검색+상세 (get_members+get_member_detail 병합)
2. `search_bills` — 의안 검색+상세+상태필터 (search_bills+get_bill_detail+pending/processed/recent 흡수)
3. `search_records` — 일정+회의록+표결 통합 (type 파라미터: schedule/meetings/votes)
4. `analyze_legislator` — 의원 종합분석 체인 (인적사항+발의+표결 Promise.all)
5. `track_legislation` — 주제별 법안 추적 체인 (다중 키워드+타임라인)
6. `discover_apis` — 276개 API 탐색 (기존 유지)
7. `query_assembly` — 범용 API 호출 (기존 유지)

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 12.1 | Lite 도구: `search_members` | get_members+get_member_detail 병합, name 단일결과시 상세 반환, 테스트 통과 | - | cc:完了 |
| 12.2 | Lite 도구: `search_bills` | 의안 검색+상세+상태필터(계류/처리/최근 흡수), bill_id로 직접 상세 조회 가능, 테스트 통과 | - | cc:完了 |
| 12.3 | Lite 도구: `search_records` | type=schedule/meetings/votes 분기, 각 도메인별 포맷팅, 테스트 통과 | - | cc:完了 |
| 12.4 | 체인 도구: `analyze_legislator` + `track_legislation` | 의원 종합분석(Promise.all 3개 API) + 주제별 법안 추적(다중 키워드), 테스트 통과 | - | cc:完了 |
| 12.5 | `MCP_PROFILE` 분기 + `registerLiteTools` | config.ts에 profile 추가, server.ts에서 lite→7개/full→23개 분기, .env.example 반영 | 12.1-12.4 | cc:完了 |
| 12.6 | 테스트 + Resource + 문서 | Lite 7개 도구 테스트(9개), Full 기존 테스트 유지(60개), assembly://tools-guide Resource | 12.5 | cc:完了 |

### Phase 14: 설치 편의성 개선 (Easy Install)

Purpose: git clone + build + JSON 수동 편집 없이, 한 줄 명령으로 설치·연동할 수 있게 한다.

현재 설치 마찰:
- git clone → npm install → npm run build (3단계 빌드)
- .env 파일 복사 + 편집기로 키 입력
- Claude Desktop JSON 수동 편집 (경로 직접 입력, transport 실수)
- 비개발자에게 진입 장벽 높음

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 14.1 | npx 원클릭 실행 지원 | `npx assembly-api-mcp` 으로 빌드 없이 바로 실행 가능. package.json bin 필드 + npm publish, shebang 동작 확인 | - | cc:完了 |
| 14.2 | `setup` CLI 명령 추가 | `npx assembly-api-mcp setup` 으로 대화형 설정 (API 키 입력 → 프로필 선택 → 6개 클라이언트 자동 설정). 플랫폼 감지(macOS/Windows/Linux) | 14.1 | cc:完了 |
| 14.3 | Claude Desktop 자동 설정 | setup 명령이 claude_desktop_config.json을 자동으로 찾아 assembly-api 항목 추가. 기존 설정 보존, MCP_TRANSPORT=stdio 자동 설정 | 14.2 | cc:完了 |
| 14.4 | Smithery MCP 마켓플레이스 등록 | smithery.yaml 생성 완료, smithery.ai 등록은 수동 | 14.1 | cc:完了 |
| 14.5 | npm publish 준비 + README 업데이트 | prepublishOnly 스크립트 추가, npm pack 검증 완료. `npm publish`는 수동 실행 필요 | 14.1, 14.2 | cc:完了 |

개선 후 설치 흐름:
```
# 방법 1: npx (빌드 불필요)
npx assembly-api-mcp setup
# → API 키 입력 → Claude Desktop 자동 설정 → 완료

# 방법 2: Smithery (MCP 마켓플레이스)
smithery install assembly-api-mcp

# 방법 3: 글로벌 설치
npm install -g assembly-api-mcp
assembly-api-mcp setup
```

### Phase 15: 성능 개선

#### 분석 요약

**가장 심각한 병목:**

1. **REST 라우터 — `createApiClient` 매 요청 재생성** (`router.ts:180`): REST API 요청마다 새 캐시, 새 모니터, 새 Rate Limiter 인스턴스가 생성됨. 이전 요청의 캐시가 버려지므로 REST 모드에서 캐시 히트율 0%. MCP 세션에서는 세션당 1번만 생성되므로 문제없었지만, REST API에서는 치명적.

2. **Monitor `metrics` 배열 무한 증가** (`monitor.ts:48`): `metrics = [...metrics, metric]`로 매 호출마다 전체 배열을 복사. 10,000 호출 시 매번 10,000개 항목 복사 — O(n) 메모리 + O(n) 시간.

3. **캐시 LRU 동작 불완전** (`cache.ts:46-66`): `get()` 시 접근 순서를 갱신하지 않아 자주 사용하는 항목도 삽입 순서대로 evict될 수 있음.

4. **정적 API 캐시 범위 부족**: `MEMBER_INFO`만 24h TTL. `COMMITTEE_INFO`, `META_API_LIST` 등 거의 변하지 않는 데이터도 1h TTL 적용.

5. **fetch 타임아웃 없음** (`client.ts:105`): 국회 API가 응답하지 않으면 무한 대기.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 15.1 | REST 라우터 — API 클라이언트 재사용 | 동일 API 키에 대해 캐시된 클라이언트 인스턴스 반환, 캐시/모니터/Rate Limiter 공유 | - | cc:完了 |
| 15.2 | Monitor — 메트릭 배열 무한 증가 수정 | 슬라이딩 윈도우 (최대 1000건) + mutable push로 변경, O(1) append | - | cc:完了 |
| 15.3 | 캐시 LRU 순서 갱신 | `get()` 시 Map delete→re-insert로 최근 사용 항목 보호 | - | cc:完了 |
| 15.4 | 정적 API 코드 확대 | COMMITTEE_INFO, META_API_LIST, VOTE_PLENARY를 정적 캐시(24h) 대상에 추가 | - | cc:完了 |
| 15.5 | fetch AbortController 타임아웃 (10초) | 느린 API 호출 10초 후 자동 중단, 타임아웃 에러 반환 | - | cc:完了 |
| 15.6 | REST 응답 Cache-Control 헤더 | 정적 데이터에 `Cache-Control: public, max-age=3600`, 동적 데이터에 `max-age=60` | 15.4 | cc:完了 |

### Phase 16: 문서/코드 정합성 수정

검증 과정에서 발견된 도구 수 불일치 및 버전 불일치를 수정한다.
원래 Lite 7개/Full 23개였으나 Phase 12 이후 Lite 9개/Full 18개로 변경됨. 문서와 소스코드 주석이 업데이트되지 않은 부분을 일괄 수정.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 16.1 | 도구 수 불일치 수정 — 문서 (QUICK_START.md, README.md, .env.example) | Lite "7개"→"9개", Full "23개"→"18개" 일괄 반영, 관련 수치 정합 | - | cc:完了 [b009e56] |
| 16.2 | 도구 수 불일치 수정 — 소스코드 주석/메시지 (config.ts, setup.ts, static-data.ts, lite/index.ts) | 소스 내 "7개"→"9개", "23개"→"18개" 수정, 빌드 통과 | 16.1 | cc:完了 [b009e56] |
| 16.3 | server.ts MCP 버전 동기화 | version: "0.2.0" → "0.3.0" (package.json과 일치) | - | cc:完了 [b009e56] |

### Phase 17: MCP 프레임워크 및 성능 개선 검토

#### 검토 배경

Claude Desktop / claude.ai 에서 MCP 도구 응답이 느리고 연결이 매끄럽지 못한 문제.
FastMCP 등 대안 프레임워크와 Pydantic 등 기술 스택으로 성능 개선 가능성을 조사.

#### 조사 결과 요약

**A. FastMCP (Python, PrefectHQ) — 부적합**
- Python 전용. 프로젝트 전체를 Python으로 재작성해야 함
- 24K 스타, 공식 MCP Python SDK에 채택됨
- 캐싱 미들웨어, Pydantic 통합 등 우수하나 언어 전환 비용이 너무 큼
- **결론: 채택 불가 (TypeScript 프로젝트)**

**B. FastMCP (TypeScript, punkpeye/fastmcp) — 검토 가치 있음**
- 3K 스타, @modelcontextprotocol/sdk를 래핑
- Progress notification, Streaming output, Session 관리, 인증 내장
- 마이그레이션 난이도: 중간 (도구 정의 패턴 변경 필요)
- **핵심 이점: 진행 상황 알림으로 UX 개선 가능**

**C. 현재 SDK에서 직접 개선 — 가장 현실적**
- @modelcontextprotocol/sdk v1.12.0이 progress notification을 이미 지원
- FastMCP 없이도 핵심 기능(진행 알림, 응답 최적화)을 직접 구현 가능
- 기존 코드 변경 최소, 즉시 효과

**D. Pydantic vs Zod — 해당 없음**
- TypeScript 프로젝트에서 Zod이 적합, Pydantic은 Python 전용
- MCP SDK v2 alpha에서 Standard Schema 지원 예정 (Zod v4 호환)

#### 핵심 병목 분석

| 병목 | 원인 | 현재 | 개선 가능성 |
|------|------|------|------------|
| 국회 API 응답 느림 | 외부 서버 1~5초 | 10초 타임아웃 | 제어 불가 (캐시로 완화) |
| 체인 도구 다중 호출 | analyze: 3회, track: N+5회 | Promise.all 병렬화 | 이미 최적화됨 |
| 진행 상황 무피드백 | MCP progress 미사용 | 빈 화면 대기 | **큰 개선 가능** |
| 응답 크기 | 전체 row JSON 반환 | 6~90KB | 필드 축소로 개선 가능 |
| Fly.dev Cold start | min_machines=0 | 첫 요청 수초 지연 | min=1로 해결 |
| 캐시 미스 시 지연 | 첫 호출 느림 | 캐시 히트율 99% | warm-up 추가 가능 |

#### 권장 방안: 현재 SDK 기반 점진적 개선

FastMCP(TS) 마이그레이션보다 현재 SDK에서 3가지 핵심 개선이 ROI가 높음:

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 17.1 | MCP Progress Notification 도입 — 체인 도구(analyze_legislator, track_legislation)에 단계별 진행 알림 | 도구 실행 중 progress 이벤트가 클라이언트에 전달됨 | - | cc:完了 |
| 17.2 | Fly.dev Cold start 제거 — min_machines_running=1 설정 | fly.toml 수정, 배포 후 첫 요청 응답 < 2초 | - | cc:完了 |
| 17.3 | 캐시 Warm-up — 서버 시작 시 정적 API(의원, 위원회) 사전 로드 | 서버 시작 후 첫 도구 호출이 캐시 히트 | - | cc:完了 |
| 17.4 | Stale-While-Revalidate 캐시 — TTL 만료 시 즉시 stale 반환 + 백그라운드 갱신 | 캐시 만료 순간에도 0ms 응답, 백그라운드에서 데이터 갱신됨 | - | cc:完了 |
| 17.5 | 요청 중복 제거 (Deduplication) — 동일 API 동시 호출 시 Promise 공유 | 같은 API 코드+파라미터의 동시 요청이 1회만 fetch 실행 | - | cc:完了 |
| 17.6 | 백그라운드 주기 갱신 — 정적 API 30분마다 자동 리프레시 | setInterval로 MEMBER_INFO/COMMITTEE_INFO/META_API_LIST 갱신, 캐시 미스 0% | - | cc:完了 |
| 17.7 | HTTP Keep-Alive 명시적 설정 — fetch keepalive: true 명시 | TCP 재사용 보장, 2회차 이후 핸드셰이크 절감 | - | cc:完了 |
| 17.8 | REST API gzip 응답 압축 — Accept-Encoding: gzip 요청 시 압축 전송 | /openapi.json 34KB→~12KB, 대량 응답 60-70% 절감 | - | cc:完了 |
| 17.9 | 예측 프리패치 — 의원 검색 시 발의법안+표결 백그라운드 프리패치 | search_members 후 analyze_legislator 호출 시 캐시 히트 | - | cc:完了 |
| 17.10 | DNS 캐시 — open.assembly.go.kr DNS 조회 결과 인메모리 캐시 (5분 TTL) | API 호출당 ~10ms DNS 조회 절감 | - | cc:完了 |

### Phase 18: API 커버율 확장 — Tier 1 (12건 통합, 도구 수 변경 없음)

발굴된 271개 코드 중 고우선순위 12건을 기존 도구에 통합하여 커버율 16%→21% 향상.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 18.1 | assembly_member에 의원이력+표결+상임위+위원회경력+보고서+SNS+영상+청원 8개 API 통합 | analyze에서 이력/경력/표결/보고서/SNS/영상/청원 반환 | - | cc:完了 |
| 18.2 | assembly_bill에 의안별회의록+계류통계+역대통계+위원회계류+대안 5개 API 통합 | track에 회의록, stats에 계류/역대, search에 위원회계류/대안 | - | cc:完了 |
| 18.3 | bill_detail에 예결산 심사+예비심사 2개 API 통합 | bill_id 조회 시 예결산 심사 자동 포함 | - | cc:完了 |
| 18.4 | petition_detail에 심사+소개의원+통계 3개 API 통합 | petition_id 상세에 심사/소개의원, mode=stats에 통계 | - | cc:完了 |
| 18.5 | assembly_session에 소위/예결위/특위 회의록+상세+제안설명서+국감결과 6개 API 통합 | 회의록 유형 확장, 상세/설명서/국감결과 | - | cc:完了 |
| 18.6 | committee_detail에 개정대상법률+자료실 2개 API 통합 | 위원회 상세에 개정법률/자료실 포함 | - | cc:完了 |

---

## 현재 프로젝트 수치

| 항목 | 수치 |
|------|------|
| MCP 도구 | 9개 (Lite) / 18개 (Full) |
| 검증된 API 코드 | 31개 |
| 전체 국회 API | 276개 (100% 접근 가능) |
| 단위 테스트 | 248개 통과 (88.8% 커버리지) |
| 소스 코드 | ~4,500줄 (TypeScript, 32개 파일) |
| 테스트 코드 | 11개 파일 |
| CLI 커맨드 | 11개 |
| MCP Resource | 5개 |
| MCP Prompt | 3개 |
