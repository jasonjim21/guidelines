import type { Doc, DocPage, El } from './doc'

/**
 * 표지 변주 — 원본 표지(1쪽)를 기본형으로, 글의 위치·표현·레이아웃·정렬만 바꾼다.
 * 좌표를 박지 않는다. 원본 표지의 여백(100)과 1/3 분할(673)에서 뽑은 그리드 위에 블록을 선언하면
 * 엔진이 좌표를 계산해 원본 재현과 같은 El 배열로 낸다 → 같은 렌더러로 그린다.
 */

/* ---------- 그리드: 원본 표지 실측 ---------- */

const PAGE = { w: 1920, h: 1080 }
/** 좌우·위 여백 100, 아래는 원본 폴리오 베이스라인 992 */
const L = 100
const R = 1820
const T = 100
const B = 992
/** 12단 — 4단 선이 원본의 1/3 분할(673.3)과 맞는다 */
const colX = (i: number) => L + ((R - L) / 12) * i
/** 8행 */
const rowY = (j: number) => T + ((B - T) / 8) * j

/** 원본 색 */
const C = {
  blue: '#004ed8',
  light: '#eeeeee', // 원본 표지의 글·로고 색
  white: '#ffffff',
  black: '#000000',
  ink: '#222222', // 원본 본문 글색
  gray: '#eeeeee', // 원본 목차 바탕
  mute: '#a4a4a4', // 원본 폴리오 글색
} as const
type Tone = keyof typeof C

/** 글자 위쪽(대문자 높이)에서 베이스라인까지 — 블록을 글자 윗선으로 맞추기 위한 값 */
const CAP = 0.74

/* ---------- 선언 ---------- */

type Part = 'brand' | 'title' | 'titleLine' | 'folio' | 'en'
type Font = 'esamanruOTFMedium' | 'esamanruOTFBold' | 'Pretendard-Medium' | 'Pretendard-SemiBold' | 'Pretendard-Regular' | 'Inter-Regular' | 'Inter-Medium' | 'Prohibition-Regular'

type Item =
  | { k: 'text'; part: Part; size: number; font: Font; tone: Tone; opacity?: number; lead?: number; gap?: number }
  /**
   * 원본에서 빌린 로고. 크기는 높이(h) 또는 단 수(cols)로.
   * mode: color = 원본 2색(파랑+검정), reverse = 검정 부분만 흰색(어두운 바탕), mono = 한 색
   */
  | { k: 'logo'; asset: LogoAsset; h?: number; cols?: number; mode: 'color' | 'reverse' | 'mono'; tone?: Tone; gap?: number }
  /** 가로 괘선. len은 단 수 */
  | { k: 'rule'; len: number; tone: Tone; w?: number; gap?: number }

interface Block {
  /** 그리드 선 번호 (단 0–12, 행 0–8) */
  x: number
  y: number
  align: 'left' | 'center' | 'right'
  /** y 선에 블록의 윗선·가운데·아랫선(마지막 베이스라인)을 맞춘다 */
  valign: 'top' | 'middle' | 'bottom'
  items: Item[]
  /** x를 단 선 대신 쪽 가운데로 */
  pageCenter?: boolean
}

/** 색 면. 단·행 선 번호, 'edge'는 재단선까지 */
interface Field { x0: number | 'edge'; x1: number | 'edge'; y0: number | 'edge'; y1: number | 'edge'; tone: Tone }

export interface CoverDecl {
  id: string
  name: string
  /** 원본에서 무엇을 바꿨는가 */
  note: string
  bg: Tone
  fields?: Field[]
  blocks: Block[]
}

/** 원본 표지 — 기준형. 이 선언으로 그린 것이 원본 재현과 겹쳐야 한다 */
export const BASE: CoverDecl = {
  id: 'c00', name: '원본', note: '파랑 바탕 · 좌상단 브랜드명+제목 · 좌하단 로고+폴리오 · 왼쪽 정렬',
  bg: 'blue',
  blocks: [
    { x: 0, y: 0, align: 'left', valign: 'top', items: [
      { k: 'text', part: 'brand', size: 90, font: 'esamanruOTFMedium', tone: 'light', gap: 60 },
      { k: 'text', part: 'title', size: 70, font: 'Pretendard-Medium', tone: 'light', lead: 1.2 },
    ] },
    { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
      { k: 'logo', asset: 'small', h: 55, mode: 'mono', tone: 'light', gap: 16 },
      { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
    ] },
  ],
}

export const COVERS: CoverDecl[] = [
  /* ----- 로고를 크게 쓰는 표지 5 ----- */
  {
    id: 'c01', name: '심볼 크게 (재단)', note: '파랑 바탕에 심볼을 단색으로 크게 놓아 오른쪽 재단선 밖으로 흘린다. 제목은 왼쪽 위에 작게',
    bg: 'blue',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'light', gap: 28 },
        { k: 'text', part: 'title', size: 40, font: 'Pretendard-Medium', tone: 'light', lead: 1.3 },
      ] },
      { x: 5, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'logo', asset: 'symbol', h: 520, mode: 'mono', tone: 'light' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
      ] },
    ],
  },
  {
    id: 'c02', name: '로고타입 쪽 폭', note: '흰 바탕 아래에 로고타입을 12단 전체 폭으로. 브랜드명 대신 로고타입이 제목 역할',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'title', size: 48, font: 'Pretendard-Medium', tone: 'blue', lead: 1.25 },
      ] },
      { x: 12, y: 0, align: 'right', valign: 'top', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'logo', asset: 'logotype', cols: 12, mode: 'mono', tone: 'black' },
      ] },
    ],
  },
  {
    id: 'c03', name: '세로 시그니처 가운데', note: '흰 바탕 한가운데 세로형 시그니처를 원본 2색으로 크게. 제목은 아래 가운데 한 줄',
    bg: 'white',
    blocks: [
      { x: 6, y: 3.6, pageCenter: true, align: 'center', valign: 'middle', items: [
        { k: 'logo', asset: 'sigV', h: 440, mode: 'color' },
      ] },
      { x: 6, y: 8, pageCenter: true, align: 'center', valign: 'bottom', items: [
        { k: 'text', part: 'titleLine', size: 30, font: 'Pretendard-Medium', tone: 'ink', gap: 20 },
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
    ],
  },
  {
    id: 'c04', name: '가로 시그니처 먹색', note: '먹색 바탕 가운데 높이에 가로형 시그니처를 10단 폭으로. 검정 부분은 흰색, 파랑은 그대로',
    bg: 'black',
    blocks: [
      { x: 0, y: 4, align: 'left', valign: 'middle', items: [
        { k: 'logo', asset: 'sigH', cols: 10, mode: 'reverse' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'titleLine', size: 24, font: 'Pretendard-Medium', tone: 'white', gap: 14 },
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'white', opacity: 0.5 },
      ] },
    ],
  },
  {
    id: 'c05', name: '1/3 색면 + 심볼', note: '1/3 분할선 왼쪽은 파랑 면에 제목, 오른쪽 흰 면 가운데에 심볼을 원본 2색으로 크게',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 4, y0: 'edge', y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 56, font: 'esamanruOTFMedium', tone: 'light', gap: 36 },
        { k: 'text', part: 'title', size: 44, font: 'Pretendard-Medium', tone: 'light', lead: 1.25 },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light', opacity: 0.7 },
      ] },
      { x: 8, y: 4, align: 'center', valign: 'middle', items: [
        { k: 'logo', asset: 'symbol', cols: 6, mode: 'color' },
      ] },
    ],
  },

  /* ----- 글로 짜는 표지 5 ----- */
  {
    id: 'c06', name: '아래로 내린 제목', note: '제목 덩어리를 왼쪽 아래로 내리고 크게. 로고는 왼쪽 위, 폴리오는 오른쪽 아래',
    bg: 'blue',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'logo', asset: 'small', h: 55, mode: 'mono', tone: 'light' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'light', gap: 40 },
        { k: 'text', part: 'title', size: 120, font: 'Pretendard-Medium', tone: 'light', lead: 1.12 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
      ] },
    ],
  },
  {
    id: 'c07', name: '흰 바탕', note: '바탕을 흰색으로 뒤집고 제목을 주조색으로. 로고는 원본 2색으로 오른쪽 아래',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'ink', gap: 48 },
        { k: 'text', part: 'title', size: 100, font: 'Pretendard-SemiBold', tone: 'blue', lead: 1.15 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'logo', asset: 'small', h: 64, mode: 'color' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
    ],
  },
  {
    id: 'c08', name: '영문 제목', note: '먹색 바탕에 영문 제목을 압축 서체 대문자로 크게. 국문은 아래에 한 줄로 작게',
    bg: 'black',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'en', size: 170, font: 'Prohibition-Regular', tone: 'white', lead: 0.92 },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'brand', size: 30, font: 'esamanruOTFMedium', tone: 'white', gap: 14 },
        { k: 'text', part: 'titleLine', size: 24, font: 'Pretendard-Regular', tone: 'white', opacity: 0.6 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'logo', asset: 'small', h: 55, mode: 'reverse' },
      ] },
    ],
  },
  {
    id: 'c09', name: '괘선 위아래', note: '회색 바탕 세로 가운데에 쪽 폭 괘선 하나. 위에 브랜드명, 아래에 한 줄 제목 (원본 목차 장의 괘선 표현)',
    bg: 'gray',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'logo', asset: 'small', h: 55, mode: 'color' },
      ] },
      { x: 0, y: 4, align: 'left', valign: 'middle', items: [
        { k: 'text', part: 'brand', size: 64, font: 'esamanruOTFMedium', tone: 'black', gap: 36 },
        { k: 'rule', len: 12, tone: 'black', w: 2, gap: 40 },
        { k: 'text', part: 'titleLine', size: 64, font: 'Pretendard-Medium', tone: 'blue' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
    ],
  },
  {
    id: 'c10', name: '아래 색 띠', note: '흰 바탕 아래 3/8을 파란 띠로. 제목은 띠 안 왼쪽, 브랜드명은 띠 안 오른쪽 정렬',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 'edge', y0: 5, y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'logo', asset: 'small', h: 64, mode: 'color' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'title', size: 64, font: 'Pretendard-Medium', tone: 'light', lead: 1.2, gap: 48 },
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light', opacity: 0.7 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'text', part: 'brand', size: 140, font: 'esamanruOTFMedium', tone: 'light' },
      ] },
    ],
  },
]

/* ---------- 내용: 원본 표지에서 읽는다 ---------- */

export interface CoverContent { brand: string; title: string[]; folio: string; en: string[] }

export function coverContent(doc: Doc): CoverContent {
  const texts = doc.pages[0].els.filter((e): e is Extract<El, { t: 'text' }> => e.t === 'text')
  const big = Math.max(...texts.map((t) => t.size))
  const brand = texts.find((t) => t.size === big)?.s ?? ''
  const title = texts.filter((t) => t.size < big && t.size > 30).map((t) => t.s)
  const folio = texts.find((t) => t.size <= 20)?.s ?? ''
  // 영문 제목은 폴리오에서 브랜드명·판 번호를 뗀 것 (원본 철자 그대로)
  const en = folio.replace(/^\S+\s+/, '').replace(/\s+Ver\s*[\d.]+$/i, '').split(/\s+/)
  return { brand, title, folio, en }
}

/* ---------- 엔진: 선언 → 좌표 ---------- */

/**
 * 로고 자산 — 원본 쪽에 그려진 로고를 그대로 빌린다 (모양은 assets, 여기서는 쪽 번호만).
 * small: 목차 장의 작은 시그니처 · symbol: 심볼 장 · logotype: 로고타입 장
 * sigH: 가로형 시그니처 장 · sigV: 세로형 시그니처 장
 */
export type LogoAsset = 'small' | 'symbol' | 'logotype' | 'sigH' | 'sigV'
const LOGO_PAGE: Record<LogoAsset, number> = { small: 2, symbol: 4, logotype: 5, sigH: 6, sigV: 7 }

interface LogoPart { el: Extract<El, { t: 'path' | 'rect' }>; blue: boolean }
interface LogoSrc { box: [number, number, number, number]; parts: LogoPart[] }

const logoCache = new Map<string, LogoSrc>()
function logoSrc(doc: Doc, a: LogoAsset): LogoSrc {
  const hit = logoCache.get(a)
  if (hit) return hit
  const page = doc.pages[LOGO_PAGE[a] - 1]
  let parts = page.els.filter((e): e is LogoPart['el'] => (e.t === 'path' || e.t === 'rect') && !!e.fill && !('stroke' in e && e.stroke) && e.box[2] < 1500)
  // 목차 장은 쪽 왼쪽 위의 작은 로고만
  if (a === 'small') parts = parts.filter((e) => e.box[0] < 400 && e.box[1] < 200)
  const x0 = Math.min(...parts.map((e) => e.box[0]))
  const y0 = Math.min(...parts.map((e) => e.box[1]))
  const x1 = Math.max(...parts.map((e) => e.box[0] + e.box[2]))
  const y1 = Math.max(...parts.map((e) => e.box[1] + e.box[3]))
  const src: LogoSrc = { box: [x0, y0, x1 - x0, y1 - y0], parts: parts.map((el) => ({ el, blue: el.fill?.toLowerCase() !== '#000000' })) }
  logoCache.set(a, src)
  return src
}

function logoSize(doc: Doc, it: Extract<Item, { k: 'logo' }>): { w: number; h: number } {
  const [, , bw, bh] = logoSrc(doc, it.asset).box
  if (it.cols) { const w = ((R - L) / 12) * it.cols; return { w, h: (w * bh) / bw } }
  const h = it.h ?? 55
  return { w: (h * bw) / bh, h }
}

function lines(part: Part, c: CoverContent): string[] {
  switch (part) {
    case 'brand': return [c.brand]
    case 'title': return c.title
    case 'titleLine': return [c.title.join(' ')]
    case 'folio': return [c.folio]
    case 'en': return c.en
  }
}

/** 항목 높이: 글은 첫 줄 윗선(대문자 높이)부터 마지막 베이스라인까지 */
function itemH(it: Item, c: CoverContent, doc: Doc): number {
  if (it.k === 'logo') return logoSize(doc, it).h
  if (it.k === 'rule') return it.w ?? 1
  const n = lines(it.part, c).length
  return it.size * CAP + (n - 1) * it.size * (it.lead ?? 1.2)
}

const edgeX = (v: number | 'edge', side: 0 | 1) => (v === 'edge' ? (side ? PAGE.w : 0) : colX(v))
const edgeY = (v: number | 'edge', side: 0 | 1) => (v === 'edge' ? (side ? PAGE.h : 0) : rowY(v))

export function renderCover(d: CoverDecl, c: CoverContent, doc: Doc, page = 0): DocPage {
  const els: El[] = []
  let n = 0
  const id = () => `${d.id}-${n++}`
  els.push({ t: 'rect', id: id(), box: [0, 0, PAGE.w, PAGE.h], fill: C[d.bg] })
  d.fields?.forEach((f) => {
    const x0 = edgeX(f.x0, 0), x1 = edgeX(f.x1, 1), y0 = edgeY(f.y0, 0), y1 = edgeY(f.y1, 1)
    els.push({ t: 'rect', id: id(), box: [x0, y0, x1 - x0, y1 - y0], fill: C[f.tone] })
  })

  for (const b of d.blocks) {
    const total = b.items.reduce((h, it, i) => h + itemH(it, c, doc) + (i < b.items.length - 1 ? it.gap ?? 0 : 0), 0)
    const Y = rowY(b.y)
    let y = b.valign === 'top' ? Y : b.valign === 'bottom' ? Y - total : Y - total / 2
    const X = b.pageCenter ? PAGE.w / 2 : colX(b.x)
    const anchor = b.align === 'left' ? 'start' : b.align === 'right' ? 'end' : 'middle'

    for (const it of b.items) {
      if (it.k === 'text') {
        const pitch = it.size * (it.lead ?? 1.2)
        lines(it.part, c).forEach((s, i) => {
          els.push({ t: 'text', id: id(), s, x: X, y: y + it.size * CAP + i * pitch, size: it.size, font: it.font, fill: C[it.tone], anchor, opacity: it.opacity })
        })
      } else if (it.k === 'logo') {
        const src = logoSrc(doc, it.asset)
        const { w, h } = logoSize(doc, it)
        const x = b.align === 'left' ? X : b.align === 'right' ? X - w : X - w / 2
        const k = h / src.box[3]
        const ox = x - src.box[0] * k, oy = y - src.box[1] * k
        src.parts.forEach((p) => {
          const fill = it.mode === 'mono' ? C[it.tone ?? 'light']
            : p.blue ? C.blue : it.mode === 'reverse' ? C.white : C.black
          const [px, py, pw, ph] = p.el.box
          if (p.el.t === 'rect') els.push({ t: 'rect', id: id(), box: [ox + px * k, oy + py * k, pw * k, ph * k], fill })
          else els.push({ t: 'path', id: id(), ref: p.el.id, tf: [k, ox, oy], box: [ox + px * k, oy + py * k, pw * k, ph * k], fill })
        })
      } else {
        const len = ((R - L) / 12) * it.len
        const x = b.align === 'left' ? X : b.align === 'right' ? X - len : X - len / 2
        const lw = it.w ?? 1
        els.push({ t: 'rect', id: id(), box: [x, y, len, lw], fill: C[it.tone] })
      }
      y += itemH(it, c, doc) + (it.gap ?? 0)
    }
  }
  return { page, w: PAGE.w, h: PAGE.h, els }
}
