---
name: implement-mcp
description: MCP 도구 코드 구현/수정 — analyze-mcp의 설계를 코드로 변환
agents: [mcp-developer]
---

# Implement MCP Skill

승인된 도구 설계를 TypeScript로 구현합니다.

## 트리거

- "이 API를 도구에 추가해줘"
- "설계대로 구현해줘"
- "Tier N 통합 진행해줘"

## 워크플로

1. **설계 확인**
   - `_workspace/design-*.md` 또는 Plans.md에서 구현 대상 확인
   - 변경 파일 목록 파악

2. **구현** (mcp-developer)
   - API 코드 등록 (`src/api/codes.ts`)
   - 도구 파일 수정 (`src/tools/lite/*.ts`, `src/tools/full/*.ts`)
   - Promise.allSettled로 실패 격리
   - Zod 스키마 파라미터 추가

3. **검증**
   - `npx tsc --noEmit` 빌드 확인
   - `npm test` 테스트 통과
   - 기존 사용자 영향 없음 확인

4. **문서 동기화** (중요!)
   - `docs/tool-mapping.md` 매핑 업데이트
   - README.md 수치 반영 (기억: feedback_doc_sync)
   - 버전 변경 시 5곳 동시 업데이트 (기억: feedback_versioning)

5. **커밋 + 배포**
   - conventional commit 형식
   - `fly deploy` (원격 서버)
   - `npm publish` (패키지, 필요 시)

## 체크리스트

- [ ] 빌드 통과
- [ ] 테스트 통과
- [ ] 문서 동기화
- [ ] Breaking change 여부 확인
- [ ] 버전 업데이트 (필요 시)
