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
  /** 의안 제안자정보 (BILL_ID 필요) */
  BILL_PROPOSERS: "BILLINFOPPSR",
  /** 위원회심사 회의정보 (BILL_ID 필요) */
  BILL_COMMITTEE_CONF: "BILLJUDGECONF",
  /** 법사위 회의정보 (BILL_ID 필요) */
  BILL_LAW_COMMITTEE_CONF: "BILLLWJUDGECONF",

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
  /** 처리 의안통계 발의주체별 법률안 */
  BILL_STATS_PROPOSER: "BILLCNTPRPSR",
  /** 처리 의안통계 의안종류별·위원회별 */
  BILL_STATS_LAW_DIV: "BILLCNTLAWDIV",

  // ── 본회의 처리안건 ────────────────────────────
  /** 본회의 처리안건_법률안 */
  PLENARY_LAW: "nkalemivaqmoibxro",
  /** 본회의 처리안건_예산안 */
  PLENARY_BUDGET: "nbslryaradshbpbpm",
  /** 본회의 처리안건_기타 */
  PLENARY_ETC: "nzgjnvnraowulzqwl",

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

  // ── 자동 발굴 코드 ─────────────────────────────────
  // 보고서ㆍ발간물>국회예산정책처
  /** NABO 경제재정수첩 */
  DISCOVERED_NABO_경제재정수첩: "ncnpwqimabagvdmky",
  /** NABO 추계 세제 이슈 */
  DISCOVERED_NABO_추계_세제_이슈: "njnuvjckavvwaohhj",
  /** NABO Focus */
  DISCOVERED_NABO_FOCUS: "npbizvcmabezbhcez",
  /** 예산춘추 */
  DISCOVERED_예산춘추: "nbxjdyrjaommhkiza",
  /** NABO 조세분석 및 연구 */
  DISCOVERED_NABO_조세분석_및_연구: "ncsrgzrwabonoefxi",
  /** NABO 대한민국 지방재정 */
  DISCOVERED_NABO_대한민국_지방재정: "naqdzohuagtisumcw",
  /** NABO 결산 분석 */
  DISCOVERED_NABO_결산_분석: "negjnychalvyrcifv",
  /** NABO 비용추계 및 재정전망 */
  DISCOVERED_NABO_비용추계_및_재정전망: "npsofwddayuhqhfgh",
  /** NABO 대한민국 재정 */
  DISCOVERED_NABO_대한민국_재정: "nxrkedghaikxodlja",
  /** NABO 대한민국 공공기관 */
  DISCOVERED_NABO_대한민국_공공기관: "nmwywvbbajlawfrsk",
  /** NABO 조세수첩 */
  DISCOVERED_NABO_조세수첩: "nfhoxrreafqmtsesg",
  /** NABO 재정동향 이슈 */
  DISCOVERED_NABO_재정동향_이슈: "nsjmwljyauxvdodgh",
  /** NABO 경제ㆍ산업동향 이슈 */
  DISCOVERED_NABO_경제산업동향_이슈: "nsenmxrjatgxxndrm",
  /** NABO 예산 분석 */
  DISCOVERED_NABO_예산_분석: "nxeytfqvawilyincp",
  /** 예산정책연구 */
  DISCOVERED_예산정책연구: "nrbcmchtaaqktsbjf",
  /** 정책연구용역 */
  DISCOVERED_정책연구용역: "nakxneqwaouwyagim",
  /** 국회예산정책처 홍보물 */
  DISCOVERED_국회예산정책처_홍보물: "nozwevvqatjorgvoc",
  /** NABO 재정사업 평가 */
  DISCOVERED_NABO_재정사업_평가: "nzjvrirbauqmffblj",
  /** NABO 경제전망 */
  DISCOVERED_NABO_경제전망: "npmbwjybaffxwvbbk",
  /** NABO 경제 정책 및 동향 분석 */
  DISCOVERED_NABO_경제_정책_및_동향_분석: "nlugechzaowgqlopk",
  // 주제별 공개>국민참여
  /** 국회도서관 정책에 관한 행정정보 공표 */
  DISCOVERED_국회도서관_정책에_관한_행정정보_공표: "nxycgjkkayfqaynjz",
  /** 국회도서관 행정감시 행정정보 공표 */
  DISCOVERED_국회도서관_행정감시_행정정보_공표: "nmpmwlsxaavvjbizm",
  /** 국회도서관 행정정보 공표목록 */
  DISCOVERED_국회도서관_행정정보_공표목록: "ndauywbhawaofrtlq",
  /** 국회도서관 사업에 관한 행정정보 공표 */
  DISCOVERED_국회도서관_사업에_관한_행정정보_공표: "nqxsurgrayxndzwjf",
  /** 국회도서관 기타 행정정보 공표 */
  DISCOVERED_국회도서관_기타_행정정보_공표: "ncfunqmvaeyhftgsq",
  /** 국회 시설물 안내 */
  DISCOVERED_국회_시설물_안내: "nabhvpvoadjjlckgw",
  /** 국회문화극장 공연 일정 */
  DISCOVERED_국회문화극장_공연_일정: "npfoswpxawimahqlt",
  /** 국회문화극장 영화 일정 */
  DISCOVERED_국회문화극장_영화_일정: "nfzxkpetatunooatq",
  /** 아트갤러리 전시 일정 */
  DISCOVERED_아트갤러리_전시_일정: "nptukpvcaxiaaaffa",
  /** 국회개방행사 일정 */
  DISCOVERED_국회개방행사_일정: "nneiozjtawpqhaidq",
  /** 국회방송 편성표 */
  DISCOVERED_국회방송_편성표: "noqtcnaiatcpgepvt",
  /** 어린이국회 개최 결과 */
  DISCOVERED_어린이국회_개최_결과: "CHILDRENOPENRESULT",
  /** 어린이국회 우수법률안 소개 */
  DISCOVERED_어린이국회_우수법률안_소개: "CHILDRENGREATBILL",
  // 주제별 공개>국민참여>국회 민원
  /** 국회사무처 정보목록 */
  DISCOVERED_국회사무처_정보목록: "ntmgtbxwaqrkrklzn",
  /** 국회도서관 정보목록 */
  DISCOVERED_국회도서관_정보목록: "nksbnuwbamgztpotg",
  /** 국회예산정책처 정보목록 */
  DISCOVERED_국회예산정책처_정보목록: "nzdoatdlaxeaqolvx",
  /** 국회입법조사처 정보목록 */
  DISCOVERED_국회입법조사처_정보목록: "nyrggptbaislycxyt",
  /** 청원 처리현황 */
  DISCOVERED_청원_처리현황: "ncryefyuaflxnqbqo",
  /** 청원 소개의원 정보 */
  DISCOVERED_청원_소개의원_정보: "PTTINFOPPSR",
  /** 청원 심사정보 */
  DISCOVERED_청원_심사정보: "PTTJUDGE",
  /** 청원 통계 */
  DISCOVERED_청원_통계: "PTTCNTMAIN",
  // 의정활동별 공개>인사청문회
  /** 인사청문회 */
  DISCOVERED_인사청문회: "nrvsawtaauyihadij",
  // 국회의원>역대 국회 정보
  /** 역대 국회의원 인적사항 */
  DISCOVERED_역대_국회의원_인적사항: "npffdutiapkzbfyvr",
  /** 역대 국회의원 위원회 경력 */
  DISCOVERED_역대_국회의원_위원회_경력: "nqbeopthavwwfbekw",
  /** 역대 국회의원 현황 */
  DISCOVERED_역대_국회의원_현황: "nprlapfmaufmqytet",
  /** 역대 국회의장단 정보 */
  DISCOVERED_역대_국회의장단_정보: "nubbgpxmawmzkclkc",
  /** 역대 국회 선거일, 의원정수, 임기정보 */
  DISCOVERED_역대_국회_선거일_의원정수_임기정보: "nokivirranikoinnk",
  /** 역대 국회 정당별 국회의원 지역분포 */
  DISCOVERED_역대_국회_정당별_국회의원_지역분포: "nvarpwrqaklzxcmmp",
  /** 역대 국회의원 재선 현황 */
  DISCOVERED_역대_국회의원_재선_현황: "ngdeoqgoablceakpp",
  /** 역대 여성 국회의원 현황 */
  DISCOVERED_역대_여성_국회의원_현황: "nmkjkjpwaxfhwdnjl",
  /** 역대 국회의원 의원이력 */
  DISCOVERED_역대_국회의원_의원이력: "nfzegpkvaclgtscxt",
  /** 역대 정당별 국회의원 선거결과 */
  DISCOVERED_역대_정당별_국회의원_선거결과: "nedjqrnlavrvcycue",
  /** 역대 의안 통계 */
  DISCOVERED_역대_의안_통계: "nzivskufaliivfhpb",
  /** 의장단 주요일정 */
  DISCOVERED_의장단_주요일정: "SPGRPSCHEDULE",
  /** 의장단 보도자료 */
  DISCOVERED_의장단_보도자료: "SPGRPPRESS",
  /** (영문)국회의장 주요동정 */
  DISCOVERED_영문국회의장_주요동정: "ENSPEAKERACTIVITI",
  /** (영문)국회의장 연설문 */
  DISCOVERED_영문국회의장_연설문: "ENSPEAKERSPEECHES",
  // 주제별 공개>언론·미디어·국회일정
  /** 국회뉴스ON_국회는 지금 */
  DISCOVERED_국회뉴스ON국회는_지금: "nkyhxppmamrzejhij",
  /** 국회뉴스ON_상임위·본회의 */
  DISCOVERED_국회뉴스ON상임위본회의: "ngnldmexasfdsgjaa",
  /** 국회뉴스ON_의원 입법안 */
  DISCOVERED_국회뉴스ON의원_입법안: "ntbzdcigaongnbfxc",
  /** 국회뉴스ON_부의장동향 */
  DISCOVERED_국회뉴스ON부의장동향: "ncnyddauatqkofnfe",
  /** 국회뉴스ON_사무총장동향 */
  DISCOVERED_국회뉴스ON사무총장동향: "navxqzpzafxazsobg",
  /** 국회뉴스ON_국회동향기타 */
  DISCOVERED_국회뉴스ON국회동향기타: "noxbiocwawvechjkc",
  /** 국회 기자회견장 사용현황 */
  DISCOVERED_국회_기자회견장_사용현황: "TBPRESSCONF",
  /** 보도자료 */
  DISCOVERED_보도자료: "ninnagrlaelvtzfnt",
  /** 국회뉴스ON_그건 이렇습니다 */
  DISCOVERED_국회뉴스ON그건_이렇습니다: "ngwksdbiacfrifqsi",
  /** 국회뉴스ON_발행물 및 보고서 */
  DISCOVERED_국회뉴스ON발행물_및_보고서: "nyazvvwaarapcotdp",
  /** 국회뉴스ON_의원의 맛과멋 */
  DISCOVERED_국회뉴스ON의원의_맛과멋: "nzsmstfjaswvtbzii",
  /** 국회뉴스ON_보좌진 이야기 */
  DISCOVERED_국회뉴스ON보좌진_이야기: "nepfnxudavtvchtlu",
  /** 국회뉴스ON_의원실 행사 */
  DISCOVERED_국회뉴스ON의원실_행사: "nkulntiravezskrjd",
  /** 국회뉴스ON_의장동향 */
  DISCOVERED_국회뉴스ON의장동향: "nknsekyoahvonwlll",
  /** NATV 뉴스_토론회/세미나 */
  DISCOVERED_NATV_뉴스토론회세미나: "nzdppcljavkxnylqs",
  /** NATV 뉴스_기타 */
  DISCOVERED_NATV_뉴스기타: "nshnpsvaalefpwslj",
  /** 국회뉴스ON_외부기고 */
  DISCOVERED_국회뉴스ON외부기고: "nrjoiyzqaxpwfzuut",
  /** NATV 뉴스_본회의 */
  DISCOVERED_NATV_뉴스본회의: "nufjqmgtawuzxhila",
  /** NATV 뉴스_인물 */
  DISCOVERED_NATV_뉴스인물: "nauvppbxargkmyovh",
  /** NATV 뉴스_위원회 */
  DISCOVERED_NATV_뉴스위원회: "nuizrfvoaepvwrjtz",
  /** NATV 뉴스_정당 */
  DISCOVERED_NATV_뉴스정당: "nbzyjjyoamdqqjorw",
  /** 국회의원 영상회의록(발언영상) */
  DISCOVERED_국회의원_영상회의록발언영상: "npeslxqbanwkimebr",
  /** NATV 뉴스_의장단 */
  DISCOVERED_NATV_뉴스의장단: "ndkuweviadcqkbjdl",
  /** 국회박물관 행사 일정 */
  DISCOVERED_국회박물관_행사_일정: "EVENTSCHEDULEMUSEUM",
  /** (영문)국회일정 */
  DISCOVERED_영문국회일정: "ENSCHEDULENOTICE",
  /** (영문)국회 소식 및 보도자료 */
  DISCOVERED_영문국회_소식_및_보도자료: "ENPRESS",
  // 국회의원>국회의원 현황 정보
  /** 국회의원 위원회 경력 */
  DISCOVERED_국회의원_위원회_경력: "nyzrglyvagmrypezq",
  /** 국회의원 본회의 표결정보 */
  DISCOVERED_국회의원_본회의_표결정보: "nojepdqqaweusdfbi",
  /** 국회의원 연구단체 등록현황 */
  DISCOVERED_국회의원_연구단체_등록현황: "numwhtqhavaqssfle",
  /** 국회의원 보좌직원 채용 */
  DISCOVERED_국회의원_보좌직원_채용: "nbdlhufiaebnmjfxf",
  /** 국회의원 상임위 활동 */
  DISCOVERED_국회의원_상임위_활동: "nuvypcdgahexhvrjt",
  /** 국회의원 기자회견 */
  DISCOVERED_국회의원_기자회견: "npbzvuwvasdqldskm",
  /** 국회의원 SNS정보 */
  DISCOVERED_국회의원_SNS정보: "negnlnyvatsjwocar",
  /** 국회의원 의원이력 */
  DISCOVERED_국회의원_의원이력: "nexgtxtmaamffofof",
  /** 국회의원 본회의 의사일정 */
  DISCOVERED_국회의원_본회의_의사일정: "NAMEMBERLEGISCHEDULE",
  /** 국회의원 위원회 의사일정 */
  DISCOVERED_국회의원_위원회_의사일정: "NAMEMBERCMITSCHEDULE",
  /** 국회의원 청원현황 */
  DISCOVERED_국회의원_청원현황: "NAMEMBERLEGIPTT",
  /** (영문)국회의원 정보 */
  DISCOVERED_영문국회의원_정보: "ENNAMEMBER",
  /** 의원실 행사 정보 */
  DISCOVERED_의원실_행사_정보: "NAMEMBEREVENT",
  // 의정활동별 공개
  /** 전원위원회 일정 */
  DISCOVERED_전원위원회_일정: "nomxleneanjcruaez",
  /** 위원회 자료실 */
  DISCOVERED_위원회_자료실: "nbiwfpqbaipwgkhfr",
  /** 전원위원회 회의록 */
  DISCOVERED_전원위원회_회의록: "ngytonzwavydlbbha",
  /** 날짜별 의정활동 */
  DISCOVERED_날짜별_의정활동: "nqfvrbsdafrmuzixe",
  /** 위원회 계류법률안 */
  DISCOVERED_위원회_계류법률안: "ndiwuqmpambgvnfsj",
  /** 소위원회 회의록 */
  DISCOVERED_소위원회_회의록: "VCONFSUBCCONFLIST",
  /** 회의록별 상세정보 */
  DISCOVERED_회의록별_상세정보: "VCONFDETAIL",
  /** 시청각자료 목록 */
  DISCOVERED_시청각자료_목록: "VCONFATTACRCLIST",
  /** 제안설명서 목록 */
  DISCOVERED_제안설명서_목록: "VCONFATTEXPLANLIST",
  /** 시정조치 결과보고서 목록 */
  DISCOVERED_시정조치_결과보고서_목록: "VCONFATTATBLIST",
  /** 회의별 안건목록 */
  DISCOVERED_회의별_안건목록: "VCONFBLLLIST",
  /** 회의별 의안목록 */
  DISCOVERED_회의별_의안목록: "VCONFBILLLIST",
  /** 의안별 회의록 목록 */
  DISCOVERED_의안별_회의록_목록: "VCONFBILLCONFLIST",
  /** 회의록 대별 위원회 목록 */
  DISCOVERED_회의록_대별_위원회_목록: "nkimylolanvseqagq",
  /** (영문)위원회 정보 */
  DISCOVERED_영문위원회_정보: "ENCMITINFO",
  /** 예결산특별위원회 회의록 */
  DISCOVERED_예결산특별위원회_회의록: "VCONFBUDGETCONFLIST",
  /** 특별위원회 회의록 */
  DISCOVERED_특별위원회_회의록: "VCONFSPCCONFLIST",
  /** 국정조사 회의록 */
  DISCOVERED_국정조사_회의록: "VCONFPIPCONFLIST",
  /** 청문회 회의록 */
  DISCOVERED_청문회_회의록: "VCONFCHCONFLIST",
  /** 연석회의 회의록 */
  DISCOVERED_연석회의_회의록: "VCONFJMCONFLIST",
  /** 대통령취임연설 포함 회의록 */
  DISCOVERED_대통령취임연설_포함_회의록: "VCONFDNACONFLIST",
  /** 대통령시정연설 포함 회의록 */
  DISCOVERED_대통령시정연설_포함_회의록: "VCONFSNACONFLIST",
  /** 외빈연설 포함 회의록 */
  DISCOVERED_외빈연설_포함_회의록: "VCONFFDCONFLIST",
  /** 회의록별 부록 정보 */
  DISCOVERED_회의록별_부록_정보: "VCONFATTAPPENDIXLIST",
  /** 서면질의답변서 목록 */
  DISCOVERED_서면질의답변서_목록: "VCONFATTQNALIST",
  // 주제별 공개>행정>인사
  /** 국회채용정보 */
  DISCOVERED_국회채용정보: "nswsyvysaidgdhsch",
  /** 9급 공개경쟁 채용현황 */
  DISCOVERED_9급_공개경쟁_채용현황: "ncdawwizazvcivann",
  /** 입법고시(5급) 채용현황 */
  DISCOVERED_입법고시5급_채용현황: "nujtkaefaqkaqvsdm",
  /** 8급 공개경쟁 채용현황 */
  DISCOVERED_8급_공개경쟁_채용현황: "nlhssknfaoxiofyix",
  /** 국회채용_종합현황 */
  DISCOVERED_국회채용종합현황: "nwutmjsuayhwupoxc",
  // 국회의원>국회의원 현황 정보>정책자료보고서
  /** 국회의원 정책자료실 */
  DISCOVERED_국회의원_정책자료실: "npggiwnfaihlruyso",
  /** 국회의원 정책 세미나 개최 현황 */
  DISCOVERED_국회의원_정책_세미나_개최_현황: "nbqbmccpamsvwebkn",
  /** 국회의원 의정보고서 */
  DISCOVERED_국회의원_의정보고서: "nmfcjtvmajsbhhckf",
  // 보고서ㆍ발간물>국회입법조사처
  /** 국회입법조사처 연구보고서(이슈와 논점) */
  DISCOVERED_국회입법조사처_연구보고서이슈와_논점: "nxlcxbbkapsrjayur",
  /** 국회입법조사처 알림지(국회입법조사처보) */
  DISCOVERED_국회입법조사처_알림지국회입법조사처보: "nezimfsfayvtciyvx",
  /** 국회입법조사처 기타자료 */
  DISCOVERED_국회입법조사처_기타자료: "ngsyzvtlaqffhhthc",
  /** 의회외교 동향과 분석 */
  DISCOVERED_의회외교_동향과_분석: "nlpoxcnfacjeiankg",
  /** 국회입법조사처 연구보고서(국제통계 동향과 분석) */
  DISCOVERED_국회입법조사처_연구보고서국제통계_동향과_분석: "nhtegpibasggyssce",
  /** 국회입법조사처 연구보고서(국정감사관련(보고서)) */
  DISCOVERED_국회입법조사처_연구보고서국정감사관련보고서: "nlfmqyizaorhysrgf",
  /** 국회입법조사처 정책연구용역자료 */
  DISCOVERED_국회입법조사처_정책연구용역자료: "nijtjlghaowvisahk",
  /** 국회입법조사처 연구보고서(외국입법·정책 분석) */
  DISCOVERED_국회입법조사처_연구보고서외국입법정책_분석: "NARSBOOKDATA",
  /** 국회입법조사처 학술지(입법과 정책) */
  DISCOVERED_국회입법조사처_학술지입법과_정책: "nakxubpbapfmxdzrc",
  /** 국회입법조사처 세미나·간담회 */
  DISCOVERED_국회입법조사처_세미나간담회: "nyapimeoaczouxzhb",
  /** 국회입법조사처 연구보고서(지표로 보는 이슈) */
  DISCOVERED_국회입법조사처_연구보고서지표로_보는_이슈: "nduvpkzfatqsoonnc",
  /** 국회입법조사처 연구보고서(NARS 현안분석) */
  DISCOVERED_국회입법조사처_연구보고서NARS_현안분석: "nvkfeqbsacvlzjmea",
  /** 국회입법조사처 연구보고서(입법영향분석보고서) */
  DISCOVERED_국회입법조사처_연구보고서입법영향분석보고서: "nusxjbgeahffxfrzl",
  /** 국회입법조사처 연구보고서(입법·정책보고서) */
  DISCOVERED_국회입법조사처_연구보고서입법정책보고서: "njythywqasrxkjxpv",
  /** 국회입법조사처 연구보고서(외국입법 동향과 분석) */
  DISCOVERED_국회입법조사처_연구보고서외국입법_동향과_분석: "ncydhlphalaqvuzph",
  /** 국회입법조사처 알림지(홍보책자) */
  DISCOVERED_국회입법조사처_알림지홍보책자: "ndbehlnaagkjdvmdu",
  // 주제별 공개>행정>기획·조정
  /** 국회도서관 업무추진비 집행현황 */
  DISCOVERED_국회도서관_업무추진비_집행현황: "ngqoyjbkaxutcpmot",
  /** 국회입법조사처 업무추진비 집행현황 */
  DISCOVERED_국회입법조사처_업무추진비_집행현황: "nlmqzojlayoicbxhw",
  /** 국회예산정책처 업무추진비 집행현황 */
  DISCOVERED_국회예산정책처_업무추진비_집행현황: "nknmvzexapgiarqcd",
  /** 국회예산정책처 연차보고서 */
  DISCOVERED_국회예산정책처_연차보고서: "nkcyfxwnanwqvlysg",
  /** 국회입법조사처 연차보고서 */
  DISCOVERED_국회입법조사처_연차보고서: "nbeysefuaxfqkbynf",
  /** 국회사무처 업무추진비 집행현황 */
  DISCOVERED_국회사무처_업무추진비_집행현황: "nalacaiwauxiynsxt",
  // 주제별 공개
  /** 지방의회 연수 교육일정 */
  DISCOVERED_지방의회_연수_교육일정: "nmkoorezaqwzfsixy",
  /** 의사일정공지 */
  DISCOVERED_의사일정공지: "njlyptmbatwuwjtxf",
  /** 주요정치일정 */
  DISCOVERED_주요정치일정: "nkhynxdkagqtlgsqg",
  /** 국회의장 주요일정 */
  DISCOVERED_국회의장_주요일정: "nhedurlwawoquyxwn",
  /** 위원회별 전체회의 일정 */
  DISCOVERED_위원회별_전체회의_일정: "nttmdfdcaakvibdar",
  /** 위원회별 소위원회 일정 */
  DISCOVERED_위원회별_소위원회_일정: "nrkqqbvfanfybishu",
  /** 위원회별 공청회 일정 */
  DISCOVERED_위원회별_공청회_일정: "napvpafracrdkxmoq",
  /** 시민의정연수 */
  DISCOVERED_시민의정연수: "nmykqpjxamciskklk",
  // 주제별 공개>정책
  /** 법률안 심사 및 처리(위원회안, 대안) */
  DISCOVERED_법률안_심사_및_처리위원회안_대안: "nxtkyptyaolzcbfwl",
  /** 지역현안 입법지원 토론회 개최 내역 */
  DISCOVERED_지역현안_입법지원_토론회_개최_내역: "nyioaasianxlkcqxs",
  /** 행정입법 분석연구 */
  DISCOVERED_행정입법_분석연구: "njwcdwalactbvidal",
  /** 법제사례 연구발표 */
  DISCOVERED_법제사례_연구발표: "nljgwkpgacamiyjod",
  /** 시정 및 처리 요구사항에 대한 결과보고서 */
  DISCOVERED_시정_및_처리_요구사항에_대한_결과보고서: "AUDITREPORTVISIBILITY",
  /** 국정조사 결과보고서 */
  DISCOVERED_국정조사_결과보고서: "INVESTREPORTRESULT",
  /** 위원회별 개정대상 법률 현황 */
  DISCOVERED_위원회별_개정대상_법률_현황: "CLAWSTATE",
  /** 최근 헌재결정과 개정대상 법률 */
  DISCOVERED_최근_헌재결정과_개정대상_법률: "CLAWLEGI",
  /** 실시간 의사중계 현황 */
  DISCOVERED_실시간_의사중계_현황: "WEBCASTREALTIEM",
  /** 영상회의록 목록 */
  DISCOVERED_영상회의록_목록: "WEBCASTVCONF",
  /** 의안정보 통합 API */
  DISCOVERED_의안정보_통합_API: "ALLBILL",
  /** 예결산 심사정보 */
  DISCOVERED_예결산_심사정보: "BUDGETJUDGE",
  /** 계류의안 통계 */
  DISCOVERED_계류의안_통계: "BILLCNTRSVT",
  /** 연차보고서 */
  DISCOVERED_연차보고서: "BILLREPORT",
  /** 예결산 예비심사 정보 조회 */
  DISCOVERED_예결산_예비심사_정보_조회: "BUDGETADJUDGE",
  /** 예결산 종합심사 회의정보 조회 */
  DISCOVERED_예결산_종합심사_회의정보_조회: "BUDGETJUDGECONF",
  /** 국정감사 결과보고서 */
  DISCOVERED_국정감사_결과보고서: "AUDITREPORTRESULT",
  /** (영문)최신 처리 의안 */
  DISCOVERED_영문최신_처리_의안: "ENBCONFBILL",
  // 보고서ㆍ발간물>미래연구원
  /** 국회미래연구원 브리프형 심층분석 보고서 */
  DISCOVERED_국회미래연구원_브리프형_심층분석_보고서: "BRIEF",
  /** 국회미래연구원 미래포럼 */
  DISCOVERED_국회미래연구원_미래포럼: "FORUM",
  /** 국회미래연구원 연차보고서 */
  DISCOVERED_국회미래연구원_연차보고서: "ANUREPORT",
  /** 국회미래연구원 연구보고서 */
  DISCOVERED_국회미래연구원_연구보고서: "RESREPORT",
  // 주제별 공개>정책>국회의원 연구단체
  /** 연도별 연구단체 건수 */
  DISCOVERED_연도별_연구단체_건수: "nhllwdafacadantme",
  /** 연구단체 활동실적 */
  DISCOVERED_연구단체_활동실적: "nnzoijvcaiexypqaf",
  /** 연구단체 연구활동비 집행현황 */
  DISCOVERED_연구단체_연구활동비_집행현황: "nipnblofawwyxdhmx",
  /** 우수연구단체 현황 */
  DISCOVERED_우수연구단체_현황: "nvbqusufapyxesqek",
  /** 연구단체 연구활동 보고서 */
  DISCOVERED_연구단체_연구활동_보고서: "ncrwiahparxrpodcv",
  // 주제별 공개>행정>감사
  /** 퇴직 공직자 취업이력 공시 */
  DISCOVERED_퇴직_공직자_취업이력_공시: "nzkepuxpasyzvbrsu",
  /** 국회의원 겸직 결정 내역 */
  DISCOVERED_국회의원_겸직_결정_내역: "nahfbzwvatmaxscwq",
  // 주제별 공개>재정>국회의원 수당 및 지원예산
  /** 의원실 지원경비 현황 */
  DISCOVERED_의원실_지원경비_현황: "naqngwqyayereswlo",
  // 주제별 공개>재정>국회 예산현황
  /** 사업별 예산 편성 규모 */
  DISCOVERED_사업별_예산_편성_규모: "nztwkhgzakucszgls",
  /** 국회사무처 2천만원 이상 수의계약 현황 */
  DISCOVERED_국회사무처_2천만원_이상_수의계약_현황: "niqfwqfuaazozqwrj",
  /** 국회사무처 1억원 이상 계약 현황 */
  DISCOVERED_국회사무처_1억원_이상_계약_현황: "nwaglmniarckeuvuh",
  /** 국회 보유 자산(전체) */
  DISCOVERED_국회_보유_자산전체: "nujvlukkawoxnwvmg",
  /** 국회 보유 자산(건물) */
  DISCOVERED_국회_보유_자산건물: "noahbdisawgzvhooq",
  /** 국회 보유 자산(토지) */
  DISCOVERED_국회_보유_자산토지: "nvkhvcvvavafkjqca",
  /** 수입징수현황(수입항별) */
  DISCOVERED_수입징수현황수입항별: "nryvgajaaeerxmdyb",
  /** 수입징수현황(수입목별) */
  DISCOVERED_수입징수현황수입목별: "ndaabdwcatyjpopzn",
  /** 지출집행현황(단위사업별) */
  DISCOVERED_지출집행현황단위사업별: "nqflguqiachajqpaq",
  /** 지출집행현황(세부사업별) */
  DISCOVERED_지출집행현황세부사업별: "njzofberazvhjncha",
  // 주제별 공개>국민참여>정보공개제도
  /** 국회예산정책처 정보공개청구 처리현황 목록 */
  DISCOVERED_국회예산정책처_정보공개청구_처리현황_목록: "niykgszzaqxzdejiz",
  /** 국회입법조사처 정보공개청구 처리현황 목록 */
  DISCOVERED_국회입법조사처_정보공개청구_처리현황_목록: "nzygztwjapjjxayhe",
  /** 국회도서관 정보공개청구 처리현황 목록 */
  DISCOVERED_국회도서관_정보공개청구_처리현황_목록: "nbtkkkcoaffclmwoc",
  /** 국회사무처 정보공개청구 처리현황 목록 */
  DISCOVERED_국회사무처_정보공개청구_처리현황_목록: "ngktubbaavswhlnle",
  /** 정보공개청구 이의신청 처리현황 */
  DISCOVERED_정보공개청구_이의신청_처리현황: "nfwzyvuxacqtkttvr",
  /** 정보공개청구 행정심판 결과현황 */
  DISCOVERED_정보공개청구_행정심판_결과현황: "npryvxppapmxgwpxw",
  /** 정보공개청구 행정소송 판결현황 */
  DISCOVERED_정보공개청구_행정소송_판결현황: "nasphyhkaiaivedef",
  // 보고서ㆍ발간물>국회도서관
  /** 국회도서관 정책연구용역 보고서 */
  DISCOVERED_국회도서관_정책연구용역_보고서: "nzkdlzgoadvnlcubt",
  // 주제별 공개>정책>국회의원 입법 및 정책개발
  /** 국회의원 소규모 연구용역 결과보고서 */
  DISCOVERED_국회의원_소규모_연구용역_결과보고서: "nfvmtaqoaldzhobsw",
  // 주제별 공개>의회외교>국회의원 직무상 국외활동
  /** 국회의원 직무상 국외활동 신고 내역 */
  DISCOVERED_국회의원_직무상_국외활동_신고_내역: "nasnutdbapnfphwyr",
  // 주제별 공개>의회외교
  /** 의원외교협의회 명단 */
  DISCOVERED_의원외교협의회_명단: "nxcxrdmpaonzzbkic",
  /** 의원친선협회 임·회원 명단 */
  DISCOVERED_의원친선협회_임회원_명단: "nbicgazsalnfamoyp",
  /** 의회외교 실시내역 */
  DISCOVERED_의회외교_실시내역: "nzhjpcyhahczgglqc",
  /** 의회외교포럼 활동보고 */
  DISCOVERED_의회외교포럼_활동보고: "nlcqadrmachptelsf",
  /** 의회외교 영문의회용어검색 */
  DISCOVERED_의회외교_영문의회용어검색: "DIPLOMACYWORD",
  /** 의회외교 동향 */
  DISCOVERED_의회외교_동향: "DIPLOMACYTREND",
  /** 의회외교 해외주요법률 제개정 */
  DISCOVERED_의회외교_해외주요법률_제개정: "DIPLOMACYREVLAW",
  // 보고서ㆍ발간물>국회사무처
  /** 법제실 발간자료 */
  DISCOVERED_법제실_발간자료: "npvzeftnakulkqsfg",
  // 주제별 공개>행정>법무
  /** 국회 및 국회사무처 소관 법인별 보조금 예산 */
  DISCOVERED_국회_및_국회사무처_소관_법인별_보조금_예산: "ntexdxjbamdpccvnt",
  // 주제별 공개>의사일정
  /** 국회의원 세미나 일정 */
  DISCOVERED_국회의원_세미나_일정: "nfcoioopazrwmjrgs",
  // 국회의원
  /** 정당 및 교섭단체 의석수 현황 */
  DISCOVERED_정당_및_교섭단체_의석수_현황: "nepjpxkkabqiqpbvk",
  // 보고서ㆍ발간물
  /** 국회도서관 연간보고서 */
  DISCOVERED_국회도서관_연간보고서: "NANETPBLMYEAR",
  /** 최신외국입법정보 */
  DISCOVERED_최신외국입법정보: "NANETPBLMLEGINEW",
  /** 현안,외국에선 */
  DISCOVERED_현안외국에선: "NANETPBLMLEGI",
  /** 토론회 결과보고서 */
  DISCOVERED_토론회_결과보고서: "NABOPBLMDCSNREPORT",
  /** 대한민국 조세 */
  DISCOVERED_대한민국_조세: "NABOPBLMTAXGOV",
  /** 대한민국 경제 */
  DISCOVERED_대한민국_경제: "NABOPBLMECNGOV",
  /** 국회발간물 통합 API */
  DISCOVERED_국회발간물_통합_API: "ALLNASPBLM",
  /** 국회도서관 제공 자료 통합 API */
  DISCOVERED_국회도서관_제공_자료_통합_API: "ALLNANETPBLM",
  /** 국회입법조사처 제공 자료 통합 API */
  DISCOVERED_국회입법조사처_제공_자료_통합_API: "ALLNARSPBLM",
  /** 국회미래연구원 제공 자료 통합 API */
  DISCOVERED_국회미래연구원_제공_자료_통합_API: "ALLNAFIPBLM",
  /** 국회예산정책처 제공 자료 통합 API */
  DISCOVERED_국회예산정책처_제공_자료_통합_API: "ALLNABOPBLM",
  // ── 국민참여입법센터 (lawmaking.go.kr) ─────────────────────────────────
  // Base URL: https://www.lawmaking.go.kr/rest
  // 인증: OC (정보공개 서비스 신청 ID)
  // 참고: endpoint 경로 직접 사용 (국회 API와 다른 형식)
  /** 입법현황 목록/상세 ( govLmSts) */
  LAWMKG_VOLMSTS: "govLmSts",
  /** 입법계획 목록/상세 ( lmPln) */
  LAWMKG_LMPLN: "lmPln",
  /** 입법예고 목록/상세 ( ogLmPp) */
  LAWMKG_OGLMPP: "ogLmPp",
  /** 행정예고 목록/상세 ( ptcpAdmPp) */
  LAWMKG_PTCPADMPP: "ptcpAdmPp",
  /** 법령해석례 검색/상세 ( lsItptEmp) */
  LAWMKG_LSITPTEMP: "lsItptEmp",
  /** 의견제시사례 목록/상세 ( loLsExample) */
  LAWMKG_LOLSEXAMPLE: "loLsExample",

} as const;

export type ApiCode = (typeof API_CODES)[keyof typeof API_CODES];
