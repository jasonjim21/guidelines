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

const no = (i: number) => String(i + 1).padStart(2, '0')

/* ---------- 항목 줄 만들기 ---------- */

interface Line {
  kr: { size: number; font: Font; tone: Tone; opacity?: number }
  en: { size: number; font: Font; tone: Tone; opacity?: number }
  /** 번호 칸 — 있으면 맨 앞, 국문은 numW 뒤에서 시작 */
  num?: { size: number; font: Font; tone: Tone; opacity?: number; w: number }
  /** 국문과 영문 사이 */
  sep?: { s: string; size: number; font: Font; tone: Tone; opacity?: number }
  gap: number
}

function rows(items: TocItem[], ln: Line, from = 0): Item[] {
  return items.map((it, i) => ({
    k: 'row' as const,
    gap: ln.gap,
    cells: [
      ...(ln.num ? [{ s: no(from + i), dx: 0, ...ln.num }] : []),
      { s: it.kr, dx: ln.num ? ln.num.w : 0, ...ln.kr },
      ...(ln.sep ? [{ ...ln.sep, dx: 10, flow: true }] : []),
      { s: it.en, dx: ln.sep ? 10 : 14, flow: true, ...ln.en },
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
    sep: { s: '|', size: 14, font: 'Pretendard-Light', tone: 'black' },
    en: { size: 20, font: 'esamanruOTFLight', tone: 'black' },
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
    id: 't00', name: '원본', note: '회색 바탕 · 왼쪽 위 작은 로고 · 오른쪽 아래 두 단(국문 장 제목+영문, 괘선, 항목)',
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
    sep: { s: '|', size: 16, font: 'Pretendard-Light', tone: 'mute' },
    en: { size: 18, font: 'Inter-Regular', tone: 'mute' },
    gap: 26,
  }
  const [b1, b2] = split(basic.items, 2)
  const head3 = (si: number): Item[] => [
    { k: 'text', part: `n${si}`, size: 24, font: 'Inter-Medium', tone: 'light', opacity: 0.6, gap: 14 },
    { k: 'text', part: `en${si}`, size: 56, font: 'Prohibition-Regular', tone: 'light', gap: 14 },
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

  return { base, variants: [v1, v2, v3, v4] }
}

/** 목차 블록이 쓰는 내용 키 */
export function tocText(sec: TocSection[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  sec.forEach((s, i) => {
    out[`kr${i}`] = [s.kr]
    out[`en${i}`] = s.en.split(/\s+/)
    out[`enl${i}`] = [s.en]
    out[`n${i}`] = [no(i)]
  })
  return out
}
