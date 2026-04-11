# 국회 API MCP 서버 (assembly-api-mcp) Plans.md

작성일: 2026-04-04 | 최종 업데이트: 2026-04-11 (v0.6.0-Plan)

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

---

## 블록 태스크 (2건)

| Task | 내용 | 상태 |
|------|------|------|
| 9.2 | 국회도서관 법률통계 API (argos.nanet.go.kr) | blocked (NANET_API_KEY 미발급) |
| 9.3 | 국회예산정책처 통계 시스템 (nabostats.go.kr) | blocked (NABO_API_KEY 미발급) |

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

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 23.1 | API 클라이언트 기본 구조 — lawmaking.ts 생성, OC 인증, XML 파싱 | lawmaking.ts 생성, APIClient base class 상속, OC 파라미터 처리 | - | cc:TODO |
| 23.2 | 입법현황/계획 API — govLmSts + lmPln 목록+상세 | 목록 조회 + 상세 조회 응답 정상 | 23.1 | cc:TODO |
| 23.3 | 입법예고 API — ogLmPp 목록+상세 (diff로 진행/종료 필터) | 진행중/종료 예고 모두 조회 가능, 파일 다운로드 링크 포함 | 23.1 | cc:TODO |
| 23.4 | 행정예고 API — ptcpAdmPp 목록+상세 | 자치법규(훈령/예규/고시/공고/지침) 예고 목록 + 상세 | 23.1 | cc:TODO |
| 23.5 | 법령해석례 API — lsItptEmp 검색+상세 | 키워드 검색 + 상세 해석례 응답 | 23.1 | cc:TODO |
| 23.6 | 의견제시사례 API — loLsExample 목록+상세 | 안건명/기관별 검색 + 상세 응답 | 23.1 | cc:TODO |
| 23.7 | MCP 도구 설계 — assembly_lawmaking 도구 (Lite 1개 or Full 5개) | tool-mapping.md 설계안 작성, Lite/Full 프로필 배분 결정 | 23.2~23.6 | cc:TODO |
| 23.8 | MCP 도구 구현 — assembly_lawmaking + assembly_lawmaking_detail | 2개 이상 MCP 도구 등록 완료, REST API 정상 응답 | 23.7 | cc:TODO |
| 23.9 | 단위 테스트 — lawmaking API 테스트 작성 | tsx scripts/call-lawmaking.ts로 수동 검증 후 jest 통과 | 23.8 | cc:TODO |
| 23.10 | 문서화 — docs/tool-mapping.md + docs/mcp-api.md 갱신 | tool-mapping.md에 lawmaking API 카테고리 추가 | 23.8 | cc:TODO |
| 23.11 | 버전 업데이트 — v0.5.0 → v0.6.0 (HISTORY.md 포함) | package.json version + README + server.ts + User-Agent 전부 v0.6.0 | 23.9, 23.10 | cc:TODO |

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

| 장점 | 단점 |
|------|------|
| 기존 도구 1개 확장만으로 통합 | 파라미터 복잡도 증가 |
| Lite 6개 도구 유지 | 자동감지 로직 복잡 |
| 마이그레이션 비용 제로 | description 토큰 증가 |

### 제안 2: 독립 도구 추가 (대안)

```
search_lawmaking({ type, keyword, ... }) // lawmaking.go.kr 검색
get_lawmaking_detail({ id, type })       // lawmaking 상세
```

| 장점 | 단점 |
|------|------|
| 도메인 경계 명확 | Lite 도구 6→8개 증가 |
| 파라미터 단순 | 토큰 소비 증가 |
| 독립 네임스페이스 |国会 API와 중복 느낌 |

### Phase 24 Task 상세

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 24.1 | lawmaking API 클라이언트 — lawmaking.ts (APIClient 상속) | OC认证, XML→JSON 변환, error handling | - | cc:TODO |
| 24.2 | lawmaking API codes.ts 등록 — 12개 엔드포인트 코드 | codes.ts에 LMGVOLMSTS, LMPLN, OGLMPP, PTCPADMPP, LSITPTEMP, LOLSEXAMPLE 등록 | 24.1 | cc:TODO |
| 24.3 | MCP 도구 설계 — assembly_org 확장안 vs 독립 도구안 | tool-designer 리뷰 포함 설계서 작성 | 23.7 | cc:TODO |
| 24.4 | assembly_org 확장 구현 — type="lawmaking" 추가 | assembly_org에 category 파라미터로 분기, lawmaking API 호출 | 24.3 | cc:TODO |
| 24.5 | assembly_org 도구 설명 갱신 — lawmaking 포함 | description에 lawmaking 카테고리 4개 설명 추가 | 24.4 | cc:TODO |
| 24.6 | 단위 테스트 — lawmaking API 테스트 | lawmaking.ts 테스트 5개 이상 | 24.4 | cc:TODO |
| 24.7 | REST API 엔드포인트 — /api/lawmaking 스키마 추가 | /api/lawmaking?type=legislation&keyword=법률 으로 200 응답 | 24.4 | cc:TODO |
| 24.8 | 문서 갱신 — tool-mapping.md + mcp-api.md | lawmaking API 카테고리 추가, assembly_org 확장 설명 | 24.5 | cc:TODO |
| 24.9 | Eval 준비 — v0.6.0评估报告准备 | eval 스크립트에 lawmaking 테스트 케이스 추가 | 24.8 | cc:TODO |

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
| API 코드 등록 | 271개 | **277개** (+6 lawmaking) | +6 |
| API 소스 |国会 1개 | **国会+lawmaking 2개** | +1 |
| 커버 범위 |国会 276개 | **282개** (+6 lawmaking) | +6 |
