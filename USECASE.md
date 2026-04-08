# 국회 MCP 서버 활용 사례 100선

> assembly-api-mcp를 활용한 실용적인 질문 100가지.
> AI 어시스턴트(Claude, ChatGPT 등)에서 바로 사용할 수 있는 자연어 질문입니다.
> 단순 조회부터 여러 도구를 조합한 복합 분석까지 다양한 난이도를 포함합니다.

## 도구 범례

> v0.5.0 — 도메인 엔티티 기반 통합 도구. 271개 API 코드 발굴, 107개 전용 도구 통합.

| 도구 | 모드 | 설명 | v0.3 대응 |
|------|------|------|----------|
| `assembly_member` | Lite/Full | 의원 검색+분석 (이름 1건 자동 상세+발의+표결) | search_members + analyze_legislator |
| `assembly_bill` | Lite/Full | 의안 검색+추적+통계 (keywords 추적, mode=stats 통계) | search_bills + track_legislation |
| `assembly_session` | Lite/Full | 일정+회의록+표결 (type=schedule/meeting/vote) | get_schedule + search_meetings + get_votes |
| `assembly_org` | Lite/Full | 위원회+청원+입법예고 (type=committee/petition/legislation_notice) | get_committees + search_petitions + get_legislation_notices |
| `discover_apis` | Lite/Full | 276개 API 카탈로그 탐색 | (변경 없음) |
| `query_assembly` | Lite/Full | API 코드로 직접 호출 (범용) | (변경 없음) |
| `bill_detail` | Full | 의안 심층 (상세+심사+이력+제안자+회의) | get_bill_detail + get_bill_review + get_bill_history + get_bill_proposers |
| `committee_detail` | Full | 위원회 심층 (현황+위원명단) | get_committees (확장) |
| `petition_detail` | Full | 청원 심층 (목록+상세) | search_petitions (확장) |
| `research_data` | Full | 연구자료 통합 (도서관+입법조사처+예산정책처) | search_library + search_research_reports + get_budget_analysis |

---

## 1. 의원 정보 (10개)

> 국회의원의 인적사항, 소속 정당, 선거구, 위원회 등 기본 정보를 조회하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 1 | "더불어민주당 소속 의원 전체 목록 보여줘" | `assembly_member` | party 파라미터로 정당별 의원 목록 조회 |
| 2 | "서울 강남구 지역구 국회의원이 누구야?" | `assembly_member` | district 파라미터로 선거구별 의원 검색 |
| 3 | "22대 국회에서 여성 의원은 몇 명이야?" | `assembly_member` | 전체 의원 조회 후 성별 필터링·집계 |
| 4 | "국민의힘 비례대표 의원 목록 알려줘" | `assembly_member` | party+district 조합으로 비례대표 필터링 |
| 5 | "환경노동위원회 소속 의원들은 누구야?" | `assembly_member` | committee 파라미터로 위원회별 의원 조회 |
| 6 | "이재명 의원의 기본 정보 알려줘" | `assembly_member` | name 파라미터로 특정 의원 인적사항 조회 |
| 7 | "22대 국회에서 3선 이상 중진 의원 목록은?" | `assembly_member` | 전체 의원 조회 후 당선횟수 기준 필터링 |
| 8 | "조국혁신당 소속 의원이 몇 명이고 누구야?" | `assembly_member` | party="조국혁신당"으로 검색, 인원수 집계 |
| 9 | "경기도 지역구 의원 중 국토교통위 소속은?" | `assembly_member` | district+committee 조합 검색으로 교차 필터링 |
| 10 | "22대 국회 최연소 의원과 최고령 의원은 누구야?" | `assembly_member` | 전체 의원 생년월일 기준 정렬로 최연소/최고령 도출 |

---

## 2. 법안/의안 검색 (10개)

> 발의된 법안을 제목, 제안자, 상태 등 다양한 조건으로 검색하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 11 | "AI 관련 법안이 지금 국회에 몇 개나 발의돼 있어?" | `assembly_bill` | keyword="인공지능" 또는 "AI"로 검색, 건수 집계 |
| 12 | "김민석 의원이 대표발의한 법안 목록 보여줘" | `assembly_bill` | proposer="김민석"으로 검색 |
| 13 | "최근 한 달간 발의된 법안 중 '부동산' 관련 법안은?" | `assembly_bill` | status="recent" + keyword="부동산"으로 검색 |
| 14 | "현재 계류 중인 교육 관련 법안 목록 알려줘" | `assembly_bill` | status="pending" + keyword="교육"으로 검색 |
| 15 | "22대 국회에서 가장 많은 공동발의 의원이 참여한 법안은?" | `assembly_bill` | 발의법안 목록에서 공동발의자 수 기준 정렬 |
| 16 | "의안번호 2200001 법안의 상세 내용 알려줘" | `assembly_bill` | bill_id로 특정 의안 상세 조회 |
| 17 | "이번 정기국회에서 처리된 법안 목록 보여줘" | `assembly_bill` | status="processed"로 처리 완료 법안 검색 |
| 18 | "반도체 특별법 관련 법안이 있어?" | `assembly_bill` | keyword="반도체"로 검색, 관련 의안 목록 확인 |
| 19 | "의원입법과 정부입법 비율이 어떻게 돼?" | `assembly_bill` | 전체 법안 조회 후 제안주체별 분류·비율 산출 |
| 20 | "기후변화 대응 관련 법안 중 위원회 심사를 통과한 건?" | `assembly_bill` | keyword="기후" + 상태별 필터링으로 심사 진행 상황 확인 |

---

## 3. 법안 추적/동향 (10개)

> 특정 주제의 입법 동향을 추적하고, 법안 심사 진행 상황을 모니터링하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 21 | "플랫폼 노동자 보호 관련 입법 동향 정리해줘" | `assembly_bill` | keyword="플랫폼 노동"으로 관련 법안 추적 및 심사현황 종합 |
| 22 | "디지털 성범죄 관련 법안이 지금 어디까지 진행됐어?" | `assembly_bill` | keyword="디지털 성범죄"로 법안별 심사 단계 추적 |
| 23 | "22대 국회 들어서 새로 발의된 조세 관련 법안 동향은?" | `assembly_bill` | keyword="조세"로 검색, 22대 발의분 필터링 |
| 24 | "저출생 대책 관련 법안 현황 브리핑 자료 만들어줘" | `assembly_bill` + `assembly_bill` | 키워드 추적 + 법안 상세 조합으로 브리핑 형태 정리 |
| 25 | "청년 주거 관련 법안이 본회의까지 갈 가능성은?" | `assembly_bill` + `bill_detail` | 법안 추적 후 심사 정보로 진행 가능성 분석 |
| 26 | "가상자산 규제 법안 타임라인 정리해줘" | `assembly_bill` + `bill_detail` | 관련 법안 추적 + 처리이력으로 시계열 정리 |
| 27 | "이번 국회에서 통과 가능성이 높은 민생 법안은?" | `assembly_bill` + `bill_detail` | 민생 키워드 추적 + 심사 진척도로 통과 가능성 판단 |
| 28 | "의료 개혁 관련 법안 현재 심사 상태 요약해줘" | `assembly_bill` | keyword="의료"로 관련 법안 심사 현황 일괄 조회 |
| 29 | "공영방송 지배구조 관련 법안은 어떤 게 있어?" | `assembly_bill` | keyword="공영방송" 또는 "방송법"으로 입법 동향 파악 |
| 30 | "최근 3개월 발의된 법안 중 핵심 키워드 트렌드는?" | `assembly_bill` + `assembly_bill` | 최근 법안 목록에서 주제별 분류, 빈도 분석 |

---

## 4. 표결 분석 (10개)

> 본회의 표결 결과, 의원별 투표 성향, 정당별 표결 패턴을 분석하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 31 | "22대 국회에서 가결된 법안 표결 결과 보여줘" | `assembly_session` | 전체 표결 목록 조회, 가결 건만 필터링 |
| 32 | "예산안 표결에서 찬성/반대 비율이 어떻게 됐어?" | `assembly_session` | 특정 예산안 bill_id로 상세 표결 결과 조회 |
| 33 | "본회의 표결에서 여야 간 가장 첨예하게 갈린 법안은?" | `assembly_session` | 전체 표결에서 찬성-반대 비율 차이가 적은 건 추출 |
| 34 | "한동훈 의원은 최근 표결에서 어떻게 투표했어?" | `assembly_member` | 의원 종합분석의 표결 참여 내역 확인 |
| 35 | "국민의힘 의원 중 당론과 다르게 투표한 사례 있어?" | `assembly_session` + `assembly_member` | 표결 상세에서 정당별 이탈표 분석 |
| 36 | "22대 국회 표결 불참률이 가장 높은 의원은?" | `assembly_session` + `assembly_member` | 전체 표결 데이터에서 불참 횟수 집계, 의원별 순위 |
| 37 | "교육위원회 소관 법안의 본회의 표결 결과 정리해줘" | `assembly_session` + `assembly_bill` | 교육 관련 법안 ID 확보 후 표결 결과 일괄 조회 |
| 38 | "무기명 표결로 처리된 안건 목록 보여줘" | `assembly_session` | 전체 표결에서 무기명 표결 건 필터링 |
| 39 | "탄핵소추안 표결 결과 상세히 알려줘" | `assembly_session` | 해당 안건 bill_id로 의원별 찬반 상세 조회 |
| 40 | "최근 한 달간 본회의 표결 전체 요약해줘" | `assembly_session` + `assembly_session` | 기간별 표결 목록 + 일정 대조로 종합 요약 |

---

## 5. 국회 일정/회의 (10개)

> 본회의, 위원회 등 국회 일정을 조회하고, 회의록을 검색하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 41 | "이번 주 국회 일정 전체 보여줘" | `assembly_session` | 금주 날짜 범위로 일정 조회 |
| 42 | "내일 열리는 위원회 회의 목록 알려줘" | `assembly_session` | 내일 날짜 + 위원회 카테고리로 일정 검색 |
| 43 | "국정감사 일정 전체 정리해줘" | `assembly_session` + `assembly_session` | 국감 키워드로 일정 조회 + 회의 목록 확인 |
| 44 | "법제사법위원회 최근 회의록 보여줘" | `assembly_session` | committee="법제사법위원회"로 회의록 검색 |
| 45 | "본회의에서 AI 관련 논의가 있었던 회의록 찾아줘" | `assembly_session` | type="본회의" + keyword="인공지능"으로 검색 |
| 46 | "인사청문회 일정과 대상자 목록 알려줘" | `assembly_session` | type="인사청문회"로 회의 검색, 대상자 정보 추출 |
| 47 | "예산결산특별위원회 회의가 이번 달에 몇 번 열렸어?" | `assembly_session` + `assembly_session` | 해당 위원회 월별 회의 건수 집계 |
| 48 | "지난 정기국회 기간 중 본회의는 총 몇 회 열렸어?" | `assembly_session` | type="본회의" + 기간 필터로 건수 조회 |
| 49 | "소위원회에서 통과된 안건 중 전체회의 미상정 건은?" | `assembly_session` + `assembly_bill` | 소위 회의록에서 의결 안건 추출 후 상태 교차 확인 |
| 50 | "공청회가 최근에 열린 주제 목록 보여줘" | `assembly_session` | type="공청회"로 최근 회의 목록 조회, 주제별 정리 |

---

## 6. 위원회 활동 (10개)

> 상임위원회, 특별위원회의 구성과 활동, 소관 법안 처리 현황을 파악하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 51 | "22대 국회 상임위원회 전체 목록과 위원장 알려줘" | `assembly_org` | 위원회 목록 조회, 위원장 정보 포함 |
| 52 | "과학기술정보방송통신위원회에서 이번 회기에 처리한 법안은?" | `assembly_org` + `assembly_bill` | 위원회 소관 법안 중 처리 완료 건 검색 |
| 53 | "국방위원회 소속 의원 명단과 소속 정당 알려줘" | `assembly_member` + `assembly_org` | 위원회 구성 + 의원 정당 정보 결합 |
| 54 | "특별위원회는 현재 어떤 것들이 운영 중이야?" | `assembly_org` | 특별위원회 유형 필터로 운영 중인 목록 조회 |
| 55 | "정보위원회 회의 개최 빈도는 어느 정도야?" | `assembly_session` + `assembly_org` | 정보위 회의록 건수로 개최 빈도 분석 |
| 56 | "각 상임위별 계류 법안 수 비교해줘" | `assembly_org` + `assembly_bill` | 위원회별 pending 법안 건수 집계·비교 |
| 57 | "여성가족위원회에서 올해 논의한 주요 안건은?" | `assembly_session` + `assembly_bill` | 위원회 회의록 + 관련 법안 목록 교차 확인 |
| 58 | "국토교통위원회 법안심사소위원회 활동 현황 알려줘" | `assembly_session` | type="소위원회" + committee="국토교통위"로 검색 |
| 59 | "22대 국회에서 새로 신설된 특별위원회가 있어?" | `assembly_org` | 위원회 목록에서 22대 신설 특위 필터링 |
| 60 | "행정안전위원회 위원 중 재선 이상 의원 비율은?" | `assembly_member` + `assembly_org` | 위원 명단 조회 후 당선횟수 기준 분석 |

---

## 7. 의원 활동 분석 (10개)

> 개별 의원의 입법 활동, 출석, 표결 참여 등을 종합적으로 분석하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 61 | "김의겸 의원의 22대 국회 활동 종합 리포트 만들어줘" | `assembly_member` | 인적사항+발의법안+표결 참여 종합 분석 |
| 62 | "22대 국회에서 법안 발의 건수 상위 10명은?" | `assembly_member` + `assembly_member` | 의원별 발의 건수 집계 후 순위 산출 |
| 63 | "우원식 국회의장의 본회의 주재 현황 알려줘" | `assembly_member` + `assembly_session` | 의장 정보 + 본회의 회의록 교차 분석 |
| 64 | "초선 의원 중 입법 활동이 가장 활발한 의원은?" | `assembly_member` + `assembly_member` | 초선 필터 후 발의 건수 비교 분석 |
| 65 | "박주민 의원과 주호영 의원의 발의 법안 주제 비교해줘" | `assembly_member` (2회) | 두 의원 각각 분석 후 발의 법안 주제 비교 |
| 66 | "우리 지역구 의원이 이번 국회에서 뭘 했는지 알려줘 (서울 동작구)" | `assembly_member` + `assembly_member` | 선거구 검색 후 해당 의원 종합 분석 |
| 67 | "22대 국회 대표발의 건수 대비 가결 비율이 높은 의원은?" | `assembly_member` + `assembly_bill` | 의원별 발의-가결 비율 산출·비교 |
| 68 | "정청래 위원장의 법사위 운영 성과 분석해줘" | `assembly_member` + `assembly_session` | 의원 분석 + 법사위 회의 현황 결합 |
| 69 | "비례대표 의원들의 평균 법안 발의 건수는?" | `assembly_member` + `assembly_member` | 비례대표 의원 목록 후 발의 건수 평균 산출 |
| 70 | "의원별 표결 참여율 랭킹 보여줘 (상위 20명)" | `assembly_session` + `assembly_member` | 표결 데이터에서 참여율 집계, 상위 순위 |

---

## 8. 입법 과정 (10개)

> 법안의 발의부터 공포까지 입법 절차와 심사 과정을 이해하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 71 | "간호법 입법 과정 전체 타임라인 보여줘" | `assembly_bill` + `bill_detail` | 법안 검색 후 처리 이력으로 단계별 타임라인 구성 |
| 72 | "현재 입법예고 중인 법안 목록 알려줘" | `assembly_org` | 입법예고 진행 중인 법안 목록 조회 |
| 73 | "교육기본법 개정안의 심사 경과 상세히 알려줘" | `bill_detail` + `bill_detail` | 심사 정보 + 처리 이력 결합으로 상세 경과 |
| 74 | "법안이 발의에서 본회의 통과까지 평균 얼마나 걸려?" | `assembly_bill` + `bill_detail` | 처리 완료 법안들의 소요 기간 평균 산출 |
| 75 | "위원회 대안으로 폐기된 법안 사례 알려줘" | `assembly_bill` + `bill_detail` | 대안반영폐기 법안 검색 후 심사 과정 확인 |
| 76 | "이번 회기에 철회된 법안이 있어?" | `assembly_bill` | 상태="철회"로 검색 |
| 77 | "정부 제출 법안과 의원 발의 법안의 가결률 비교해줘" | `assembly_bill` + `bill_detail` | 제안주체별 가결률 산출·비교 |
| 78 | "수정안이 가결된 최근 본회의 사례 알려줘" | `assembly_session` + `bill_detail` | 수정안 표결 건 검색 후 상세 확인 |
| 79 | "법사위에서 체계·자구 심사 중인 법안 현황은?" | `assembly_bill` + `bill_detail` | 법사위 계류 법안 중 체계자구심사 단계 필터 |
| 80 | "입법예고 기간이 끝난 법안 중 국민 의견이 많았던 건?" | `assembly_org` | 입법예고 완료 건에서 의견 수 기준 정렬 |

---

## 9. 시민 참여/청원 (10개)

> 국민동의청원, 입법예고 의견, 시민 참여 관련 정보를 조회하는 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 81 | "현재 동의 진행 중인 국민청원 목록 보여줘" | `assembly_org` | 진행 중인 청원 목록 조회 |
| 82 | "5만 명 이상 동의를 받아 국회에 회부된 청원은?" | `assembly_org` | 동의 수 기준 필터링, 회부 상태 확인 |
| 83 | "교육 관련 국민청원 중 현재 심사 중인 건 있어?" | `assembly_org` | keyword="교육"으로 검색, 심사 상태 필터 |
| 84 | "22대 국회 들어서 국민청원 접수 건수 추이는?" | `assembly_org` | 월별 접수 건수 집계로 추이 분석 |
| 85 | "국민청원이 실제 법안으로 발의된 사례 있어?" | `assembly_org` + `assembly_bill` | 청원 주제와 유사한 법안 교차 검색 |
| 86 | "현재 입법예고 중인 법안에 의견 제출하려면 어떻게 해?" | `assembly_org` | 입법예고 목록 + 의견제출 절차 안내 |
| 87 | "최근 만료된 청원 중 동의 수가 아쉽게 부족했던 건?" | `assembly_org` | 만료 청원 중 동의 수 상위 건 조회 |
| 88 | "동물보호 관련 청원과 법안을 함께 정리해줘" | `assembly_org` + `assembly_bill` | 동물보호 키워드로 청원+법안 통합 검색 |
| 89 | "역대 국민동의청원 중 가장 많은 동의를 받은 건?" | `assembly_org` | 동의 수 기준 내림차순 정렬, 최다 동의 건 확인 |
| 90 | "국민청원 제도의 현황을 데이터로 요약해줘" | `assembly_org` + `discover_apis` | 청원 통계 데이터 조회 + API 탐색으로 종합 요약 |

---

## 10. 고급 분석/리서치 (10개)

> 여러 도구를 조합하거나, discover_apis + query_assembly로 확장 데이터를 활용하는 고급 분석 질문

| # | 질문 | 도구 | 설명 |
|---|------|------|------|
| 91 | "22대 국회 전반기 입법 성과를 종합 리포트로 만들어줘" | `assembly_bill` + `assembly_session` + `assembly_session` + `assembly_org` | 법안 처리·표결·회의 데이터를 결합한 종합 성과 리포트 |
| 92 | "국회 예산결산 분석 자료 중 복지 분야 예산 추이 알려줘" | `research_data` | 복지 분야 키워드로 예산결산 분석 데이터 조회 |
| 93 | "국회입법조사처 보고서 중 AI 규제 관련 자료 찾아줘" | `research_data` | keyword="인공지능 규제"로 연구보고서 검색 |
| 94 | "국회도서관에서 '탄소중립' 관련 자료 검색해줘" | `research_data` | keyword="탄소중립"으로 국회도서관 자료 검색 |
| 95 | "의안 통계 API가 있는지 확인하고, 22대 국회 의안 현황 통계 가져와" | `discover_apis` + `query_assembly` | API 카탈로그에서 의안통계 API 탐색 후 직접 호출 |
| 96 | "위원회 위원 변경 이력을 확인할 수 있는 API가 있어?" | `discover_apis` + `query_assembly` | 위원회 위원 관련 API 탐색 후 변경이력 데이터 호출 |
| 97 | "국회의원 해외출장 정보를 조회할 수 있어?" | `discover_apis` + `query_assembly` | 276개 API 중 해외출장 관련 API 탐색 후 데이터 조회 |
| 98 | "의원 세비(세비) 및 수당 관련 데이터 API 찾아서 조회해줘" | `discover_apis` + `query_assembly` | 세비/수당 관련 API 카탈로그 탐색 + 직접 호출 |
| 99 | "국회 회의에서 특정 단어가 얼마나 자주 언급되는지 분석해줘 (예: '민생')" | `discover_apis` + `query_assembly` + `assembly_session` | 발언 관련 API 탐색 + 회의록 검색으로 빈도 분석 |
| 100 | "여야 의원들의 입법 활동을 비교 분석하고, 국회 연구보고서에서 관련 평가 자료도 찾아줘" | `assembly_member` + `assembly_member` + `research_data` | 정당별 의원 분석 + 연구보고서 교차 검색으로 종합 비교 |

---

## 활용 팁

1. **단순 질문은 도구 1개로 충분합니다.** "OO 의원 정보 알려줘"처럼 직관적으로 물어보세요.
2. **복합 분석은 AI가 알아서 여러 도구를 조합합니다.** "OO 의원의 발의 법안과 표결 성향을 비교 분석해줘"처럼 자연스럽게 요청하세요.
3. **discover_apis로 276개 API를 탐색**하면, 기본 도구로 커버되지 않는 데이터도 query_assembly를 통해 직접 조회할 수 있습니다.
4. **Full 모드를 사용하면** 의안 상세, 심사 정보, 청원, 예산, 연구보고서 등 추가 도구를 활용할 수 있습니다.
5. **시기를 특정하면 더 정확합니다.** "22대 국회", "이번 정기국회", "최근 3개월" 등 기간을 명시하세요.
