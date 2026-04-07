# MCP 도구 매핑 가이드

> Lite/Full 프로필별 도구 구성, 통합 원칙, API 매핑을 정리합니다.
> 최종 업데이트: 2026-04-08

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
| **Full** | 파워유저, 심층 분석 | 10개 | 세부 데이터 필요 시 |

- Lite는 도구 수를 최소화하여 **LLM 도구 선택 정확도 최적 구간(6~8개)**을 유지
- Full은 Lite 6개 + 심층 도구 4개 = 10개로, Cursor 40개 제한의 25%만 사용

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
| `name` (결과 1건) | 자동 상세 + 분석 | MEMBER_INFO + MEMBER_BILLS + VOTE_PLENARY |
| `analyze=true` | 종합 분석 강제 실행 | MEMBER_INFO + MEMBER_BILLS + VOTE_PLENARY |

**흡수한 기존 도구**: `search_members`, `analyze_legislator`

### 2. `assembly_bill` — 의안

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `bill_name`, `proposer` | 의안 검색 | MEMBER_BILLS |
| `bill_id` | 의안 상세 + 공동발의자 | BILL_DETAIL + BILL_PROPOSERS |
| `status="pending"` | 계류의안 | BILL_PENDING |
| `status="processed"` | 처리의안 | BILL_PROCESSED |
| `status="recent"` | 최근 본회의 처리 | RECENT_PLENARY_BILLS |
| `keywords="AI,인공지능"` | 키워드 법안 추적 | MEMBER_BILLS (병렬) |
| `keywords` + `include_history` | + 심사이력+회의 | + BILL_REVIEW + BILL_COMMITTEE_CONF |
| `mode="stats"` | 의안 통계 5종 | BILLCNTMAIN, BILLCNTCMIT, BILLCNTPRPSR, BILLCNTLAWDIV, BILLCNTLAWCMIT |

**흡수한 기존 도구**: `search_bills`, `track_legislation`

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

**흡수한 기존 도구**: `get_schedule`, `search_meetings`, `get_votes`

### 4. `assembly_org` — 위원회/청원/입법예고

| 파라미터 | 동작 | 사용 API |
|----------|------|---------|
| `type="committee"` | 위원회 목록 | COMMITTEE_INFO |
| `committee_name` | 위원회 검색 + 위원명단 | COMMITTEE_INFO + COMMITTEE_MEMBERS |
| `type="petition"` | 청원 계류현황 | PETITION_PENDING |
| `petition_id` | 청원 상세 | PETITION_DETAIL |
| `petition_status="all"` | 청원 접수목록 | PETITION_LIST |
| `type="legislation_notice"` | 입법예고 | LEGISLATION_ACTIVE |
| `bill_name` (입법예고) | 법률안명 필터 (클라이언트) | LEGISLATION_ACTIVE |

**흡수한 기존 도구**: `get_committees`, `search_petitions`, `get_legislation_notices`

### 5. `discover_apis` — API 탐색

276개 국회 API를 키워드/카테고리로 탐색합니다. 변경 없음.

### 6. `query_assembly` — 범용 API 호출

임의의 API 코드로 직접 호출합니다. 변경 없음.

---

## Full 프로필 (Lite 6개 + Full 전용 4개 = 10개)

Full 프로필은 Lite 6개를 모두 포함하며, 심층 분석용 4개 도구를 추가합니다.

### 7. `bill_detail` — 의안 심층 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `bill_id` (필수) | 의안 ID |
| `fields` | 조회 항목 선택: `detail`, `review`, `history`, `proposers`, `meetings` |

1회 호출로 의안의 모든 것을 반환합니다:

| 항목 | API | 내용 |
|------|-----|------|
| detail | BILL_DETAIL | 제안이유(RSN), 주요내용(DETAIL_CONTENT), 링크 |
| review | BILL_REVIEW | 심사 경과 (클라이언트 BILL_ID 필터) |
| history | BILL_RECEIVED | 접수/처리 이력 |
| proposers | BILL_PROPOSERS | 공동발의 의원 전체 목록 |
| meetings | BILL_COMMITTEE_CONF + BILL_LAW_COMMITTEE_CONF | 위원회+법사위 회의 |

**흡수한 기존 도구**: `get_bill_detail`, `get_bill_review`, `get_bill_history`, `get_bill_proposers`

### 8. `committee_detail` — 위원회 심층 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `committee_name` | 위원회명 (미지정 시 전체 목록) |
| `include_members` | 위원 명단 포함 (기본: true when name specified) |

**흡수한 기존 도구**: `get_committees` (확장)

### 9. `petition_detail` — 청원 심층 (Full 전용)

| 파라미터 | 설명 |
|----------|------|
| `petition_id` | 청원 ID (상세 모드) |
| `status` | `pending` / `processed` / `all` |
| `keyword` | 청원명 검색 (클라이언트 필터) |

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

### codes.ts에 등록된 코드 (44개)

| 카테고리 | 코드 수 | Lite에서 사용 | Full에서 추가 사용 |
|---------|--------|-------------|-----------------|
| 국회의원 | 2 | 2 | 0 |
| 의안 | 14 | 10 | 4 |
| 표결 | 2 | 2 | 0 |
| 의안 통계 | 5 | 5 | 0 |
| 본회의 처리안건 | 3 | 3 | 0 |
| 일정 | 3 | 1 | 0 |
| 회의록 | 5 | 5 | 0 |
| 위원회 | 2 | 2 | 2 |
| 청원 | 3 | 1 | 2 |
| 입법예고 | 2 | 1 | 0 |
| 메타/기타 | 3 | 2 | 1 |
| **합계** | **44** | **34** | **9** |

### Lite에서 접근 불가한 나머지 ~232개 API

`discover_apis` + `query_assembly` 2개 범용 도구로 276개 API 전체에 **100% 접근 가능**합니다.

---

## 수치 요약

| 항목 | 이전 (v0.3) | 현재 (v0.4) | 변화 |
|------|------------|------------|------|
| Lite 도구 수 | 9 | **6** | -33% |
| Full 도구 수 | 19 | **10** | -47% |
| 토큰 소비 (Lite) | ~3,800 | **~2,800** | -26% |
| Cursor 슬롯 (Full) | 48% | **25%** | -23%p |
| API 코드 수 | 39 | **44** | +5 |
| LLM 도구 선택 | 양호 | **최적** | 6개 = 최적 구간 |
| 276개 API 접근 | 100% | **100%** | 유지 |
