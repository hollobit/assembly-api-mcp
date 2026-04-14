# 디자인 자료 저장 규칙

이 저장소에서는 구현 문서와 디자인 문서를 분리한다.

- `docs/`는 MCP 도구 설계 분석, API 매핑, 기술 문서를 둔다.
- `design/`는 시각 디자인 기준, 외부 레퍼런스, 생성형 디자인 산출물을 둔다.
- canonical 디자인 문서는 항상 `design/DESIGN.md` 하나로 유지한다.

## 권장 구조

```text
design/
├── DESIGN.md
├── inspirations/
│   ├── getdesign-<slug>.md
│   └── designmd-<slug>.md
├── skills/
│   └── typeui-<style>.SKILL.md
└── notes.md
```

## 파일 역할

- `design/DESIGN.md`
  - 이 저장소의 대표 디자인 기준 문서
- `design/inspirations/`
  - 외부 레퍼런스, 실험 초안, 벤치마크
- `design/skills/`
  - TypeUI 등에서 만든 스킬/프롬프트 산출물
- `design/notes.md`
  - 채택 이유, 제외 사유, 변경 로그

## 외부 도구

### getdesign.md

- URL: https://getdesign.md/
- 용도: 서비스 스타일 기반 `DESIGN.md` 초안 확보
- 예시:

```bash
npx getdesign@latest add linear
```

### TypeUI

- URL: https://www.typeui.sh/
- 용도: 디자인 skill 생성 또는 스타일 pull
- 예시:

```bash
npx typeui.sh generate
npx typeui.sh pull editorial
```

### DESIGNmd.ai

- URL: https://designmd.ai/
- 용도: `DESIGN.md` 검색, 다운로드, 업로드
- 예시:

```bash
npm install -g designmd
designmd search "public sector dashboard"
designmd download owner/slug -o ./design/inspirations/designmd-public-sector.md
```

## 운영 원칙

- 외부에서 가져온 디자인 문서는 바로 canonical로 쓰지 않는다.
- 먼저 `design/inspirations/` 또는 `design/skills/`에 저장하고 필요한 내용만 `design/DESIGN.md`에 반영한다.
- 디자인 자료는 `memory/`나 `docs/`에 섞지 않는다.
