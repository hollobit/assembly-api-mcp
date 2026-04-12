# Migration Guide: v0.3 → v0.4+

v0.4.0에서 도구 이름이 전면 변경되었습니다. v0.3에서 사용하던 도구 이름을 새 이름으로 대체해야 합니다.

## 도구 이름 변경对照表

| v0.3 (旧) | v0.4+ (新) | 비고 |
|-----------|-----------|------|
| `search_members` | `assembly_member` | 검색 + 분석 통합 |
| `analyze_legislator` | `assembly_member` | 통합됨 |
| `search_bills` | `assembly_bill` | 검색 + 추적 통합 |
| `track_legislation` | `assembly_bill` | 통합됨 (keywords 파라미터) |
| `get_schedule` | `assembly_session` | type="schedule" |
| `search_meetings` | `assembly_session` | type="meeting" 통합 |
| `get_votes` | `assembly_session` | type="vote" 통합 |
| `get_committees` | `assembly_org` | type="committee" |
| `search_petitions` | `assembly_org` | type="petition" 통합 |
| `get_legislation_notices` | `assembly_org` | type="legislation_notice" 통합 |
| `get_bill_detail` | `bill_detail` | (Full 프로필) |
| `get_bill_review` | `bill_detail` | (Full 프로필, 통합됨) |
| `get_bill_history` | `bill_detail` | (Full 프로필, 통합됨) |
| `get_bill_proposers` | `bill_detail` | (Full 프로필, 통합됨) |
| `search_library` | `research_data` | (Full 프로필) |
| `search_research_reports` | `research_data` | (Full 프로필, 통합됨) |
| `get_budget_analysis` | `research_data` | (Full 프로필, 통합됨) |

## 예시: v0.3 → v0.4+ 마이그레이션

### Before (v0.3)

```json
{
  "name": "search_members",
  "arguments": { "name": "이재명" }
}
```

### After (v0.4+)

```json
{
  "name": "assembly_member",
  "arguments": { "name": "이재명" }
}
```

## Lite 프로필 기본값 변경

Lite 프로필의 기본값이 변경되었습니다:

| 파라미터 | v0.3 | v0.4+ | 비고 |
|---------|------|-------|------|
| 기본 프로필 | 없음 | `lite` | Lite/Full 명시적 선택 |
| age 기본값 | 21 | 22 | 현재 대수 기본 |

## 파라미터 변경

| 도구 | 파라미터 변경 |
|------|------------|
| `assembly_bill` | `status` 파라미터 추가 (`pending`/`processed`/`recent`) |
| `assembly_session` | `type` 파라미터로 schedule/meeting/vote 전환 |
| `assembly_org` | `type` 파라미터로 committee/petition/legislation_notice 전환 |

## 새 프로필 시스템

v0.4+에서는 Lite/Full 두 가지 프로필이 있습니다:

### Lite (기본, 6개 도구)

```bash
MCP_PROFILE=lite npx assembly-api-mcp
```

| 도구 | 역할 |
|------|------|
| `assembly_member` | 의원 검색 + 분석 |
| `assembly_bill` | 의안 검색 + 추적 |
| `assembly_session` | 일정 + 회의록 + 표결 |
| `assembly_org` | 위원회 + 청원 + 입법예고 |
| `discover_apis` | 276개 API 탐색 |
| `query_assembly` | 범용 API 호출 |

### Full (11개 도구)

```bash
MCP_PROFILE=full npx assembly-api-mcp
```

Lite 6개 + Full 전용 5개:

| 도구 | 역할 |
|------|------|
| `bill_detail` | 의안 심층 조회 |
| `committee_detail` | 위원회 심층 |
| `petition_detail` | 청원 심층 |
| `research_data` | 연구자료 통합 |
| `get_nabo` | NABO 보고서/정기간행물 |

## 자동 검증

마이그레이션 후 다음 명령으로 동작을 확인할 수 있습니다:

```bash
npm test
npx tsx src/cli.ts test
npx tsx src/cli.ts members --name 이임장
```

## 도움이 필요한 경우

문제가 있으면 [GitHub Issues](https://github.com/hollobit/assembly-api-mcp/issues/new/choose)에報告してください。
