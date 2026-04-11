# Contributing

국회 API MCP 서버(assembly-api-mcp)에 기여해 주셔서 감사합니다.

## 개발 환경 설정

```bash
git clone https://github.com/hollobit/assembly-api-mcp.git
cd assembly-api-mcp
npm install
cp .env.example .env
# .env에 ASSEMBLY_API_KEY 입력 (https://open.assembly.go.kr 에서 발급)
```

## 개발 명령어

```bash
npm run build      # TypeScript 빌드
npm test           # 테스트 실행 (235개)
npm run dev        # 개발 모드 (tsx)
npm run lint       # 타입 체크
```

## 프로필 구조

이 프로젝트는 **Lite/Full 프로필**로 MCP 도구를 제공합니다.

- **Lite** (기본, 6개 도구): `src/tools/lite/` — 도메인 엔티티 기반 통합
- **Full** (11개 도구): Lite 6개 + `src/tools/full/` 심층 5개 (bill_detail, committee_detail, petition_detail, research_data, get_nabo)

새 도구를 추가할 때:
1. Full 모드 도구: `src/tools/` 아래에 파일 생성, `server.ts`의 Full 분기에 등록
2. Lite 모드 도구: `src/tools/lite/` 아래에 파일 생성, `lite/index.ts`에서 등록
3. 양쪽 공용 도구: `src/tools/`에 생성 후 `lite/index.ts`에서도 import

## API 코드 추가

검증된 API 코드는 `src/api/codes.ts`에 정의합니다.

1. [열린국회정보](https://open.assembly.go.kr)에서 실제 API 코드 확인
2. `codes.ts`에 코드 추가 (주석에 검증 데이터 수 기록)
3. 도구에서 `API_CODES.XXX`로 참조

## 테스트

- 테스트 프레임워크: [vitest](https://vitest.dev)
- 테스트 파일: `tests/unit/*.test.ts`
- 커버리지 목표: 80% 이상
- `global.fetch`를 mock하여 API 호출 테스트

```bash
npm test                        # 전체 테스트
npx vitest run --coverage       # 커버리지 포함
npx vitest run tests/unit/xxx   # 개별 파일
```

## PR 제출

1. `main`에서 feature 브랜치 생성
2. 코드 작성 + 테스트 추가
3. `npm test` 및 `npm run lint` 통과 확인
4. PR 제출 (변경 내용 요약 포함)

## 커밋 메시지

```
<type>: <description>

Types: feat, fix, refactor, docs, test, chore
```

## 코딩 스타일

- TypeScript strict mode
- 불변 패턴 (spread, readonly)
- 함수 < 50줄, 파일 < 400줄
- 한국어 에러 메시지 (사용자 대면)
- `console.log` 금지 (CLI 제외, `process.stderr.write` 사용)
