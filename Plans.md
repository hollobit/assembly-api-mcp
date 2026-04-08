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
