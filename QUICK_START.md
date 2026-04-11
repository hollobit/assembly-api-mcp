# 빠른 시작 가이드

5분 안에 국회 API MCP 서버를 사용하는 방법입니다.

---

## 사전 조건

- **국회 API 키** — [open.assembly.go.kr](https://open.assembly.go.kr)에서 무료 발급 (`sample` 키로 테스트 가능)

---

## 원격 서버 (설치 불필요, 가장 빠른 방법)

아무것도 설치하지 않고 URL만 등록하면 바로 사용할 수 있습니다.

### 설정 도우미로 시작하기 (권장)

**[https://assembly-api-mcp.fly.dev/](https://assembly-api-mcp.fly.dev/)** 에 접속하여 API 키를 입력하면, 사용 중인 AI 클라이언트에 맞는 설정 코드를 자동으로 생성해 줍니다. 복사해서 붙여넣기만 하면 됩니다.

- claude.ai, Claude Desktop, Claude Code, Cursor, VS Code, Gemini CLI, ChatGPT GPTs 지원
- `sample` 키로 먼저 체험해 볼 수 있습니다

### 직접 URL 구성하기

설정 도우미를 사용하지 않고 직접 URL을 구성할 수도 있습니다:

```
https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite
```

| 파라미터 | 필수 | 기본값 | 설명 |
|---------|------|--------|------|
| `key` | O | `sample` | 열린국회정보 API 키 |
| `profile` | X | `lite` | `lite` (6개 도구) 또는 `full` (11개 도구) |

> `sample` 키로 최대 10건까지 테스트할 수 있습니다. 설정 후 Claude Desktop을 완전 종료(Cmd+Q) 후 재시작하세요.

원격 서버만으로 충분하다면 아래의 로컬 설치 단계는 건너뛰어도 됩니다.

---

## claude.ai (웹)에서 사용하기

설치 없이 브라우저에서 바로 사용할 수 있습니다. **Pro 이상 플랜**이 필요합니다.

> **[설정 도우미](https://assembly-api-mcp.fly.dev/)**에서 "claude.ai" 탭을 선택하면 URL을 자동 생성해 줍니다.

1. [claude.ai](https://claude.ai) 접속 → 로그인
2. 좌측 하단 **프로필 아이콘** → **Settings** (설정)
3. **Integrations** 탭 → **Add More** 클릭
4. **Custom MCP server** 선택
5. 이름: `국회 API` (원하는 이름)
6. URL 입력:

```
https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite
```

7. **Save** 후 새 대화에서 바로 질문

> 도구가 처음 호출될 때 **"Allow"** (허용) 버튼을 눌러야 합니다.

---

## Claude 모바일 앱 (iOS / Android)에서 사용하기

모바일 앱에서도 원격 MCP 서버를 연결할 수 있습니다. **Pro 이상 플랜**이 필요합니다.

> **[설정 도우미](https://assembly-api-mcp.fly.dev/)**에서 URL을 미리 복사해 두면 편리합니다.

1. Claude 앱 실행 → **설정** (⚙️)
2. **Integrations** (통합) 메뉴 진입
3. **Add Integration** → **Custom MCP server**
4. URL 입력:

```
https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite
```

5. 저장 후 새 대화에서 바로 질문

> 모바일에서는 로컬 서버(stdio)를 실행할 수 없으므로, 반드시 원격 서버 URL 방식을 사용해야 합니다.

---

## ChatGPT (GPTs)에서 사용하기

ChatGPT GPTs의 **Actions** 기능으로 국회 API를 사용할 수 있습니다. ChatGPT Plus 이상 플랜이 필요합니다.

> **[설정 도우미](https://assembly-api-mcp.fly.dev/)**에서 "ChatGPT GPTs" 탭을 선택하면 Import URL을 자동 생성해 줍니다.

### GPT 생성 시 Actions 설정

1. [ChatGPT](https://chat.openai.com) → **Explore GPTs** → **Create**
2. **Configure** 탭 → **Actions** → **Create new action**
3. **Import from URL** 클릭 후 아래 URL 입력:

```
https://assembly-api-mcp.fly.dev/openapi.json?profile=full
```

4. **Authentication** 설정:
   - Type: **API Key**
   - Auth Type: **Custom**
   - Custom Header Name: 비워두기 (쿼리 파라미터 방식)
   - 또는 각 요청의 `key` 파라미터에 API 키를 직접 포함

5. **Privacy policy URL** 입력 후 저장

> Lite 프로필만 사용하려면 URL에서 `profile=full`을 `profile=lite`로 변경하세요.

### REST API 직접 호출 (개발자용)

GPTs 외에도 REST API를 직접 호출할 수 있습니다:

```bash
# 의원 검색
curl "https://assembly-api-mcp.fly.dev/api/members?name=이해민&key=YOUR_API_KEY"

# 의안 검색
curl "https://assembly-api-mcp.fly.dev/api/bills?bill_name=교육&key=YOUR_API_KEY"

# OpenAPI 스펙 확인
curl "https://assembly-api-mcp.fly.dev/openapi.json?profile=full"
```

### REST API 엔드포인트 목록

| 엔드포인트 | 설명 | 프로필 |
|-----------|------|--------|
| `GET /api/members` | 국회의원 검색 | Lite |
| `GET /api/bills` | 의안 검색 | Lite |
| `GET /api/schedule` | 국회 일정 | Lite |
| `GET /api/meetings` | 회의록 검색 | Lite |
| `GET /api/votes` | 표결 결과 | Lite |
| `GET /api/legislators/{name}/analysis` | 의원 종합분석 | Lite |
| `GET /api/legislation/track` | 법안 추적 | Lite |
| `GET /api/discover` | API 탐색 | Lite |
| `GET /api/query/{api_code}` | 범용 API 호출 | Lite |
| `GET /api/bills/{bill_id}` | 의안 상세 | Full |
| `GET /api/bills/review` | 의안 심사정보 | Full |
| `GET /api/bills/history` | 의안 이력 | Full |
| `GET /api/committees` | 위원회 목록 | Full |
| `GET /api/petitions` | 청원 검색 | Full |
| `GET /api/legislation/notices` | 입법예고 | Full |
| `GET /api/library` | 국회도서관 검색 | Full |
| `GET /api/budget` | 예산분석 자료 | Full |
| `GET /api/research` | 입법조사 보고서 | Full |
| `GET /openapi.json` | OpenAPI 스펙 | - |

---

## 자동 설치 (로컬 실행)

Node.js 18 이상이 필요합니다 ([nodejs.org](https://nodejs.org)).

```bash
npx assembly-api-mcp setup
```

대화형 마법사가 API 키 입력 → 프로필 선택 → AI 클라이언트 설정을 한 번에 처리합니다. 아래의 수동 설치 단계를 건너뛸 수 있습니다.

---

## 수동 설치

Node.js 18 이상이 필요합니다 ([nodejs.org](https://nodejs.org)).

### 1단계: API 키 발급 (2분)

1. [열린국회정보](https://open.assembly.go.kr) 접속
2. **회원가입** (무료, 즉시 완료)
3. 로그인 → **마이페이지** → **OPEN API** → **인증키 발급**
4. 발급된 32자리 키를 복사

> 키 발급 전에도 `sample` 키로 테스트할 수 있습니다 (최대 10건).

---

## 2단계: 설치 및 설정 (2분)

```bash
# 프로젝트 클론
git clone https://github.com/hollobit/assembly-api-mcp.git
cd assembly-api-mcp

# 의존성 설치 및 빌드
npm install
npm run build

# 환경 변수 설정
cp .env.example .env
```

`.env` 파일을 열어 API 키를 입력합니다:

```env
ASSEMBLY_API_KEY=여기에_발급받은_키_입력
```

---

## 3단계: 동작 확인 (1분)

```bash
# API 작동 테스트
npx tsx src/cli.ts test
```

정상이면 이렇게 출력됩니다:

```
=== 전체 API 작동 테스트 ===

✓ 의원 인적사항              295건
✓ 의원 발의법률안           16477건
✓ 의안 통합검색            17626건
✓ 의안 접수목록           118682건
...
결과: 11/11 API 정상 작동
```

---

## 4단계: AI 클라이언트 연동

### Claude Desktop

#### macOS

설정 파일 위치: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/git/assembly-api-mcp/dist/index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
      }
    }
  }
}
```

#### Windows

설정 파일 위치: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "assembly-api": {
      "command": "node",
      "args": ["C:\\Users\\YOUR_USERNAME\\git\\assembly-api-mcp\\dist\\index.js"],
      "env": {
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
      }
    }
  }
}
```

#### 적용

1. `args`의 경로를 실제 설치 경로로 수정
2. `ASSEMBLY_API_KEY`에 발급받은 키 입력
3. **Claude Desktop 완전 종료** (트레이 아이콘까지 닫기)
4. Claude Desktop 재시작

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
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
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
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
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
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
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
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
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
        "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력"
      }
    }
  }
}
```

### 연동 지원 현황

| 클라이언트 | Transport | MCP 지원 |
|-----------|-----------|----------|
| claude.ai (웹) | HTTP | ✅ Integrations (Pro 이상) |
| Claude 모바일 (iOS/Android) | HTTP | ✅ Integrations (Pro 이상) |
| Claude Desktop | stdio / HTTP | ✅ 네이티브 |
| Claude Code (CLI) | stdio | ✅ 네이티브 |
| Gemini CLI | stdio | ✅ 네이티브 |
| VS Code (Copilot/Claude) | stdio | ✅ 네이티브 |
| Cursor | stdio | ✅ 네이티브 |
| Windsurf | stdio | ✅ 네이티브 |
| ChatGPT (GPTs) | HTTP | ✅ OpenAPI Actions (REST API) |
| Docker / 원격 서버 | HTTP | ✅ Streamable HTTP |

---

## 5단계: 사용해 보기

### AI 클라이언트에서

연동한 AI에게 다음과 같이 질문하면 됩니다:

- "현재 국회의원 목록을 보여줘"
- "교육 관련 의안을 검색해줘"
- "이해민 의원의 의정활동을 분석해줘"
- "최근 본회의에서 처리된 법안은?"
- "제22대 국회 위원회 목록을 알려줘"
- "현재 계류 중인 청원 목록을 보여줘"

> Lite 프로필(기본)에서는 6개 통합 도구가 사용됩니다.

### CLI에서

```bash
# 의원 검색
npx tsx src/cli.ts members --party 국민의힘 --size 5

# 의안 검색
npx tsx src/cli.ts bills --name 부동산

# 의원 의정활동
npx tsx src/cli.ts activity --name 이해민

# 계류의안
npx tsx src/cli.ts pending --size 10

# 전체 API 목록 (276개)
npx tsx src/cli.ts meta
```

### HTTP 서버 모드

```bash
# .env에서 MCP_TRANSPORT=http 설정 후
npm start
# → http://localhost:3000/mcp 에서 MCP 프로토콜 접근
# → http://localhost:3000/health 에서 상태 확인
```

### 브라우저 테스터

```bash
open examples/api-tester.html
# 브라우저에서 API를 직접 테스트할 수 있습니다
```

---

## 문제 해결

### Claude Desktop에서 "server disconnected" 오류

프로젝트의 `.env` 파일에 `MCP_TRANSPORT=http`이 설정되어 있으면, Claude Desktop이 기대하는 stdio 모드 대신 HTTP 모드로 서버가 시작됩니다. 클라이언트 설정에서 `MCP_TRANSPORT`를 명시적으로 override하세요:

```json
"env": {
  "ASSEMBLY_API_KEY": "여기에_발급받은_키_입력",
  "MCP_TRANSPORT": "stdio",
  "MCP_PROFILE": "lite"
}
```

> `.env` 파일의 값은 서버가 `dotenv`로 자동 로드합니다. 클라이언트 설정의 `env`에서 같은 변수를 지정하면 `.env`보다 우선 적용됩니다.

### Claude Desktop에서 도구가 보이지 않음

→ Claude Desktop을 **완전히 종료** (macOS: Cmd+Q, 트레이 아이콘도 닫기) 후 재시작하세요. 설정 파일 변경은 재시작 후에만 적용됩니다.

### "ASSEMBLY_API_KEY가 설정되지 않았습니다"

→ `.env` 파일에 키를 입력했는지 확인하세요. Claude Desktop 등 외부 클라이언트에서 실행할 때는 클라이언트 설정의 `env`에도 키를 지정해야 합니다.

### API 호출이 0건 반환

→ 일부 API는 `AGE` 파라미터가 필요합니다. 도구들은 자동으로 22대(현재)를 기본값으로 사용합니다.

### Rate Limit 초과

→ 개발계정은 월 10,000건 제한입니다. `npx tsx src/cli.ts test`로 현재 상태를 확인하세요.

### 포트 충돌 (HTTP 모드)

→ `EADDRINUSE` 오류가 발생하면 해당 포트를 사용 중인 프로세스를 확인하세요:

```bash
lsof -i :3000
# 다른 포트로 변경
MCP_PORT=3001 npm start
```

---

## 다음 단계

- [README.md](README.md) — 전체 프로젝트 설명, Lite(6개)/Full(11개) 도구 목록
- [docs/api-catalog.md](docs/api-catalog.md) — 국회 API 276개 전체 목록
- [docs/mcp-api.md](docs/mcp-api.md) — MCP 도구 ↔ API 매핑 상세
- [docs/discovered-codes.md](docs/discovered-codes.md) — 발굴된 API 코드 및 파라미터
- [docs/mcp-design-analysis.md](docs/mcp-design-analysis.md) — MCP 도구 설계 분석 보고서
