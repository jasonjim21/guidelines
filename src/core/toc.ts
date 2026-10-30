import type { Doc, El } from './doc'
import { fixSpelling } from './cover'
import type { Block, Font, Item, PageDecl, Tone } from './blocks'

/**
 * 목차 변주 — 원본 목차(2쪽)를 기본형으로.
 * 장 제목·항목은 원본 목차에서 읽고, 응용 시스템 항목만 정해 준 다섯 개로 바꾼다.
 */

export interface TocItem { kr: string; en: string }
export interface TocSection { kr: string; en: string; items: TocItem[] }

/** 응용 시스템 — 이번 문서에 들어가는 적용물 */
const APPLICATION: TocItem[] = [
  { kr: '명함', en: 'Business Card' },
  { kr: '소봉투', en: 'Envelope S' },
  { kr: '대봉투', en: 'Envelope L' },
  { kr: '쇼핑백', en: 'Shopping Bag' },
  { kr: '티셔츠', en: 'T-Shirt' },
]

/** 원본 목차 장에서 장 제목과 항목을 읽는다 (왼쪽 단 = 기본 시스템) */
export function tocContent(doc: Doc): TocSection[] {
  const texts = doc.pages[1].els.filter((e): e is Extract<El, { t: 'text' }> => e.t === 'text')
  const colOf = (t: { x: number }) => (t.x < 1300 ? 0 : 1)
  const sections: TocSection[] = [0, 1].map((ci) => {
    const head = texts.filter((t) => colOf(t) === ci && t.size > 25)
    const kr = head.find((t) => t.font.startsWith('esamanru'))?.s ?? ''
    const en = head.find((t) => t.font.startsWith('Prohibition'))?.s ?? ''
    const rows = new Map<number, string[]>()
    texts.filter((t) => colOf(t) === ci && t.size <= 20 && t.s.trim() !== '|').forEach((t) => {
      const k = Math.round(t.y)
      rows.set(k, [...(rows.get(k) ?? []), t.s.trim()])
    })
    const items = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => ({ kr: v[0], en: fixSpelling(v[1] ?? '') }))
    return { kr, en: fixSpelling(en), items }
  })
  sections[1] = { ...sections[1], items: APPLICATION }
  return sections
}

export const no = (i: number) => String(i + 1).padStart(2, '0')

/* ---------- 항목 줄 만들기 ---------- */

export interface Line {
  kr: { size: number; font: Font; tone: Tone; opacity?: number }
  en: { size: number; font: Font; tone: Tone; opacity?: number }
  /** 번호 칸 — 있으면 맨 앞, 국문은 numW 뒤에서 시작 */
  num?: { size: number; font: Font; tone: Tone; opacity?: number; w: number }
  gap: number
}

export function rows(items: TocItem[], ln: Line, from = 0): Item[] {
  return items.map((it, i) => ({
    k: 'row' as const,
    gap: ln.gap,
    cells: [
      ...(ln.num ? [{ s: no(from + i), dx: 0, ...ln.num }] : []),
      { s: it.kr, dx: ln.num ? ln.num.w : 0, ...ln.kr },
      { s: it.en, dx: 14, flow: true, ...ln.en },
    ],
  }))
}

/** 목록을 n단으로 나눠 블록 여러 개로 (위에서부터 채움) */
function split<T>(a: T[], n: number): T[][] {
  const per = Math.ceil(a.length / n)
  return Array.from({ length: n }, (_, i) => a.slice(i * per, (i + 1) * per)).filter((x) => x.length)
}

/* ---------- 선언 ---------- */

export function tocDecls(sec: TocSection[]): { base: PageDecl; variants: PageDecl[] } {
  const [basic, app] = sec

  /** 원본 목차 — 회색 바탕, 왼쪽 위 로고, 오른쪽 아래 두 단 (실측 그대로) */
  const ORIG: Line = {
    kr: { size: 20, font: 'esamanruOTFLight', tone: 'black' },
    en: { size: 20, font: 'esamanruOTFLight', tone: 'black', opacity: 0.45 },
    gap: 24.4,
  }
  const origCol = (s: TocSection, x: number, len: number): Block => ({
    x, y: 3.687, align: 'left', valign: 'top', items: [
      { k: 'row', gap: 22.7, cells: [
        { s: s.kr, dx: 0, size: 30.5, font: 'esamanruOTFMedium', tone: 'black' },
        { s: s.en, dx: 10, flow: true, size: 27, font: 'Prohibition-Regular', tone: 'black' },
      ] },
      { k: 'rule', len, tone: 'black', w: 1, gap: 22.7 },
      ...rows(s.items, ORIG),
    ],
  })
  const base: PageDecl = {
    id: 't00', name: '원본', note: '회색 바탕 · 왼쪽 위 작은 로고 · 오른쪽 아래 두 단(국문 장 제목+영문, 괘선, 항목). 구분표(|)를 빼고 영문을 옅게',
    bg: 'gray',
    blocks: [
      { x: 0, y: -0.121, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50.68, mode: 'color' }] },
      origCol(basic, 6.17, 2.407),
      origCol(app, 9.05, 2.914),
    ],
  }

  /* 01 — 흰 바탕, 1/3 선부터 두 단. 장 번호를 크게 */
  const L1: Line = {
    num: { size: 16, font: 'Inter-Medium', tone: 'mute', w: 44 },
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'ink' },
    en: { size: 18, font: 'Inter-Regular', tone: 'mute' },
    gap: 26,
  }
  const col1 = (s: TocSection, si: number, x: number): Block => ({
    x, y: 0, align: 'left', valign: 'top', items: [
      { k: 'text', part: `n${si}`, size: 96, font: 'Prohibition-Regular', tone: 'blue', gap: 36 },
      { k: 'row', gap: 28, cells: [
        { s: s.kr, dx: 0, size: 30, font: 'esamanruOTFMedium', tone: 'black' },
        { s: s.en, dx: 12, flow: true, size: 27, font: 'Prohibition-Regular', tone: 'blue', opacity: 0.4 },
      ] },
      { k: 'rule', len: 3.6, tone: 'black', w: 1, opacity: 0.5, gap: 32 },
      ...rows(s.items, L1),
    ],
  })
  const v1: PageDecl = {
    id: 't01', name: '번호 두 단', note: '흰 바탕. 원본의 1/3 분할선(4단)과 8단에서 두 단을 시작하고, 장 번호를 크게 · 항목마다 번호',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      col1(basic, 0, 4),
      col1(app, 1, 8),
    ],
  }

  /* 02 — 파랑 바탕을 좌우 반으로, 장마다 영문 장 제목을 크게 */
  const L2: Line = {
    kr: { size: 24, font: 'Pretendard-Medium', tone: 'light' },
    en: { size: 18, font: 'Inter-Regular', tone: 'light', opacity: 0.6 },
    gap: 22,
  }
  const half = (s: TocSection, si: number, x: number): Block[] => [
    { x, y: 0, align: 'left', valign: 'top', items: [
      { k: 'text', part: `en${si}`, size: 110, font: 'Prohibition-Regular', tone: 'light', lead: 0.95, gap: 24 },
      { k: 'text', part: `kr${si}`, size: 28, font: 'esamanruOTFMedium', tone: 'light', opacity: 0.7 },
    ] },
    { x, y: 8, align: 'left', valign: 'bottom', items: rows(s.items, L2) },
  ]
  const v2: PageDecl = {
    id: 't02', name: '좌우 반 · 영문 장 제목', note: '파랑 바탕을 6단씩 둘로 나눠 장마다 영문 장 제목을 위에 크게, 항목은 아래로 내려 바닥선에 맞춤',
    bg: 'blue',
    blocks: [...half(basic, 0, 0), ...half(app, 1, 6.15)],
  }

  /* 03 — 왼쪽 1/3 파랑 면에 장 제목 둘, 오른쪽 2/3에 항목 */
  const L3: Line = {
    num: { size: 16, font: 'Inter-Medium', tone: 'blue', w: 44 },
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'ink' },
    en: { size: 18, font: 'Inter-Regular', tone: 'mute' },
    gap: 26,
  }
  const [b1, b2] = split(basic.items, 2)
  const head3 = (si: number): Item[] => [
    { k: 'text', part: `n${si}`, size: 24, font: 'Inter-Medium', tone: 'light', opacity: 0.6, gap: 14 },
    { k: 'text', part: `en${si}`, size: 56, font: 'Prohibition-Regular', tone: 'light', lead: 0.92, gap: 14 },
    { k: 'text', part: `kr${si}`, size: 24, font: 'esamanruOTFMedium', tone: 'light', gap: 56 },
  ]
  const v3: PageDecl = {
    id: 't03', name: '1/3 색면 · 장 제목 왼쪽', note: '원본 1/3 분할선 왼쪽을 파랑 면으로. 장 제목 둘은 색면에, 항목은 흰 면에 장마다 줄을 맞춰 세 단',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 4, y0: 'edge', y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'mono', tone: 'light' }] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [...head3(0), ...head3(1).map((it, i, a) => (i === a.length - 1 ? { ...it, gap: 0 } : it))] },
      { x: 4.5, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'kr0', size: 18, font: 'esamanruOTFMedium', tone: 'blue', gap: 28 }, ...rows(b1, L3),
      ] },
      { x: 8.25, y: 0, align: 'left', valign: 'top', items: [
        { k: 'space', h: 18 * 0.74, gap: 28 }, ...rows(b2, L3, b1.length),
      ] },
      { x: 4.5, y: 5.2, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'kr1', size: 18, font: 'esamanruOTFMedium', tone: 'blue', gap: 28 }, ...rows(app.items, L3),
      ] },
    ],
  }

  /* 04 — 회색 바탕(원본), 장을 가로 띠로. 왼쪽 4단에 장 제목, 오른쪽 8단에 항목 세 단 */
  const L4: Line = {
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'black' },
    en: { size: 18, font: 'Inter-Regular', tone: 'black', opacity: 0.5 },
    gap: 26,
  }
  const band = (s: TocSection, si: number, y: number): Block[] => {
    const parts = split(s.items, 3)
    let from = 0
    return [
      { x: 0, y, align: 'left', valign: 'top', items: [
        { k: 'rule', len: 12, tone: 'black', w: 1, opacity: 0.5, gap: 32 },
        { k: 'text', part: `kr${si}`, size: 36, font: 'esamanruOTFMedium', tone: 'black', gap: 16 },
        { k: 'text', part: `enl${si}`, size: 30, font: 'Prohibition-Regular', tone: 'blue' },
      ] },
      ...parts.map((p, i): Block => {
        const b: Block = { x: 4 + i * 2.67, y, align: 'left', valign: 'top', items: [{ k: 'space', h: 1, gap: 32 }, ...rows(p, L4, from)] }
        from += p.length
        return b
      }),
    ]
  }
  const v4: PageDecl = {
    id: 't04', name: '가로 띠', note: '원본 회색 바탕. 장마다 쪽 폭 괘선으로 띠를 나누고, 장 제목은 왼쪽 1/3, 항목은 오른쪽 2/3에 세 단',
    bg: 'gray',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      ...band(basic, 0, 1.6),
      ...band(app, 1, 5.6),
    ],
  }

  /* 05 — 먹색 바탕, 두 장을 각자 단의 가운데 축에 */
  const L5: Line = {
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'white' },
    en: { size: 18, font: 'Inter-Regular', tone: 'white', opacity: 0.45 },
    gap: 26,
  }
  const left5 = (s: TocSection, si: number, x: number): Block => ({
    x, y: 0, align: 'left', valign: 'top', items: [
      { k: 'text', part: `n${si}`, size: 24, font: 'Inter-Medium', tone: 'blue', gap: 20 },
      { k: 'text', part: `enl${si}`, size: 64, font: 'Prohibition-Regular', tone: 'white', gap: 16 },
      { k: 'text', part: `kr${si}`, size: 24, font: 'esamanruOTFMedium', tone: 'white', opacity: 0.6, gap: 48 },
      ...rows(s.items, L5),
    ],
  })
  const v5: PageDecl = {
    id: 't05', name: '먹색 · 반 나눔', note: '먹색 바탕. 쪽을 반으로 나눠 장마다 장 번호·영문 장 제목·항목을 왼쪽 정렬(0단·6단 선). 두 장의 머리 높이를 맞춤',
    bg: 'black',
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [{ k: 'logo', asset: 'small', h: 40, mode: 'reverse' }] },
      left5(basic, 0, 0),
      left5(app, 1, 6),
    ],
  }

  /* 06 — 파랑 바탕, 왼쪽에 심볼을 크게, 오른쪽 한 단에 모든 항목을 이어서 */
  const L6: Line = {
    num: { size: 16, font: 'Inter-Medium', tone: 'light', opacity: 0.5, w: 44 },
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'light' },
    en: { size: 18, font: 'Inter-Regular', tone: 'light', opacity: 0.5 },
    gap: 22,
  }
  const head6 = (s: TocSection, si: number, gap: number): Item[] => [
    { k: 'row', gap: 30, cells: [
      { s: no(si), dx: 0, size: 30, font: 'Prohibition-Regular', tone: 'light', opacity: 0.5 },
      { s: s.en.toUpperCase(), dx: 44, size: 30, font: 'Prohibition-Regular', tone: 'light' },
      { s: s.kr, dx: 14, flow: true, size: 22, font: 'esamanruOTFMedium', tone: 'light', opacity: 0.6 },
    ] },
    ...rows(s.items, L6).map((it, i, a) => (i === a.length - 1 ? { ...it, gap } : it)),
  ]
  const v6: PageDecl = {
    id: 't06', name: '심볼 + 한 단 목록', note: '파랑 바탕 왼쪽 아래에 심볼을 단색으로 크게, 오른쪽 한 단에 두 장의 항목을 이어서 (바닥선에 맞춤)',
    bg: 'blue',
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [{ k: 'logo', asset: 'symbol', cols: 5.5, mode: 'mono', tone: 'light' }] },
      { x: 8, y: 8, align: 'left', valign: 'bottom', items: [...head6(basic, 0, 56), ...head6(app, 1, 0)] },
    ],
  }

  /* 07 — 회색 바탕, 오른쪽 정렬 두 단 */
  const L7: Line = {
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'black' },
    en: { size: 18, font: 'Inter-Regular', tone: 'black', opacity: 0.45 },
    gap: 26,
  }
  const right7 = (s: TocSection, si: number, x: number): Block => ({
    x, y: 0, align: 'right', valign: 'top', items: [
      { k: 'text', part: `en${si}`, size: 72, font: 'Prohibition-Regular', tone: 'blue', lead: 0.92, gap: 18 },
      { k: 'text', part: `kr${si}`, size: 24, font: 'esamanruOTFMedium', tone: 'black', gap: 28 },
      { k: 'rule', len: 3, tone: 'black', w: 1, opacity: 0.5, gap: 28 },
      ...rows(s.items, L7),
    ],
  })
  const v7: PageDecl = {
    id: 't07', name: '오른쪽 정렬', note: '원본 회색 바탕. 두 단을 8단·12단 선에 오른쪽 정렬하고, 로고는 왼쪽 아래',
    bg: 'gray',
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      right7(basic, 0, 8),
      right7(app, 1, 12),
    ],
  }

  /* 08 — 흰 바탕, 항목마다 번호를 크게 단 타일 격자 */
  const tile = (si: number, k: number, x: number, y: number): Block => ({
    x, y, align: 'left', valign: 'top', items: [
      { k: 'text', part: `s${si}i${k}no`, size: 40, font: 'Prohibition-Regular', tone: 'blue', gap: 16 },
      { k: 'text', part: `s${si}i${k}kr`, size: 22, font: 'Pretendard-Medium', tone: 'ink', gap: 10 },
      { k: 'text', part: `s${si}i${k}en`, size: 16, font: 'Inter-Regular', tone: 'mute' },
    ],
  })
  const grid8 = (s: TocSection, si: number, y: number): Block[] => [
    { x: 0, y, align: 'left', valign: 'top', items: [
      { k: 'text', part: `kr${si}`, size: 30, font: 'esamanruOTFMedium', tone: 'black', gap: 14 },
      { k: 'text', part: `enl${si}`, size: 27, font: 'Prohibition-Regular', tone: 'blue', opacity: 0.4 },
    ] },
    ...s.items.map((_, k) => tile(si, k, 3 + (k % 6) * 1.5, y + Math.floor(k / 6) * 1.55)),
  ]
  const v8: PageDecl = {
    id: 't08', name: '번호 타일', note: '흰 바탕. 항목 하나를 번호·국문·영문 세 줄짜리 칸으로 만들어 9단에 여섯 칸씩 격자로',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      ...grid8(basic, 0, 1.6),
      ...grid8(app, 1, 5.6),
    ],
  }

  /* 09 — 흰 바탕, 항목 사이에 옅은 괘선을 그은 표 */
  const L9: Line = {
    num: { size: 16, font: 'Inter-Medium', tone: 'blue', w: 48 },
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'ink' },
    en: { size: 18, font: 'Inter-Regular', tone: 'mute' },
    gap: 16,
  }
  const ruled = (items: TocItem[], len: number, from = 0): Item[] =>
    rows(items, L9, from).flatMap((r) => [r, { k: 'rule' as const, len, tone: 'black' as Tone, w: 1, opacity: 0.12, gap: 16 }])
  const [p1, p2] = split(basic.items, 2)
  const v9: PageDecl = {
    id: 't09', name: '괘선 표', note: '흰 바탕. 장 제목을 위에 크게 걸고, 항목 줄마다 옅은 괘선(12%)을 그어 표처럼. 기본 시스템 두 단 + 응용 시스템 한 단',
    bg: 'white',
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'enl0', size: 56, font: 'Prohibition-Regular', tone: 'black', gap: 14 },
        { k: 'text', part: 'kr0', size: 22, font: 'esamanruOTFMedium', tone: 'blue', gap: 40 },
        ...ruled(p1, 3.6),
      ] },
      { x: 4, y: 0, align: 'left', valign: 'top', items: [
        { k: 'space', h: 56 * 0.74, gap: 14 }, { k: 'space', h: 22 * 0.74, gap: 40 },
        ...ruled(p2, 3.6, p1.length),
      ] },
      { x: 8, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'enl1', size: 56, font: 'Prohibition-Regular', tone: 'black', gap: 14 },
        { k: 'text', part: 'kr1', size: 22, font: 'esamanruOTFMedium', tone: 'blue', gap: 40 },
        ...ruled(app.items, 4),
      ] },
    ],
  }

  /* 10 — 오른쪽 1/3을 파랑 면으로, 응용 시스템만 색면에 */
  const L10a: Line = {
    num: { size: 16, font: 'Inter-Medium', tone: 'blue', w: 44 },
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'ink' },
    en: { size: 18, font: 'Inter-Regular', tone: 'mute' },
    gap: 26,
  }
  const L10b: Line = {
    num: { size: 16, font: 'Inter-Medium', tone: 'light', opacity: 0.5, w: 44 },
    kr: { size: 22, font: 'Pretendard-Medium', tone: 'light' },
    en: { size: 18, font: 'Inter-Regular', tone: 'light', opacity: 0.5 },
    gap: 26,
  }
  const [q1, q2] = split(basic.items, 2)
  const head10 = (si: number, tone: Tone): Item[] => [
    { k: 'text', part: `en${si}`, size: 80, font: 'Prohibition-Regular', tone, lead: 0.92, gap: 18 },
    { k: 'text', part: `kr${si}`, size: 24, font: 'esamanruOTFMedium', tone, opacity: 0.6 },
  ]
  const v10: PageDecl = {
    id: 't10', name: '오른쪽 1/3 색면', note: '흰 바탕 오른쪽 1/3(8단 선부터)을 파랑 면으로. 기본 시스템은 흰 면에 두 단, 응용 시스템은 색면에. 장 제목은 위, 항목 첫 줄은 세 단이 같은 높이',
    bg: 'white',
    fields: [{ x0: 8, x1: 'edge', y0: 'edge', y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: head10(0, 'black') },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: rows(q1, L10a) },
      { x: 4, y: 8, align: 'left', valign: 'bottom', items: rows(q2, L10a, q1.length).concat(Array(q1.length - q2.length).fill(0).map(() => ({ k: 'space' as const, h: 22 * 0.74, gap: 26 }))) },
      { x: 8.5, y: 0, align: 'left', valign: 'top', items: head10(1, 'light') },
      // 응용 시스템 첫 줄을 기본 시스템 첫 줄(01 심볼) 높이에 맞춘다 — 모자란 줄 수만큼 아래를 비운다
      { x: 8.5, y: 8, align: 'left', valign: 'bottom', items: rows(app.items, L10b).concat(Array(Math.max(0, q1.length - app.items.length)).fill(0).map(() => ({ k: 'space' as const, h: 22 * 0.74, gap: 26 }))) },
    ],
  }

  return { base, variants: [v1, v2, v3, v4, v5, v6, v7, v8, v9, v10] }
}

/** 목차 블록이 쓰는 내용 키 */
export function tocText(sec: TocSection[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  sec.forEach((s, i) => {
    out[`kr${i}`] = [s.kr]
    out[`en${i}`] = s.en.split(/\s+/)
    out[`enl${i}`] = [s.en]
    out[`n${i}`] = [no(i)]
    s.items.forEach((it, k) => {
      out[`s${i}i${k}no`] = [no(k)]
      out[`s${i}i${k}kr`] = [it.kr]
      out[`s${i}i${k}en`] = [it.en]
    })
  })
  return out
}
