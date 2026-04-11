/**
 * 원격 MCP 서버 설정 랜딩 페이지
 *
 * API 키와 프로필을 입력하면 7개 클라이언트별 설정 코드를 자동 생성합니다.
 * 외부 의존성 없이 인라인 CSS/JS로 구성된 단일 HTML 페이지입니다.
 */

export function getLandingPageHtml(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>국회 API MCP 서버 — 설정 도우미</title>
<style>
  :root {
    --primary: #1a56db;
    --primary-hover: #1e40af;
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --text: #1e293b;
    --text-secondary: #64748b;
    --success: #16a34a;
    --code-bg: #f1f5f9;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text);
    line-height: 1.6; padding: 0 1rem;
  }
  .container { max-width: 720px; margin: 0 auto; padding: 2rem 0 4rem; }

  /* Header */
  header { text-align: center; margin-bottom: 2rem; }
  header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  header p { color: var(--text-secondary); font-size: 0.95rem; }
  header a { color: var(--primary); text-decoration: none; }
  header a:hover { text-decoration: underline; }

  /* Card */
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem;
  }
  .card h2 { font-size: 1.1rem; margin-bottom: 1rem; }

  /* Form */
  label { display: block; font-weight: 600; margin-bottom: 0.35rem; font-size: 0.9rem; }
  .hint { color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.75rem; }
  input[type="text"] {
    width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border);
    border-radius: 8px; font-size: 0.95rem; font-family: monospace;
  }
  input[type="text"]:focus { outline: 2px solid var(--primary); border-color: transparent; }

  .radio-group { display: flex; gap: 1rem; margin-bottom: 0.5rem; }
  .radio-group label {
    display: flex; align-items: center; gap: 0.4rem;
    font-weight: 400; cursor: pointer;
  }

  /* Buttons */
  .btn {
    display: inline-block; padding: 0.55rem 1.2rem;
    border: none; border-radius: 8px; font-size: 0.9rem;
    cursor: pointer; font-weight: 600; transition: background 0.15s;
  }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-primary:hover { background: var(--primary-hover); }
  .btn-sample {
    background: transparent; color: var(--primary); border: 1px solid var(--primary);
    font-size: 0.85rem; padding: 0.45rem 1rem;
  }
  .btn-sample:hover { background: #eff6ff; }
  .btn-row { display: flex; gap: 0.75rem; align-items: center; margin-top: 1rem; }

  /* Tabs */
  .tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
  .tab-btn {
    padding: 0.4rem 0.85rem; border: 1px solid var(--border); border-radius: 6px;
    background: var(--bg); font-size: 0.8rem; cursor: pointer; transition: all 0.15s;
  }
  .tab-btn:hover { border-color: var(--primary); color: var(--primary); }
  .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* Code block */
  .code-wrap { position: relative; margin-top: 0.5rem; }
  .code-block {
    background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 1rem; font-family: "SF Mono", "Fira Code", monospace;
    font-size: 0.82rem; line-height: 1.5; overflow-x: auto;
    white-space: pre; tab-size: 2;
  }
  .copy-btn {
    position: absolute; top: 0.5rem; right: 0.5rem;
    padding: 0.3rem 0.6rem; border: 1px solid var(--border); border-radius: 6px;
    background: var(--card); font-size: 0.75rem; cursor: pointer; transition: all 0.15s;
  }
  .copy-btn:hover { border-color: var(--primary); color: var(--primary); }
  .copy-btn.copied { background: var(--success); color: #fff; border-color: var(--success); }

  .path-info {
    font-size: 0.8rem; color: var(--text-secondary);
    margin-bottom: 0.5rem; word-break: break-all;
  }
  .step-label { font-weight: 600; font-size: 0.85rem; margin: 0.75rem 0 0.25rem; }

  /* Result area */
  #result { display: none; }

  /* Footer */
  footer { text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 2rem; }
  footer a { color: var(--primary); text-decoration: none; }
</style>
</head>
<body>
<div class="container">

<header>
  <h1>국회 API MCP 서버</h1>
  <p>AI에서 국회 데이터에 바로 접근 — 설정 코드를 자동으로 생성합니다</p>
  <p style="margin-top:0.3rem"><a href="https://github.com/hollobit/assembly-api-mcp" target="_blank">GitHub</a> · <a href="https://github.com/hollobit/assembly-api-mcp/blob/main/USECASE.md" target="_blank">활용 사례 100선</a></p>
</header>

<!-- 입력 폼 -->
<div class="card">
  <h2>설정</h2>

  <label for="apiKey">API 키</label>
  <div class="hint">
    <a href="https://open.assembly.go.kr" target="_blank">open.assembly.go.kr</a>에서 무료 발급 · 없으면 <code>sample</code> 키로 10건까지 테스트 가능
  </div>
  <input type="text" id="apiKey" placeholder="발급받은 API 키 또는 sample" autocomplete="off" spellcheck="false">

  <div class="hint" style="margin-top:0.75rem">
    <strong>국민참여입법센터 API (선택)</strong> —
    <a href="https://opinion.lawmaking.go.kr" target="_blank">opinion.lawmaking.go.kr</a>에서 OC 발급 시 입력 ·
    없으면 입법현황/예고 등 lawmaking API 사용 불가
  </div>
  <input type="text" id="lawmakingOc" placeholder="OC (정보공개 서비스 신청 ID, 선택)" autocomplete="off" spellcheck="false">

  <div style="margin-top:1rem">
    <label>프로필</label>
    <div class="radio-group">
      <label><input type="radio" name="profile" value="lite" checked> Lite (6개 도구, 권장)</label>
      <label><input type="radio" name="profile" value="full"> Full (11개 도구)</label>
    </div>
  </div>

  <div class="btn-row">
    <button class="btn btn-primary" onclick="generate()">설정 코드 생성</button>
    <button class="btn btn-sample" onclick="useSample()">sample 키로 체험하기</button>
  </div>
</div>

<!-- 결과 영역 -->
<div id="result">
  <div class="card">
    <h2>클라이언트별 설정</h2>

    <div class="tabs" id="tabs"></div>
    <div id="panels"></div>
  </div>
</div>

<footer>
  <p>assembly-api-mcp · MIT License · <a href="https://github.com/hollobit/assembly-api-mcp" target="_blank">hollobit/assembly-api-mcp</a></p>
</footer>

</div>

<script>
const BASE = ${JSON.stringify(baseUrl)};

const CLIENTS = [
  { id: "claude-web", name: "claude.ai (웹/모바일)" },
  { id: "claude-desktop", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "gemini", name: "Gemini CLI" },
  { id: "chatgpt", name: "ChatGPT GPTs" },
];

function getValues() {
  const key = document.getElementById("apiKey").value.trim() || "sample";
  const profile = document.querySelector('input[name="profile"]:checked').value;
  const lawmakingOc = document.getElementById("lawmakingOc").value.trim() || undefined;
  return { key, profile, lawmakingOc };
}

function mcpUrl(key, profile, lawmakingOc) {
  let url = BASE + "/mcp?key=" + encodeURIComponent(key) + "&profile=" + profile;
  if (lawmakingOc) {
    url += "&lawmakingOc=" + encodeURIComponent(lawmakingOc);
  }
  return url;
}

function openapiUrl(profile) {
  return BASE + "/openapi.json?profile=" + profile;
}

function jsonBlock(obj) {
  return JSON.stringify(obj, null, 2);
}

function buildContent(id, key, profile, lawmakingOc) {
  const url = mcpUrl(key, profile, lawmakingOc);

  switch (id) {
    case "claude-web":
      return {
        steps: [
          { label: "1. claude.ai 또는 모바일 앱 → Settings → Integrations → Add More → Custom MCP server", type: "text" },
          { label: '2. 아래 URL을 붙여넣고 Save (Pro 이상 플랜 필요)', type: "code", value: url },
        ]
      };

    case "claude-desktop": {
      const config = { mcpServers: { "assembly-api": { url: url } } };
      return {
        steps: [
          { label: "1. 설정 파일 열기", type: "path",
            value: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json\\nWindows: %APPDATA%\\\\Claude\\\\claude_desktop_config.json" },
          { label: "2. 아래 내용을 붙여넣기 (기존 내용이 있으면 mcpServers 안에 추가)", type: "code", value: jsonBlock(config) },
          { label: "3. Claude Desktop을 완전 종료(Cmd+Q) 후 재시작", type: "text" },
        ]
      };
    }

    case "claude-code":
      return {
        steps: [
          { label: "터미널에서 아래 명령을 실행하세요:", type: "code",
            value: "claude mcp add assembly-api --transport http " + url },
        ]
      };

    case "cursor": {
      const config = { mcpServers: { "assembly-api": { url: url } } };
      return {
        steps: [
          { label: "1. 설정 파일 열기", type: "path", value: "~/.cursor/mcp.json" },
          { label: "2. 아래 내용을 붙여넣기", type: "code", value: jsonBlock(config) },
          { label: "3. Cursor 재시작 또는 MCP 서버 새로고침", type: "text" },
        ]
      };
    }

    case "vscode": {
      const config = { servers: { "assembly-api": { url: url } } };
      return {
        steps: [
          { label: "1. 프로젝트 루트에 .vscode/mcp.json 파일 생성", type: "text" },
          { label: "2. 아래 내용을 붙여넣기", type: "code", value: jsonBlock(config) },
        ]
      };
    }

    case "gemini": {
      const config = { mcpServers: { "assembly-api": { url: url } } };
      return {
        steps: [
          { label: "1. 설정 파일 열기", type: "path", value: "~/.gemini/settings.json" },
          { label: "2. 아래 내용을 붙여넣기", type: "code", value: jsonBlock(config) },
        ]
      };
    }

    case "chatgpt":
      return {
        steps: [
          { label: "1. ChatGPT → Explore GPTs → Create → Configure → Actions → Create new action", type: "text" },
          { label: '2. "Import from URL"에 아래 URL 입력', type: "code", value: openapiUrl(profile) },
          { label: "3. 각 API 호출 시 key 파라미터에 API 키 포함", type: "text" },
        ]
      };

    default:
      return { steps: [] };
  }
}

function renderPanel(id, key, profile, lawmakingOc) {
  const { steps } = buildContent(id, key, profile, lawmakingOc);
  let html = "";
  for (const step of steps) {
    if (step.type === "text") {
      html += '<div class="step-label">' + escHtml(step.label) + "</div>";
    } else if (step.type === "path") {
      html += '<div class="step-label">' + escHtml(step.label) + "</div>";
      html += '<div class="path-info">' + escHtml(step.value).replace(/\\n/g, "<br>") + "</div>";
    } else if (step.type === "code") {
      html += '<div class="step-label">' + escHtml(step.label) + "</div>";
      html += '<div class="code-wrap">';
      html += '<pre class="code-block">' + escHtml(step.value) + "</pre>";
      html += '<button class="copy-btn" onclick="copyCode(this)">복사</button>';
      html += "</div>";
    }
  }
  return html;
}

function generate() {
  const { key, profile } = getValues();
  const tabsEl = document.getElementById("tabs");
  const panelsEl = document.getElementById("panels");

  let tabsHtml = "";
  let panelsHtml = "";
  CLIENTS.forEach(function(c, i) {
    const active = i === 0 ? " active" : "";
    tabsHtml += '<button class="tab-btn' + active + '" data-tab="' + c.id + '" onclick="switchTab(this)">' + escHtml(c.name) + "</button>";
    panelsHtml += '<div class="tab-panel' + active + '" id="panel-' + c.id + '">' + renderPanel(c.id, key, profile, lawmakingOc) + "</div>";
  });

  tabsEl.innerHTML = tabsHtml;
  panelsEl.innerHTML = panelsHtml;
  document.getElementById("result").style.display = "block";
  document.getElementById("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

function useSample() {
  document.getElementById("apiKey").value = "sample";
  generate();
}

function switchTab(btn) {
  document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
  document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
  btn.classList.add("active");
  document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
}

function copyCode(btn) {
  const code = btn.previousElementSibling.textContent;
  navigator.clipboard.writeText(code).then(function() {
    btn.textContent = "복사됨!";
    btn.classList.add("copied");
    setTimeout(function() {
      btn.textContent = "복사";
      btn.classList.remove("copied");
    }, 2000);
  });
}

function escHtml(s) {
  var d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
</script>
</body>
</html>`;
}
