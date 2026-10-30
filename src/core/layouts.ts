import type { LayoutDecl, Slot, TextPart } from './decl'

/**
 * 장표 유형별 레이아웃 선언.
 * 좌표가 아니라 12단 × 8행 그리드 위의 칸 구성이다 (system.ts).
 * ref가 붙은 것은 references/samwoo-ci-v1.json 의 실측에서 옮긴 것,
 * 없는 것은 같은 그리드 위에서 계열을 넓히려고 새로 짠 것이다.
 */

/* ---------- 내지 공통 부품 ---------- */

/** 레퍼런스 내지의 좌측 머리 — 영문 대문자 제목(주조색 40%) + 설명 본문 */
const HEAD: TextPart[] = [
  { role: 'title', step: 'h1', weight: 700, tone: 'accentSoft', upper: true, gap: 24 },
  { role: 'subtitle', step: 'lead', weight: 600, tone: 'fg', gap: 16 },
  { role: 'body', step: 'body', weight: 400, tone: 'fg' },
]

const sidebar = (rows = 6): Slot => ({ k: 'text', area: { c: [1, 4], r: [1, rows] }, parts: HEAD, needsTitle: true })
const folio: Slot = { k: 'folio', tone: 'muted', pageNo: true }

/* ---------- 표지 ---------- */

const COVERS: LayoutDecl[] = [
  {
    id: 'cover-field', name: '색면 표지', type: 'cover', family: 'cover-field', ref: 'p1',
    note: '주조색 바탕, 좌상단 제목, 좌하단 로고. 오른쪽 절반을 모티브 선이 재단선까지 채운다',
    bg: 'primary',
    slots: [
      { k: 'motif', area: { c: [6, 7], r: [1, 8], bleed: ['t', 'r', 'b'] }, tone: 'tonal' },
      { k: 'text', area: { c: [1, 6], r: [1, 4] }, parts: [
        { role: 'title', step: 'hero', weight: 500, tone: 'onAccent', gap: 24 },
        { role: 'subtitle', step: 'lead', weight: 500, tone: 'onAccent' },
      ], needsTitle: true },
      { k: 'logo', area: { c: [1, 3], r: [7, 2] }, h: 60, valign: 'bottom', tone: 'mono' },
      { k: 'folio', tone: 'onAccent' },
    ],
  },
  {
    id: 'cover-center', name: '로고 중심 표지', type: 'cover', family: 'cover-center',
    note: '흰 바탕 한가운데 로고. 제목은 아래로 내려 조용히 둔다',
    bg: 'paper',
    slots: [
      { k: 'logo', area: { c: [4, 6], r: [3, 3] }, h: 140, align: 'center', valign: 'middle' },
      { k: 'text', area: { c: [1, 8], r: [7, 2] }, valign: 'bottom', parts: [
        { role: 'title', step: 'display', weight: 700, tone: 'fg', gap: 12 },
        { role: 'subtitle', step: 'lead', weight: 400, tone: 'muted' },
      ], needsTitle: true },
      { k: 'folio', tone: 'muted' },
    ],
  },
  {
    id: 'cover-split', name: '사진 반면 표지', type: 'cover', family: 'cover-split',
    note: '오른쪽 절반을 사진이 재단선까지 채운다. 사진 1장이 있어야 성립한다',
    bg: 'paper',
    slots: [
      { k: 'media', area: { c: [7, 6], r: [1, 8], bleed: ['t', 'r', 'b'] }, accepts: ['image'],
        arrange: { a: 'grid', cols: 1, valign: 'top' }, cap: { min: 1, max: 1, best: 1 }, caption: 'none', required: true },
      { k: 'text', area: { c: [1, 5], r: [1, 4] }, parts: [
        { role: 'title', step: 'hero', weight: 700, tone: 'accent', gap: 24 },
        { role: 'subtitle', step: 'lead', weight: 500, tone: 'fg' },
      ], needsTitle: true },
      { k: 'logo', area: { c: [1, 3], r: [7, 2] }, h: 56, valign: 'bottom' },
      { k: 'folio', tone: 'muted' },
    ],
  },
  {
    id: 'cover-ink', name: '먹색 표지', type: 'cover', family: 'cover-ink',
    note: '먹색 바탕에 제목을 아래로 크게. 로고는 좌상단에 작게',
    bg: 'ink',
    slots: [
      { k: 'logo', area: { c: [1, 3], r: [1, 1] }, h: 48, tone: 'mono' },
      { k: 'text', area: { c: [1, 9], r: [4, 5] }, valign: 'bottom', parts: [
        { role: 'subtitle', step: 'label', weight: 500, tone: 'accentSoft', gap: 20 },
        { role: 'title', step: 'hero', weight: 700, tone: 'onAccent' },
      ], needsTitle: true },
      { k: 'folio', tone: 'muted' },
    ],
  },
]

/* ---------- 목차 ---------- */

const TOCS: LayoutDecl[] = [
  {
    id: 'toc-row', name: '가로 목차', type: 'toc', family: 'toc-row', ref: 'p2',
    note: '밝은 회색 바탕, 좌상단 작은 로고. 오른쪽 아래 절반에 장 제목이 밑줄과 함께 가로로 선다',
    bg: 'gray',
    slots: [
      { k: 'logo', area: { c: [1, 2], r: [1, 1] }, h: 40 },
      { k: 'toc', area: { c: [7, 6], r: [4, 2] }, dir: 'row', numbered: false, valign: 'middle' },
    ],
  },
  {
    id: 'toc-column', name: '번호 목차', type: 'toc', family: 'toc-column',
    note: '왼쪽에 "목차", 오른쪽에 번호와 장 제목을 세로로. 장이 많아도 버틴다',
    bg: 'paper',
    slots: [
      { k: 'text', area: { c: [1, 4], r: [1, 2] }, parts: [{ role: 'tocHead', step: 'display', weight: 700, tone: 'accent' }] },
      { k: 'toc', area: { c: [7, 6], r: [1, 8] }, dir: 'column', numbered: true },
      { k: 'logo', area: { c: [1, 2], r: [8, 1] }, h: 36, valign: 'bottom' },
    ],
  },
  {
    id: 'toc-split', name: '색면 목차', type: 'toc', family: 'toc-split',
    note: '왼쪽 1/3을 주조색 면으로 덮고 그 위에 "목차". 오른쪽에 번호 목록',
    bg: 'paper',
    slots: [
      { k: 'fill', area: { c: [1, 4], r: [1, 8], bleed: ['l', 't', 'b'] }, tone: 'accent' },
      { k: 'text', area: { c: [1, 4], r: [1, 2] }, parts: [{ role: 'tocHead', step: 'display', weight: 700, tone: 'onAccent' }] },
      { k: 'toc', area: { c: [6, 7], r: [2, 6] }, dir: 'column', numbered: true, valign: 'middle' },
    ],
  },
]

/* ---------- 간지 ---------- */

const DIVIDERS: LayoutDecl[] = [
  {
    id: 'div-mega', name: '큰 글자 간지', type: 'divider', family: 'div-mega', ref: 'p3',
    note: '주조색 바탕에 장 제목을 톤온톤으로 쪽 높이만큼 크게. 한 단어가 한 줄',
    bg: 'primary',
    slots: [
      { k: 'mega', area: { c: [1, 12], r: [1, 8], bleed: ['t', 'b', 'r'] }, source: 'title', step: 'mega', tone: 'tonal' },
    ],
  },
  {
    id: 'div-number', name: '번호 간지', type: 'divider', family: 'div-number',
    note: '흰 바탕에 큰 장 번호와 제목. 오른쪽에 사진이 있으면 함께 선다',
    bg: 'paper',
    slots: [
      { k: 'mega', area: { c: [1, 5], r: [1, 4] }, source: 'sectionNo', step: 'big', tone: 'accent' },
      { k: 'text', area: { c: [1, 5], r: [5, 4] }, valign: 'bottom', parts: [
        { role: 'title', step: 'display', weight: 700, tone: 'fg', gap: 16 },
        { role: 'subtitle', step: 'lead', weight: 400, tone: 'muted' },
      ], needsTitle: true },
      { k: 'media', area: { c: [7, 6], r: [1, 8], bleed: ['t', 'r', 'b'] }, accepts: ['image'],
        arrange: { a: 'grid', cols: 1 }, cap: { min: 0, max: 1, best: 1 }, caption: 'none', required: false },
      { k: 'folio', tone: 'muted' },
    ],
  },
  {
    id: 'div-ink', name: '먹색 간지', type: 'divider', family: 'div-ink',
    note: '먹색 바탕 가운데에 번호와 제목. 사진이 없을 때 가장 단정하다',
    bg: 'ink',
    slots: [
      { k: 'text', area: { c: [3, 8], r: [3, 4] }, valign: 'middle', align: 'center', parts: [
        { role: 'sectionNo', step: 'label', weight: 600, tone: 'accentSoft', gap: 20 },
        { role: 'title', step: 'hero', weight: 700, tone: 'onAccent', gap: 20 },
        { role: 'subtitle', step: 'lead', weight: 400, tone: 'muted' },
      ], needsTitle: true },
    ],
  },
]

/* ---------- 내지 ---------- */

const CONTENTS: LayoutDecl[] = [
  {
    id: 'c-hero-right', name: '한 점 크게 (오른쪽)', type: 'content', family: 'hero', ref: 'p4',
    note: '왼쪽 머리, 오른쪽 8단에 로고나 그림 하나를 크게. 오른쪽 끝에 붙인다',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [2, 6] }, accepts: ['logo', 'image', 'icon'],
      arrange: { a: 'single', align: 'right', valign: 'middle', maxH: 0.8 }, cap: { min: 1, max: 1, best: 1 }, caption: 'none', required: true,
    }, folio],
  },
  {
    id: 'c-hero-center', name: '한 점 크게 (가운데)', type: 'content', family: 'hero', ref: 'p7',
    note: '세로형 시그니처처럼 키가 큰 것을 오른쪽 8단 가운데에',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [2, 6] }, accepts: ['logo', 'image', 'icon'],
      arrange: { a: 'single', align: 'center', valign: 'middle', maxH: 0.9 }, cap: { min: 1, max: 1, best: 1 }, caption: 'none', required: true,
    }, folio],
  },
  {
    id: 'c-list', name: '세로 목록 + 설명', type: 'content', family: 'list', ref: 'p9',
    note: '항목을 세로로 쌓아 오른쪽 끝을 맞추고, 설명을 옆 단에 붙인다 (최소 크기·여백 규정)',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [2, 6] }, accepts: ['logo', 'image', 'icon'],
      arrange: { a: 'list', captionCols: 3 }, cap: { min: 2, max: 3, best: 2 }, caption: 'side', required: true,
    }, folio],
  },
  {
    id: 'c-bands', name: '색 띠', type: 'content', family: 'bands', ref: 'p10',
    note: '컬러칩을 가로 띠로 쌓는다. 첫 색(주조색)을 두 배로. 색 이름은 크게, 값은 띠 오른쪽 위',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['chip'],
      arrange: { a: 'bands', firstWeight: 2 }, cap: { min: 2, max: 5, best: 3 }, caption: 'none', required: true,
    }, folio],
  },
  {
    id: 'c-swatches', name: '색 기둥', type: 'content', family: 'swatches',
    note: '컬러칩을 세로 기둥으로 나란히. 색이 4개 이상일 때 띠보다 낫다',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['chip'],
      arrange: { a: 'swatches' }, cap: { min: 3, max: 6, best: 4 }, caption: 'none', required: true,
    }, folio],
  },
  {
    id: 'c-panels', name: '두 판 위아래', type: 'content', family: 'panels', ref: 'p12',
    note: '넓은 판 두 장을 위아래로. 판마다 위에 작은 설명',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['image', 'logo'],
      arrange: { a: 'grid', cols: 1, gap: 40 }, cap: { min: 2, max: 2, best: 2 }, caption: 'above', required: true,
    }, folio],
  },
  {
    id: 'c-grid-3', name: '3단 타일', type: 'content', family: 'grid', ref: 'p13',
    note: '같은 크기 타일 3단. 타일마다 위에 설명 (사용 위반 사례처럼 여러 개를 비교할 때)',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['logo', 'image', 'icon'],
      arrange: { a: 'grid', cols: 3, ratio: 1.7, valign: 'top' }, cap: { min: 3, max: 9, best: 6 }, caption: 'above', required: true,
    }, folio],
  },
  {
    id: 'c-grid-2', name: '2단 타일', type: 'content', family: 'grid2', ref: 'p16',
    note: '큰 타일 2단. 그래픽 모티브나 적용 사진처럼 크게 보여야 할 때',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['image', 'logo', 'icon'],
      arrange: { a: 'grid', cols: 2, gap: 16 }, cap: { min: 2, max: 4, best: 4 }, caption: 'below', required: true,
    }, folio],
  },
  {
    id: 'c-specimen', name: '서체 견본', type: 'content', family: 'specimen', ref: 'p14',
    note: '견본 문장을 굵기별로 한 줄씩. 오른쪽 끝에 굵기 이름',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['specimen'],
      arrange: { a: 'rows' }, cap: { min: 2, max: 6, best: 4 }, caption: 'none', required: true,
    }, folio],
  },
  {
    id: 'c-table', name: '표', type: 'content', family: 'table',
    note: '표 하나를 오른쪽 8단에. 행이 많으면 글자를 줄이지 않고 경고한다',
    bg: 'paper',
    slots: [sidebar(), {
      k: 'media', area: { c: [5, 8], r: [1, 8] }, accepts: ['table'],
      arrange: { a: 'single', align: 'left', valign: 'top' }, cap: { min: 1, max: 1, best: 1 }, caption: 'none', required: true,
    }, folio],
  },
  {
    id: 'c-top-grid', name: '위 머리 + 아래 타일', type: 'content', family: 'top-grid',
    note: '머리를 위로 올리고 아래 12단 전체에 타일. 항목이 많을 때 왼쪽 머리형보다 넓게 쓴다',
    bg: 'paper',
    slots: [
      { k: 'text', area: { c: [1, 7], r: [1, 2] }, parts: HEAD, needsTitle: true },
      { k: 'media', area: { c: [1, 12], r: [3, 6] }, accepts: ['logo', 'image', 'icon', 'chip'],
        arrange: { a: 'grid', cols: 'auto', valign: 'top' }, cap: { min: 4, max: 12, best: 8 }, caption: 'below', required: true },
      folio,
    ],
  },
  {
    id: 'c-text', name: '글 중심 2단', type: 'content', family: 'text',
    note: '그림 없이 긴 본문을 2단으로. 오른쪽에 그림 하나를 둘 수 있다',
    bg: 'paper',
    slots: [
      { k: 'text', area: { c: [1, 8], r: [1, 8] }, bodyCols: 2, bodyBest: 900, parts: [
        { role: 'title', step: 'display', weight: 700, tone: 'fg', gap: 16 },
        { role: 'subtitle', step: 'lead', weight: 500, tone: 'accent', gap: 40 },
        { role: 'body', step: 'body', weight: 400, tone: 'fg' },
      ], needsTitle: true },
      { k: 'media', area: { c: [9, 4], r: [1, 8] }, accepts: ['image', 'icon'],
        arrange: { a: 'single', align: 'center', valign: 'top' }, cap: { min: 0, max: 1, best: 0 }, caption: 'below', required: false },
      folio,
    ],
  },
]

export const LAYOUTS: LayoutDecl[] = [...COVERS, ...TOCS, ...DIVIDERS, ...CONTENTS]

export const layoutById = (id: string) => LAYOUTS.find((l) => l.id === id)
