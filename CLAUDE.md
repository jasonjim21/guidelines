# 브랜드 가이드라인 장표 엔진 — 작업 지침

## 지금 단계: 1번 — 받은 원본을 좌표로 그대로 재현

삼우건기 CI 가이드라인 v1(.ai, 1920×1080, 17장)을 요소 단위로 뜯어 좌표 원자료로 만들고,
그 원자료만으로 17장을 다시 그린다. 화면에서 바꾸는 기능은 없다. 내용 편집은 나중에 붙일
다른 서비스에서 한다. 이 저장소는 비주얼(배치·글줄·색)만 책임진다.

다음 단계(2번)는 이 좌표에서 그리드·칸 구성을 읽어 레이아웃 선언으로 옮기는 것이다.
그 전까지 좌표를 손으로 고치지 말 것 — 원본이 바뀌면 추출을 다시 돌린다.

## 변주 (src/core/cover.ts) — 지금은 표지 10개

원본 재현 장을 기본형으로 두고 **글의 위치 · 글의 표현(크기·굵기·한 줄/두 줄·국문/영문) · 레이아웃(바탕·색면) · 정렬**만 바꾼다.
- 그리드는 원본 표지 실측: 여백 좌우·위 100, 아래 기준선 992(원본 폴리오 베이스라인), 12단 × 8행.
  4단 선 = 673.3 = 원본의 1/3 분할선
- 블록은 그리드 선에 붙는다. 위로 맞출 때는 글자 윗선(크기 × 0.74), 아래로 맞출 때는 마지막 베이스라인
- `BASE`(원본 표지 선언)로 그린 것이 원본 재현과 겹쳐야 한다. 엔진을 고치면 이것부터 확인
- 내용(브랜드명·제목·폴리오)은 원본 표지에서 읽는다. 변주가 글을 지어내지 않는다
- 로고는 원본 목차 장의 2색 로고 모양을 빌려(`ref`) 옮기고 키운다(`tf`). 단색은 같은 모양을 한 색으로
- 표지 배경 그래픽(모티브 선)은 변주에서 쓰지 않는다
- **자간은 모든 글에 −2%** (`render.tsx`의 `TRACK`). 원본 재현에도 같이 걸린다

## 흐름

```
원본.ai ─ scripts/extract_ai.py ─┬─ references/samwoo-ci-v1.json        좌표·크기·색·투명도·글 (커밋)
                                 └─ references/local/*.assets.json       패스 모양·사진 (gitignore)
                                              │
              src/core/render.tsx (PageSvg) ──┴─→ 화면 / PDF
```

**원자료 배열이 유일한 원본이다.** 렌더러는 `PageSvg` 하나. 미리보기용·출력용을 따로 만들지 말 것.

## 추출 규칙 (scripts/extract_ai.py)

- PyMuPDF로 읽는다. poppler(pdftotext·pdftoppm)는 이 파일의 한글 CID 글꼴을 못 그려
  목차 항목·국문 제목이 통째로 빠진다 — 쓰지 말 것
- 칠하는 순서 그대로 요소를 낸다: `rect` · `line` · `path` · `text` · `image`
- 글은 줄 단위. 한 span이 여러 줄이거나 칸마다 떨어져 있으면(표 머리) 나눈다. y는 베이스라인
- 그룹 투명도: 그림 요소는 그룹 단계(level)로, 글은 글 상자를 감싸는/거의 같은 그룹 상자로 붙인다
  (그룹 시작에 순서 번호가 없어서). 쪽 제목 영문 40%, 간지 큰 글자 10%, 여백 규정 상자 10·20% 등
- 잘라내기: 상자면 `clip`, 모양이면 `clipPath`(assets 키). 사용 위반 '그라데이션' 사례가 로고 윤곽 클립
- 사진은 칠 순서가 없어 같은 자리의 클립 위치에 끼운다

**그림은 저장소에 넣지 않는다.** 패스 d 값과 사진은 `references/local/`(gitignore)에만 있다.
없으면 렌더러가 같은 상자를 반투명 면으로 그린다. 아티팩트 빌드는 로컬 파일이 있을 때 함께 묶인다.

## 글자체 (src/core/fonts.ts) — 렌더 인자

| 원본 | OFL | 그릴 서체 |
|---|---|---|
| Pretendard | ○ | Pretendard (npm 번들) — 그대로, 글줄 길이 원본과 같음 |
| Inter | ○ | Inter (Google) — 그대로 |
| SUIT | ○ | Pretendard로 대체 (웹 배포본 없음, 여백 규정의 X 표시뿐) |
| 이사만루체 esamanru | × | Pretendard (Light 400 / Medium 700 / Bold 800), 원본 폭에 맞춤 |
| Prohibition | × | Barlow Condensed 600, 대문자, 원본 폭에 맞춤 |

대체 서체는 `textLength`로 원본 줄 폭에 맞춰 늘이고 줄인다(fit). 원본 서체는 손대지 않는다.
자간은 0을 넘기지 않는다 — 폭 맞춤은 글자 폭을 바꾸는 것이지 자간을 벌리는 것이 아니다.

## 화면·코드 규칙 (다른 서비스로 넘길 수 있게)

- 스타일은 전부 `.gle` 아래. 전역 선택자 금지. 아티팩트용 body 바탕은 `scripts/artifact.mjs`가 넣는다
- 문서 전체를 뒤지는 `querySelector` 금지 — ref를 쓴다
- 한글은 keep-all, 화면 글자 13px 이상

## 검증 — 원본과 픽셀로 맞춘다

```bash
# 원본 렌더 (MuPDF)
python3 -I -c "import pymupdf as f,sys;d=f.open(sys.argv[1]);[p.get_pixmap().save(f'{sys.argv[2]}/o-{i+1:02d}.png') for i,p in enumerate(d)]" 원본.ai /tmp/orig
npm run build && node scripts/compare.mjs /tmp/orig shots/compare   # 쪽마다 다른 픽셀 비율 + 차이 이미지
```

현재(fuzz 12%) 다른 픽셀 0.1–4.6%. 남는 차이는 대체 서체(이사만루체·Prohibition)의 글자 모양,
사진 잘림 위치, 그라데이션(셰이딩)을 사진으로 받은 것. 배치·글줄·색은 일치.

## 아티팩트로 올리기

```bash
npm run build && node scripts/artifact.mjs   # artifact/artifact.html + artifact/assets/*
```

`artifact.html`을 페이지로, `assets/*`를 같은 상대 경로의 `files`로, 같은 URL에 다시 올린다.

## 남은 과제

- 2번: 좌표 → 12단 그리드·칸 구성 선언으로 (쪽 유형별), 같은 구조끼리 묶기
- 이사만루체 사용 여부 결정 (무료 상업 사용 가능하나 OFL 아님 — 지금은 Pretendard 대체)
- PDF 출력: 같은 화면을 Playwright `page.pdf()`로
