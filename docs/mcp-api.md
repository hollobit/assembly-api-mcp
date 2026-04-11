# MCP 도구 - 국회 API + 국민참여입법센터 매핑

> 최종 검증일: 2026-04-11 (v0.6.0)
> 279개 API 코드 등록 (271国会 + 8 국민참여입법센터)
> 도구 매핑 상세는 [tool-mapping.md](tool-mapping.md) 참조

---

## Lite 프로필 도구 (6개)

Lite 프로필은 도메인 엔티티 기반 6개 도구로 전체 API를 효율적으로 활용합니다.

### 1. assembly_member -- 의원 검색+분석

| API 코드 | API명 | 비고 |
|----------|-------|------|
| `nwvrqwxyaytdsfvhu` | 국회의원 인적사항 | 295건, AGE 불필요 |

- **파라미터**: `HG_NM`(이름), `POLY_NM`(정당), `ORIG_NM`(선거구)
- **응답 필드**: HG_NM, HJ_NM, ENG_NM, BTH_DATE, POLY_NM, ORIG_NM, REELE_GBN_NM, ELECT_GBN_NM, CMITS, TEL_NO, E_MAIL, HOMEPAGE, 사진(`https://www.assembly.go.kr/photo/{MONA_CD}.jpg`), 의원코드(MONA_CD)
- **참고**: 결과 1건이면 상세 정보 자동 반환, 소속위원회 필터는 클라이언트 측 처리

### 2. search_bills -- 의안 검색/상세/상태 필터

| API 코드 | API명 | 용도 | 비고 |
|----------|-------|------|------|
| `nzmimeepazxkubdpn` | 의원 발의법률안 | 기본 검색 (status=all) | AGE 필요 |
| `nwbqublzajtcqpdae` | 계류의안 | status=pending | 13,006건, AGE 불필요 |
| `nzpltgfqabtcpsmai` | 처리의안 | status=processed | 4,620건, AGE 필요 |
| `nxjuyqnxadtotdrbw` | 최근 본회의 부의안건 | status=recent | AGE 필요 |
| `BILLINFODETAIL` | 의안 상세정보 | bill_id 지정 시 | BILL_ID 필요 |

### 3. get_schedule -- 국회 일정

| API 코드 | API명 | 비고 |
|----------|-------|------|
| `ALLSCHEDULE` | 국회일정 통합 | 90,201건, AGE 불필요 |

- **파라미터**: `SCH_DT`(날짜), `CMIT_NM`(위원회명)
- **참고**: 날짜 범위 필터링, 키워드 필터링은 클라이언트 측 처리

### 4. search_meetings -- 회의록 검색

| API 코드 | API명 | 용도 | 비고 |
|----------|-------|------|------|
| `nzbyfwhwaoanttzje` | 본회의 회의록 | meeting_type=본회의 | DAE_NUM + CONF_DATE 필요 |
| `ncwgseseafwbuheph` | 위원회 회의록 | meeting_type=위원회/소위원회 (기본) | DAE_NUM + CONF_DATE 필요 |
| `VCONFAPIGCONFLIST` | 국정감사 회의록 | meeting_type=국정감사 | ERACO 필요 |
| `VCONFCFRMCONFLIST` | 인사청문회 회의록 | meeting_type=인사청문회 | ERACO 필요 |
| `VCONFPHCONFLIST` | 공청회 회의록 | meeting_type=공청회 | ERACO 필요 |

### 5. get_votes -- 표결 결과

| API 코드 | API명 | 용도 | 비고 |
|----------|-------|------|------|
| `ncocpgfiaoituanbr` | 의안별 표결현황 | bill_id 지정 시 의원별 상세 | 1,352건, AGE 필요 |
| `nwbpacrgavhjryiph` | 본회의 표결정보 | bill_id 미지정 시 전체 목록 | 1,315건, AGE 필요 |

### 6. analyze_legislator -- 의원 종합분석 (체인)

3개 API를 병렬 호출하여 의원의 의정활동을 종합 분석합니다.

| API 코드 | API명 | 용도 |
|----------|-------|------|
| `nwvrqwxyaytdsfvhu` | 국회의원 인적사항 | 인적사항 조회 |
| `nzmimeepazxkubdpn` | 의원 발의법률안 | 발의 법안 목록 |
| `nwbpacrgavhjryiph` | 본회의 표결정보 | 표결 참여 현황 |

### 7. track_legislation -- 주제별 법안 추적 (체인)

키워드로 관련 법안을 검색하고 심사 이력을 조회합니다.

| API 코드 | API명 | 용도 |
|----------|-------|------|
| `nzmimeepazxkubdpn` | 의원 발의법률안 | 키워드별 법안 검색 |
| `BILLJUDGE` | 의안 심사정보 | 심사 이력 조회 (옵션) |

### 8. discover_apis -- API 탐색

| API 코드 | API명 | 비고 |
|----------|-------|------|
| `OPENSRVAPI` | OPEN API 전체 현황 | 276건 |

### 9. query_assembly -- 범용 API 호출

임의의 API 코드를 직접 호출할 수 있는 범용 도구입니다.

- 271개 발굴 코드 및 미등록 코드 모두 호출 가능

---

## Full 프로필 추가 도구 (5개)

Full 프로필은 Lite 6개 도구에 아래 5개 심층 도구를 추가로 제공합니다 (총 11개).

| # | 도구명 | 설명 | 사용 API 코드 |
|---|--------|------|---------------|
| 1 | get_bill_detail | 의안 상세 조회 | `BILLINFODETAIL`, `nzmimeepazxkubdpn` (보완 조회) |
| 2 | get_bill_review | 의안 심사정보 | `BILLJUDGE` |
| 3 | get_bill_history | 의안 접수/처리 이력 | `BILLRCP` |
| 4 | get_committees | 위원회 목록 | `nxrvzonlafugpqjuh` |
| 5 | search_petitions | 청원 검색 | `nvqbafvaajdiqhehi` |
| 6 | get_legislation_notices | 입법예고 | `nknalejkafmvgzmpt` |
| 7 | search_library | 국회도서관 자료 검색 | `nywrpgoaatcpoqbiy` |
| 8 | get_budget_analysis | 예산정책처 분석 자료 | `OZN379001174FW17905` |
| 9 | search_research_reports | 입법조사처 보고서 | `naaborihbkorknasp` |

---

## 국민참여입법센터 API (lawmaking.go.kr)

> v0.6.0에서 추가 — `.env`에 `LAWMKING_OC` 설정 필요

| API 코드 | API명 | 용도 | 비고 |
|----------|-------|------|------|
| `govLmSts` | 입법현황 | type=lawmaking, category=legislation | OC 필요 |
| `lmPln` | 입법계획 | type=lawmaking, category=legislation | OC 필요 |
| `ogLmPp` | 입법예고 | type=lawmaking, category=legislation, diff=0 | OC 필요 |
| `ptcpAdmPp` | 행정예고 | type=lawmaking, category=admin | OC 필요 |
| `lsItptEmp` | 법령해석례 | type=lawmaking, category=interpretation | OC 필요 |
| `loLsExample` | 의견제시사례 | type=lawmaking, category=opinion | OC 필요 |


---

## 검증 완료 API 코드 총정리 (271개 발굴)

모든 코드는 실제 API 호출로 정상 작동을 확인했습니다.

### 국회의원 (2개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 1 | `nwvrqwxyaytdsfvhu` | 국회의원 인적사항 | 295건 | 불필요 |
| 2 | `ALLNAMEMBER` | 국회의원 정보 통합 | 3,286건 | 불필요 |

### 의안/법률안 (12개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 3 | `nzmimeepazxkubdpn` | 의원 발의법률안 | - | 필요 |
| 4 | `TVBPMBILL11` | 의안 통합검색 | 17,626건 | 필요 |
| 5 | `BILLRCP` | 의안 접수목록 | 118,682건 | 불필요 |
| 6 | `BILLJUDGE` | 의안 심사정보 | 35,329건 | 불필요 |
| 7 | `BILLINFODETAIL` | 의안 상세정보 | BILL_ID 필요 | 불필요 |
| 8 | `nwbqublzajtcqpdae` | 계류의안 | 13,006건 | 불필요 |
| 9 | `nzpltgfqabtcpsmai` | 처리의안 | 4,620건 | 필요 |
| 10 | `nayjnliqaexiioauy` | 본회의부의안건 | 139건 | 불필요 |
| 11 | `BILLCNTMAIN` | 처리 의안통계 총괄 | - | - |
| 12 | `BILLCNTCMIT` | 처리 의안통계 위원회별 | - | - |
| 13 | `BILLCNTLAWCMIT` | 처리 의안통계 위원회별 법률안 | - | - |
| 14 | `nxjuyqnxadtotdrbw` | 최근 본회의 부의안건 | - | - |

### 표결 (2개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 15 | `ncocpgfiaoituanbr` | 의안별 표결현황 | 1,352건 | 필요 |
| 16 | `nwbpacrgavhjryiph` | 본회의 표결정보 | 1,315건 | 필요 |

### 일정 (3개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 17 | `ALLSCHEDULE` | 국회일정 통합 | 90,201건 | 불필요 |
| 18 | `nekcaiymatialqlxr` | 본회의 일정 | - | UNIT_CD 필요 |
| 19 | `nrsldhjpaemrmolla` | 위원회별 일정 | - | UNIT_CD 필요 |

### 회의록 (5개)

| # | API 코드 | API명 | 데이터 수 | 필수 파라미터 |
|---|----------|-------|----------|-------------|
| 20 | `nzbyfwhwaoanttzje` | 본회의 회의록 | - | DAE_NUM + CONF_DATE |
| 21 | `ncwgseseafwbuheph` | 위원회 회의록 | - | DAE_NUM + CONF_DATE |
| 22 | `VCONFAPIGCONFLIST` | 국정감사 회의록 | - | ERACO |
| 23 | `VCONFCFRMCONFLIST` | 인사청문회 회의록 | - | ERACO |
| 24 | `VCONFPHCONFLIST` | 공청회 회의록 | - | ERACO |

### 위원회 (2개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 25 | `nxrvzonlafugpqjuh` | 위원회 현황 정보 | 356건 | 불필요 |
| 26 | `nktulghcadyhmiqxi` | 위원회 위원 명단 | 524건 | 불필요 |

### 청원 (3개)

| # | API 코드 | API명 | 데이터 수 | 필수 파라미터 |
|---|----------|-------|----------|-------------|
| 27 | `nvqbafvaajdiqhehi` | 청원 계류현황 | 276건 | AGE 불필요 |
| 28 | `PTTRCP` | 청원 접수목록 | - | ERACO 필요 |
| 29 | `PTTINFODETAIL` | 청원 상세정보 | - | PTT_ID 필요 |

### 입법예고 (2개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 30 | `nknalejkafmvgzmpt` | 진행중 입법예고 | 265건 | 불필요 |
| 31 | `nohgwtzsamojdozky` | 종료된 입법예고 | 16,565건 | 필요 |

### 입법조사처 (1개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 32 | `naaborihbkorknasp` | 입법조사처 보고서 | - | - |

### 메타/기타 (4개)

| # | API 코드 | API명 | 데이터 수 | AGE |
|---|----------|-------|----------|-----|
| 33 | `OPENSRVAPI` | OPEN API 전체 현황 | 276건 | 불필요 |
| 34 | `BILLSESSPROD` | 회기정보 | - | - |
| 35 | `nywrpgoaatcpoqbiy` | 국회도서관 자료검색 | - | - |
| 36 | `OZN379001174FW17905` | 예산정책처 분석자료 | - | - |
