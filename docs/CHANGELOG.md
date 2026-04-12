# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-04-12

### Added
- **nabo.go.kr 3개 API 통합** — 보고서 자료 검색, 정기간행물, 채용정보
- **get_nabo MCP 도구** (Full 프로필) — `type=report|periodical|recruitments`
- **REST API `/api/nabo`** — Full 프로필에서 HTTP로 NABO 데이터 접근
- **도구 수 변경** — Lite 유지 (6개), Full 10개 → **11개** (+get_nabo)
- **API 소스 3개** —国会 + lawmaking + NABO
- **API 커버 287개** (276개국회 + 8 국민참여입법센터 + 3개 NABO)
- [docs/legislative-lifecycle.md](legislative-lifecycle.md) 입법 라이프사이클 완전 가이드

### Changed
- NABO API Key 발급 링크 추가 (README)

## [0.6.0] - 2026-04-11

### Added
- **assembly_org 확장** — `type=lawmaking`으로 입법현황/계획/예고, 행정예고, 법령해석례, 의견제시사례 접근 (14개 엔드포인트)
- **279개 API 코드 등록** (271국회 + 8 국민참여입법센터)

### Changed
- Lite/Full 도구 수 변경 없음 (6/10개 유지, 파라미터 확장만)
- **fast-xml-parser 의존성 추가** — lawmaking API XML 응답 파싱

### Security
- lawmaking API URL 도메인 수정

## [0.5.0] - 2026-04-09

### Added
- **271개 API 코드 일괄 발굴** (98.2%) — 자동 발굴 스크립트로 276개 중 271개 코드 확인
- **107개 API 전용 도구 통합** (39% 커버율) — Tier 1~3 단계적 통합 완료
- **ALLBILL 의안정보 통합 API** — 의안 심사경과(소관위→법사위→본회의→공포) 자동 포함
- **역대国会 데이터** — `assembly_member(scope="history")`로 역대 의원/선거/의장 13개 API 접근
- **국정감시 확장** — 국정조사/시정연설/인사청문/토론회 회의록 + 결과보고서
- **영문 API 지원** — 4개 도구에 `lang="en"` 파라미터
- **보도자료/연구자료 확장** — `assembly_org(type="press")`, `research_data(source="future")`
- **정당 의석수 통계** — `assembly_member(mode="party_stats")`

### Changed
- Lite/Full 도구 수 변경 없음 (기존 사용자 영향 없음)

## [0.4.0] - 2026-04-08

### Added
- **Lite/Full 프로필 도입** — 23개 도구를 6개(Lite) / 11개(Full) 프로필로 통합
- **도메인 엔티티 기반 도구 설계** — assembly_member, assembly_bill, assembly_session, assembly_org

### Changed
- **도구 이름 전면 변경** (Breaking Change) — 기존 v0.3 도구를 사용 중이었다면 마이그레이션 필요
- Lite 프로필: 23개 → 6개 도구 (토큰 73% 절감)

### Migration Required
v0.3에서 업그레이드하는 경우: [MIGRATION.md](MIGRATION.md)参照

## [0.3.0] - 2026-04-07

### Added
- 23개 개별 MCP 도구 제공
- REST API 엔드포인트 (18개)
- MCP SDK 기반 서버

---

## Upgrade Guide

### v0.4.0 이상へのアップグレード

v0.4.0以降、ツールの名前が変更になりました。
v0.3からの迁移は[MIGRATION.md](MIGRATION.md)を参照してください。

### Latest Versionへのアップグレード

```bash
git pull origin main
npm install
npm run build
```

업데이트 후 `npm test`로 전체 테스트 실행을 권장합니다.
