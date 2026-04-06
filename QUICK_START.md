# 빠른 시작 가이드

5분 안에 국회 API MCP 서버를 사용하는 방법입니다.

---

## 사전 조건

- **국회 API 키** — [open.assembly.go.kr](https://open.assembly.go.kr)에서 무료 발급 (`sample` 키로 테스트 가능)

---

## 원격 서버 (설치 불필요, 가장 빠른 방법)

아무것도 설치하지 않고 URL만 등록하면 바로 사용할 수 있습니다.

AI 클라이언트 설정에 아래 URL을 추가하세요:

```
https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite
```

Claude Desktop 설정 예시 (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "assembly-api": {
      "url": "https://assembly-api-mcp.fly.dev/mcp?key=YOUR_API_KEY&profile=lite"
    }
  }
}
```

| 파라미터 | 필수 | 기본값 | 설명 |
|---------|------|--------|------|
| `key` | O | `sample` | 열린국회정보 API 키 |
| `profile` | X | `lite` | `lite` (9개 도구) 또는 `full` (18개 도구) |

> `sample` 키로 최대 10건까지 테스트할 수 있습니다. 설정 후 Claude Desktop을 완전 종료(Cmd+Q) 후 재시작하세요.

원격 서버만으로 충분하다면 아래 단계는 건너뛰어도 됩니다.

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
| Claude Desktop | stdio | ✅ 네이티브 |
| Claude Code (CLI) | stdio | ✅ 네이티브 |
| Gemini CLI | stdio | ✅ 네이티브 |
| VS Code (Copilot/Claude) | stdio | ✅ 네이티브 |
| Cursor | stdio | ✅ 네이티브 |
| Windsurf | stdio | ✅ 네이티브 |
| ChatGPT (GPTs) | HTTP | ⚠️ Actions에서 REST 변환 필요 |
| Docker / 원격 서버 | HTTP | ✅ Streamable HTTP |

---

## 5단계: 사용해 보기

### AI 클라이언트에서

연동한 AI에게 다음과 같이 질문하면 됩니다:

- "현재 국회의원 목록을 보여줘"
- "교육 관련 의안을 검색해줘"
- "고민정 의원의 의정활동을 분석해줘"
- "최근 본회의에서 처리된 법안은?"
- "제22대 국회 위원회 목록을 알려줘"
- "현재 계류 중인 청원 목록을 보여줘"

> Lite 프로필(기본)에서는 7개 통합 도구가 사용됩니다.

### CLI에서

```bash
# 의원 검색
npx tsx src/cli.ts members --party 국민의힘 --size 5

# 의안 검색
npx tsx src/cli.ts bills --name 부동산

# 의원 의정활동
npx tsx src/cli.ts activity --name 고민정

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

- [README.md](README.md) — 전체 프로젝트 설명, Lite(7개)/Full(23개) 도구 목록
- [docs/api-catalog.md](docs/api-catalog.md) — 국회 API 276개 전체 목록
- [docs/mcp-api.md](docs/mcp-api.md) — MCP 도구 ↔ API 매핑 상세
- [docs/discovered-codes.md](docs/discovered-codes.md) — 발굴된 API 코드 및 파라미터
- [docs/mcp-design-analysis.md](docs/mcp-design-analysis.md) — MCP 도구 설계 분석 보고서
