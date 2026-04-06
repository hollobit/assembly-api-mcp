# assembly-api-mcp

대한민국 국회 Open API를 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 서버로 제공합니다.

Claude, ChatGPT 등 AI 도구에서 국회의원, 의안, 일정, 회의록, 위원회, 표결, 청원 등 국회 데이터에 실시간으로 접근할 수 있습니다.

## 주요 기능

- **9개 Lite / 18개 Full 프로필 도구** — 기본 Lite 프로필로 핵심 기능 제공 ([활용 사례 100선](USECASE.md))
- **276개 국회 API 100% 접근** — `discover_apis` + `query_assembly` 범용 도구
- **31개 검증된 API 코드** — 실제 데이터 반환 확인
- **CLI 지원** — 터미널에서 직접 국회 데이터 조회
- **이중 Transport** — stdio (Claude Desktop) + HTTP (원격 서버)
- **인메모리 캐싱** — TTL 기반, 정적/동적 데이터 구분
- **API 모니터링** — 응답 시간 추적, Rate Limit 관리

## 빠른 시작

### 사전 조건

- **Node.js 18 이상** — [nodejs.org](https://nodejs.org)에서 설치
  - macOS: `brew install node` 또는 공식 설치 파일
  - Windows: 공식 설치 파일 또는 `winget install OpenJS.NodeJS.LTS`
  - Linux: `sudo apt install nodejs npm` 또는 [NodeSource](https://github.com/nodesource/distributions)
- **국회 API 키** — [open.assembly.go.kr](https://open.assembly.go.kr)에서 무료 발급 (`sample` 키로 테스트 가능)

### 방법 1: 자동 설치 (권장)

```bash
npx assembly-api-mcp setup
```

대화형 마법사가 API 키 입력 → 프로필 선택 → AI 클라이언트 설정을 자동으로 처리합니다. macOS, Windows, Linux 모두 동일한 명령으로 설치됩니다.

### 방법 2: 수동 설치

> 상세한 가이드는 [QUICK_START.md](QUICK_START.md)를 참조하세요.

```bash
# 1. 설치
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

### HTTP 모드 (원격 클라이언트용)

stdio를 지원하지 않는 클라이언트는 HTTP 모드로 서버를 실행하여 연결할 수 있습니다:

```bash
ASSEMBLY_API_KEY=your-api-key MCP_TRANSPORT=http MCP_PORT=3000 npm start
# → MCP 엔드포인트: http://localhost:3000/mcp
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
| ChatGPT (GPTs) | HTTP | ⚠️ Actions에서 REST 변환 필요 |
| Docker / 원격 서버 | HTTP | ✅ Streamable HTTP |

## MCP 도구 목록

### Lite 프로필 (9개, 기본)

AI가 효율적으로 사용할 수 있도록 핵심 기능을 통합한 프로필입니다.

| 도구 | 설명 |
|------|------|
| `search_members` | 의원 검색 (이름/정당/선거구/위원회, 1건이면 자동 상세) |
| `search_bills` | 의안 검색+상세+상태필터 (계류/처리/최근, bill_id로 상세) |
| `get_schedule` | 국회 일정 조회 (날짜/위원회/키워드) |
| `search_meetings` | 회의록 검색 (본회의/위원회/소위/국감/인사청문회/공청회) |
| `get_votes` | 표결 조회 (전체 본회의 표결 또는 의안별 상세) |
| `analyze_legislator` | 의원 종합분석 (인적+발의+표결 한 번에) |
| `track_legislation` | 주제별 법안 추적 (다중 키워드, 심사이력) |
| `discover_apis` | 276개 API 키워드 검색 |
| `query_assembly` | 범용 API 직접 호출 |

> 활용 예시는 [활용 사례 100선](USECASE.md)을 참조하세요.

### Full 프로필 (18개)

`MCP_PROFILE=full`로 전환하면 Lite 9개 + Full 전용 9개를 사용할 수 있습니다.

#### Lite 도구 (9개) — 위와 동일

#### Full 전용 (9개)

| 도구 | 설명 |
|------|------|
| `get_bill_detail` | 의안 상세 조회 (제안이유, 주요내용) |
| `get_bill_review` | 의안 심사정보 |
| `get_bill_history` | 의안 접수/처리 이력 |
| `get_committees` | 위원회 목록 |
| `search_petitions` | 국민동의청원 검색 |
| `get_legislation_notices` | 입법예고 조회 |
| `search_library` | 국회도서관 자료 검색 |
| `get_budget_analysis` | 예산정책처 분석 자료 |
| `search_research_reports` | 입법조사처 보고서 |

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

## 문서

| 문서 | 설명 |
|------|------|
| [QUICK_START.md](QUICK_START.md) | 5분 안에 시작하는 빠른 설정 가이드 |
| [docs/api-catalog.md](docs/api-catalog.md) | 국회 Open API 276개 전체 목록 (카테고리별 분류) |
| [docs/mcp-api.md](docs/mcp-api.md) | MCP 도구 ↔ 국회 API 코드 매핑 (31개 검증 완료) |
| [docs/discovered-codes.md](docs/discovered-codes.md) | API 코드 발굴 과정 및 검증된 엔드포인트 파라미터 |
| [docs/mcp-design-analysis.md](docs/mcp-design-analysis.md) | MCP 도구 설계 분석 — Lite/Full 프로필 결정 근거 |

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
│   ├── tools/                # MCP 도구 (16개 파일, 23개 도구)
│   │   ├── lite/             # Lite 프로필 도구 (9개)
│   ├── resources/            # MCP 정적 리소스
│   └── prompts/              # MCP 프롬프트 템플릿
├── tests/                    # 단위 테스트 (248개)
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

- [korean-law-mcp](https://github.com/SeoNaRu/korean-law-mcp) — 한국 법률 MCP 서버
- [data-go-mcp-servers](https://github.com/Koomook/data-go-mcp-servers) — 공공데이터 MCP 서버

## 라이선스

MIT License - [LICENSE](LICENSE) 참조
