## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
- MCP 도구 개선, API 통합, 도구 구조 분석 → invoke assembly-orchestrator
- API 커버율 분석 → invoke analyze-mcp
- 도구 코드 구현/수정 → invoke implement-mcp

---

## 하네스: 국회 MCP 서버 개선

**목표:** assembly-api-mcp의 276개 API → MCP 도구 래핑 구조를 분석·최적화하고, 승인된 개선안을 구현한다

**에이전트 팀:**

| 에이전트 | 역할 | 파일 |
|---------|------|------|
| api-analyst | 276개 API 구조 분석, 중복/연관 파악, 통합 기회 도출 | `.claude/agents/api-analyst.md` |
| tool-designer | MCP 도구 인터페이스 UX 분석, 토큰 효율 최적화, AI 클라이언트 관점 설계 | `.claude/agents/tool-designer.md` |
| mcp-developer | 승인된 개선안 TypeScript 구현, 테스트 작성 | `.claude/agents/mcp-developer.md` |

**스킬:**

| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| analyze-mcp | API 구조 분석 + 도구 설계 제안 | api-analyst, tool-designer |
| implement-mcp | 도구 코드 구현/수정 | mcp-developer |
| assembly-orchestrator | 분석→설계→구현 전체 워크플로우 조율 | 전체 |

**실행 규칙:**
- MCP 도구 개선, API 래핑 최적화, 도구 구조 분석 관련 작업 시 `assembly-orchestrator` 스킬을 통해 에이전트로 처리
- 단순 버그 수정, 코드 질문, 설정 변경은 에이전트 없이 직접 응답
- 모든 에이전트는 `model: opus` 사용
- 중간 산출물: `_workspace/` 디렉토리
