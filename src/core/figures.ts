import type { Box, Doc, El, GroupEl } from './doc'
import { isHeadText } from './object'
import type { Area, Special } from './specials'

/**
 * 여백 규정(8)·최소 크기(9)·사용 위반(13)·국문/영문 서체(14·15)·그래픽 모티브(16) 전용 레이아웃.
 * 원본 개체를 '그림 단위'(심볼+여백 상자, 타일 하나, 견본 묶음 …)로 나누고 캡션을 짝지은 뒤,
 * 그림을 줄·격자·목록·크게/작게·재단 띠로 다시 놓는다. 그림 안은 원본 그대로(잘라내기·투명도 포함).
 */

type Text = Extract<El, { t: 'text' }>
interface CapStyle { size: number; font: string; fill: string; opacity?: number }
export interface Figure { els: El[]; box: Box; caption: string[]; cap?: CapStyle }

const union = (bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((b) => b[0])), y0 = Math.min(...bs.map((b) => b[1]))
  const x1 = Math.max(...bs.map((b) => b[0] + b[2])), y1 = Math.max(...bs.map((b) => b[1] + b[3]))
  return [x0, y0, x1 - x0, y1 - y0]
}
const near = (a: Box, b: Box, pad: number) =>
  a[0] - pad < b[0] + b[2] && b[0] - pad < a[0] + a[2] && a[1] - pad < b[1] + b[3] && b[1] - pad < a[1] + a[3]
const center = (b: Box) => [b[0] + b[2] / 2, b[1] + b[3] / 2]
const inside = (p: number[], b: Box) => p[0] >= b[0] && p[0] <= b[0] + b[2] && p[1] >= b[1] && p[1] <= b[1] + b[3]
const same = (a: Box, b: Box) => a.every((v, i) => Math.abs(v - b[i]) < 2)

function boxOf(e: El): Box {
  if (e.t === 'text') return [e.x, e.y - e.size * 0.8, e.w ?? e.s.length * e.size * 0.6, e.size]
  return e.box
}
/** 실제로 보이는 요소만 — 잘린 상자가 0인 것(쪽 밖 모티브 선)은 뺀다 */
const visible = (e: El) => !(e.clip && (e.clip[2] < 1 || e.clip[3] < 1))

/** 서로 닿는(pad 이내) 요소끼리 묶는다 */
function cluster(els: El[], pad: number): El[][] {
  const groups: { els: El[]; box: Box }[] = []
  for (const e of els) {
    const b = boxOf(e)
    const hits = groups.filter((g) => near(g.box, b, pad))
    const merged = { els: [...hits.flatMap((h) => h.els), e], box: union([b, ...hits.map((h) => h.box)]) }
    for (const h of hits) groups.splice(groups.indexOf(h), 1)
    groups.push(merged)
  }
  return groups.map((g) => g.els)
}

/** 같은 베이스라인의 글 조각을 한 줄로 ('인쇄물' '|' ' 넓이 20mm' → '인쇄물 | 넓이 20mm') */
function lines(ts: Text[]): { s: string; y: number; t: Text }[] {
  const by = new Map<number, Text[]>()
  ts.forEach((t) => { const k = Math.round(t.y); by.set(k, [...(by.get(k) ?? []), t]) })
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([y, row]) => {
    const r = row.sort((a, b) => a.x - b.x)
    return { y, t: r[0], s: r.map((t) => t.s).join('').replace(/\s*\|\s*/g, ' | ').trim() }
  })
}

const objEls = (doc: Doc, n: number) => doc.pages[n - 1].els.filter((e) => !isHeadText(e) && visible(e))
const fig = (els: El[], caption: string[] = [], cap?: CapStyle): Figure => ({ els, box: union(els.map(boxOf)), caption, cap })
const capOf = (t: Text): CapStyle => ({ size: t.size, font: t.font, fill: t.fill, opacity: t.opacity })

/* ------------------------------------------------------------------ *
 * 쪽마다 그림 나누기
 * ------------------------------------------------------------------ */

export function figuresOf(doc: Doc, n: number): Figure[] {
  const els = objEls(doc, n)
  switch (n) {
    case 8: // 심볼·시그니처와 그 둘레 여백 상자 — 닿는 것끼리
      return cluster(els, 24).map((g) => fig(g)).sort((a, b) => a.box[1] - b.box[1])
    case 9: { // 로고+치수 괄호 묶음, 오른쪽 설명 두 줄
      const shapes = els.filter((e) => e.t !== 'text')
      const ts = els.filter((e): e is Text => e.t === 'text')
      const gs = cluster(shapes, 30).map((g) => fig(g)).sort((a, b) => a.box[1] - b.box[1])
      const ls = lines(ts)
      gs.forEach((g) => {
        const mine = ls.filter((l) => Math.abs(l.y - center(g.box)[1]) < 90)
        g.caption = mine.map((l) => l.s)
        if (mine[0]) g.cap = capOf(mine[0].t)
      })
      return gs
    }
    case 13: { // 옅은 타일 9장 + 위 설명
      const tiles = els.filter((e): e is Extract<El, { t: 'rect' }> => e.t === 'rect' && Math.abs(e.box[2] - 367) < 3 && Math.abs(e.box[3] - 216) < 3)
      const ts = els.filter((e): e is Text => e.t === 'text')
      return tiles.sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]).map((tile) => {
        const content = els.filter((e) => e !== tile && e.t !== 'text' && !tiles.includes(e as never) && inside(center(boxOf(e)), tile.box))
        const c = ts.find((t) => Math.abs(t.x - tile.box[0]) < 3 && t.y < tile.box[1] && t.y > tile.box[1] - 40)
        return { els: [tile, ...content], box: tile.box, caption: c ? [c.s] : [], cap: c ? capOf(c) : undefined }
      })
    }
    case 14:
    case 15: { // 제목 견본·본문 견본, 위의 '국문 제목 | 이사만루체' 줄이 설명
      const ts = els.filter((e): e is Text => e.t === 'text')
      const labels = lines(ts.filter((t) => t.size === 16 && t.x < 1000 && t.fill === '#9d9d9d'))
      return labels.map((lab, i) => {
        const next = labels[i + 1]?.y ?? Infinity
        const body = ts.filter((t) => t.y > lab.y + 5 && t.y < next - 5)
        return { ...fig(body), caption: [lab.s], cap: capOf(lab.t) }
      })
    }
    case 16: { // 모티브 타일 4장 — 바탕 면 + 그 면으로 잘린 조각들
      const bgs = els.filter((e) => e.t === 'path' && !e.clip && Math.abs(e.box[2] - 565) < 3)
      return bgs.map((bg) => fig([bg, ...els.filter((e) => e.clip && same(e.clip, (bg as { box: Box }).box))])).map((f, i) => ({ ...f, box: (bgs[i] as { box: Box }).box }))
    }
  }
  return []
}

/* ------------------------------------------------------------------ *
 * 놓기
 * ------------------------------------------------------------------ */

let gid = 0
const nid = () => `fg${gid++}`
interface Frame { x: number; y: number; w: number; h: number }

/**
 * 그림을 틀에 맞춰 옮긴다. contain: 틀 안에 들어가게(원본보다 maxScale배 넘게 키우지 않음), cover: 틀을 채우고 넘치는 건 자른다
 */
function put(f: Figure, fr: Frame, mode: 'contain' | 'cover' = 'contain', maxScale = 1, align: 'center' | 'left' = 'center', fixed?: number): { el: GroupEl; box: Box } {
  const [bx, by, bw, bh] = f.box
  const k = fixed ?? (mode === 'cover' ? Math.max(fr.w / bw, fr.h / bh) : Math.min(maxScale, fr.w / bw, fr.h / bh))
  const w = bw * k, h = bh * k
  const x = align === 'left' && mode === 'contain' ? fr.x : fr.x + (fr.w - w) / 2
  const y = fr.y + (fr.h - h) / 2
  const el: GroupEl = { t: 'group', id: nid(), box: [x, y, w, h], tf: [k, x - bx * k, y - by * k], els: f.els }
  if (mode === 'cover') el.clip = [fr.x, fr.y, fr.w, fr.h]
  return { el, box: mode === 'cover' ? [fr.x, fr.y, fr.w, fr.h] : [x, y, w, h] }
}

const DEF_CAP: CapStyle = { size: 16, font: 'Pretendard-Regular', fill: '#9d9d9d' }
function caption(f: Figure, x: number, y: number, anchor: 'start' | 'end' = 'start', lead = 1.5): El[] {
  const c = f.cap ?? DEF_CAP
  return f.caption.map((s, i) => ({ t: 'text', id: nid(), s, x, y: y + i * c.size * lead, size: c.size, font: c.font, fill: c.fill, opacity: c.opacity, anchor }))
}
const capH = (f: Figure) => (f.caption.length ? (f.cap ?? DEF_CAP).size * 1.5 * f.caption.length + 12 : 0)
const tint = (x: number, y: number, w: number, h: number, fill = '#004ed8', opacity = 0.05): El => ({ t: 'rect', id: nid(), box: [x, y, w, h], fill, opacity })


/**
 * 한 배율 — 그림끼리 크기 관계가 내용인 쪽(최소 크기 20mm·10mm, 여백 규정)은 모든 그림을 같은 배율로.
 * 각 틀에 들어가는 배율 중 가장 작은 것
 */
const common = (fs: Figure[], frames: Frame[], maxScale: number) =>
  Math.min(maxScale, ...fs.map((f, i) => Math.min(frames[i].w / f.box[2], frames[i].h / f.box[3])))

/** 가로 한 줄 — 같은 높이 칸에 나란히, 설명은 아래 */
function row(fs: Figure[], o: { gap?: number; tile?: boolean; maxScale?: number; area: Area; uniform?: boolean }): El[] {
  const a = o.area, gap = o.gap ?? 32
  const w = (a.r - a.x - gap * (fs.length - 1)) / fs.length
  const ch = Math.max(...fs.map(capH))
  const out: El[] = []
  const h = a.b - a.y - ch
  const frames = fs.map((_, i) => {
    const x = a.x + i * (w + gap)
    return { x: x + (o.tile ? w * 0.1 : 0), y: a.y + (o.tile ? h * 0.1 : 0), w: w * (o.tile ? 0.8 : 1), h: h * (o.tile ? 0.8 : 1) }
  })
  const k = o.uniform ? common(fs, frames, o.maxScale ?? 1) : undefined
  fs.forEach((f, i) => {
    const x = a.x + i * (w + gap)
    if (o.tile) out.push(tint(x, a.y, w, h))
    const p = put(f, frames[i], 'contain', o.maxScale ?? 1, 'center', k)
    out.push(p.el, ...caption(f, x, a.y + h + 30))
  })
  return out
}

/** 격자 — cols 단, 설명은 칸 아래(below) 또는 칸 안 왼쪽 위(inside) */
function grid(fs: Figure[], cols: number, o: { gap?: number; cap?: 'below' | 'inside'; mode?: 'contain' | 'cover'; area: Area }): El[] {
  const a = o.area, gap = o.gap ?? 24
  const rows = Math.ceil(fs.length / cols)
  const ch = o.cap === 'below' ? Math.max(...fs.map(capH)) : 0
  const w = (a.r - a.x - gap * (cols - 1)) / cols
  const h = (a.b - a.y - gap * (rows - 1)) / rows - ch
  const out: El[] = []
  fs.forEach((f, i) => {
    const x = a.x + (i % cols) * (w + gap), y = a.y + Math.floor(i / cols) * (h + ch + gap)
    out.push(put(f, { x, y, w, h }, o.mode ?? 'contain', 3).el)
    if (o.cap === 'below') out.push(...caption(f, x, y + h + 26))
    if (o.cap === 'inside') out.push(...caption(f, x + 16, y + 30))
  })
  return out
}

/** 세로 목록 — 그림은 오른쪽 끝을 맞추고 설명은 옆 단 */
function list(fs: Figure[], o: { capW?: number; area: Area; capSide?: 'left' | 'right'; uniform?: boolean; maxScale?: number }): El[] {
  const a = o.area, capW = o.capW ?? 320, gap = 48
  const h = (a.b - a.y - gap * (fs.length - 1)) / fs.length
  const out: El[] = []
  const left = o.capSide === 'left'
  const fx = left ? a.x + capW : a.x, fw = a.r - a.x - capW
  const frames = fs.map((_, i) => ({ x: fx, y: a.y + i * (h + gap), w: fw, h }))
  const k = o.uniform ? common(fs, frames, o.maxScale ?? 1) : undefined
  fs.forEach((f, i) => {
    const p = put(f, frames[i], 'contain', o.maxScale ?? 1, left ? 'left' : 'center', k)
    out.push(p.el)
    const c = f.cap ?? DEF_CAP
    const cy = p.box[1] + p.box[3] / 2 - ((f.caption.length - 1) * c.size * 1.5) / 2 + c.size * 0.35
    out.push(...caption(f, left ? a.x : a.r - capW + 40, cy))
  })
  return out
}

/** 하나 크게 + 나머지 작게 (오른쪽 또는 아래로) */
function feature(fs: Figure[], o: { side?: 'right' | 'below'; split?: number; cols?: number; area: Area }): El[] {
  const a = o.area, gap = 24
  const [main, ...rest] = fs
  const out: El[] = []
  if ((o.side ?? 'right') === 'right') {
    const mw = (a.r - a.x - gap) * (o.split ?? 0.62)
    out.push(put(main, { x: a.x, y: a.y, w: mw, h: a.b - a.y - capH(main) }, 'contain', 3).el, ...caption(main, a.x, a.b - capH(main) + 30))
    out.push(...grid(rest, o.cols ?? 1, { area: { x: a.x + mw + gap, y: a.y, r: a.r, b: a.b }, cap: 'below', gap: 20 }))
  } else {
    const mh = (a.b - a.y - gap) * (o.split ?? 0.6)
    out.push(put(main, { x: a.x, y: a.y, w: a.r - a.x, h: mh - capH(main) }, 'contain', 3).el, ...caption(main, a.x, a.y + mh - capH(main) + 30))
    out.push(...grid(rest, o.cols ?? rest.length, { area: { x: a.x, y: a.y + mh + gap, r: a.r, b: a.b }, cap: 'below', gap: 20 }))
  }
  return out
}

/** 옅은 판(주조색 5%)을 개체 자리에 깔고 그 위에 그림을 나란히 */
function panel(fs: Figure[], a: Area): El[] {
  return [tint(a.x, a.y, a.r - a.x, a.b - a.y), ...row(fs, { area: { x: a.x + 64, y: a.y + 64, r: a.r - 64, b: a.b - 40 }, gap: 64, maxScale: 1.3, uniform: true })]
}

/* ------------------------------------------------------------------ *
 * 쪽마다 4개 — 틀(내지 1–4)은 고정, 개체 자리(a) 안의 표현만
 * ------------------------------------------------------------------ */

const S = (id: string, name: string, note: string, draw: (a: Area) => El[]): Special => ({ id, name, note, draw })
/** 한 줄 넷 — 칸 비율 4:3으로 자리 가운데 */
const strip = (a: Area, n: number, gap: number): Area => {
  const w = (a.r - a.x - gap * (n - 1)) / n, h = Math.min(a.b - a.y, w * 0.75), y = (a.y + a.b - h) / 2
  return { ...a, y, b: y + h }
}

export function figureLayouts(doc: Doc, n: number): Special[] {
  const fs = figuresOf(doc, n)
  if (!fs.length) return []
  switch (n) {
    case 8:
      return [
        S('f8a', '나란히', '심볼과 시그니처 여백 그림을 한 줄로 나란히, 세로 가운데 (같은 배율)', (a) => row(fs, { area: a, uniform: true })),
        S('f8b', '옅은 판 둘', '그림마다 옅은 판(주조색 5%)을 깔아 영역을 나눔', (a) => row(fs, { area: a, tile: true, gap: 24, uniform: true })),
        S('f8c', '시그니처 크게', '시그니처 여백 그림을 크게, 심볼 여백 그림은 오른쪽에 작게', (a) => feature([fs[1], fs[0]], { area: a, split: 0.66 })),
        S('f8d', '옅은 판 한 장', '개체 자리 전체에 옅은 판을 한 장 깔고 그 위에 두 그림', (a) => panel(fs, a)),
      ]
    case 9:
      return [
        // 두 크기의 관계(20mm·10mm)가 내용이므로 모든 표현에서 같은 배율
        S('f9a', '나란히 + 아래 설명', '두 크기를 한 줄로 나란히 놓고 치수 설명을 각 그림 아래로. 두 그림은 같은 배율', (a) => row(fs, { area: a, maxScale: 1.4, uniform: true })),
        S('f9b', '설명 왼쪽 목록', '원본의 목록을 뒤집어 설명을 왼쪽 단에, 그림은 그 오른쪽에 왼쪽 맞춤', (a) => list(fs, { area: a, capSide: 'left', capW: 340, uniform: true })),
        S('f9c', '옅은 판', '크기마다 옅은 판 위에 그림, 설명은 판 아래. 같은 배율', (a) => row(fs, { area: a, tile: true, gap: 24, maxScale: 1.4, uniform: true })),
        S('f9d', '설명 오른쪽 목록', '원본처럼 그림 위아래 목록, 설명은 오른쪽 단', (a) => list(fs, { area: a, capW: 300, uniform: true })),
      ]
    case 13:
      return [
        S('f13a', '설명 아래 3×3', '원본 3×3에서 설명을 타일 아래로 내림', (a) => grid(fs, 3, { area: a, cap: 'below', gap: 24 })),
        S('f13b', '틈 없는 격자', '타일 사이 틈을 없애 한 장의 판처럼, 설명은 타일 안 왼쪽 위', (a) => grid(fs, 3, { area: a, cap: 'inside', gap: 2 })),
        S('f13c', '하나 크게 + 여덟', '첫 사례를 크게, 나머지 여덟은 아래 4×2', (a) => feature(fs, { area: a, side: 'below', split: 0.5, cols: 4 })),
        S('f13d', '한 줄 셋 × 셋', '3×3을 넓은 간격으로, 설명은 타일 안 왼쪽 위', (a) => grid(fs, 3, { area: a, cap: 'inside', gap: 40 })),
      ]
    case 14:
    case 15:
      return [
        S(`f${n}a`, '설명 왼쪽 · 견본 오른쪽', "'국문 제목 | 이사만루체' 같은 설명을 왼쪽 단에, 견본은 그 오른쪽에 원래 크기 그대로", (a) => list(fs, { area: a, capSide: 'left', capW: 260, uniform: true })),
        S(`f${n}b`, '제목 견본 크게', '제목 견본을 위에 크게, 본문 견본은 아래', (a) => feature(fs, { area: a, side: 'below', split: 0.5 })),
        S(`f${n}c`, '옅은 판', '견본마다 옅은 판을 깔아 위아래로', (a) => {
          const p = { x: a.x + 32, y: a.y + 24, r: a.r - 32, b: a.b - 24 }, gap = 56, h = (a.b - a.y - gap) / 2
          return [tint(a.x, a.y, a.r - a.x, h), tint(a.x, a.y + h + gap, a.r - a.x, h), ...grid(fs, 1, { area: p, cap: 'below', gap: gap + 48 })]
        }),
        S(`f${n}d`, '견본 위아래 · 설명 아래', '견본 둘을 위아래로, 설명은 견본 아래', (a) => grid(fs, 1, { area: a, cap: 'below', gap: 40 })),
      ]
    case 16:
      return [
        S('f16a', '하나 크게 + 셋', '첫 모티브를 크게, 나머지 셋은 오른쪽에 세로로', (a) => feature(fs, { area: a, split: 0.68 })),
        S('f16b', '한 줄 넷', '네 모티브를 한 줄로', (a) => grid(fs, 4, { gap: 16, mode: 'cover', area: strip(a, 4, 16) })),
        S('f16c', '2×2 (틈 없이)', '개체 자리를 2×2로 틈 없이 채움', (a) => grid(fs, 2, { gap: 0, mode: 'cover', area: a })),
        S('f16d', '한 장 크게 (잘라 씀)', '첫 모티브를 개체 자리 전면에 잘라 깔고, 나머지는 쓰지 않음', (a) => grid(fs.slice(0, 1), 1, { gap: 0, mode: 'cover', area: a })),
      ]
  }
  return []
}
