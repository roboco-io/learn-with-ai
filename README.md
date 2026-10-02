# AI 시대의 학습법

대학생을 위한 60분 웹 발표자료입니다. `IDEATION.md`를 바탕으로 구성했습니다.

**발표자료: https://roboco.io/learn-with-ai/**

- 본문 48장(중간 타이틀 포함, 질문 6분) + 참고 자료 2장
- Offer Backward, 톱다운 학습, 오픈소스 참여 학습, 리스크 없는 창업과 차별점
- METR 공식 TH 1.1 데이터의 로그/선형 그래프, 모델별 추정치와 신뢰구간
- 발표자 노트, 목차, 전체화면, 모바일 화면, 인쇄 지원
- 모든 슬라이드에 버전 표시 · [릴리즈 노트](RELEASE_NOTES.md)

## 사용

`←` / `→` 또는 `PageUp` / `PageDown`으로 이동, `O` 목차, `N` 발표자 노트, `F` 전체화면.
`Home` / `End`로 처음/끝 이동. 모바일에서는 버튼 또는 좌우 스와이프를 사용합니다.
슬라이드 주소(`#7` 등)를 복사해 특정 페이지를 공유할 수 있습니다.
인쇄 버튼으로 전체 슬라이드를 인쇄하거나 브라우저에서 PDF로 저장할 수 있습니다.

## 편집과 미리보기

- `site/content.js`: 슬라이드 내용·출처·발표 노트·권장 시간
- `site/style.css`: 레이아웃과 반응형·인쇄 스타일
- `site/app.js`: 슬라이드 이동과 METR 그래프
- `site/data/metr.json`: 차트에 사용하는 데이터
- `site/data/metr-source.yaml`: METR 원자료 스냅샷(2026-09-27 수집)

```sh
python3 -m http.server 18765 --bind 127.0.0.1 --directory site
# http://127.0.0.1:18765/
node --check site/app.js
node --check site/content.js
node scripts/check.mjs
```

외부 CDN이나 빌드 패키지 없이 실행됩니다. 데이터 로딩을 위해 `file://` 대신 로컬 HTTP 서버를 사용하세요.

## 배포

`main`에 push하면 `.github/workflows/pages.yml`이 검증 후 `site/`만 GitHub Pages에 배포합니다.
저장소의 Pages source는 **GitHub Actions**입니다. 조직 사이트의 `roboco.io` 도메인을 상속하므로 이 프로젝트에 별도 `CNAME`을 추가하지 않습니다.

## 자료 해석

METR 그래프는 인간 전문가의 과제 소요 시간을 기준으로 한 **50% 성공 시간 지평**입니다.
모델이 자율적으로 실행된 시간이나 직업 전체의 자동화 시점이 아닙니다. 공식 TH 1.1의 26개 모델을 모두 표시하며 세로선은 95% 신뢰구간입니다. 16시간을 넘는 추정치는 현재 과제 구성상 신뢰도가 낮다는 METR의 설명을 표시합니다. 그래프는 실시간 갱신되지 않습니다.

장비 구성은 강연자의 권장안이고, 월 2–3만원은 보장된 정액 요금이 아닌 학습 예산 목표입니다. 가상 사례와 실험 수치는 본문·노트에 구분했습니다. 원문 출처는 각 슬라이드에서 확인할 수 있습니다.


## 릴리즈 노트와 버전

버전 형식은 `20261002+1`처럼 **연월일+당일 연번**입니다. 날짜는 한국 시간(`Asia/Seoul`) 기준이며 다음 날에는 연번이 1부터 시작합니다. 모든 슬라이드 오른쪽 아래에 표시되고 전체화면·인쇄에도 포함됩니다.

처음 체크아웃한 환경에서는 저장소 전용 훅을 설치합니다. 전역 Git 설정은 바꾸지 않으며 기존 훅이 있으면 덮어쓰지 않습니다.

```sh
node scripts/release.mjs install-hooks
```

배포할 때는 Codex에 **“배포해줘”** 또는 **`$deploy-presentation`**을 요청하세요. 저장소의 [배포 스킬](.agents/skills/deploy-presentation/SKILL.md)이 변경내용을 요약하고 아래 준비·검증·푸시·배포 확인 절차를 수행합니다. 저장소 스킬은 자동 검색되며, 목록에 보이지 않으면 Codex를 다시 시작하거나 해당 파일을 직접 읽어 사용하세요.

직접 준비하려면 변경 요약을 `- ` 목록으로 작성한 파일을 저장소 밖에 두고 실행합니다.

```sh
node scripts/release.mjs prepare --notes-file /absolute/path/to/summary.txt
node --check site/app.js
node --check site/content.js
node --test scripts/release.test.mjs
node scripts/check.mjs
git diff --check
```

`prepare`는 `RELEASE_NOTES.md`와 `site/release.js`를 함께 갱신합니다. 커밋 전 반복 실행은 같은 초안을 다시 만들며, 커밋한 뒤 실행하면 다음 연번을 발급합니다. 과거 노트는 보존합니다. 준비 뒤 코드·문서 등을 수정했다면 다시 실행하세요. 두 생성 파일과 모든 변경을 커밋한 뒤 설정된 원격 저장소 모두에 `main`을 푸시합니다.

Git `pre-push` 훅은 실제 푸시될 커밋의 버전·노트·소스 일치를 확인합니다. 훅은 파일이나 커밋을 자동 수정하지 않으며, 갱신은 배포 스킬의 준비 단계가 수행합니다. GitHub Actions도 같은 검증을 수행하여 훅을 설치하지 않은 환경의 누락을 차단합니다.

배포 성공 후 `release-20261002+1` 형태의 태그가 해당 커밋에 붙습니다. 릴리즈 노트는 **배포 준비 기록**, 태그와 Actions 성공 상태는 **배포 완료 기록**입니다. 같은 버전의 성공한 배포를 다시 실행할 수 없습니다. 수동 재배포도 새 버전과 사유를 준비해 커밋해야 합니다. 실패 후 재시도는 성공 태그가 없는 버전으로 가능합니다. 첫 적용 시에는 저장소 규칙이 GitHub Actions의 `contents: write` 권한으로 이 태그를 생성할 수 있어야 합니다.
