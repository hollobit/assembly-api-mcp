# assembly-api-mcp

대한민국 국회 관련 Open API를 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 서버로 제공합니다.

Claude, Gemini, ChatGPT 등 AI 도구에서 국회의원, 의안, 일정, 회의록, 위원회, 표결, 청원 등 국회 관련 데이터에 실시간으로 접근할 수 있습니다.

***국가 AI 전환(AX)은 AI 챗봇쓴다고 되지 않죠. 국민들의 일상이 AI로 편리해져야 그것이 진정한 네이티브 AI 시대겠죠***

## 업데이트 내역

> **전체 변경사항:** [CHANGELOG](docs/CHANGELOG.md) | **v0.3→v0.4 마이그레이션:** [MIGRATION.md](MIGRATION.md)

### v0.7.0 — 국회예산정책처(NABO) Open API 통합 (2026-04-12)

- [docs/legislative-lifecycle.md](docs/legislative-lifecycle.md) 입법 라이프사이클 완전 가이드 — 입법 전/중/후 데이터 추적 
- **nabo.go.kr 3개 API 통합** — 보고서 자료 검색, 정기간행물, 채용정보
- **get_nabo MCP 도구 추가** (Full 프로필) — `type=report|periodical|recruitments`
- **REST API `/api/nabo` 추가** — Full 프로필에서 HTTP로 NABO 데이터 접근
- **도구 수 변경** — Lite 유지 (6개), Full 10개 → **11개** (+get_nabo)
- **API 소스 3개** —국회 + lawmaking + NABO
- **API 커버 287개** (276개국회 + 8 국민참여입법센터 + 3개 NABO)
- **NABO API Key 발급** — https://www.nabo.go.kr/ko/api/apply.do?key=2509230004

### v0.6.0 — 국민참여입법센터 API 통합 (2026-04-11)

- **279개 API 코드 등록** (271국회 + 8 국민참여입법센터)
- **assembly_org 확장** — `type=lawmaking`으로 입법현황/계획/예고, 행정예고, 법령해석례, 의견제시사례 접근 (14개 엔드포인트)
- **Lite/Full 도구 수 변경 없음** (6/10개 유지, 파라미터 확장만)
- **fast-xml-parser 의존성 추가** — lawmaking API XML 응답 파싱
- **국민참여입법센터 API 사용 시** — [opinion.lawmaking.go.kr](https://opinion.lawmaking.go.kr)에서 OC(정보공개 서비스 신청 ID) 발급 필요

### v0.5.0 — API 커버율 대폭 확장 (2026-04-09)

- **271개 API 코드 일괄 발굴** (98.2%) — 자동 발굴 스크립트로 276개 중 271개 코드 확인
- **107개 API 전용 도구 통합** (39% 커버율) — Tier 1~3 단계적 통합 완료
- **ALLBILL 의안정보 통합 API** — 의안 심사경과(소관위→법사위→본회의→공포) 자동 포함
- **역대 국회 데이터** — `assembly_member(scope="history")`로 역대 의원/선거/의장 13개 API 접근
- **국정감시 확장** — 국정조사/시정연설/인사청문/토론회 회의록 + 결과보고서
- **영문 API 지원** — 4개 도구에 `lang="en"` 파라미터로 영문 데이터 접근
- **보도자료/연구자료 확장** — `assembly_org(type="press")`, `research_data(source="future")`
- **정당 의석수 통계** — `assembly_member(mode="party_stats")`

> 도구 수 변경 없음 (Lite 6개 / Full 10개). 기존 사용자 영향 없음.

### v0.4.0 — 도구 구조 대규모 통합 (Breaking Change)

| v0.3 (이전) | v0.4+ (현재) |
|------------|-------------|
| `search_members` + `analyze_legislator` | **`assembly_member`** |
| `search_bills` + `track_legislation` | **`assembly_bill`** |
| `get_schedule` + `search_meetings` + `get_votes` | **`assembly_session`** |
| `get_committees` + `search_petitions` + `get_legislation_notices` | **`assembly_org`** |
| `get_bill_detail` + `get_bill_review` + `get_bill_history` + `get_bill_proposers` | **`bill_detail`** (Full) |
| `search_library` + `search_research_reports` + `get_budget_analysis` | **`research_data`** (Full) |

자세한 도구 매핑은 [docs/tool-mapping.md](docs/tool-mapping.md)를 참조하세요.

## 주요 기능

- **6개 Lite / 11개 Full 프로필 도구** — 도메인 엔티티 기반 통합 ([활용 사례 100선](USECASE.md))
- **287개 API 접근 (276개국회 + 8 국민참여입법센터 + 3개 NABO)** — `discover_apis` + `query_assembly` 범용 도구
- **279개 API 코드 등록 (271개국회 + 8 국민참여입법센터)** — 107개 전용 도구 통합, 나머지 `query_assembly`로 즉시 호출
- **영문 API 지원** — `lang="en"` 파라미터로 의원/일정/의안/위원회 영문 데이터
- **역대 국회 데이터** — `scope="history"`로 역대 의원/선거/의장 접근
- **ALLBILL 심사경과** — 의안 조회 시 소관위→법사위→본회의→공포 타임라인 자동 포함
- **입법 라이프사이클 완전 추적** — 입법계획/예고(입법 전)→심사/표결(입법 중)→NABO 분석(입법 후) 통합 ([legislative-lifecycle](docs/legislative-lifecycle.md))
- **CLI 지원** — 터미널에서 직접 국회 데이터 조회
- **이중 Transport** — stdio (Claude Desktop) + HTTP (원격 서버)
- **REST API + OpenAPI 스펙** — ChatGPT GPTs Actions 지원 (`/openapi.json`)
- **성능 최적화** — SWR 캐시, DNS 프리워밍, gzip 압축, 예측 프리패치, MCP Progress/Logging

## 빠른 시작

### 사전 조건

- **국회 API 키** — [open.assembly.go.kr](https://open.assembly.go.kr)에서 무료 발급 (`sample` 키로 테스트 가능)
- **국민참여입법센터 API 키(선택)** — [opinion.lawmaking.go.kr](https://opinion.lawmaking.go.kr)에서 정보공개 서비스 신청 후 OC 발급 필요. 미설정 시 해당 API 호출 불가.

### 방법 1: 자동 설치 (로컬, 권장)

Node.js 18 이상이 필요합니다 ([nodejs.org](https://nodejs.org)).

```bash
npx assembly-api-mcp setup
```

대화형 마법사가 API 키 입력 → 프로필 선택 → AI 클라이언트 설정을 자동으로 처리합니다. macOS, Windows, Linux 모두 동일한 명령으로 설치됩니다.

### 방법 2: 원격 서버 (설치 불필요)

설치 없이 URL만으로 바로 사용할 수 있습니다.

**[설정 도우미](https://assembly-api-mcp.fly.dev/)** 페이지에서 API 키를 입력하면 사용 중인 AI 클라이언트에 맞는 설정 코드를 자동으로 생성해 줍니다.

직접 URL을 구성할 수도 있습니다:

```
https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite
```

| 파라미터 | 필수 | 기본값 | 설명 |
|---------|------|--------|------|
| `key` | O | `sample` | 열린국회정보 API 키 |
| `profile` | X | `lite` | `lite` (6개 도구) 또는 `full` (11개 도구) |

> `sample` 키로 최대 10건까지 테스트할 수 있습니다.

### 방법 3: 수동 설치

> 상세한 가이드는 [QUICK_START.md](QUICK_START.md)를 참조하세요.

```bash
# 1. 설치 (Node.js 18 이상 필요)
git clone https://github.com/hollobit/assembly-api-mcp.git
cd assembly-api-mcp
npm install && npm run build

# 2. API 키 설정
cp .env.example .env
# .env 파일에 ASSEMBLY_API_KEY 입력 (발급: https://open.assembly.go.kr)

# 3. 테스트
npx tsx src/cli.ts test
```

## AI 클라이언트 연동

> 상세한 설정 가이드는 [QUICK_START.md](QUICK_START.md)를 참조하세요.

### Claude Desktop (stdio)

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/absolute/path/to/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key-here",
        "MCP_PROFILE": "lite"
      }
    }
  }
}
```

> Claude Desktop을 완전히 종료(트레이 포함)한 후 재시작해야 설정이 적용됩니다.

### Claude Code (CLI)

```bash
claude mcp add assembly-api -- node /absolute/path/to/assembly-api-mcp/dist/index.js
```

또는 프로젝트 루트에 `.mcp.json` 파일을 생성합니다:

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/absolute/path/to/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Gemini CLI

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/absolute/path/to/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### VS Code (GitHub Copilot / Claude Extension)

프로젝트 루트에 `.vscode/mcp.json` 파일을 생성합니다:

```json
{
  "servers": {
    "assembly-api": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor IDE

`~/.cursor/mcp.json` 또는 프로젝트 루트 `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/absolute/path/to/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/absolute/path/to/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### claude.ai (웹) / Claude 모바일

설치 없이 원격 서버 URL을 등록하여 사용합니다. **Pro 이상 플랜** 필요.

1. Settings → Integrations → Add More → Custom MCP server
2. URL: `https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite`

> 자세한 설정 방법은 [QUICK_START.md](QUICK_START.md)를 참조하세요.

### ChatGPT (GPTs Actions)

ChatGPT GPTs에서 OpenAPI Actions로 국회 API를 사용할 수 있습니다.

1. GPT 생성 → Configure → Actions → Create new action
2. **Import from URL**: `https://assembly-api-mcp.fly.dev/openapi.json?profile=full`
3. 각 요청의 `key` 파라미터에 API 키 포함

> REST API를 직접 호출할 수도 있습니다. 엔드포인트 목록은 [QUICK_START.md](QUICK_START.md)를 참조하세요.

### HTTP 모드 (원격 클라이언트용)

stdio를 지원하지 않는 클라이언트는 HTTP 모드로 서버를 실행하여 연결할 수 있습니다:

```bash
ASSEMBLY_API_KEY=your-api-key MCP_TRANSPORT=http MCP_PORT=3000 npm start
# → MCP 엔드포인트: http://localhost:3000/mcp
# → REST API: http://localhost:3000/api/members?key=YOUR_KEY
# → OpenAPI 스펙: http://localhost:3000/openapi.json
# → 상태 확인: http://localhost:3000/health
```

외부에서 접근하려면 ngrok 등 터널링 도구를 사용하세요:

```bash
ngrok http 3000
```

### 연동 지원 현황

| 클라이언트 | Transport | MCP 지원 |
|-----------|-----------|----------|
| Claude Desktop | stdio | ✅ 네이티브 |
| Claude Code (CLI) | stdio | ✅ 네이티브 |
| Gemini CLI | stdio | ✅ 네이티브 |
| VS Code (Copilot/Claude) | stdio | ✅ 네이티브 |
| Cursor | stdio | ✅ 네이티브 |
| Windsurf | stdio | ✅ 네이티브 |
| claude.ai (웹) | HTTP | ✅ Integrations (Pro 이상) |
| Claude 모바일 (iOS/Android) | HTTP | ✅ Integrations (Pro 이상) |
| ChatGPT (GPTs) | HTTP | ✅ OpenAPI Actions (REST API) |
| Docker / 원격 서버 | HTTP | ✅ Streamable HTTP |

## MCP 도구 목록

### Lite 프로필 (6개, 기본)

도메인 엔티티(사람/법안/회의/기관) 기반으로 통합된 프로필입니다.

| 도구 | 설명 |
|------|------|
| `assembly_member` | 의원 검색+분석 (이름 1건이면 자동 상세+발의+표결) |
| `assembly_bill` | 의안 검색+추적+통계 (keywords로 추적, mode=stats로 통계) |
| `assembly_session` | 일정+회의록+표결 (type=schedule/meeting/vote) |
| `assembly_org` | 위원회+청원+입법예고 (type=committee/petition/legislation_notice) |
| `discover_apis` | 276개 API 키워드 검색 |
| `query_assembly` | 범용 API 직접 호출 |

> 활용 예시는 [활용 사례 100선](USECASE.md)을 참조하세요. 도구 매핑 상세는 [docs/tool-mapping.md](docs/tool-mapping.md)를 참조하세요.

### Full 프로필 (11개)

`MCP_PROFILE=full`로 전환하면 Lite 6개 + Full 전용 5개를 사용할 수 있습니다.

#### Lite 도구 (6개) — 위와 동일

#### Full 전용 (5개)

| 도구 | 설명 |
|------|------|
| `bill_detail` | 의안 심층 조회 (상세+심사+이력+제안자+회의 통합) |
| `committee_detail` | 위원회 심층 (현황+위원명단) |
| `petition_detail` | 청원 심층 (목록+상세) |
| `research_data` | 연구자료 통합 (도서관+입법조사처+예산정책처) |
| `get_nabo` | NABO 보고서/정기간행물/채용정보 (nabo.go.kr) |

## CLI 사용법

### 의원 검색

```bash
# 전체 의원 목록 (기본 20명)
npx tsx src/cli.ts members

# 이름으로 검색
npx tsx src/cli.ts members --name 이재명

# 정당별 검색
npx tsx src/cli.ts members --party 더불어민주당
npx tsx src/cli.ts members --party 국민의힘

# 선거구별 검색
npx tsx src/cli.ts members --district 서울

# 결과 수 조절
npx tsx src/cli.ts members --party 더불어민주당 --size 50
```

### 의원 의정활동

```bash
# 의원별 인적사항 + 발의 법안 조회
npx tsx src/cli.ts activity --name 박주민
npx tsx src/cli.ts activity --name 이해민

# 조회 건수 조절
npx tsx src/cli.ts activity --name 한동훈 --size 5
```

### 의안 검색

```bash
# 의안명 키워드 검색
npx tsx src/cli.ts bills --name AI
npx tsx src/cli.ts bills --name 부동산
npx tsx src/cli.ts bills --name 교육

# 의안번호로 검색
npx tsx src/cli.ts bills --bill-no 2204567

# 제안자로 검색
npx tsx src/cli.ts bills --proposer 안철수

# 특정 대수 의안 검색 (기본: 22대)
npx tsx src/cli.ts bills --name 환경 --age 21

# 결과 수 조절
npx tsx src/cli.ts bills --name 의료 --size 50
```

### 의안 상세

```bash
# BILL_ID로 의안 상세 조회 (bills 검색 결과에서 BILL_ID 확인)
npx tsx src/cli.ts bill-detail <BILL_ID>
```

### 표결 / 계류 / 처리 / 최근 의안

```bash
# 의안별 표결 현황
npx tsx src/cli.ts votes
npx tsx src/cli.ts votes --size 50

# 계류 중인 의안
npx tsx src/cli.ts pending
npx tsx src/cli.ts pending --size 10

# 처리된 의안
npx tsx src/cli.ts processed
npx tsx src/cli.ts processed --age 21

# 최근 본회의 처리 의안
npx tsx src/cli.ts recent

# 본회의 부의안건
npx tsx src/cli.ts plenary
```

### API 탐색 및 테스트

```bash
# 열린국회정보 전체 API 목록 (276개)
npx tsx src/cli.ts meta

# 전체 API 작동 테스트 (11개 핵심 API 점검)
npx tsx src/cli.ts test

# 도움말
npx tsx src/cli.ts help
```

### 국민참여입법센터 API (lawmaking.go.kr)

> `.env`에 `LAWMKING_OC=<발급받은OC>` 설정 필요

```bash
# 입법현황 목록
npx tsx src/cli.ts lawmaking --type status

# 입법계획 목록 (키워드 검색)
npx tsx src/cli.ts lawmaking --type plan --key 교육

# 입법예고 목록 (진행중)
npx tsx src/cli.ts lawmaking --type notice

# 행정예고 목록
npx tsx src/cli.ts lawmaking --type admin

# 법령해석례 검색
npx tsx src/cli.ts lawmaking --type interpretation --key 자동차

# 의견제시사례 목록
npx tsx src/cli.ts lawmaking --type opinion
```

### 국회예산정책처 NABO API (nabo.go.kr)

> `.env`에 `NABO_API_KEY=<발급받은키>` 설정 필요

```bash
# 보고서 자료 검색 (기본)
npx tsx src/cli.ts nabo --type report

# 키워드 검색
npx tsx src/cli.ts nabo --type report --key 예산

# 정기간행물 조회
npx tsx src/cli.ts nabo --type periodical
npx tsx src/cli.ts nabo --type periodical --key 경제

# 채용정보 조회
npx tsx src/cli.ts nabo --type recruitments

# 페이지네이션
npx tsx src/cli.ts nabo --type report --page 2 --size 20
```

### 교차 검색 (2~3개 API 소스 통합)

`cross` 명령어로 국회(open.assembly.go.kr) + 국민참여입법센터(lawmaking.go.kr) + NABO(nabo.go.kr)를 동시에 검색합니다.

```bash
# 2개 소스:국회 + NABO (예: "교육" 관련 의안과 예산 분석보고서 동시 검색)
npx tsx src/cli.ts cross --keyword 교육 --sources assembly,nabo

# 2개 소스: 국민참여입법센터 + NABO (예: "교통" 관련 입법예고와 NABO 보고서 동시 검색)
npx tsx src/cli.ts cross --keyword 교통 --sources lawmaking,nabo

# 3개 소스:국회 + 국민참여입법센터 + NABO (예: "의료" 관련 입법 전/중/후 데이터 통합 검색)
npx tsx src/cli.ts cross --keyword 의료 --sources assembly,lawmaking,nabo

# 전체 소스 (기본값, --sources all)
npx tsx src/cli.ts cross --keyword 예산 --sources all --size 10
```

**출력 예시 (`--sources assembly,lawmaking,nabo`):**
```
=== "교육" 교차 검색 (국회, 국민참여입법센터, NABO) ===

[국회(assembly)] 의안 검색 (총 N건)
BILL_NO  | BILL_NAME               | COMMITTEE  | PROC_RESULT
---------|-------------------------|------------|------------
2201234  | 교육기본법 일부개정법률안 | 교육위원회  | 계류

[국민참여입법센터(lawmaking)] 입법예고 (총 N건)
법령명         | 소관부처 | 공고일자
--------------|----------|----------
교육기본법     |교육부    | 2026.03.01

[NABO(nabo.go.kr)] NABO 보고서 (총 N건)
제목                      | 작성부서 | 게시일
--------------------------|----------|--------
2026 교육예산 분석보고서   | NABO     | 2026.03.15
```

**소스 조합 가이드:**

| 조합 | 용도 | 설명 |
|------|------|------|
| `assembly,nabo` | 입법 중 + 입법 후 | 의안 심사경과 + NABO 예산 분석 |
| `lawmaking,nabo` | 입법 전 + 입법 후 | 입법예고 + NABO 정책보고서 |
| `assembly,lawmaking` | 입법 전 + 입법 중 | 입법예고 + 실제 의안 검색 |
| `all` (기본) | 입법 전/중/후 전체 | 입법 라이프사이클 완전 추적 |

> `cross` 명령어는 각 소스를 병렬로 호출하므로 1개 소스 장애 시에도 다른 소스 결과는 정상 반환됩니다.

## 문서

| 문서 | 설명 |
|------|------|
| [QUICK_START.md](QUICK_START.md) | 5분 안에 시작하는 빠른 설정 가이드 |
| [docs/api-catalog.md](docs/api-catalog.md) | 국회 Open API 276개 전체 목록 (카테고리별 분류) |
| [docs/mcp-api.md](docs/mcp-api.md) | MCP 도구 ↔ 국회 API 코드 매핑 (271개 발굴, 107개 통합) |
| [docs/discovered-codes.md](docs/discovered-codes.md) | API 코드 발굴 과정 및 검증된 엔드포인트 파라미터 |
| [docs/mcp-design-analysis.md](docs/mcp-design-analysis.md) | MCP 도구 설계 분석 — Lite/Full 프로필 결정 근거 |
| [docs/legislative-lifecycle.md](docs/legislative-lifecycle.md) | 입법 라이프사이클 완전 가이드 — 입법 전/중/후 데이터 추적 |

## 문제 해결

### Claude Desktop에서 "server disconnected" 오류

프로젝트의 `.env` 파일에 `MCP_TRANSPORT=http`이 설정되어 있으면, Claude Desktop이 기대하는 stdio 모드 대신 HTTP 모드로 서버가 시작됩니다. 클라이언트 설정에서 `MCP_TRANSPORT`를 명시적으로 override하세요:

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/absolute/path/to/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "your-api-key",
        "MCP_TRANSPORT": "stdio",
        "MCP_PROFILE": "lite"
      }
    }
  }
}
```

> `.env` 파일의 `MCP_TRANSPORT` 값은 서버가 `dotenv`로 자동 로드합니다. 클라이언트 설정의 `env`에서 같은 변수를 지정하면 `.env`보다 우선 적용됩니다.

### Claude Desktop에서 도구가 보이지 않음

Claude Desktop을 **완전히 종료** (macOS: Cmd+Q, 트레이 아이콘까지 닫기) 후 재시작하세요. 설정 파일 변경은 재시작 후에만 적용됩니다.

### "ASSEMBLY_API_KEY가 설정되지 않았습니다"

`.env` 파일에 키를 입력했는지 확인하세요. Claude Desktop 등 외부 클라이언트에서 실행할 때는 클라이언트 설정의 `env`에도 키를 지정해야 합니다.

### API 호출이 0건 반환

일부 API는 `AGE` 파라미터가 필요합니다. 도구들은 자동으로 22대(현재)를 기본값으로 사용합니다.

### Rate Limit 초과

개발계정은 월 10,000건 제한입니다. `npx tsx src/cli.ts test`로 현재 상태를 확인하세요.

### 포트 충돌 (HTTP 모드)

HTTP 모드에서 `EADDRINUSE` 오류가 발생하면 해당 포트를 사용 중인 프로세스를 확인하세요:

```bash
lsof -i :3000
# 다른 포트로 변경
MCP_PORT=3001 npm start
```

## 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `ASSEMBLY_API_KEY` | O | - | 열린국회정보 API 키 |
| `DATA_GO_KR_SERVICE_KEY` | X | - | 공공데이터포털 ServiceKey |
| `NANET_API_KEY` | X | - | 국회도서관 API 키 |
| `NABO_API_KEY` | X | - | 국회예산정책처 API 키 |
| `LAWMKING_OC` | X | - | 국민참여입법센터 OC (정보공개 서비스 신청 ID) |
| `MCP_PROFILE` | X | `lite` | `lite` 또는 `full` |
| `MCP_TRANSPORT` | X | `stdio` | `stdio` 또는 `http` |
| `MCP_PORT` | X | `3000` | HTTP 모드 포트 |
| `LOG_LEVEL` | X | `info` | 로그 레벨 |
| `CACHE_ENABLED` | X | `true` | 캐시 활성화 |

## API 키 발급

1. [열린국회정보](https://open.assembly.go.kr) 접속
2. 회원가입 (무료)
3. 로그인 후 마이페이지 > OPEN API > 인증키 발급
4. 발급받은 키를 `.env` 파일의 `ASSEMBLY_API_KEY`에 입력

> `sample` 키로 최대 10건까지 테스트할 수 있습니다.

### 국민참여입법센터 API 키 발급

1. [opinion.lawmaking.go.kr](https://opinion.lawmaking.go.kr) 접속
2. 정보공개 서비스 신청 (무료)
3. 신청 승인 후 OC(Organization Code) 확인 — `@` 앞부분이 OC입니다
4. `.env` 파일에 `LAWMKING_OC=<OC값>`으로 입력

## 프로젝트 구조

```
assembly-api/
├── src/
│   ├── index.ts              # MCP 서버 진입점
│   ├── server.ts             # McpServer 초기화 (stdio/HTTP)
│   ├── config.ts             # 환경 변수 설정
│   ├── cli.ts                # CLI 인터페이스
│   ├── api/
│   │   ├── client.ts         # HTTP 클라이언트 (캐싱/모니터링 통합)
│   │   ├── cache.ts          # 인메모리 TTL 캐시 (LRU)
│   │   ├── codes.ts          # 검증된 API 코드 매핑
│   │   ├── monitor.ts        # API 응답 시간 모니터링
│   │   └── rate-limiter.ts   # Rate Limit 추적
│   ├── tools/                # MCP 도구 (Lite 6개 / Full 11개)
│   │   ├── lite/             # Lite 프로필 도구 (6개)
│   ├── openapi/              # OpenAPI REST 브릿지
│   │   ├── router.ts         # REST 라우터 (/api/*)
│   │   ├── handlers.ts       # REST 핸들러 (18개 엔드포인트)
│   │   └── spec.ts           # OpenAPI 3.1 스펙 생성
│   ├── resources/            # MCP 정적 리소스
│   └── prompts/              # MCP 프롬프트 템플릿
├── tests/                    # 단위 테스트 (235개)
├── examples/
│   └── api-tester.html       # 브라우저 API 테스터
├── docs/
│   ├── api-catalog.md        # 국회 API 276개 전체 목록
│   ├── mcp-api.md            # MCP 도구 ↔ API 매핑
│   ├── discovered-codes.md   # 발굴된 API 코드
│   └── mcp-design-analysis.md # MCP 도구 설계 분석
├── .env.example              # 환경 변수 템플릿
├── Dockerfile                # Docker 이미지
├── docker-compose.yml        # Docker Compose
└── QUICK_START.md            # 빠른 시작 가이드
```

## 개발

```bash
npm run build      # TypeScript 빌드
npm test           # 테스트 실행
npm run dev        # 개발 모드 (tsx)
npm run cli        # CLI 실행
npm run lint       # 타입 체크 (tsc --noEmit)
```

## Docker

```bash
docker compose up -d
# HTTP 모드로 포트 3000에서 실행
# Health check: curl localhost:3000/health
```

## 참고 프로젝트

- [korean-law-mcp](https://github.com/chrisryugj/korean-law-mcp) — 한국 법률 MCP 서버
- [data-go-mcp-servers](https://github.com/Koomook/data-go-mcp-servers) — 공공데이터 MCP 서버

## Star history

[![Star History Chart](https://starchart.cc/hollobit/assembly-api-mcp.svg)](https://starchart.cc/hollobit/assembly-api-mcp)

## 라이선스

MIT License - [LICENSE](LICENSE) 참조

Jonghong Jeon (hollobit@etri.re.kr)
