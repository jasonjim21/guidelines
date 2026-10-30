import type { Doc, DocPage, El } from './doc'
import { faceOf, type FontSet } from './fonts'
import { inkBounds } from './ink'
import { drawMock, mockSize, type MockKind } from './mockup'

/**
 * 장표 블록 엔진 — 표지·목차 변주가 같이 쓴다.
 * 좌표를 박지 않는다. 원본 표지의 여백(100)과 1/3 분할(673)에서 뽑은 그리드 위에 블록을 선언하면
 * 엔진이 좌표를 계산해 원본 재현과 같은 El 배열로 낸다 → 같은 렌더러로 그린다.
 */

/* ---------- 그리드: 원본 표지 실측 ---------- */

export const PAGE = { w: 1920, h: 1080 }
/** 좌우·위 여백 100, 아래는 원본 폴리오 베이스라인 992 */
const L = 100
const R = 1820
const T = 100
const B = 992
/** 12단 — 4단 선이 원본의 1/3 분할(673.3)과 맞는다 */
export const colX = (i: number) => L + ((R - L) / 12) * i
/** 8행 */
export const rowY = (j: number) => T + ((B - T) / 8) * j

/** 원본 색 */
export const C = {
  blue: '#004ed8',
  light: '#eeeeee', // 원본 표지의 글·로고 색
  white: '#ffffff',
  black: '#000000',
  ink: '#222222', // 원본 본문 글색
  gray: '#eeeeee', // 원본 목차 바탕
  mute: '#a4a4a4', // 원본 폴리오 글색
  tint: '#f2f6fd', // 원본 사용 위반 장의 타일 바탕 (주조색 5%)
} as const
export type Tone = keyof typeof C

/** 글자 위쪽(대문자 높이)에서 베이스라인까지 — 블록을 글자 윗선으로 맞추기 위한 값 */
export const CAP = 0.74

/* ---------- 선언 형식 ---------- */

/** 원본 서체 이름 — 무엇으로 그릴지는 fonts.ts가 정한다 */
export type Font =
  | 'esamanruOTFMedium' | 'esamanruOTFBold' | 'esamanruOTFLight'
  | 'Pretendard-Medium' | 'Pretendard-SemiBold' | 'Pretendard-Regular' | 'Pretendard-Light'
  | 'Inter-Regular' | 'Inter-Medium' | 'Inter-SemiBold' | 'Inter-Light'
  | 'Prohibition-Regular'

/** 글 한 덩어리의 모양 */
export interface TextStyle { size: number; font: Font; tone: Tone; opacity?: number }

/**
 * 가로 한 줄의 칸. dx는 블록 정렬선에서 오른쪽으로 떨어진 거리(px).
 * flow면 앞 칸 글이 끝난 자리에서 dx만큼 띄워 잇는다 ('심볼 | Symbol'처럼 글 길이를 따라가는 칸)
 */
export interface Cell extends TextStyle { s: string; dx: number; flow?: boolean }

export type Item =
  /** 내용 키(part)로 줄들을 받아 쌓는다 */
  /**
   * 내용 키(part)의 줄들을 쌓는다. wrap(단 수)을 주면 원본 줄바꿈을 풀고 그 폭으로 어절 단위로 다시 짠다
   */
  | ({ k: 'text'; part: string; lead?: number; gap?: number; wrap?: number } & TextStyle)
  /** 한 줄에 여러 칸 (번호 · 국문 · 영문처럼). 블록 정렬은 줄 전체의 잉크 폭에 맞춘다 */
  | { k: 'row'; cells: Cell[]; gap?: number }
  /** 빈 간격 */
  | { k: 'space'; h: number; gap?: number }
  /**
   * 원본에서 빌린 로고. 크기는 높이(h) 또는 단 수(cols)로. 둘 다 주면 그 상자 안에 맞춘다.
   * mode: color = 원본 2색(파랑+검정), reverse = 검정 부분만 흰색(어두운 바탕), mono = 한 색
   */
  | { k: 'logo'; asset: LogoAsset; h?: number; cols?: number; mode: 'color' | 'reverse' | 'mono'; tone?: Tone; opacity?: number; gap?: number
      /**
       * 시각 크기(px²). 주면 로고마다 비율이 달라도 '보이는 크기'가 비슷하게 — 상자 면적을 이 값에 맞추고(획 밀도 보정),
       * cols·h는 넘지 말아야 할 한계로만 쓴다. 안 주면 cols·h 상자를 꽉 채운다
       */
      area?: number }
  /** 평면 목업 (명함·봉투·쇼핑백·티셔츠). 실제 규격 비율로 그려 단 수·높이 상자 안에 맞춘다. 아래에 규격 설명이 붙는다 */
  | { k: 'mock'; kind: MockKind; cols: number; h: number; gap?: number }
  /** 가로 괘선. len은 단 수 */
  | { k: 'rule'; len: number; tone: Tone; w?: number; opacity?: number; gap?: number }

export interface Block {
  /** 그리드 선 번호 (단 0–12, 행 0–8) */
  x: number
  y: number
  align: 'left' | 'center' | 'right'
  /** y 선에 블록의 윗선·가운데·아랫선(마지막 베이스라인)을 맞춘다 */
  valign: 'top' | 'middle' | 'bottom'
  items: Item[]
  /** x를 단 선 대신 쪽 가운데로 */
  pageCenter?: boolean
  /** x를 단 선 대신 앞 블록(번호)의 글 오른쪽 끝(잉크)에서 gap(px) 띄운 자리로 — 글 길이를 따라가는 배치 */
  beside?: { block: number; gap: number }
}

/** 색 면. 단·행 선 번호, 'edge'는 재단선까지 */
export interface Field { x0: number | 'edge'; x1: number | 'edge'; y0: number | 'edge'; y1: number | 'edge'; tone: Tone }

export interface PageDecl {
  id: string
  name: string
  /** 원본에서 무엇을 바꿨는가 */
  note: string
  bg: Tone
  fields?: Field[]
  blocks: Block[]
}

/** 내용 — 키마다 줄 배열. 선언은 키만 안다 */
export type Content = Record<string, string[]>


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
/** 원본 로고를 (x, y) 왼쪽 위·높이 h로 옮겨 놓는다 — 블록 엔진과 목업이 같이 쓴다 */
export function placeLogo(
  els: El[], id: () => string, doc: Doc, asset: LogoAsset, x: number, y: number, h: number,
  mode: 'color' | 'reverse' | 'mono', tone?: Tone, opacity?: number,
): number {
  const src = logoSrc(doc, asset)
  const k = h / src.box[3]
  const ox = x - src.box[0] * k, oy = y - src.box[1] * k
  src.parts.forEach((p) => {
    const fill = mode === 'mono' ? C[tone ?? 'light'] : p.blue ? C.blue : mode === 'reverse' ? C.white : C.black
    const [px, py, pw, ph] = p.el.box
    if (p.el.t === 'rect') els.push({ t: 'rect', id: id(), box: [ox + px * k, oy + py * k, pw * k, ph * k], fill, opacity })
    else els.push({ t: 'path', id: id(), ref: p.el.id, tf: [k, ox, oy], box: [ox + px * k, oy + py * k, pw * k, ph * k], fill, opacity, evenodd: p.el.evenodd })
  })
  return src.box[2] * k
}

export function logoSrc(doc: Doc, a: LogoAsset): LogoSrc {
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

/**
 * 획 밀도 보정 — 같은 상자 면적이어도 꽉 찬 글자(로고타입)는 크게, 성긴 묶음(세로 시그니처)은 덜 크게 보인다.
 * 눈으로 맞춘 값. 1보다 작을수록 같은 area에서 작게 그린다
 */
const OPTICAL: Record<LogoAsset, number> = { small: 1, symbol: 1, logotype: 0.62, sigH: 0.9, sigV: 0.62 }

function logoSize(doc: Doc, it: Extract<Item, { k: 'logo' }>): { w: number; h: number } {
  const [, , bw, bh] = logoSrc(doc, it.asset).box
  // 단 수와 높이를 둘 다 주면 그 상자 안에 들어가는 크기 — 비율이 다른 로고(가로형·세로형)를 같은 선언으로
  const byW = it.cols ? ((R - L) / 12) * it.cols : Infinity
  const byH = it.h ?? (it.cols ? Infinity : 55)
  let k = Math.min(byW / bw, byH / bh)
  if (it.area) k = Math.min(k, Math.sqrt((it.area * OPTICAL[it.asset]) / (bw * bh)))
  return { w: bw * k, h: bh * k }
}

function lines(part: string, c: Content): string[] {
  return c[part] ?? []
}

/** 항목 높이: 글은 첫 줄 윗선(대문자 높이)부터 마지막 베이스라인까지 */
/** 글 항목의 실제 줄 — wrap이 있으면 어절 단위(keep-all)로 그 폭에 다시 짠다 */
function textLines(it: Extract<Item, { k: 'text' }>, c: Content, fonts: FontSet): string[] {
  const src = lines(it.part, c)
  if (!it.wrap) return src
  const max = ((R - L) / 12) * it.wrap
  const f = faceOf(fonts, it.font)
  const words = src.join(' ').split(/\s+/).filter(Boolean)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && inkBounds(next, it.size, f.family, f.weight).advance > max) { out.push(cur); cur = w } else cur = next
  }
  if (cur) out.push(cur)
  return out
}

function itemH(it: Item, c: Content, doc: Doc, fonts: FontSet): number {
  if (it.k === 'logo') return logoSize(doc, it).h
  if (it.k === 'space') return it.h
  if (it.k === 'row') return Math.max(...it.cells.map((x) => x.size)) * CAP
  if (it.k === 'rule') return it.w ?? 1
  if (it.k === 'mock') return mockSize(it.kind, ((R - L) / 12) * it.cols, it.h).h
  const n = textLines(it, c, fonts).length
  return it.size * CAP + (n - 1) * it.size * (it.lead ?? 1.2)
}

const edgeX = (v: number | 'edge', side: 0 | 1) => (v === 'edge' ? (side ? PAGE.w : 0) : colX(v))
const edgeY = (v: number | 'edge', side: 0 | 1) => (v === 'edge' ? (side ? PAGE.h : 0) : rowY(v))

export function renderPage(d: PageDecl, c: Content, doc: Doc, fonts: FontSet, page = 0): DocPage {
  const els: El[] = []
  let n = 0
  const id = () => `${d.id}-${n++}`
  els.push({ t: 'rect', id: id(), box: [0, 0, PAGE.w, PAGE.h], fill: C[d.bg] })
  d.fields?.forEach((f) => {
    const x0 = edgeX(f.x0, 0), x1 = edgeX(f.x1, 1), y0 = edgeY(f.y0, 0), y1 = edgeY(f.y1, 1)
    els.push({ t: 'rect', id: id(), box: [x0, y0, x1 - x0, y1 - y0], fill: C[f.tone] })
  })

  /** 블록마다 글 잉크의 오른쪽 끝 — beside가 참조한다 */
  const inkRight: number[] = []
  for (const b of d.blocks) {
    let right = -Infinity
    const total = b.items.reduce((h, it, i) => h + itemH(it, c, doc, fonts) + (i < b.items.length - 1 ? it.gap ?? 0 : 0), 0)
    const Y = rowY(b.y)
    let y = b.valign === 'top' ? Y : b.valign === 'bottom' ? Y - total : Y - total / 2
    const X = b.beside ? inkRight[b.beside.block] + b.beside.gap : b.pageCenter ? PAGE.w / 2 : colX(b.x)

    for (const it of b.items) {
      if (it.k === 'text') {
        const pitch = it.size * (it.lead ?? 1.2)
        const f = faceOf(fonts, it.font)
        textLines(it, c, fonts).forEach((s, i) => {
          // 정렬선에 글자 상자가 아니라 획 끝을 맞춘다 (광학 정렬)
          const ink = inkBounds(f.upper ? s.toUpperCase() : s, it.size, f.family, f.weight)
          const x = b.align === 'left' ? X - ink.left : b.align === 'right' ? X - ink.right : X - (ink.left + ink.right) / 2
          els.push({ t: 'text', id: id(), s, x, y: y + it.size * CAP + i * pitch, size: it.size, font: it.font, fill: C[it.tone], anchor: 'start', opacity: it.opacity })
          right = Math.max(right, x + ink.right)
        })
      } else if (it.k === 'row') {
        // 칸들을 정렬선 0 기준으로 먼저 놓고, 잉크 전체 폭으로 블록 정렬(왼·가운데·오른)에 맞춘다
        const base = y + Math.max(...it.cells.map((x) => x.size)) * CAP
        const placed: { cell: Cell; x: number }[] = []
        let end = 0, inkL = Infinity, inkR = -Infinity
        for (const cell of it.cells) {
          const f = faceOf(fonts, cell.font)
          const ink = inkBounds(f.upper ? cell.s.toUpperCase() : cell.s, cell.size, f.family, f.weight)
          const x = cell.flow ? end + cell.dx : cell.dx - ink.left
          placed.push({ cell, x })
          inkL = Math.min(inkL, x + ink.left)
          inkR = Math.max(inkR, x + ink.right)
          end = x + ink.advance
        }
        const shift = b.align === 'left' ? X : b.align === 'right' ? X - inkR : X - (inkL + inkR) / 2
        for (const { cell, x } of placed) {
          els.push({ t: 'text', id: id(), s: cell.s, x: x + shift, y: base, size: cell.size, font: cell.font, fill: C[cell.tone], anchor: 'start', opacity: cell.opacity })
        }
        right = Math.max(right, inkR + shift)
      } else if (it.k === 'space') {
        // 간격만
      } else if (it.k === 'logo') {
        const { w, h } = logoSize(doc, it)
        const x = b.align === 'left' ? X : b.align === 'right' ? X - w : X - w / 2
        placeLogo(els, id, doc, it.asset, x, y, h, it.mode, it.tone, it.opacity)
      } else if (it.k === 'mock') {
        const { w } = mockSize(it.kind, ((R - L) / 12) * it.cols, it.h)
        const x = b.align === 'left' ? X : b.align === 'right' ? X - w : X - w / 2
        els.push(...drawMock(it.kind, x, y, ((R - L) / 12) * it.cols, it.h, { doc, id, fonts }))
      } else {
        const len = ((R - L) / 12) * it.len
        const x = b.align === 'left' ? X : b.align === 'right' ? X - len : X - len / 2
        const lw = it.w ?? 1
        els.push({ t: 'rect', id: id(), box: [x, y, len, lw], fill: C[it.tone], opacity: it.opacity })
      }
      y += itemH(it, c, doc, fonts) + (it.gap ?? 0)
    }
    inkRight.push(right)
  }
  return { page, w: PAGE.w, h: PAGE.h, els }
}
