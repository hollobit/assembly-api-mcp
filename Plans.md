# assembly-api-mcp Cross-Source CLI Plans.md

작성일: 2026-04-12

---

## Phase 1: 교차소스 CLI 명령어 구현

Purpose:国会(open.assembly.go.kr) + 국민참여입법센터(lawmaking.go.kr) + NABO(nabo.go.kr) 2~3개 API를 통합 검색하는 `cross` CLI 명령 추가

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | cross CLI 명령어 추가 — src/cli.ts에 `cross` 명령 등록 | `npx tsx src/cli.ts cross --help` 도움말 출력 확인 | - | cc:완료 |
| 1.2 | cross 명령 핸들러 구현 — 3개 API 소스 동시 호출 (Promise.allSettled) | `"교육"` 키워드로 3개 소스 결과 최소 1개 이상 반환 | 1.1 | cc:완료 |
| 1.3 | 결과 포맷팅 — 소스 구분 헤더 + 테이블 출력 | results에 source 필드 포함, 소스명 출력 확인 | 1.2 | cc:완료 |
| 1.4 | 마이그레이션 문서 — README.md CLI 예제 업데이트 | cross 명령어 추가된 CLI 도움말에 포함 | 1.3 | cc:완료 |

---

## Phase 2: README 교차 검색 예제 추가

Purpose: README에 2~3개 API 소스를 함께 사용하는 CLI 복합 예제 추가

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 2.1 | 교차 검색 README 섹션 추가 — cross 명령어 3가지 조합 예제 |assembly+nabo, lawmaking+nabo, assembly+lawmaking+nabo 3가지 예제 포함 | - | cc:완료 |

---

## 구현 방향

### cross 명령 설계

```
npx tsx src/cli.ts cross --keyword <검색어> [--sources <sources>] [--size <N>]
```

**동작:**
1. `--keyword` (필수): 검색어
2. `--sources` (선택): 사용할 소스 (기본: `all` = assembly+lawmaking+nabo)
   - `assembly` — 열린국회정보 API
   - `lawmaking` — 국민참여입법센터 API
   - `nabo` — NABO API (report만)
   - 예: `--sources assembly,nabo` (2개 소스만)
3. `--size` (선택): 소스당 결과 수 (기본: 5)

**출력 형식:**
```
=== "교육" 검색 결과 ===

[국회] 의안 검색 (총 N건)
BILL_NO  | BILL_NAME               | COMMITTEE
---------|-------------------------|----------
2102345  | 교육기본법 일부개정법률안 | 교육위원회

[국민참여입법센터] 입법예고 (총 N건)
법령명        | 소관부처        | 공고일
--------------|----------------|----------
교육기본법    |教育部           | 2024.01.15

[NABO] 보고서 (총 N건)
제목                     | 작성부서 | 게시일
-------------------------|----------|----------
2024 교육예산 분석보고서  | NABO     | 2024.03.01
```

### API 소스별 검색 구현

| 소스 | API | 검색 방법 |
|------|-----|----------|
| assembly | `assembly_bill(bill_name)` | 의안명 키워드 검색 |
| lawmaking | `getLegislationNotices({lsNm})` | 법령명 검색 |
| nabo | `searchReports({scSw})` | 보고서 키워드 검색 |

### 핵심 구현 포인트

- **비동기 동시 호출**: `Promise.allSettled`로 3개 소스 독립 조회
- **부분 실패 허용**: 1개 소스 실패해도 다른 2개 결과는 표시
- **실패 시 에러 logged but continues**: `mcpLogger.log("error", ...)`
- **병렬 호출**: `Promise.allSettled([assembly, lawmaking, nabo])`