# 브랜드 가이드라인 장표 엔진

받은 CI 가이드라인(.ai)을 좌표 원자료로 뜯어 두고, 그 위에서 표지·목차·간지·내지 변주를 선언으로 짠다.
산출물은 **표지·목차·간지를 각각 하나, 내지는 틀 하나를 골라** 끝까지 같은 틀로 이은 22장이다.
이 저장소는 비주얼(배치·글줄·색)만 맡는다. 글 내용 편집은 붙일 쪽 서비스가 한다.

## 넘겨받는 쪽이 쓰는 것 — `src/core/deck.ts`

```ts
import { buildDeck } from './core/deck'
import { PageSvg } from './core/render'

const pages = buildDeck(doc, FONT_SETS[0], { cover: 6, toc: 3, divider: 4, format: 3 })
// → 22장: 표지 · 목차 · 간지(기본 시스템) · 내지 13장 · 간지(응용 시스템) · 응용 시스템 5장
pages.map((p) => <PageSvg page={p.page} assets={assets} fonts={FONT_SETS[0]} track={p.track} />)
```

| 고르기 | 값 | 어디 |
|---|---|---|
| `cover` 표지 | 0 = 원본, 1–10 (01–05 로고가 주인공, 06–10 글로 짜기) | `cover.ts` |
| `toc` 목차 | 0 = 원본, 1–10 | `toc.ts` |
| `divider` 간지 | 0 = 원본, 1–10 — 기본 시스템·응용 시스템 두 장에 같은 선언 | `divider.ts` |
| `format` 내지 틀 | 1 원본 · 2 왼쪽 회색 면 · 3 개체 왼쪽·글 오른쪽 · 4 개체 위·글 아래 | `content.ts` |

내지 틀은 제목·설명·폴리오 자리와 회색 면을 고정한다. 쪽마다 달라지는 것은 개체 자리(`FORMAT_SLOTS`) 안의 표현뿐
(색상 체계·색상 규정·회색도는 `specials.ts`, 여백·최소 크기·사용 위반·서체·모티브는 `figures.ts`). 응용 시스템도 같은 틀에 목업을 넣는다.

- **입력** `doc` — `references/samwoo-ci-v1.json` (원본 좌표·글·색). 글은 여기서 읽는다(`deckContent`). 다른 서비스에서 글을 바꾸면 이 배열의 글이나 `Content` 키를 바꿔 넘긴다
- **입력** `assets` — `references/local/samwoo-ci-v1.assets.json` (로고 패스·사진). 저장소에 넣지 않는다. 없으면 같은 자리에 반투명 상자로 그린다
- **출력** `DocPage` — 1920×1080 좌표의 요소 배열. 렌더러는 `PageSvg` 하나 (화면·HTML·PDF 공통)

## 실행

```bash
npm install
npm run dev                                   # 탭: 표지 · 목차 · 간지 · 내지(틀 1–4) · 응용 시스템 · 전체 장표(조합 고르기)
npm run build && node scripts/export-html.mjs deck "cover=6&toc=3&divider=4&format=3"
                                              # 고른 조합 22장 → export/*.html (서체·그림 품은 한 파일, 인쇄 시 한 장씩)
```

주소로 바로 열기: `/#deck?cover=6&toc=3&divider=4&format=3`

## 구조

```
references/samwoo-ci-v1.json        원본 좌표 원자료 (scripts/extract_ai.py로 .ai에서 뽑음)
references/local/*.assets.json      로고 패스·사진 (gitignore — 함께 받은 파일)
src/core/
  doc.ts        원자료 형식 (rect · line · path · text · image · group)
  render.tsx    PageSvg — 유일한 렌더러. 자간 −2%(TRACK), 장평 100%
  fonts.ts      원본 서체 → 그릴 서체 (OFL만)
  ink.ts        획 끝(잉크) 재기 — 좌우 정렬 기준
  blocks.ts     그리드(12단×8행)·블록 선언 → 좌표 엔진, 로고 빌리기
  cover.ts toc.ts divider.ts      표지·목차·간지 변주 10개씩
  content.ts    내지 틀 1–4, 개체 자리
  specials.ts figures.ts          내지 쪽 전용 표현
  object.ts     원본 쪽에서 개체 묶음 떼기
  application.ts mockup.ts        응용 시스템 본문 초안 · 평면 목업(통용 규격)
  deck.ts       전체 장표 조립 (진입점)
src/ui/App.tsx  확인용 화면 (탭)
scripts/        추출 · 원본 대조 · HTML 내보내기 · 아티팩트
```

## 규칙 (자세히는 CLAUDE.md)

- 좌표를 박지 않는다. 그리드 선 번호와 블록 선언으로 짠다. 원본 좌표 원자료는 손으로 고치지 않는다
- 자간은 모든 글에 −2%, 장평은 언제나 100% (textLength·scaleX 금지)
- 좌우 정렬은 글자 상자가 아니라 획 끝에 맞춘다
- 변주가 글을 지어내지 않는다. 내용은 원본에서 읽는다 (응용 시스템 본문만 초안)
- 렌더러를 하나 더 만들지 않는다. 새 출력(PDF 등)은 같은 `DocPage`를 `PageSvg`로 그려서 뽑는다

## 남은 것

- 이사만루체 사용 여부 (OFL 아님 — 지금은 Pretendard로 대체), Prohibition → Barlow Condensed 대체
- PDF 출력: 같은 화면을 Playwright `page.pdf()`로
- 좌표 → 쪽 유형별 그리드 선언으로 (다른 브랜드 가이드라인을 넣을 수 있게)
