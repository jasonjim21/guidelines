import type { Doc, El } from './doc'
import type { FontSet } from './fonts'
import { placeLogo } from './blocks'

/**
 * 평면 목업 — 응용 시스템 장에 들어가는 명함·봉투·쇼핑백·티셔츠.
 * 통용 규격(mm) 비율 그대로 그리고, 주어진 상자 안에 맞춰 줄인다. 로고는 원본 것을 빌린다.
 * 목업 속 이름·주소 같은 글은 지어내지 않고 회색 막대(자리표시)로 둔다.
 * 아래에 규격 설명(예: '앞면 · 90 × 50 mm')이 붙는다.
 */
export type MockKind = 'card' | 'envS' | 'envL' | 'bag' | 'tee'

interface Piece { x: number; y: number; w: number; h: number; caption: string }

/** 규격(mm)과 판 배치. 판은 왼쪽부터, y는 위에서 */
const SPEC: Record<MockKind, { w: number; h: number; pieces: Piece[] }> = {
  card: { w: 192, h: 50, pieces: [
    { x: 0, y: 0, w: 90, h: 50, caption: '앞면 · 90 × 50 mm' },
    { x: 102, y: 0, w: 90, h: 50, caption: '뒷면' },
  ] },
  envS: { w: 220, h: 105, pieces: [{ x: 0, y: 0, w: 220, h: 105, caption: '소봉투 · 220 × 105 mm' }] },
  envL: { w: 510, h: 330, pieces: [
    { x: 0, y: 0, w: 245, h: 330, caption: '앞면 · 245 × 330 mm' },
    { x: 265, y: 0, w: 245, h: 330, caption: '뒷면' },
  ] },
  // 손잡이 높이 90mm를 위에 둔다. 앞판 320 + 옆판 110
  bag: { w: 430, h: 490, pieces: [{ x: 0, y: 90, w: 430, h: 400, caption: '쇼핑백 · 320 × 400 × 110 mm' }] },
  // L 사이즈 기준 (가슴 단면 약 56cm · 총장 약 74cm), 소매 포함 폭 820
  tee: { w: 1720, h: 740, pieces: [
    { x: 0, y: 0, w: 820, h: 740, caption: '앞면 · L 사이즈 기준' },
    { x: 900, y: 0, w: 820, h: 740, caption: '뒷면' },
  ] },
}

/** 규격 설명 줄 높이 (화면 px, 줄이지 않는다) */
const CAPTION_H = 40
const CAPTION_SIZE = 16

export function mockSize(kind: MockKind, maxW: number, maxH: number): { w: number; h: number; s: number } {
  const sp = SPEC[kind]
  const s = Math.min(maxW / sp.w, (maxH - CAPTION_H) / sp.h)
  return { w: sp.w * s, h: sp.h * s + CAPTION_H, s }
}

const BLUE = '#004ed8'
const BLUE_DARK = '#003da8'
const LINE = '#d4d4d4'
const BAR = '#dcdcdc'

export function drawMock(kind: MockKind, x: number, y: number, maxW: number, maxH: number, ctx: { doc: Doc; id: () => string; fonts: FontSet }): El[] {
  const { s } = mockSize(kind, maxW, maxH)
  const { doc, id } = ctx
  const els: El[] = []
  const X = (mm: number) => x + mm * s
  const Y = (mm: number) => y + mm * s
  /** 사각형 판 — 테두리는 화면 1px */
  const panel = (mx: number, my: number, mw: number, mh: number, fill: string, stroke?: string, clip?: boolean) => {
    const [px, py, pw, ph] = [X(mx), Y(my), mw * s, mh * s]
    els.push({ t: 'path', id: id(), box: [px, py, pw, ph], d: `M${px} ${py}H${px + pw}V${py + ph}H${px}Z`, fill, stroke, sw: stroke ? 1 : undefined })
    return clip ? ([px, py, pw, ph] as [number, number, number, number]) : undefined
  }
  /** 글 자리표시 막대 */
  const bar = (mx: number, my: number, mw: number, mh: number, fill = BAR, opacity?: number) =>
    els.push({ t: 'rect', id: id(), box: [X(mx), Y(my), mw * s, mh * s], fill, opacity })
  /** 로고를 mm 높이로 */
  const logo = (asset: Parameters<typeof placeLogo>[3], mx: number, my: number, mh: number, mode: 'color' | 'reverse' | 'mono', tone?: 'white' | 'light' | 'black') =>
    placeLogo(els, id, doc, asset, X(mx), Y(my), mh * s, mode, tone)
  /** 로고를 가로 가운데로 — 먼저 폭을 재려고 한 번 놓고 옮긴다 */
  const logoCenter = (asset: Parameters<typeof placeLogo>[3], cx: number, my: number, mh: number, mode: 'color' | 'reverse' | 'mono', tone?: 'white' | 'light' | 'black') => {
    const tmp: El[] = []
    const w = placeLogo(tmp, () => 'tmp', doc, asset, 0, 0, mh * s, mode, tone)
    placeLogo(els, id, doc, asset, X(cx) - w / 2, Y(my), mh * s, mode, tone)
  }

  switch (kind) {
    case 'card': {
      panel(0, 0, 90, 50, '#ffffff', LINE)
      logoCenter('sigH', 45, 20.5, 9, 'color')
      panel(102, 0, 90, 50, BLUE)
      logo('small', 110, 8, 5, 'mono', 'white')
      bar(110, 27, 22, 3.2, '#ffffff', 0.9)
      bar(110, 32.5, 14, 2, '#ffffff', 0.6)
      ;[37, 40.4, 43.8].forEach((yy, i) => bar(110, yy, [34, 30, 26][i], 1.6, '#ffffff', 0.45))
      break
    }
    case 'envS': {
      panel(0, 0, 220, 105, '#ffffff', LINE)
      logo('sigH', 12, 12, 8, 'color')
      bar(12, 25, 64, 2.2)
      bar(12, 29.5, 48, 2.2)
      break
    }
    case 'envL': {
      panel(0, 0, 245, 330, '#ffffff', LINE)
      logo('sigH', 18, 18, 14, 'color')
      ;[296, 302, 308].forEach((yy, i) => bar(18, yy, [92, 76, 60][i], 2.6))
      // 뒷면 — 파랑 바탕에 표지의 모티브 선을 옮겨 깐다 (그래픽 모티브)
      const clip = panel(265, 0, 245, 330, BLUE, undefined, true)!
      const k = (330 * s) / 1080
      const ox = X(265) - 820 * k, oy = Y(0)
      ;['p1-2', 'p1-3', 'p1-4', 'p1-5'].forEach((ref) =>
        els.push({ t: 'path', id: id(), ref, tf: [k, ox, oy], box: clip, stroke: '#ffffff', sw: 1.2 / k, opacity: 0.45, clip }))
      logo('small', 283, 302, 10, 'mono', 'white')
      break
    }
    case 'bag': {
      // 손잡이 — 끈 두 줄
      const hw = 3 * s
      ;[[100, 220]].forEach(([a, b]) => {
        const d = `M${X(a)} ${Y(92)}C${X(a)} ${Y(-6)} ${X(b)} ${Y(-6)} ${X(b)} ${Y(92)}`
        els.push({ t: 'path', id: id(), box: [X(a), Y(0), (b - a) * s, 92 * s], d, stroke: '#1d1d1d', sw: hw })
      })
      panel(0, 90, 320, 400, BLUE)
      panel(320, 90, 110, 400, BLUE_DARK)
      logoCenter('sigH', 160, 250, 40, 'mono', 'white')
      logoCenter('symbol', 375, 270, 18, 'mono', 'white')
      // 손잡이 구멍
      ;[100, 220].forEach((a) => els.push({ t: 'path', id: id(), box: [X(a) - 4 * s, Y(102), 8 * s, 8 * s], d: circle(X(a), Y(106), 3.5 * s), fill: '#ffffff', opacity: 0.9 }))
      break
    }
    case 'tee': {
      const tee = (ox: number, neck: number) =>
        `M${X(ox + 290)} ${Y(0)}Q${X(ox + 410)} ${Y(neck * 2)} ${X(ox + 530)} ${Y(0)}L${X(ox + 720)} ${Y(40)}L${X(ox + 820)} ${Y(230)}L${X(ox + 700)} ${Y(300)}L${X(ox + 660)} ${Y(250)}L${X(ox + 660)} ${Y(740)}L${X(ox + 160)} ${Y(740)}L${X(ox + 160)} ${Y(250)}L${X(ox + 120)} ${Y(300)}L${X(ox)} ${Y(230)}L${X(ox + 100)} ${Y(40)}Z`
      els.push({ t: 'path', id: id(), box: [X(0), Y(0), 820 * s, 740 * s], d: tee(0, 90), fill: '#ffffff', stroke: '#c8c8c8', sw: 1 })
      // 가슴(입는 사람 왼쪽 = 보는 쪽 오른쪽)에 심볼
      logo('symbol', 470, 160, 30, 'color')
      els.push({ t: 'path', id: id(), box: [X(900), Y(0), 820 * s, 740 * s], d: tee(900, 30), fill: '#ffffff', stroke: '#c8c8c8', sw: 1 })
      logoCenter('logotype', 1310, 170, 80, 'mono', 'black')
      break
    }
  }

  // 규격 설명
  SPEC[kind].pieces.forEach((p) => {
    els.push({ t: 'text', id: id(), s: p.caption, x: X(p.x), y: Y(p.y + p.h) + 30, size: CAPTION_SIZE, font: 'Pretendard-Regular', fill: '#8c8c8c', anchor: 'start' })
  })
  return els
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`
