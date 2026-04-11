# MCP 도구 매핑 가이드

> Lite/Full 프로필별 도구 구성, 통합 원칙, API 매핑을 정리합니다.
> 최종 업데이트: 2026-04-12

---

## 설계 원칙

### 1. 도메인 엔티티 기반 통합

API 1:1 매핑이 아닌, **사용자의 질문 단위**에 맞춰 도구를 설계합니다.

```
사용자: "이해민 의원에 대해 알려줘"
  → assembly_member (1개 도구로 검색+분석 완결)

사용자: "AI 관련 법안 현황은?"
  → assembly_bill (검색+추적+통계를 한 도구에서)
```

**원칙**: 하나의 질문에 하나의 도구 호출로 완결되어야 합니다.

### 2. Lite = 최소, Full = 심층

| 프로필 | 목적 | 도구 수 | 대상 |
|--------|------|---------|------|
| **Lite** | AI 에이전트 최적화, 토큰 절감 | 6개 | 일반 사용 (기본) |
| **Full** | 파워유저, 심층 분석 | 11개 | 세부 데이터 필요 시 |

- Lite는 도구 수를 최소화하여 **LLM 도구 선택 정확도 최적 구간(6~8개)**을 유지
- Full은 Lite 6개 + 심층 도구 5개 = 11개로, Cursor 40개 제한의 27%만 사용

### 3. 파라미터 확장 > 도구 추가

새 기능은 기존 도구에 파라미터를 추가하는 방식으로 통합합니다.

```
나쁜 예: get_bill_stats (신규 도구 추가)
좋은 예: assembly_bill(mode="stats") (기존 도구에 모드 추가)
```

### 4. 자동 감지 > 명시 지정

사용자가 모드를 지정하지 않아도 파라미터 조합으로 자동 감지합니다.

```
assembly_session({bill_id: "..."})        → 자동으로 표결 모드
assembly_session({meeting_type: "본회의"}) → 자동으로 회의록 모드
assembly_session({date_from: "2026-04"})  → 자동으로 일정 모드
```

### 5. 실패 격리

하나의 API 실패가 전체 응답을 차단하지 않도록 `Promise.allSettled`를 사용합니다.

```
bill_detail(bill_id="...") 호출 시:
  ├── 상세정보 ✓  (정상)
  ├── 심사정보 ✗  (실패 → 해당 섹션만 빈 배열)
  ├── 이력    ✓  (정상)
  └── 제안자  ✓  (정상)
→ 전체 응답: 부분 성공으로 반환 (실패한 부분만 제외)
```

---

## Lite 프로필 (6개 도구)

### 1. `assembly_member` — 국회의원

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `name`, `party`, `district` | 의원 목록 검색 | MEMBER_INFO |
| `committee` | 소속위원회 필터 (클라이언트 측) | MEMBER_INFO |
| `name` (결과 1건) | 자동 상세 + 분석 | MEMBER_INFO + MEMBER_BILLS + VOTE_PLENARY + 아래 8개 |
| `analyze=true` | 종합 분석 강제 실행 | 위 전부 + 아래 Tier 1+2 API |

**analyze 모드 추가 API (Tier 1+2, 11개)**:

| API 코드 | API명 | 응답 키 | Tier |
|----------|-------|---------|------|
| `nexgtxtmaamffofof` | 의원이력 | `career` | 1 |
| `nojepdqqaweusdfbi` | 본회의 표결정보 (의원별) | `vote_detail` | 1 |
| `nuvypcdgahexhvrjt` | 상임위 활동 | `committee_activity` | 1 |
| `nyzrglyvagmrypezq` | 위원회 경력 | `committee_career` | 1 |
| `nmfcjtvmajsbhhckf` | 의정보고서 | `reports` | 2 |
| `negnlnyvatsjwocar` | SNS정보 | `sns` | 2 |
| `npeslxqbanwkimebr` | 발언영상 | `speeches` | 2 |
| `NAMEMBERLEGIPTT` | 청원현황 | `petitions` | 2 |

**추가 파라미터 (Tier 3)**:

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `scope="history"` | 역대 국회 의원/선거/의장 데이터 | 13개 역대 API (3B) |
| `mode="party_stats"` | 정당별 교섭단체 의석수 | `nepjpxkkabqiqpbvk` (3C) |
| `lang="en"` | 영문 의원 정보 | ENNAMEMBER (3D) |

### 2. `assembly_bill` — 의안

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `bill_name`, `proposer` | 의안 검색 | MEMBER_BILLS |
| `bill_id` | 의안 상세 + 공동발의자 + 심사경과 | BILL_DETAIL + BILL_PROPOSERS + ALLBILL |
| `status="pending"` | 계류의안 | BILL_PENDING |
| `status="processed"` | 처리의안 | BILL_PROCESSED |
| `status="recent"` | 최근 본회의 처리 | RECENT_PLENARY_BILLS |
| `keywords="AI,인공지능"` | 키워드 법안 추적 | MEMBER_BILLS (병렬) |
| `keywords` + `include_history` | + 심사이력+회의+의안별회의록 | + BILL_REVIEW + BILL_COMMITTEE_CONF + VCONFBILLCONFLIST |
| `mode="stats"` | 의안 통계 7종 | BILLCNTMAIN, BILLCNTCMIT, BILLCNTPRPSR, BILLCNTLAWDIV, BILLCNTLAWCMIT + BILLCNTRSVT + 역대통계 |
| `status="pending"` + `committee` | 위원회별 계류법률안 | `ndiwuqmpambgvnfsj` |
| `bill_type="alternative"` | 위원회안/대안 | `nxtkyptyaolzcbfwl` |
| `lang="en"` + `status="recent"` | 영문 최신 처리 의안 | ENBCONFBILL (3D) |

### 3. `assembly_session` — 일정/회의록/표결

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `type="schedule"` 또는 `date_from` | 국회 일정 | SCHEDULE_ALL |
| `type="meeting"` 또는 `meeting_type` | 회의록 검색 | MEETING_PLENARY/COMMITTEE/AUDIT/... |
| `keyword` (meeting) | 안건명 키워드 필터 (클라이언트) | (위 API + 필터링) |
| `type="vote"` | 전체 본회의 표결 | VOTE_PLENARY |
| `bill_id` (vote) | 의안별 표결 상세 | VOTE_BY_BILL |
| `vote_type="법률안"` | 법률안 표결 | PLENARY_LAW |
| `vote_type="예산안"` | 예산안 표결 | PLENARY_BUDGET |
| `vote_type="기타"` | 기타 안건 표결 | PLENARY_ETC |
| `meeting_type="소위원회"` | 소위원회 회의록 | VCONFSUBCCONFLIST |
| `meeting_type="예결위"` | 예결위 회의록 | VCONFBUDGETCONFLIST |
| `meeting_type="특별위"` | 특별위 회의록 | VCONFSPCCONFLIST |
| `conf_id` | 회의록 상세 | VCONFDETAIL |
| `include_explanations=true` | 제안설명서 목록 | VCONFATTEXPLANLIST |
| `meeting_type="국정감사"` | + 국감 결과+시정조치+처리요구 보고서 | + AUDITREPORTRESULT + VCONFATTATBLIST + AUDITREPORTVISIBILIT |
| `meeting_type="국정조사"` | 국정조사 회의록 + 결과보고서 | VCONFPIPCONFLIST + INVESTREPORTRESULT |
| `meeting_type="시정연설"` | 대통령시정연설 회의록 | VCONFSNACONFLIST |
| `meeting_type="인사청문"` | 인사청문회 정보 | `nrvsawtaauyihadij` |
| `meeting_type="토론회"` | 토론회 + 결과보고서 | `nyioaasianxlkcqxs` + NABOPBLMDCSNREPORT |
| `lang="en"` (schedule) | 영문 국회일정 | ENSCHEDULENOTICE |

### 4. `assembly_org` — 위원회/청원/입법예고/보도자료

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `type="committee"` | 위원회 목록 | COMMITTEE_INFO |
| `committee_name` | 위원회 검색 + 위원명단 | COMMITTEE_INFO + COMMITTEE_MEMBERS |
| `type="petition"` | 청원 계류현황 | PETITION_PENDING |
| `petition_id` | 청원 상세 | PETITION_DETAIL |
| `petition_status="all"` | 청원 접수목록 | PETITION_LIST |
| `type="legislation_notice"` | 입법예고 | LEGISLATION_ACTIVE |
| `bill_name` (입법예고) | 법률안명 필터 (클라이언트) | LEGISLATION_ACTIVE |
| `type="press"` | 보도자료 검색 | `ninnagrlaelvtzfnt` |
| `type="press"` + `lang="en"` | 영문 보도자료 | ENPRESS |
| `lang="en"` (committee) | 영문 위원회 정보 | ENCMITINFO |

**흡수한 기존 도구**: `get_committees`, `search_petitions`, `get_legislation_notices`

### 5. `discover_apis` — API 탐색

276개 국회 API를 키워드/카테고리로 탐색합니다. 변경 없음.

### 6. `query_assembly` — 범용 API 호출

임의의 API 코드로 직접 호출합니다. 변경 없음.

---

## Full 프로필 (Lite 6개 + Full 전용 5개 = 11개)

Full 프로필은 Lite 6개를 모두 포함하며, 심층 분석용 5개 도구를 추가합니다.

### 7. `bill_detail` — 의안 심층 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `bill_id` (필수) | 의안 ID |
| `fields` | 조회 항목 선택: `detail`, `review`, `history`, `proposers`, `meetings`, `lifecycle`, `budget` |

1회 호출로 의안의 모든 것을 반환합니다:

| 항목 | API | 내용 |
|------|-----|------|
| detail | BILL_DETAIL | 제안이유(RSN), 주요내용(DETAIL_CONTENT), 링크 |
| review | BILL_REVIEW | 심사 경과 (클라이언트 BILL_ID 필터) |
| history | BILL_RECEIVED | 접수/처리 이력 |
| proposers | BILL_PROPOSERS | 공동발의 의원 전체 목록 |
| meetings | BILL_COMMITTEE_CONF + BILL_LAW_COMMITTEE_CONF | 위원회+법사위 회의 |
| budget | BUDGETJUDGE + BUDGETADJUDGE | 예결산 심사+예비심사 (Tier 1) |
| lifecycle | ALLBILL | 소관위→법사위→본회의→공포 전체 타임라인 (Phase 19) |

**흡수한 기존 도구**: `get_bill_detail`, `get_bill_review`, `get_bill_history`, `get_bill_proposers`

### 8. `committee_detail` — 위원회 심층 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `committee_name` | 위원회명 (미지정 시 전체 목록) |
| `include_members` | 위원 명단 포함 (기본: true when name specified) |
| `include_resources` | 위원회 자료실 포함 | `nbiwfpqbaipwgkhfr` (Tier 2) |
| (위원회명 지정 시) | 개정대상 법률 자동 포함 | CLAWSTATE (Tier 2) |

**흡수한 기존 도구**: `get_committees` (확장)

### 9. `petition_detail` — 청원 심층 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `petition_id` | 청원 ID (상세 모드) |
| `status` | `pending` / `processed` / `all` |
| `keyword` | 청원명 검색 (클라이언트 필터) |
| `mode="stats"` | 청원 통계 | PTTCNTMAIN (Tier 1) |
| (petition_id 지정 시) | + 심사정보+소개의원 자동 | + PTTJUDGE + PTTINFOPPSR (Tier 1) |

**흡수한 기존 도구**: `search_petitions` (확장)

### 10. `research_data` — 연구자료 통합 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `keyword` (필수) | 검색 키워드 |
| `source` | `library` / `research` / `budget` / `all` (기본: all) |

3개 기관 자료를 병렬로 통합 검색합니다:

| source | API | 기관 |
|--------|-----|------|
| library | LIBRARY_SEARCH | 국회도서관 |
| research | RESEARCH_REPORTS | 입법조사처 |
| budget | BUDGET_ANALYSIS | 예산정책처 |

**흡수한 기존 도구**: `search_library`, `search_research_reports`, `get_budget_analysis`

---

## API 코드 매핑 총정리

### codes.ts에 등록된 코드 (271개, 그 중 107개 전용 도구 사용) → 주요 매핑

| # | codes.ts 키 | API 코드 | API명 | 사용 도구 |
|---|------------|---------|-------|----------|
| 1 | MEMBER_INFO | `nwvrqwxyaytdsfvhu` | 국회의원 인적사항 | `assembly_member` |
| 2 | MEMBER_BILLS | `nzmimeepazxkubdpn` | 의원 발의법률안 | `assembly_member`, `assembly_bill` |
| 3 | BILL_SEARCH | `TVBPMBILL11` | 의안 통합검색 | CLI |
| 4 | BILL_RECEIVED | `BILLRCP` | 의안 접수목록 | `bill_detail` (Full) |
| 5 | BILL_REVIEW | `BILLJUDGE` | 의안 심사정보 | `assembly_bill`, `bill_detail` |
| 6 | BILL_DETAIL | `BILLINFODETAIL` | 의안 상세정보 | `assembly_bill`, `bill_detail` |
| 7 | BILL_PENDING | `nwbqublzajtcqpdae` | 계류의안 | `assembly_bill` |
| 8 | BILL_PROCESSED | `nzpltgfqabtcpsmai` | 처리의안 | `assembly_bill` |
| 9 | PLENARY_AGENDA | `nayjnliqaexiioauy` | 본회의부의안건 | CLI |
| 10 | BILL_PROPOSERS | `BILLINFOPPSR` | 의안 제안자정보 | `assembly_bill`, `bill_detail` |
| 11 | BILL_COMMITTEE_CONF | `BILLJUDGECONF` | 위원회심사 회의정보 | `assembly_bill`, `bill_detail` |
| 12 | BILL_LAW_COMMITTEE_CONF | `BILLLWJUDGECONF` | 법사위 회의정보 | `bill_detail` (Full) |
| 13 | VOTE_BY_BILL | `ncocpgfiaoituanbr` | 의안별 표결현황 | `assembly_session` |
| 14 | VOTE_PLENARY | `nwbpacrgavhjryiph` | 본회의 표결정보 | `assembly_member`, `assembly_session` |
| 15 | BILL_STATS_MAIN | `BILLCNTMAIN` | 의안통계 총괄 | `assembly_bill` (stats) |
| 16 | BILL_STATS_COMMITTEE | `BILLCNTCMIT` | 의안통계 위원회별 | `assembly_bill` (stats) |
| 17 | BILL_STATS_LAW_COMMITTEE | `BILLCNTLAWCMIT` | 의안통계 위원회별 법률안 | `assembly_bill` (stats) |
| 18 | BILL_STATS_PROPOSER | `BILLCNTPRPSR` | 의안통계 발의주체별 | `assembly_bill` (stats) |
| 19 | BILL_STATS_LAW_DIV | `BILLCNTLAWDIV` | 의안통계 의안종류별 | `assembly_bill` (stats) |
| 20 | PLENARY_LAW | `nkalemivaqmoibxro` | 본회의 처리_법률안 | `assembly_session` (vote_type) |
| 21 | PLENARY_BUDGET | `nbslryaradshbpbpm` | 본회의 처리_예산안 | `assembly_session` (vote_type) |
| 22 | PLENARY_ETC | `nzgjnvnraowulzqwl` | 본회의 처리_기타 | `assembly_session` (vote_type) |
| 23 | SCHEDULE_ALL | `ALLSCHEDULE` | 국회일정 통합 | `assembly_session` |
| 24 | SCHEDULE_PLENARY | `nekcaiymatialqlxr` | 본회의 일정 | (미사용, SCHEDULE_ALL이 커버) |
| 25 | SCHEDULE_COMMITTEE | `nrsldhjpaemrmolla` | 위원회별 일정 | (미사용, SCHEDULE_ALL이 커버) |
| 26 | MEETING_PLENARY | `nzbyfwhwaoanttzje` | 본회의 회의록 | `assembly_session` |
| 27 | MEETING_COMMITTEE | `ncwgseseafwbuheph` | 위원회 회의록 | `assembly_session` |
| 28 | MEETING_AUDIT | `VCONFAPIGCONFLIST` | 국정감사 회의록 | `assembly_session` |
| 29 | MEETING_CONFIRMATION | `VCONFCFRMCONFLIST` | 인사청문회 회의록 | `assembly_session` |
| 30 | MEETING_PUBLIC_HEARING | `VCONFPHCONFLIST` | 공청회 회의록 | `assembly_session` |
| 31 | COMMITTEE_INFO | `nxrvzonlafugpqjuh` | 위원회 현황 | `assembly_org`, `committee_detail` |
| 32 | COMMITTEE_MEMBERS | `nktulghcadyhmiqxi` | 위원회 위원 명단 | `assembly_org`, `committee_detail` |
| 33 | PETITION_PENDING | `nvqbafvaajdiqhehi` | 청원 계류현황 | `assembly_org`, `petition_detail` |
| 34 | PETITION_LIST | `PTTRCP` | 청원 접수목록 | `petition_detail` (Full) |
| 35 | PETITION_DETAIL | `PTTINFODETAIL` | 청원 상세정보 | `assembly_org`, `petition_detail` |
| 36 | LEGISLATION_ACTIVE | `nknalejkafmvgzmpt` | 진행중 입법예고 | `assembly_org` |
| 37 | LEGISLATION_CLOSED | `nohgwtzsamojdozky` | 종료된 입법예고 | (미사용, query_assembly로 접근) |
| 38 | META_API_LIST | `OPENSRVAPI` | API 전체 현황 | `discover_apis` |
| 39 | MEMBER_ALL | `ALLNAMEMBER` | 의원 정보 통합 | (미사용, MEMBER_INFO 사용) |
| 40 | SESSION_INFO | `BILLSESSPROD` | 회기정보 | (리소스에서 참조) |
| 41 | RESEARCH_REPORTS | `naaborihbkorknasp` | 입법조사처 보고서 | `research_data` (Full) |
| 42 | RECENT_PLENARY_BILLS | `nxjuyqnxadtotdrbw` | 최근 본회의 부의안건 | `assembly_bill` |
| 43 | LIBRARY_SEARCH | `nywrpgoaatcpoqbiy` | 국회도서관 자료검색 | `research_data` (Full) |
| 44 | BUDGET_ANALYSIS | `OZN379001174FW17905` | 예산정책처 분석자료 | `research_data` (Full) |

### 카테고리별 요약 (v0.5.0)

| 카테고리 | 전용 도구 사용 | 주요 도구 |
|---------|-------------|----------|
| 국회의원 (현재+역대) | 15 | `assembly_member` (analyze, history, party_stats) |
| 의안+통합 | 27 | `assembly_bill` + `bill_detail` + ALLBILL |
| 표결+처리안건 | 5 | `assembly_session` (vote, vote_type) |
| 회의록+국정감시 | 17 | `assembly_session` (meeting_type 확장) |
| 일정 | 2 | `assembly_session` (schedule, lang=en) |
| 위원회 | 4 | `assembly_org` + `committee_detail` |
| 청원 | 6 | `assembly_org` + `petition_detail` |
| 입법예고 | 1 | `assembly_org` |
| 영문 API | 5 | 4개 도구 `lang=en` |
| 보도자료 | 2 | `assembly_org(type=press)` |
| 연구자료+예산+미래 | 8 | `research_data` (source 확장) |
| 메타/범용 | 2 | `discover_apis` + `query_assembly` |
| 나머지 (164건) | query_assembly | 276개 100% 접근 |
| **전용 도구 합계** | **107** | **6 Lite + 4 Full = 10개 도구** |

### 전체 국회 API 276개 커버리지

> 2026-04-08 일괄 발굴 완료: **271개 코드 발굴 (98.2%)**

| 카테고리 | 전체 | 코드 발굴 | 전용 도구 | 접근 방법 |
|---------|------|---------|---------|----------|
| 1. 메타 | 1 | 1 | 1 | `discover_apis` |
| 2. 통합 API | 8 | 7 | 6 | `research_data(source=all_integrated)` + ALLBILL |
| 3. 국회의원 | 21 | 20 | 15 | `assembly_member` (analyze+history+party_stats) |
| 4. 의안 | 24 | 23 | 20 | `assembly_bill` + `bill_detail` + ALLBILL |
| 5. 의안 통계 | 7 | 7 | 7 | `assembly_bill(mode=stats)` — 전부 통합 |
| 6. 본회의 처리안건 | 4 | 4 | 3 | `assembly_session(vote_type=...)` |
| 7. 회의록 | 21 | 21 | 13 | `assembly_session` (소위/예결위/특위/국조/시정연설/토론회 등) |
| 8. 일정 | 13 | 13 | 2 | `assembly_session` (+ 영문) |
| 9. 위원회 | 5 | 5 | 4 | `assembly_org` + `committee_detail` (위원명단+개정법률+자료실) |
| 10. 청원 | 7 | 7 | 6 | `assembly_org` + `petition_detail` (심사+소개의원+통계) |
| 11. 인사청문/국감 | 6 | 6 | 4 | `assembly_session` (인사청문+국감+국조 결과보고서) |
| 12. 역대 국회 | 11 | 11 | 11 | `assembly_member(scope=history)` — 전부 통합 |
| 13. 보도자료/뉴스 | 22 | 22 | 2 | `assembly_org(type=press)` + 영문 |
| 14. 의회외교 | 8 | 7 | 0 | `query_assembly` (코드 발굴 완료) |
| 15. 영문 API | 7 | 7 | 5 | 4개 도구 `lang=en` + 영문 보도자료 |
| 16. 예산정책처 | 25 | 25 | 4 | `research_data` + `bill_detail(budget)` |
| 17. 입법조사처 | 16 | 16 | 1 | `research_data` |
| 18~23. 기타 | 70 | 69 | 3 | `research_data(source=future/publications)` + `query_assembly` |
| 24. NABO (nabo.go.kr) | 3 | 3 | 1 | `get_nabo` (Full) |
| **합계** | **276** | **271 (98.2%)** | **108** | **100% 접근** |

> **핵심**: 271개 API의 코드가 `codes.ts`에 등록되어 `query_assembly`로 **즉시 호출 가능**합니다. 107개는 전용 도구에서 최적화된 인터페이스로 제공됩니다.

### 코드 미발굴 API (5개)

| API | 이유 |
|-----|------|
| OPEN API 전체 현황 (OPENSRVAPI) | 메타 API 자신, 이미 `discover_apis`로 사용 |
| 의안정보 통합 API | 개별 API(BILLINFODETAIL 등)로 대체 |
| 의안 접수목록 | BILLRCP로 이미 등록 (중복 엔트리) |
| 법률안 제안이유 및 주요내용 | 열린국회정보에서 API 코드 미제공 |
| 의원연맹별 보조금 예산 | 열린국회정보에서 API 코드 미제공 |

### 통합 완료된 주요 API (Tier 1~3, v0.5.0)

| API | 코드 | 통합 도구 | Tier |
|-----|------|----------|------|
| 의원이력 | `nexgtxtmaamffofof` | `assembly_member` (analyze) | 1 |
| 본회의 표결정보 (의원별) | `nojepdqqaweusdfbi` | `assembly_member` (analyze) | 1 |
| 상임위 활동 | `nuvypcdgahexhvrjt` | `assembly_member` (analyze) | 1 |
| 위원회 경력 | `nyzrglyvagmrypezq` | `assembly_member` (analyze) | 1 |
| 의정보고서 | `nmfcjtvmajsbhhckf` | `assembly_member` (analyze) | 2 |
| SNS정보 | `negnlnyvatsjwocar` | `assembly_member` (analyze) | 2 |
| 발언영상 | `npeslxqbanwkimebr` | `assembly_member` (analyze) | 2 |
| 청원현황 | `NAMEMBERLEGIPTT` | `assembly_member` (analyze) | 2 |
| 의안별 회의록 | `VCONFBILLCONFLIST` | `assembly_bill` (track) | 1 |
| 계류의안 통계 | `BILLCNTRSVT` | `assembly_bill` (stats) | 1 |
| 역대 의안 통계 | `nzivskufaliivfhpb` | `assembly_bill` (stats) | 1 |
| 위원회 계류법률안 | `ndiwuqmpambgvnfsj` | `assembly_bill` (search) | 2 |
| 위원회안/대안 | `nxtkyptyaolzcbfwl` | `assembly_bill` (search) | 2 |
| ALLBILL 심사경과 | `ALLBILL` | `assembly_bill` + `bill_detail` | — |
| 예결산 심사 | `BUDGETJUDGE` | `bill_detail` | 1 |
| 예결산 예비심사 | `BUDGETADJUDGE` | `bill_detail` | 1 |
| 소위원회 회의록 | `VCONFSUBCCONFLIST` | `assembly_session` | 2 |
| 예결위 회의록 | `VCONFBUDGETCONFLIST` | `assembly_session` | 2 |
| 특별위 회의록 | `VCONFSPCCONFLIST` | `assembly_session` | 2 |
| 회의록 상세 | `VCONFDETAIL` | `assembly_session` | 2 |
| 제안설명서 | `VCONFATTEXPLANLIST` | `assembly_session` | 2 |
| 국감 결과보고서 | `AUDITREPORTRESULT` | `assembly_session` | 2 |
| 국정조사 회의록 | `VCONFPIPCONFLIST` | `assembly_session` | 3A |
| 국정조사 결과보고서 | `INVESTREPORTRESULT` | `assembly_session` | 3A |
| 시정연설 회의록 | `VCONFSNACONFLIST` | `assembly_session` | 3A |
| 인사청문회 | `nrvsawtaauyihadij` | `assembly_session` | 3A |
| 토론회 | `nyioaasianxlkcqxs` | `assembly_session` | 3A |
| 토론회 결과보고서 | `NABOPBLMDCSNREPORT` | `assembly_session` | 3A |
| 시정조치 결과보고서 | `VCONFATTATBLIST` | `assembly_session` | 3A |
| 처리요구 결과보고서 | `AUDITREPORTVISIBILIT` | `assembly_session` | 3A |
| 역대 의원 인적사항 외 13건 | (13개 코드) | `assembly_member(scope=history)` | 3B |
| 정당 의석수 | `nepjpxkkabqiqpbvk` | `assembly_member(mode=party_stats)` | 3C |
| 영문 의원/일정/의안/위원회/보도자료 | 5개 EN* 코드 | 4개 도구 `lang=en` | 3D |
| 통합API 5건+미래연구원 | 5개 ALL* + 4개 코드 | `research_data` source 확장 | 3E |
| 보도자료 | `ninnagrlaelvtzfnt` | `assembly_org(type=press)` | 3F |
| 청원 심사 | `PTTJUDGE` | `petition_detail` | 1 |
| 청원 소개의원 | `PTTINFOPPSR` | `petition_detail` | 1 |
| 청원 통계 | `PTTCNTMAIN` | `petition_detail` | 1 |
| 개정대상 법률 | `CLAWSTATE` | `committee_detail` | 2 |
| 위원회 자료실 | `nbiwfpqbaipwgkhfr` | `committee_detail` | 2 |

---

## 국민참여입법센터 API (lawmaking.go.kr)

> Phase 23-24: v0.6.0에서 추가
> Base URL: `https://www.lawmaking.go.kr/rest`
> 인증: OC (정보공개 서비스 신청 ID, `.env`에 `LAWMKING_OC`로 설정)

### 목록 API (6개)

| # | API 코드 | API명 | 매핑 도구 | 비고 |
|---|----------|-------|----------|------|
| 1 | `govLmSts` | 입법현황 목록 | `assembly_org(type=lawmaking, category=legislation)` | OC 필요 |
| 2 | `lmPln` | 입법계획 목록 | `assembly_org(type=lawmaking, category=legislation, keyword=...)` | OC 필요 |
| 3 | `ogLmPp` | 입법예고 목록 | `assembly_org(type=lawmaking, category=legislation, diff=0)` | OC 필요 |
| 4 | `ptcpAdmPp` | 행정예고 목록 | `assembly_org(type=lawmaking, category=admin)` | OC 필요 |
| 6 | `lsItptEmp` | 법령해석례 검색 | `assembly_org(type=lawmaking, category=interpretation)` | OC 필요 |
| 7 | `loLsExample` | 의견제시사례 목록 | `assembly_org(type=lawmaking, category=opinion)` | OC 필요 |

### 상세 API (6개) — `detail_seq` 파라미터로 조회

| # | API 코드 | API명 | 매핑 도구 |
|---|----------|-------|----------|
| 8 | `govLmSts/{seq}` | 입법현황 상세 | `assembly_org(type=lawmaking, category=legislation, detail_seq=...)` |
| 9 | `lmPln/{seq}` | 입법계획 상세 | `assembly_org(type=lawmaking, category=legislation, keyword=..., detail_seq=...)` |
| 10 | `ogLmPp/{seq}/...` | 입법예고 상세 | `assembly_org(type=lawmaking, category=legislation, diff=..., detail_seq=...)` |
| 11 | `ptcpAdmPp/{seq}` | 행정예고 상세 | `assembly_org(type=lawmaking, category=admin, detail_seq=...)` |
| 12 | `lsItptEmp/{seq}` | 법령해석례 상세 | `assembly_org(type=lawmaking, category=interpretation, detail_seq=...)` |
| 13 | `loLsExample/{seq}` | 의견제시사례 상세 | `assembly_org(type=lawmaking, category=opinion, detail_seq=...)` |

### assembly_org lawmaking 파라미터

```
assembly_org(
  type="lawmaking",           // 필수
  category="legislation",     // legislation | admin | interpretation | opinion
  keyword="검색어",          // 공통 검색어
  page=1, page_size=20,      // 페이지네이션
  detail_seq="일련번호",      // 상세 조회 시 (선택)

  // legislation 전용
  diff="0",                  // 0=진행중, 1=종료 (notice 모드)
  ls_cls_cd="AA0101",       // 법령분류코드 (AA0101=법률)
  cpt_ofi_org_cd="1741000", // 소관부처 코드

  // admin 전용
  closing="N",               // N=진행, Y=종료

  // interpretation 전용
  prd_fr_day="2024.01.01",  // 검색기간
  ls_cpt_org="1320000",     // 소관기관 코드

  // opinion 전용
  sc_text_type="caseNm",     // caseNm | caseNo | reqOrgNm
  sc_text="검색어"
)
```

###国会 API와 중복/보완 관계

| 국민참여입법센터 |国会 API | 관계 |
|----------------|---------|------|
| 입법예고(ogLmPp) | `nknalejkafmvgzmpt` (진행중) | **보완**: lawmaking은 진행/종료 모두 제공 |
| 행정예고(ptcpAdmPp) | 없음 | **신규**: 자치법규(훈령/예규/고시/공고) 예고 |
| 법령해석례(lsItptEmp) | 법제처 해석례 API | **별도**: lawmaking vs 법제처 해석 |
| 의견제시사례(loLsExample) | 없음 | **신규**: 자치법제 의견제시 |

> 발굴 스크립트: `ASSEMBLY_API_KEY=your-key npx tsx scripts/discover-all-codes.ts`
> 전체 결과: `docs/discovered-all-codes.json`

---

## 수치 요약

| 항목 | v0.4 | v0.5 | v0.6 |
|------|------|----------|--------------|
| Lite 도구 수 | 6 | 6 | **6** |
| Full 도구 수 | 10 | 10 | **10** |
| 토큰 소비 (Lite) | ~2,800 | ~2,800 | **~2,880** (+80 lawmaking) |
| API 코드 등록 | 44 | 271 (98.2%) | **279** (+8 lawmaking) |
| 전용 도구에서 사용 | 44 | 107 | **107** |
| 전용 도구 커버율 | 16% | 39% | **43%** |
| API 접근 |国会 276개 |国会 276개 | **284개** (+lawmaking 8개) |
