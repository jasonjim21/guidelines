import type { Doc, DocPage, El } from './doc'
import { faceOf, type FontSet } from './fonts'
import { inkBounds } from './ink'

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
  | ({ k: 'text'; part: string; lead?: number; gap?: number } & TextStyle)
  /** 한 줄에 여러 칸 (번호 · 국문 · 영문처럼). 왼쪽 정렬 블록에서만 쓴다 */
  | { k: 'row'; cells: Cell[]; gap?: number }
  /** 빈 간격 */
  | { k: 'space'; h: number; gap?: number }
  /**
   * 원본에서 빌린 로고. 크기는 높이(h) 또는 단 수(cols)로.
   * mode: color = 원본 2색(파랑+검정), reverse = 검정 부분만 흰색(어두운 바탕), mono = 한 색
   */
  | { k: 'logo'; asset: LogoAsset; h?: number; cols?: number; mode: 'color' | 'reverse' | 'mono'; tone?: Tone; gap?: number }
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

function lines(part: string, c: Content): string[] {
  return c[part] ?? []
}

/** 항목 높이: 글은 첫 줄 윗선(대문자 높이)부터 마지막 베이스라인까지 */
function itemH(it: Item, c: Content, doc: Doc): number {
  if (it.k === 'logo') return logoSize(doc, it).h
  if (it.k === 'space') return it.h
  if (it.k === 'row') return Math.max(...it.cells.map((x) => x.size)) * CAP
  if (it.k === 'rule') return it.w ?? 1
  const n = lines(it.part, c).length
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

  for (const b of d.blocks) {
    const total = b.items.reduce((h, it, i) => h + itemH(it, c, doc) + (i < b.items.length - 1 ? it.gap ?? 0 : 0), 0)
    const Y = rowY(b.y)
    let y = b.valign === 'top' ? Y : b.valign === 'bottom' ? Y - total : Y - total / 2
    const X = b.pageCenter ? PAGE.w / 2 : colX(b.x)

    for (const it of b.items) {
      if (it.k === 'text') {
        const pitch = it.size * (it.lead ?? 1.2)
        const f = faceOf(fonts, it.font)
        lines(it.part, c).forEach((s, i) => {
          // 정렬선에 글자 상자가 아니라 획 끝을 맞춘다 (광학 정렬)
          const ink = inkBounds(f.upper ? s.toUpperCase() : s, it.size, f.family, f.weight)
          const x = b.align === 'left' ? X - ink.left : b.align === 'right' ? X - ink.right : X - (ink.left + ink.right) / 2
          els.push({ t: 'text', id: id(), s, x, y: y + it.size * CAP + i * pitch, size: it.size, font: it.font, fill: C[it.tone], anchor: 'start', opacity: it.opacity })
        })
      } else if (it.k === 'row') {
        const base = y + Math.max(...it.cells.map((x) => x.size)) * CAP
        let end = X
        for (const cell of it.cells) {
          const f = faceOf(fonts, cell.font)
          const ink = inkBounds(f.upper ? cell.s.toUpperCase() : cell.s, cell.size, f.family, f.weight)
          const x = cell.flow ? end + cell.dx : X + cell.dx - ink.left
          els.push({ t: 'text', id: id(), s: cell.s, x, y: base, size: cell.size, font: cell.font, fill: C[cell.tone], anchor: 'start', opacity: cell.opacity })
          end = x + ink.advance
        }
      } else if (it.k === 'space') {
        // 간격만
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
          else els.push({ t: 'path', id: id(), ref: p.el.id, tf: [k, ox, oy], box: [ox + px * k, oy + py * k, pw * k, ph * k], fill, evenodd: p.el.t === 'path' ? p.el.evenodd : undefined })
        })
      } else {
        const len = ((R - L) / 12) * it.len
        const x = b.align === 'left' ? X : b.align === 'right' ? X - len : X - len / 2
        const lw = it.w ?? 1
        els.push({ t: 'rect', id: id(), box: [x, y, len, lw], fill: C[it.tone], opacity: it.opacity })
      }
      y += itemH(it, c, doc) + (it.gap ?? 0)
    }
  }
  return { page, w: PAGE.w, h: PAGE.h, els }
}
