# 국회 API MCP 서버 (assembly-api-mcp) Plans.md

작성일: 2026-04-04 | 최종 업데이트: 2026-04-09 (v0.5.0)

---

## 완료된 Phase 요약

| Phase | 내용 | 상태 |
|-------|------|------|
| 1~8, 10~11, 13 | 프로젝트 기반 → 23개 도구 → Docker/CI → 통합 인터페이스 (59/63) | cc:完了 |
| 12 | Lite 프로필 7개 통합 도구 설계+구현 (6/6) | cc:完了 |
| 14 | 설치 편의성: npx setup, Smithery, npm publish (5/5) | cc:完了 |
| 15 | 성능 개선: REST 클라이언트 재사용, LRU, 타임아웃 등 (6/6) | cc:完了 |
| 16 | 문서/코드 정합성: 도구 수 불일치 수정, 버전 동기화 (3/3) | cc:完了 |
| 17 | MCP 성능 11건: Progress, SWR, Dedup, Warm-up, gzip, DNS 등 (10/10) | cc:完了 |
| 18 | Tier 1+2 API 통합 26건: 의원이력, 표결, 예결산, 청원 등 (6/6) | cc:完了 |
| 19 | ALLBILL 의안정보 통합 API: 심사경과 자동 포함 (2/2) | cc:完了 |
| 20 | Tier 3 API 통합 36건: 역대, 국정감시, 영문, 보도자료 등 (6/6) | cc:完了 |
| 21 | Harness Audit: baseline, CHANGES, Plans 축소 (3/3) | cc:完了 |

---

## 블록 태스크 (2건)

| Task | 내용 | 상태 |
|------|------|------|
| 9.2 | 국회도서관 법률통계 API (argos.nanet.go.kr) | blocked (NANET_API_KEY 미발급) |
| 9.3 | 국회예산정책처 통계 시스템 (nabostats.go.kr) | blocked (NABO_API_KEY 미발급) |

---

## Phase 22: 의안 생애주기 완성 — 발의→심사→표결→공포 전체 정보 제공

목표: 의안 1건의 생애주기 전체를 MCP 도구로 완전히 추적할 수 있도록 확장.
현재 부족한 영역: 원문 파일 링크, 회의별 의안/안건, 부록/첨부, 서면질의, 영상회의록.

### 의안 생애주기 맵

```
발의 → 위원회 심사 → 법사위 → 본회의 표결 → 정부이송 → 공포
 │        │            │          │             │         │
 │        │            │          │             │         └─ ALLBILL 공포일/번호
 │        │            │          │             └─ ALLBILL 정부이송일
 │        │            │          └─ VOTE_BY_BILL 표결 상세
 │        │            └─ BILLLWJUDGECONF 법사위 회의
 │        └─ BILLJUDGE + BILLJUDGECONF 심사경과/회의
 └─ BILLINFODETAIL 제안이유 + BILLINFOPPSR 발의자

 [현재 빠진 것]
 └─ LIKMS 원문 HWP/PDF 링크 생성
 └─ VCONFBILLLIST 회의별 의안목록
 └─ VCONFATTAPPENDIXLIST 회의록 부록
 └─ VCONFATTQNALIST 서면질의답변서
 └─ WEBCASTVCONF 영상회의록
```

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 22.1 | LIKMS 원문 링크 생성 — bill_detail에 HWP/PDF 다운로드 URL 자동 포함 | BILLINFODETAIL 응답의 BOOK_ID로 LIKMS FileGate URL 생성, 응답에 `원문_HWP`/`원문_PDF` 포함 | - | cc:完了 |
| 22.2 | 회의별 의안/안건 통합 — assembly_session에 VCONFBILLLIST + VCONFBLLLIST 추가 | conf_id 지정 시 해당 회의의 의안/안건 목록 자동 포함 | - | cc:完了 |
| 22.3 | 회의록 부록/첨부 — assembly_session에 VCONFATTAPPENDIXLIST + VCONFATTQNALIST 추가 | conf_id 지정 시 부록+서면질의 자동 포함 | 22.2 | cc:完了 |
| 22.4 | 영상회의록 링크 — assembly_session에 WEBCASTVCONF 연동 | 회의록 결과에 영상 링크(VOD_LINK_URL) 포함 | - | cc:完了 |
| 22.5 | bill_detail lifecycle 강화 — 전체 생애주기를 1회 호출로 반환 | bill_detail(fields=["lifecycle"])에 원문링크+회의록+부록 모두 포함 | 22.1~22.4 | cc:完了 |

---

## 현재 프로젝트 수치 (v0.5.0)

| 항목 | 수치 |
|------|------|
| MCP 도구 | 6개 (Lite) / 10개 (Full) |
| API 코드 등록 | 277개 (271개 발굴, 98.2%) |
| 전용 도구 통합 | 107개 API (39% 커버율) |
| 전체 국회 API | 276개 (100% 접근: query_assembly) |
| 단위 테스트 | 235개 통과 (12 파일) |
| 소스 코드 | TypeScript, Lite 4 + Full 4 + 공유 2 도구 파일 |
| CLI 커맨드 | 11개 |
| MCP Resource | 5개 |
| MCP Prompt | 3개 |
| 성능 최적화 | SWR, Dedup, Warm-up, gzip, DNS, Progress, Logging |
| 보안 | Session/Inflight/DNS 제한, no-store, Zod 검증 |
