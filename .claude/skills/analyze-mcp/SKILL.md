---
name: analyze-mcp
description: 국회 API 구조 분석 + MCP 도구 설계 제안
agents: [api-analyst, tool-designer]
---

# Analyze MCP Skill

276개 국회 API 구조를 분석하고 MCP 도구 통합/개선 방안을 제안합니다.

## 트리거

- "API 커버율을 높이려면?"
- "어떤 API를 추가 통합하면 좋을까?"
- "도구 구조를 개선하려면?"
- "새 API가 추가되었는데 어디에 넣을까?"

## 워크플로

1. **현황 분석** (api-analyst)
   - `docs/discovered-all-codes.json`에서 미사용 코드 추출
   - `docs/tool-mapping.md`에서 현재 커버리지 확인
   - 카테고리별 갭 분석

2. **통합 기회 도출** (api-analyst)
   - 기존 도구에 자연스럽게 추가 가능한 API 식별
   - 도메인 엔티티 매핑 (사람/법안/회의/기관)
   - 우선순위 산정 (ROI: 사용 빈도 × 구현 난이도)

3. **도구 설계** (tool-designer)
   - 파라미터 스키마 설계
   - description 작성 (토큰 최적화)
   - Lite/Full 배분 결정
   - 기존 사용자 영향 분석

4. **보고서 작성**
   - `_workspace/analysis-{date}.md`에 저장
   - Plans.md에 태스크 추가 제안

## 출력 형식

```markdown
## API 통합 분석 보고서

### 현재 커버리지
- 등록 코드: X/271
- 전용 도구 통합: Y/271 (Z%)

### 통합 제안 (우선순위순)
| # | API | 코드 | 대상 도구 | 방법 | ROI |
|---|-----|------|----------|------|-----|

### 도구 수 변화
- Lite: 변경 없음 / Full: 변경 없음

### 기존 사용자 영향
- Breaking change 여부
```
