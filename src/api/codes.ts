/**
 * 검증된 국회 API 코드 매핑
 *
 * 실제 API 호출로 검증된 코드만 포함합니다.
 * 검증일: 2026-04-04, KEY: 실제 발급 키 사용
 *
 * 주의: 대부분의 API는 AGE(대수) 파라미터가 필요합니다.
 * AGE 없이 호출하면 0건이 반환될 수 있습니다.
 */

/** 현재 국회 대수 */
export const CURRENT_AGE = 22;

/** 검증된 API 코드 */
export const API_CODES = {
  // ── 국회의원 ──────────────────────────────────
  /** 국회의원 인적사항 (295명, AGE 불필요) */
  MEMBER_INFO: "nwvrqwxyaytdsfvhu",

  // ── 의안 ────────────────────────────────────
  /** 의원 발의법률안 (AGE 필요) */
  MEMBER_BILLS: "nzmimeepazxkubdpn",
  /** 의안 통합검색 (AGE 필요, 17,626건@22대) */
  BILL_SEARCH: "TVBPMBILL11",
  /** 의안 접수목록 (AGE 불필요, 118,682건) */
  BILL_RECEIVED: "BILLRCP",
  /** 의안 심사정보 (AGE 불필요, 35,329건) */
  BILL_REVIEW: "BILLJUDGE",
  /** 의안 상세정보 (BILL_ID 필요) */
  BILL_DETAIL: "BILLINFODETAIL",
  /** 계류의안 (AGE 불필요, 13,006건) */
  BILL_PENDING: "nwbqublzajtcqpdae",
  /** 처리의안 (AGE 필요, 4,620건@22대) */
  BILL_PROCESSED: "nzpltgfqabtcpsmai",
  /** 본회의부의안건 (139건) */
  PLENARY_AGENDA: "nayjnliqaexiioauy",

  // ── 표결 ────────────────────────────────────
  /** 의안별 표결현황 (AGE 필요, 1,352건@22대) */
  VOTE_BY_BILL: "ncocpgfiaoituanbr",
  /** 본회의 표결정보 (AGE 필요, 1,315건@22대) */
  VOTE_PLENARY: "nwbpacrgavhjryiph",

  // ── 의안 통계 ──────────────────────────────────
  /** 처리 의안통계 총괄 */
  BILL_STATS_MAIN: "BILLCNTMAIN",
  /** 처리 의안통계 위원회별 */
  BILL_STATS_COMMITTEE: "BILLCNTCMIT",
  /** 처리 의안통계 위원회별 법률안 */
  BILL_STATS_LAW_COMMITTEE: "BILLCNTLAWCMIT",

  // ── 일정 ────────────────────────────────────
  /** 국회일정 통합 API (90,201건, AGE 불필요) */
  SCHEDULE_ALL: "ALLSCHEDULE",
  /** 본회의 일정 (UNIT_CD 필요, 예: 100022) */
  SCHEDULE_PLENARY: "nekcaiymatialqlxr",
  /** 위원회별 일정 (UNIT_CD 필요) */
  SCHEDULE_COMMITTEE: "nrsldhjpaemrmolla",

  // ── 회의록 ──────────────────────────────────
  /** 본회의 회의록 (DAE_NUM + CONF_DATE 필요) */
  MEETING_PLENARY: "nzbyfwhwaoanttzje",
  /** 위원회 회의록 (DAE_NUM + CONF_DATE 필요) */
  MEETING_COMMITTEE: "ncwgseseafwbuheph",
  /** 국정감사 회의록 (ERACO 필요, 예: "제22대") */
  MEETING_AUDIT: "VCONFAPIGCONFLIST",
  /** 인사청문회 회의록 (ERACO 필요) */
  MEETING_CONFIRMATION: "VCONFCFRMCONFLIST",
  /** 공청회 회의록 (ERACO 필요) */
  MEETING_PUBLIC_HEARING: "VCONFPHCONFLIST",

  // ── 위원회 ──────────────────────────────────
  /** 위원회 현황 정보 (356건, AGE 불필요) */
  COMMITTEE_INFO: "nxrvzonlafugpqjuh",
  /** 위원회 위원 명단 (524건) */
  COMMITTEE_MEMBERS: "nktulghcadyhmiqxi",

  // ── 청원 ────────────────────────────────────
  /** 청원 계류현황 (276건, AGE 불필요) */
  PETITION_PENDING: "nvqbafvaajdiqhehi",
  /** 청원 접수목록 (ERACO 필요, 예: "제22대") */
  PETITION_LIST: "PTTRCP",
  /** 청원 상세정보 (PTT_ID 필요) */
  PETITION_DETAIL: "PTTINFODETAIL",

  // ── 입법예고 ────────────────────────────────
  /** 진행중 입법예고 (265건, AGE 불필요) */
  LEGISLATION_ACTIVE: "nknalejkafmvgzmpt",
  /** 종료된 입법예고 (AGE 필요, 16,565건@22대) */
  LEGISLATION_CLOSED: "nohgwtzsamojdozky",

  // ── 메타 ────────────────────────────────────
  /** OPEN API 전체 현황 (276건) */
  META_API_LIST: "OPENSRVAPI",
  /** 국회의원 정보 통합 API (3,286건) */
  MEMBER_ALL: "ALLNAMEMBER",
  /** 회기정보 */
  SESSION_INFO: "BILLSESSPROD",

  // ── 입법조사처 ─────────────────────────────────
  /** 입법조사처 보고서 */
  RESEARCH_REPORTS: "naaborihbkorknasp",

  // ── 기타 ────────────────────────────────────
  /** 최근 본회의 부의안건 */
  RECENT_PLENARY_BILLS: "nxjuyqnxadtotdrbw",
  /** 국회도서관 자료검색 */
  LIBRARY_SEARCH: "nywrpgoaatcpoqbiy",
  /** 예산정책처 분석자료 */
  BUDGET_ANALYSIS: "OZN379001174FW17905",
} as const;

export type ApiCode = (typeof API_CODES)[keyof typeof API_CODES];
