#国会 API MCP 서버 (assembly-api-mcp) Plans.md

작성일: 2026-04-04 | 최종 업데이트: 2026-04-12 (v0.7.0-Plan)

---

## 완료된 Phase 요약

| Phase | 내용 | 상태 |
|-------|------|------|
| 1~8, 10~11, 13 | 프로젝트 기반 → 23개 도구 → Docker/CI → 통합 인터페이스 (59/63) | cc:완료 |
| 12 | Lite 프로필 7개 통합 도구 설계+구현 (6/6) | cc:완료 |
| 14 | 설치 편의성: npx setup, Smithery, npm publish (5/5) | cc:완료 |
| 15 | 성능 개선: REST 클라이언트 재사용, LRU, 타임아웃 등 (6/6) | cc:완료 |
| 16 | 문서/코드 정합성: 도구 수 불일치 수정, 버전 동기화 (3/3) | cc:완료 |
| 17 | MCP 성능 11건: Progress, SWR, Dedup, Warm-up, gzip, DNS 등 (10/10) | cc:완료 |
| 18 | Tier 1+2 API 통합 26건: 의원이력, 표결, 예결산, 청원 등 (6/6) | cc:완료 |
| 19 | ALLBILL 의안정보 통합 API: 심사경과 자동 포함 (2/2) | cc:완료 |
| 20 | Tier 3 API 통합 36건: 역대, 국정감시, 영문, 보도자료 등 (6/6) | cc:완료 |
| 21 | Harness Audit: baseline, CHANGES, Plans 축소 (3/3) | cc:완료 |
| 22 | 의안 생애주기 완성: LIKMS 원문, 회의별 의안, 부록, 영상 (5/5) | cc:완료 |
| 23 | 국민참여입법센터 API 통합: lawmaking 6개 엔드포인트 목록 + 6개 상세 (12/12) | cc:완료 |
| 24 | assembly_org lawmaking 확장: type=lawmaking + category 파라미터 (6/6) | cc:완료 |
| 25 | NABO Open API 통합: nabo.go.kr 3개 API(report/periodical/recruitments) + get_nabo 도구 + /api/nabo (7/7) | cc:완료 |

---

## 블록 태스크 (2건)

| Task | 내용 | 상태 |
|------|------|------|
| 9.2 |国会도서관 법률통계 API (argos.nanet.go.kr) | blocked (NANET_API_KEY 미발급) |
| 9.3 | NABOSTATS 통계 시스템 (nabostats.go.kr) | blocked (NABO_API_KEY 미발급) |

---

## Phase 25: NABO Open API 통합 (nabo.go.kr)

### 배경

국회예산정책처(NABO) nabo.go.kr은 **3개의 REST API**를同一 구조로 제공합니다:

| # | API명 | Endpoint | 용도 |
|---|-------|----------|------|
| 1 | 채용정보 | `/api/v1/recruitments.do` |nabo.go.kr 채용공고 조회 |
| 2 | 보고서 자료 검색 | `/api/v1/report.do` | NABO 분석보고서 (1,687건+) |
| 3 | 정기간행물 | `/api/v1/periodical.do` | NABO 정기간행물 |

**공통 특징**:
- Base URL: `https://www.nabo.go.kr`
- 인증: `key` 파라미터 (공통 에러: INVALID_KEY, NOT_APPROVED, NOT_YET_VALID, EXPIRED)
- 응답: XML 또는 JSON (기본 XML)
- 페이지네이션 공통: `page`, `size`(default:20), `scSort`(pubDt/subj), `scOrder`(asc/desc), `scSw`

### NABO 3개 API 공통 응답 필드

| 필드 | TYPE | 설명 |
|------|------|------|
| page | number | 현재 페이지 번호 |
| size | number | 현재 페이지 사이즈 |
| total | number | 전체 검색 수 |
| subj | String | 게시물 제목 |
| cdNm | String | 작성자/작성부서 |
| pubDt | date | 게시일 |
| count | number | 조회수 |
| text | String | 게시물 내용 |
| detailUrl | String | 상세 페이지 URL |
| name | String | 첨부파일명 |
| url | String | 첨부파일 다운로드 URL |

### NABOSTATS (nabostats.go.kr) — 별도 Phase 26

nabostats.go.kr의 통계표 API(`SttsApiTblData.do`)는 **별도 API Key + 명세서 다운로드** 필요.
현재 블로커 상태 유지.

---

## Phase 25 Task 상세

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 25.1 | NABO API 클라이언트 — nabo.ts 생성 (APIClient 패턴) | nabo.go.kr 3개 API(report/periodical/recruitments) 호출 성공, XML→JSON 변환 정상 | - | cc:완료 |
| 25.2 | REST API 엔드포인트 — /api/nabo 스키마 추가 | report/periodical/recruitments 3개 type 200 응답 | 25.1 | cc:완료 |
| 25.3 | MCP 도구 설계 — get_nabo_report + get_nabo_periodical + get_nabo_recruitment | tool-designer 리뷰 포함, Lite 1개 or Full 3개 배분 | 25.1 | cc:완료 |
| 25.4 | MCP 도구 구현 — 1~3개 도구 등록 |nabo.go.kr 1개 이상 MCP 도구 등록 | 25.3 | cc:완료 |
| 25.5 | 단위 테스트 — NABO API 테스트 작성 |nabo.ts 테스트 5개 이상 | 25.4 | cc:완료 |
| 25.6 | 문서 갱신 — tool-mapping.md + docs/nabo-api.md | NABO API 카테고리 추가, 사용법記載 | 25.5 | cc:완료 |
| 25.7 | 버전 업데이트 — v0.6.0 → v0.7.0 | package.json + README + server.ts + User-Agent v0.7.0 | 25.6 | cc:완료 |
| 25.8 | NABO CLI 명령어 추가 — nabo.go.kr 3개 타입 CLI 지원 | npx tsx src/cli.ts nabo --type report\|periodical\|recruitments 동작 확인 | 25.1 | cc:완료 |

---

## Phase 26: NABOSTATS Open API (nabostats.go.kr) — 추후 진행

**블로커**: NABO_API_KEY 발급 + 명세서 다운로드 필요

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 26.1 | NABOSTATS API 탐색 — nabostats.go.kr 엔드포인트 확인 | nabostats.go.kr API 목록 확인 | - | blocked |
| 26.2 | NABOSTATS API 클라이언트 — nabostats.ts 생성 | nabostats.go.kr 통계표 API 호출 성공 | 26.1 | blocked |
| 26.3 | MCP 도구 구현 — get_nabostats |nabostats.go.kr 통계 조회 MCP 도구 등록 | 26.2 | blocked |

---

## 우선순위 매트릭스 (Impact × Risk)

| Task | Impact | Risk | Priority |
|------|--------|------|----------|
| 25.1 NABO API 기본구조 | ★★★ | ★★☆ | **Required** (API Key 발급 후) |
| 25.3 도구 설계 | ★★★ | ★☆☆ | **Required** |
| 25.4 NABO 도구 구현 | ★★★ | ★★☆ | **Required** |
| 25.5 단위 테스트 | ★★☆ | ★★☆ | **Required** |
| 26.x NABOSTATS | ★★★ | ★★★ | **Recommended** (별도 Phase) |

---

## 블로커 해제 조건

| Task | 블로커 | 해제 조건 |
|------|--------|----------|
| 25.1~25.7 | NABO_API_KEY 미발급 | https://www.nabo.go.kr/ko/api/apply.do?key=2509230004 에서 신청 |
| 26.x | NABO_API_KEY 미발급 + 명세서 미확인 | 상동 + nabostats.go.kr 명세서 다운로드 |

---

## 현재 프로젝트 수치 (v0.7.0 목표)

| 항목 | v0.6.0 | v0.7.0 | 변화 |
|------|--------|--------|------|
| MCP 도구 | 6개 (Lite) / 10개 (Full) | **6개 (Lite) / 11개 (Full)** | +1 |
| NABO API | 0개 | **3개** (report/periodical/recruitments) | +3 |
| API 소스 |国会+lawmaking | **国会+lawmaking+NABO 3개** | +1 |

---

## Phase 23: 국민참여입법센터 Open API 통합

목표: lawmaking.go.kr의 Open API를 assembly-api-mcp에 통합하여 입법예고/행정예고/법령해석례/의견제시까지 100% 커버

### 배경

국회 API의 입법예고(`nknalejkafmvgzmpt`)는 열린국회정보 기준, 국민참여입법센터(lawmaking.go.kr)는 법제처 기준. 두 소스를 통합하면:
-立法예고: 진행 중 / 종료된 예고 모두 확인
- 행정예고: 자치법규(조례/규칙) 예고 확인
- 법령해석례: 해석 사례 검색
- 의견제시사례: 자치법제 의견제시 안건 추적

### 국민참여입법센터 API 카탈로그

| # | API명 | Endpoint | 파라미터 | 응답 필드 |
|---|-------|----------|---------|----------|
| 1 | 입법현황 목록 | `/rest/govLmSts` | OC, lsKndCd, cptOfiOrgCd, stDtFmt, edDtFmt, lbPrcStsCdGrp, lsNmKo | lbicId, lsNmKo, lsKndNm, cptOfiOrgNm, lbPrcStsNm, lbPrcStsDt |
| 2 | 입법현황 상세 | `/rest/govLmSts/{일련번호}` | OC | 상세 내용 |
| 3 | 입법계획 목록 | `/rest/lmPln` | OC, lmPlnYy, pmtClsCd, cptOfiOrgCd, searchKnd, srchTxt | lmPlnSeq, lsNm, cptOfiOrgNm, srcNm, lbPrcStsNm, mgtDt |
| 4 | 입법계획 상세 | `/rest/lmPln/{일련번호}` | OC | 상세 내용 |
| 5 | 입법예고 목록 | `/rest/ogLmPp` | OC, lsClsCd, cptOfiOrgCd, diff, pntcNo, stYdFmt, edYdFmt, lsNm | ogLmPpSeq, lsNm, lsClsNm, asndOfiNm, pntcNo, stYd, edYd, FileDownLink |
| 6 | 입법예고 상세 | `/rest/ogLmPp/{seq}/{mappingLbicId}/{announceType}` | OC | 상세 + 파일 목록 |
| 7 | 행정예고 목록 | `/rest/ptcpAdmPp` | OC, lsClsCd, closing, asndOfiNm, stYdFmt, edYdFmt, admRulNm | ogAdmPpSeq, admRulNm, lsClsNm, asndOfiNm, pntcNo, FileDownLink |
| 8 | 행정예고 상세 | `/rest/ptcpAdmPp/{일련번호}` | OC | 상세 + 파일 목록 |
| 9 | 법령해석례 검색 | `/rest/lsItptEmp` | OC, prdFrDay, prdToDay, lsCptOrg, schKeyword | itmSeq, itmNm, tgLsNm, joCts, catNm |
| 10 | 법령해석례 상세 | `/rest/lsItptEmp/{일련번호}` | OC | 해석례 전문 |
| 11 | 의견제시사례 목록 | `/rest/loLsExample` | OC, scFmDt, scToDt, scTextType, scText | caseSeq, caseNm, caseNo, reqOrgNm, cdtDt |
| 12 | 의견제시사례 상세 | `/rest/loLsExample/{일련번호}` | OC | 상세 내용 |

### 기존国会 API와 중복/보완 관계

| 국민참여입법센터 | 기존国会 API | 관계 |
|----------------|-------------|------|
| 입법예고(ogLmPp) | nknalejkafmvgzmpt | **보완**: 진행/종료 모두 제공 |
| 행정예고(ptcpAdmPp) | 없음 | **신규**: 자치법규 예고 |
| 법령해석례(lsItptEmp) | mcp-korean-law__get_interpretation_text | **별도**: lawmaking vs 법제처 해석 |
| 의견제시사례(loLsExample) | 없음 | **신규**: 자치법제 의견제시 |

---

## Phase 24: assembly_lawmaking MCP 도구 통합 설계 (23.7 Expanded)

### 설계 원칙

1. **파라미터 확장 > 도구 추가**: 기존 도구에 `source` 파라미터로 lawmaking 추가
2. **국회 API와 차이 명확히**: lawmaking은 법제처/국민참여입법센터, 국회는 국민소통실
3. **자동 감지**: `type` 파라미터로 API 분기

### 제안 1: assembly_org 확장 (채택 권장)

기존 `assembly_org(type="legislation_notice")` → `type="lawmaking"` 추가

```
assembly_org(type="lawmaking", category="legislation") // 입법예고
assembly_org(type="lawmaking", category="admin")       // 행정예고
assembly_org(type="lawmaking", category="interpretation") // 법령해석례
assembly_org(type="lawmaking", category="opinion")       // 의견제시사례
```

### 제안 2: 독립 도구 추가 (대안)

```
search_lawmaking({ type, keyword, ... }) // lawmaking.go.kr 검색
get_lawmaking_detail({ id, type })       // lawmaking 상세
```

---

## 우선순위 매트릭스 (Impact × Risk)

| Task | Impact | Risk | Priority |
|------|--------|------|----------|
| 23.1 API 기본구조 | ★★★ | ★☆☆ | **Required** |
| 23.3 입법예고 API | ★★★ | ★☆☆ | **Required** |
| 23.4 행정예고 API | ★★☆ | ★☆☆ | **Required** |
| 23.5 법령해석례 API | ★★☆ | ★★☆ | **Recommended** |
| 23.6 의견제시사례 API | ★☆☆ | ★★☆ | **Optional** |
| 24.3 도구 설계 | ★★★ | ★★☆ | **Required** |
| 24.4 assembly_org 확장 | ★★★ | ★☆☆ | **Required** |

---

## 현재 프로젝트 수치 (v0.6.0)

| 항목 | v0.5.0 | v0.6.0 | 변화 |
|------|--------|--------|------|
| MCP 도구 | 6개 (Lite) / 10개 (Full) | 6개 (Lite) / 10개 (Full) | 유지 |
| API 코드 등록 | 271개 | **279개** (+8 lawmaking) | +8 |
| API 소스 |国会 1개 | **国会+lawmaking 2개** | +1 |
| 커버 범위 |国会 276개 | **284개** (+8 lawmaking) | +8 |
