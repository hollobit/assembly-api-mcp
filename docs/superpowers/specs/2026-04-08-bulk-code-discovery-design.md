# 국회 API 코드 일괄 발굴 스크립트 설계

Date: 2026-04-08

## 목표

276개 국회 API의 엔드포인트 코드를 일괄 발굴하여 codes.ts에 등록한다. 현재 44개(16%) → 목표 250+개(90%+).

## 방법

OPENSRVAPI 메타 API → Excel 스펙 다운로드 → 요청주소 필드에서 코드 추출. 세션 1에서 14개 코드를 이 방법으로 발굴한 실적이 있다.

## 스크립트 사양

**파일**: `scripts/discover-all-codes.ts`
**실행**: `npx tsx scripts/discover-all-codes.ts`
**입력**: `ASSEMBLY_API_KEY` 환경 변수 (실제 API 키 필수)

### 처리 흐름

1. OPENSRVAPI 호출 → 276개 API 목록 수집 (INF_ID, INF_NM, CATE_NM, DDC_URL)
2. 각 INF_ID에 대해 Excel 스펙 다운로드
   - URL: `https://open.assembly.go.kr/portal/data/openapi/downloadOpenApiSpec.do?infId={INF_ID}&infSeq=2`
   - 병렬 5개씩 배치 처리, 배치 간 1초 대기 (Rate limit 보호)
3. Excel 파싱 → "요청주소" 필드에서 API 코드 추출
   - 패턴: `/portal/openapi/{CODE}?` → CODE 추출
4. 결과 저장 + 통계 출력

### 출력물

1. **`docs/discovered-all-codes.json`** — 전체 발굴 결과
   ```json
   {
     "discoveredAt": "2026-04-08T...",
     "total": 276,
     "discovered": 251,
     "failed": 3,
     "noCode": 22,
     "apis": [
       {
         "infId": "ORDPSW001070QH19059",
         "name": "국회의원 인적사항",
         "category": "국회의원",
         "code": "nwvrqwxyaytdsfvhu",
         "status": "discovered"
       }
     ]
   }
   ```

2. **콘솔** — 카테고리별 발굴 현황 테이블

3. **(선택)** `src/api/codes.ts` 자동 업데이트 — `--update-codes` 플래그

### 의존성

- `xlsx` npm 패키지 (devDependencies) — Excel 파싱
- 기존 fetch API 사용 (Node.js 22 내장)

### 에러 처리

- Excel 다운로드 실패 → 스킵, 실패 목록에 기록
- Excel에 "요청주소" 없음 → `noCode`로 분류
- Rate limit 감지 → 배치 간 대기 시간 증가
- 전체 실행 실패 시 부분 결과라도 저장

### 코드 발굴 후 통합 계획

발굴된 코드는 즉시 `codes.ts`에 등록하되, 도구 통합은 수요에 따라 점진적으로:

- 우선순위 1~8 API → 기존 Lite/Full 도구에 통합 (assembly_member, assembly_bill 등)
- 나머지 → `query_assembly`로 접근 가능 (discover_apis가 코드를 안내)

## 범위 제외

- 276개 API 전부를 전용 도구에 통합하는 것은 범위 밖
- data.go.kr 경유 API는 별도 인증 체계로 이 스크립트 범위 밖
- 발굴된 코드의 실제 작동 검증은 별도 단계
