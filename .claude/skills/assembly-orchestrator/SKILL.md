---
name: assembly-orchestrator
description: 분석→설계→구현 전체 워크플로우 조율 — analyze-mcp + implement-mcp 통합 실행
agents: [api-analyst, tool-designer, mcp-developer]
---

# Assembly Orchestrator Skill

MCP 도구 개선의 전체 워크플로를 조율합니다: 분석 → 설계 → 승인 → 구현 → 검증 → 배포.

## 트리거

- "MCP 도구를 개선해줘"
- "API 커버율을 높여줘"
- "새 API를 통합해줘"
- "도구 구조를 최적화해줘"

## 워크플로

```
Phase 1: 분석 (api-analyst)
  └── 현황 파악 → 갭 분석 → 통합 기회 도출

Phase 2: 설계 (tool-designer)
  └── 파라미터 스키마 → description → Lite/Full 배분

Phase 3: 승인
  └── 사용자에게 설계 제안 → 승인 대기

Phase 4: 구현 (mcp-developer)
  └── 코드 작성 → 빌드 → 테스트

Phase 5: 검증
  └── Eval 실행 → 성능 벤치마크 → 보안 검토

Phase 6: 배포
  └── 문서 동기화 → 커밋 → fly deploy → npm publish
```

## 실행 규칙

- 모든 에이전트는 `model: opus` 사용
- 중간 산출물은 `_workspace/` 디렉토리에 저장
- 각 Phase 완료 후 사용자에게 진행 상황 보고
- Phase 3 (승인)은 반드시 사용자 확인 후 진행
- Breaking change가 있으면 버전업 필수 (기억: feedback_breaking_change)
- 문서 동기화 필수 (기억: feedback_doc_sync)

## 사전 점검

실행 전 반드시 확인:
1. `docs/discovered-all-codes.json` 존재 여부
2. `docs/tool-mapping.md` 최신 여부
3. `npm test` 통과 여부
4. git working tree clean 여부

## 산출물

| Phase | 파일 | 내용 |
|-------|------|------|
| 1 | `_workspace/analysis-{date}.md` | API 분석 보고서 |
| 2 | `_workspace/design-{date}.md` | 도구 설계 제안서 |
| 4 | `_workspace/impl-{date}.md` | 구현 변경 요약 |
| 5 | `.claude/evals/v{ver}-eval.md` | Eval 보고서 |
