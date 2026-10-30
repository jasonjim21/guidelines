import { ASCENT, GRID, LEADING, LIVE, MARGIN, PAGE, STEP, TRACK, COL_W, areaBox, clampTrack, type Box, type Step } from './system'
import { textWidth, wrap, type Font } from './measure'
import { familyOf, type FontPair } from './fonts'
import { mix, rgbLabel, textOn } from './color'
import { MEDIA_LABEL, MEDIA_UNIT, mediaItems, ratioLabel, splitSlash, type DocInput, type MediaItem, type MediaKind, type PageInput } from './schema'
import type { Align, Arrange, Bg, LayoutDecl, Slot, TextPart, Tone, VAlign } from './decl'

/**
 * 선언 + 입력 + 글자체 → 좌표가 찍힌 Op 배열.
 * 미리보기와 PDF는 이 배열 하나를 같은 렌더러(render.tsx)로 그린다.
 */
export type Op =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string; stroke?: string; sw?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; w: number }
  | { t: 'text'; x: number; y: number; s: string; size: number; weight: number; fill: string; anchor: Align; track: number }
  | { t: 'poly'; pts: [number, number][]; fill: string; stroke?: string; sw?: number }
  /** 업로드한 그림 — mono면 바탕 위에서 흰색으로 */
  | { t: 'img'; x: number; y: number; w: number; h: number; src: string; mono: boolean }
  /** 사진 자리표시. 실제 사진 비율로 채웠을 때 잘리는 양을 엔진이 따로 셈한다 */
  | { t: 'photo'; x: number; y: number; w: number; h: number; fill: string; fg: string; label: string }

export type Level = 'hard' | 'soft'
export interface Issue {
  level: Level
  msg: string
  delta: number
  /** 고칠 방법 — "약 120자 줄이기", "두 장으로 나누기" */
  fix?: string
}

export interface PageRender { ops: Op[]; issues: Issue[] }

export interface Ctx {
  doc: DocInput
  page: PageInput
  /** 문서 안 쪽 번호 (1부터) */
  pageNo: number
  /** 이 간지의 장 번호 '01' */
  sectionNo: string
  /** 목차 — 문서의 간지들 */
  toc: { no: string; title: string }[]
  pair: FontPair
}

/* ------------------------------------------------------------------ *
 * 색
 * ------------------------------------------------------------------ */

interface Palette { bg: string; fg: string; muted: string; accent: string; accentSoft: string; tonal: string; onAccent: string; rule: string; tile: string }

const WHITE = '#ffffff'
const INK = '#141414'

function palette(bg: Bg, primary: string): Palette {
  switch (bg) {
    case 'paper':
    case 'gray': {
      const base = bg === 'paper' ? WHITE : '#eeeeee'
      return {
        bg: base, fg: '#222222', muted: '#9a9a9a', accent: primary,
        accentSoft: mix(primary, WHITE, 0.6), tonal: mix(primary, base, 0.9),
        onAccent: textOn(primary), rule: bg === 'paper' ? '#d6d6d6' : '#c4c4c4', tile: mix(primary, WHITE, 0.95),
      }
    }
    case 'primary': {
      const on = textOn(primary)
      return {
        bg: primary, fg: on, muted: mix(primary, on, 0.6), accent: on,
        accentSoft: mix(primary, on, 0.6), tonal: mix(primary, WHITE, 0.09),
        onAccent: on, rule: mix(primary, on, 0.35), tile: mix(primary, WHITE, 0.12),
      }
    }
    case 'ink':
      return {
        bg: INK, fg: WHITE, muted: '#8c8c8c', accent: primary,
        accentSoft: mix(primary, WHITE, 0.45), tonal: '#262626',
        onAccent: WHITE, rule: '#3a3a3a', tile: '#1f1f1f',
      }
  }
}

const toneColor = (p: Palette, t: Tone = 'fg') => p[t]

/* ------------------------------------------------------------------ *
 * 글자
 * ------------------------------------------------------------------ */

interface R {
  c: Ctx
  p: Palette
  family: string
  ops: Op[]
  issues: Issue[]
}

const font = (r: R, step: Step, weight: number): Font => ({ size: STEP[step], weight, family: r.family, track: TRACK[step] })
const lineH = (step: Step) => STEP[step] * LEADING[step]

/** 줄 상자 위쪽 → 베이스라인 */
const baseline = (top: number, step: Step) => top + (lineH(step) - STEP[step]) / 2 + STEP[step] * ASCENT

function textAt(r: R, s: string, x: number, top: number, step: Step, weight: number, fill: string, anchor: Align = 'left') {
  r.ops.push({ t: 'text', x, y: baseline(top, step), s, size: STEP[step], weight, fill, anchor, track: clampTrack(TRACK[step]) })
}

const alignX = (b: Box, a: Align) => (a === 'left' ? b.x : a === 'center' ? b.x + b.w / 2 : b.x + b.w)

function issue(r: R, level: Level, msg: string, delta: number, fix?: string) {
  if (!r.issues.some((i) => i.msg === msg)) r.issues.push({ level, msg, delta, fix })
}

/* ------------------------------------------------------------------ *
 * 칸: 글 묶음
 * ------------------------------------------------------------------ */

function partText(part: TextPart, c: Ctx): string {
  const p = c.page
  switch (part.role) {
    case 'title': return p.title
    case 'subtitle': return p.subtitle
    case 'body': return p.body
    case 'sectionNo': return c.sectionNo
    case 'brand': return c.doc.brand.nameKr
    case 'tocHead': return '목차'
  }
}

function slotText(r: R, s: Extract<Slot, { k: 'text' }>) {
  const B = areaBox(s.area)
  const align = s.align ?? 'left'
  const cols = s.bodyCols ?? 1
  const colW = cols === 2 ? (B.w - GRID.gutter * 2) / 2 : B.w

  // 머리 파트(본문 외)를 먼저 잰다
  type Piece = { part: TextPart; lines: string[] }
  const pieces: Piece[] = []
  for (const part of s.parts) {
    let txt = partText(part, r.c).trim()
    if (!txt) continue
    if (part.upper) txt = txt.toUpperCase()
    const f = font(r, part.step, part.weight ?? 400)
    const w = part.role === 'body' ? colW : B.w
    pieces.push({ part, lines: wrap(txt, w, f, part.role === 'body' ? 'newline' : 'slash') })
  }

  const headH = pieces
    .filter((x) => x.part.role !== 'body')
    .reduce((h, x) => h + x.lines.length * lineH(x.part.step) + (x.part.gap ?? 0), 0)
  const body = pieces.find((x) => x.part.role === 'body')

  if (headH > B.h + 0.5) {
    issue(r, 'hard', `제목이 칸을 ${Math.ceil(headH - B.h)}px 넘칩니다`, -30, '제목을 줄이거나 \'/\' 줄바꿈 위치 바꾸기')
  }

  // 본문 넘침 — 들어가는 줄 수만큼만 그리고, 넘친 글자 수로 고칠 방법을 알려 준다
  let bodyLinesShown: string[][] = []
  let bodyH = 0
  if (body) {
    const lh = lineH(body.part.step)
    const room = Math.max(0, B.h - headH)
    const perCol = Math.floor(room / lh)
    const capLines = perCol * cols
    const all = body.lines
    const shown = all.slice(0, capLines)
    const over = all.slice(capLines)
    if (over.length) {
      const total = all.join('').replace(/\s/g, '').length
      const cut = over.join('').replace(/\s/g, '').length
      const fix = cut > total * 0.4 ? `두 장으로 나누기 (또는 약 ${roundUp(cut)}자 줄이기)` : `약 ${roundUp(cut)}자 줄이기`
      issue(r, 'hard', `본문이 칸을 ${over.length}줄 넘칩니다`, -32, fix)
    }
    bodyLinesShown = cols === 2 ? [shown.slice(0, perCol), shown.slice(perCol)] : [shown]
    bodyH = Math.min(shown.length, perCol) * lh
  }

  if (s.bodyBest && body) {
    const chars = r.c.page.body.replace(/\s/g, '').length
    if (chars < s.bodyBest * 0.5) issue(r, 'soft', `글 중심 구성인데 본문이 ${chars}자로 짧아 단이 빕니다 (${s.bodyBest}자 안팎에 맞춤)`, -Math.min(14, Math.round((1 - chars / s.bodyBest) * 16)))
  }

  const total = headH + bodyH
  const free = Math.max(0, B.h - total)
  let y = B.y + (s.valign === 'bottom' ? free : s.valign === 'middle' ? free / 2 : 0)

  for (const pc of pieces) {
    const { part } = pc
    const fill = toneColor(r.p, part.tone)
    const weight = part.weight ?? 400
    if (part.role === 'body') {
      bodyLinesShown.forEach((col, ci) => {
        const x0 = B.x + ci * (colW + GRID.gutter * 2)
        let yy = y
        col.forEach((ln) => {
          if (ln) textAt(r, ln, alignX({ ...B, x: x0, w: colW }, align), yy, part.step, weight, fill, align)
          yy += lineH(part.step)
        })
      })
      y += bodyH
    } else {
      pc.lines.forEach((ln) => { textAt(r, ln, alignX(B, align), y, part.step, weight, fill, align); y += lineH(part.step) })
      y += part.gap ?? 0
    }
  }
}

const roundUp = (n: number) => (n < 20 ? n : Math.ceil(n / 10) * 10)

/* ------------------------------------------------------------------ *
 * 로고 — 업로드가 없으면 자리표시 (사각 심볼 + 브랜드 이름)
 * ------------------------------------------------------------------ */

function placeholderRatio(r: R): number {
  const name = r.c.doc.brand.nameEn || r.c.doc.brand.nameKr || 'BRAND'
  const w = textWidth(name.toUpperCase(), { size: 62, weight: 700, family: r.family, track: -0.02 })
  return (100 + 22 + w) / 100
}

function logoRatio(r: R): number {
  return r.c.doc.brand.logo?.ratio ?? placeholderRatio(r)
}

function drawLogo(r: R, x: number, y: number, h: number, mono: boolean, onBg: string) {
  const lg = r.c.doc.brand.logo
  const w = h * logoRatio(r)
  if (lg) { r.ops.push({ t: 'img', x, y, w, h, src: lg.src, mono }); return }
  const primary = r.c.doc.brand.colors[0]?.hex ?? '#2a5bd7'
  const fg = mono ? textOn(onBg) : primary === onBg ? textOn(onBg) : primary
  const name = (r.c.doc.brand.nameEn || r.c.doc.brand.nameKr || 'BRAND').toUpperCase()
  // 사선이 들어간 사각 심볼
  r.ops.push({ t: 'poly', pts: [[x, y + h], [x + h * 0.38, y], [x + h, y], [x + h * 0.62, y + h]], fill: fg })
  const size = h * 0.62
  r.ops.push({ t: 'text', x: x + h * 1.22, y: y + h * 0.5 + size * 0.36, s: name, size, weight: 700, fill: mono ? fg : textOn(onBg) === WHITE ? WHITE : INK, anchor: 'left', track: -0.02 })
}

function slotLogo(r: R, s: Extract<Slot, { k: 'logo' }>) {
  const B = areaBox(s.area)
  const h = Math.min(s.h, B.h)
  const w = h * logoRatio(r)
  if (w > B.w + 1) issue(r, 'soft', '로고가 가로로 길어 칸을 넘습니다', -6)
  const x = s.align === 'center' ? B.x + (B.w - w) / 2 : s.align === 'right' ? B.x + B.w - w : B.x
  const y = s.valign === 'bottom' ? B.y + B.h - h : s.valign === 'middle' ? B.y + (B.h - h) / 2 : B.y
  drawLogo(r, x, y, h, s.tone === 'mono', r.p.bg)
}

/* ------------------------------------------------------------------ *
 * 칸: 시각 항목
 * ------------------------------------------------------------------ */

interface Placed { item: MediaItem; caption: string }

function chipColor(c: Ctx, i: number): { name: string; hex: string } {
  const cs = c.doc.brand.colors
  if (i < cs.length) return cs[i]
  const base = cs[0]?.hex ?? '#2a5bd7'
  const k = i - cs.length + 1
  return { name: `Tint ${k * 20}%`, hex: mix(base, WHITE, Math.min(0.85, k * 0.2)) }
}

const SPEC_WEIGHTS: [number, string][] = [[700, 'Bold'], [600, 'SemiBold'], [500, 'Medium'], [400, 'Regular'], [700, 'Bold'], [400, 'Regular']]

/** 항목 하나를 상자 안에 그린다. 사진은 상자를 채우고(잘림 계산), 로고·아이콘은 상자 안에 맞춘다 */
function drawItem(r: R, it: MediaItem, b: Box, opts: { tile: boolean; align?: Align; valign?: VAlign }) {
  const { p } = r
  switch (it.kind) {
    case 'image': {
      const ratio = it.ratio ?? 1.5
      const boxR = b.w / b.h
      const kept = Math.min(ratio / boxR, boxR / ratio)
      const crop = Math.round((1 - kept) * 100)
      if (crop > 40) issue(r, 'hard', `이미지 ${it.i + 1}(${ratioLabel(ratio)})이 ${crop}% 잘립니다`, -22, '비율이 맞는 이미지로 바꾸기')
      else if (crop > 18) issue(r, 'soft', `이미지 ${it.i + 1}이 ${crop}% 잘립니다`, -5)
      r.ops.push({ t: 'photo', ...b, fill: mix(p.accent === p.bg ? '#888888' : p.accent, WHITE, 0.82), fg: mix(p.accent === p.bg ? '#888888' : p.accent, WHITE, 0.45), label: `이미지 ${it.i + 1} · ${ratioLabel(ratio)}` })
      return
    }
    case 'logo': {
      // 로고 변형: 타일이면 바탕을 돌려 가며 (흰·주조색·먹·옅은색) 보여 준다
      let bg = r.p.bg
      if (opts.tile) {
        const primary = r.c.doc.brand.colors[0]?.hex ?? '#2a5bd7'
        const cycle = [p.tile, primary, INK, WHITE]
        bg = cycle[it.i % cycle.length]
        r.ops.push({ t: 'rect', ...b, fill: bg, stroke: bg === WHITE ? '#e2e2e2' : undefined, sw: 1 })
      }
      const ratio = logoRatio(r)
      const pad = opts.tile ? Math.min(b.w, b.h) * 0.18 : 0
      const iw = b.w - pad * 2, ih = b.h - pad * 2
      let h = Math.min(ih, iw / ratio)
      if (opts.tile) h = Math.min(h, ih * 0.5)
      const w = h * ratio
      const al = opts.align ?? 'center', va = opts.valign ?? 'middle'
      const x = al === 'left' ? b.x + pad : al === 'right' ? b.x + b.w - pad - w : b.x + (b.w - w) / 2
      const y = va === 'top' ? b.y + pad : va === 'bottom' ? b.y + b.h - pad - h : b.y + (b.h - h) / 2
      drawLogo(r, x, y, h, bg !== WHITE && bg !== p.tile && bg !== '#eeeeee', bg)
      return
    }
    case 'icon': {
      if (opts.tile) r.ops.push({ t: 'rect', ...b, fill: p.tile })
      const s = Math.min(b.w, b.h) * (opts.tile ? 0.36 : 0.8)
      const x = b.x + (b.w - s) / 2, y = b.y + (b.h - s) / 2
      r.ops.push({ t: 'rect', x, y, w: s, h: s, fill: 'none', stroke: p.accent, sw: Math.max(2, s * 0.06) })
      r.ops.push({ t: 'line', x1: x + s * 0.28, y1: y + s * 0.5, x2: x + s * 0.72, y2: y + s * 0.5, stroke: p.accent, w: Math.max(2, s * 0.06) })
      r.ops.push({ t: 'line', x1: x + s * 0.5, y1: y + s * 0.28, x2: x + s * 0.5, y2: y + s * 0.72, stroke: p.accent, w: Math.max(2, s * 0.06) })
      return
    }
    case 'chip': {
      const c = chipColor(r.c, it.i)
      r.ops.push({ t: 'rect', ...b, fill: c.hex, stroke: c.hex.toLowerCase() === '#ffffff' ? '#dddddd' : undefined, sw: 1 })
      const on = textOn(c.hex)
      if (b.h >= 70 && b.w >= 120) {
        textAt(r, c.name, b.x + 16, b.y + b.h - 16 - lineH('label'), 'label', 600, on)
        textAt(r, c.hex.toUpperCase(), b.x + 16, b.y + 14, 'caption', 500, on)
      } else issue(r, 'hard', '컬러칩이 작아 색 이름이 잘립니다', -18)
      return
    }
    case 'specimen':
      return // rows 배열에서만 그린다
    case 'table':
      drawTable(r, b)
      return
  }
}

function drawTable(r: R, b: Box) {
  const t = r.c.page.table ?? { rows: 3, cols: 3 }
  const rowH = 48
  const need = (t.rows + 1) * rowH
  let rows = t.rows
  if (need > b.h) {
    const fit = Math.max(0, Math.floor(b.h / rowH) - 1)
    issue(r, 'hard', `표가 ${t.rows - fit}행 넘칩니다`, -26, t.rows - fit > t.rows * 0.4 ? '두 장으로 나누기' : `${t.rows - fit}행 줄이기`)
    rows = fit
  }
  const cw = b.w / t.cols
  const minCol = 96
  if (cw < minCol) issue(r, 'hard', `표가 ${t.cols}열이라 칸이 ${Math.round(cw)}px로 좁습니다`, -18, `${Math.ceil(t.cols - b.w / minCol)}열 줄이기`)
  const { p } = r
  r.ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: rowH, fill: p.tile })
  for (let ci = 0; ci < t.cols; ci++) textAt(r, `항목 ${ci + 1}`, b.x + ci * cw + 16, b.y + (rowH - lineH('body')) / 2, 'body', 600, p.fg)
  for (let ri = 1; ri <= rows; ri++) {
    const y = b.y + ri * rowH
    r.ops.push({ t: 'line', x1: b.x, y1: y, x2: b.x + b.w, y2: y, stroke: p.rule, w: 1 })
    for (let ci = 0; ci < t.cols; ci++) textAt(r, '—', b.x + ci * cw + 16, y + (rowH - lineH('body')) / 2, 'body', 400, p.muted)
  }
  r.ops.push({ t: 'line', x1: b.x, y1: b.y + (rows + 1) * rowH, x2: b.x + b.w, y2: b.y + (rows + 1) * rowH, stroke: p.fg, w: 1.5 })
}

function captionLines(r: R, s: string, w: number, step: Step = 'caption'): string[] {
  return s ? wrap(s, w, font(r, step, 500), 'slash') : []
}

function arrangeMedia(r: R, B: Box, items: Placed[], a: Arrange, caption: Extract<Slot, { k: 'media' }>['caption']) {
  const { p } = r
  const n = items.length
  if (!n) return
  const capStep: Step = 'caption'
  const capLH = lineH(capStep)

  switch (a.a) {
    case 'single': {
      const { item, caption: cap } = items[0]
      const capH = caption === 'below' && cap ? capLH + 12 : 0
      const maxH = (B.h - capH) * (a.maxH ?? 1)
      if (item.kind === 'table' || item.kind === 'chip') { drawItem(r, item, { ...B, h: B.h - capH }, { tile: false }); return }
      const ratio = item.kind === 'image' ? item.ratio ?? 1.5 : item.kind === 'logo' ? logoRatio(r) : 1
      let w = B.w, h = w / ratio
      if (h > maxH) { h = maxH; w = h * ratio }
      const al = a.align ?? 'center', va = a.valign ?? 'middle'
      const x = al === 'left' ? B.x : al === 'right' ? B.x + B.w - w : B.x + (B.w - w) / 2
      const y = va === 'top' ? B.y : va === 'bottom' ? B.y + B.h - capH - h : B.y + (B.h - capH - h) / 2
      drawItem(r, item, { x, y, w, h }, { tile: false })
      if (capH) captionLines(r, cap, w).slice(0, 1).forEach((ln) => textAt(r, ln, x, y + h + 12, capStep, 500, p.muted))
      return
    }

    case 'grid': {
      const gap = a.gap ?? GRID.gutter
      const capLines = caption === 'above' || caption === 'below' ? Math.max(1, ...items.map((x) => (x.caption ? 1 : 0))) : 0
      const capH = capLines && items.some((x) => x.caption) ? capLH + 8 : 0
      const firstRatio = a.ratio ?? items.find((x) => x.item.ratio)?.item.ratio
      const pickCols = (): number => {
        if (a.cols !== 'auto') return a.cols
        const rr = firstRatio ?? 4 / 3
        let best = 1, bestArea = 0
        for (let c = 1; c <= Math.min(n, 6); c++) {
          const rows = Math.ceil(n / c)
          let tw = (B.w - gap * (c - 1)) / c
          let th = tw / rr
          const maxTh = (B.h - gap * (rows - 1)) / rows - capH
          if (th > maxTh) { th = maxTh; tw = Math.min(tw, th * rr) }
          const area = tw * th * n
          if (area > bestArea) { bestArea = area; best = c }
        }
        return best
      }
      const cols = pickCols()
      const rows = Math.ceil(n / cols)
      const tw = (B.w - gap * (cols - 1)) / cols
      const maxTh = (B.h - gap * (rows - 1)) / rows - capH
      const th = firstRatio ? Math.min(tw / firstRatio, maxTh) : maxTh
      if (tw < 140 || th < 80) issue(r, 'hard', `타일이 ${Math.round(tw)}×${Math.round(th)}px로 작아 내용이 잘립니다`, -24, '항목 수 줄이기 또는 두 장으로 나누기')
      if (rows > 1 && n % cols) issue(r, 'soft', `마지막 줄에 ${cols - (n % cols)}칸이 빕니다`, -6)
      const usedH = rows * (th + capH) + gap * (rows - 1)
      const y0 = a.valign === 'middle' ? B.y + (B.h - usedH) / 2 : B.y
      items.forEach((pl, i) => {
        const cx = B.x + (i % cols) * (tw + gap)
        const cy = y0 + Math.floor(i / cols) * (th + capH + gap)
        const ty = caption === 'above' ? cy + capH : cy
        drawItem(r, pl.item, { x: cx, y: ty, w: tw, h: th }, { tile: true })
        if (pl.caption && capH) {
          const ln = captionLines(r, pl.caption, tw)
          if (ln.length > 1) issue(r, 'soft', `설명 "${short(pl.caption)}"이 타일 폭보다 깁니다`, -4)
          textAt(r, ln[0] ?? '', cx, caption === 'above' ? cy : ty + th + 8, capStep, 500, p.muted)
        }
      })
      return
    }

    case 'bands': {
      const weights = items.map((_, i) => (i === 0 ? a.firstWeight : 1))
      const sum = weights.reduce((x, y) => x + y, 0)
      let y = B.y
      items.forEach((pl, i) => {
        const h = (B.h * weights[i]) / sum
        const c = chipColor(r.c, pl.item.i)
        const on = textOn(c.hex)
        r.ops.push({ t: 'rect', x: B.x, y, w: B.w, h, fill: c.hex, stroke: c.hex.toLowerCase() === '#ffffff' ? '#dddddd' : undefined, sw: 1 })
        // 색 이름 크기는 띠 높이에 맞춰 단계 안에서 고른다
        const nameStep = (['hero', 'display', 'h1', 'label'] as Step[]).find((st) => STEP[st] * 1.1 <= h * 0.42) ?? 'label'
        if (h < 96) issue(r, 'hard', `띠가 ${Math.round(h)}px로 얇아 색 값이 잘립니다`, -22, '색 수 줄이기 또는 색 기둥 레이아웃')
        const nm = c.name.toUpperCase()
        textAt(r, nm, B.x + 28, y + h - 20 - lineH(nameStep), nameStep, 700, on)
        // 값: 띠 오른쪽 위, 두 열 (레퍼런스는 Pantone·RGB·CMYK·HEX 네 열 — 지금은 화면 색만)
        const vx = B.x + B.w - 28 - 300
        textAt(r, 'HEX', vx, y + 22, 'caption', 600, on)
        textAt(r, c.hex.toUpperCase(), vx, y + 22 + capLH, 'caption', 400, on)
        textAt(r, 'RGB', vx + 140, y + 22, 'caption', 600, on)
        textAt(r, rgbLabel(c.hex), vx + 140, y + 22 + capLH, 'caption', 400, on)
        y += h
      })
      return
    }

    case 'swatches': {
      const gap = 16
      const w = (B.w - gap * (n - 1)) / n
      if (w < 150) issue(r, 'hard', `색 기둥이 ${Math.round(w)}px로 좁아 값이 잘립니다`, -22, '색 수 줄이기')
      items.forEach((pl, i) => {
        const x = B.x + i * (w + gap)
        const c = chipColor(r.c, pl.item.i)
        const bh = B.h * 0.68
        r.ops.push({ t: 'rect', x, y: B.y, w, h: bh, fill: c.hex, stroke: c.hex.toLowerCase() === '#ffffff' ? '#dddddd' : undefined, sw: 1 })
        let ty = B.y + bh + 20
        textAt(r, c.name, x, ty, 'label', 700, p.fg); ty += lineH('label') + 8
        textAt(r, c.hex.toUpperCase(), x, ty, 'caption', 500, p.fg); ty += capLH
        textAt(r, rgbLabel(c.hex), x, ty, 'caption', 400, p.muted)
      })
      return
    }

    case 'rows': {
      const rowH = Math.min(200, B.h / n)
      if (rowH < 90) issue(r, 'hard', `견본 줄이 ${Math.round(rowH)}px로 낮아 글자가 잘립니다`, -22, '견본 줄 수 줄이기')
      const labelW = 180
      const sampleW = B.w - labelW - 24
      const sample = '가나다라마바사 아자차카타파하 Brand Guideline 0123'
      items.forEach((pl, i) => {
        const y = B.y + i * rowH
        const [wt, wn] = SPEC_WEIGHTS[pl.item.i % SPEC_WEIGHTS.length]
        const step: Step = rowH >= 150 ? 'display' : rowH >= 110 ? 'h1' : 'lead'
        const f = font(r, step, wt)
        // 칸보다 길면 어절 단위로 덜어낸다 (글자 중간에서 자르지 않는다)
        const words = sample.split(' ')
        while (words.length > 1 && textWidth(words.join(' '), f) > sampleW) words.pop()
        const s = words.join(' ')
        const cap = pl.caption || `${r.c.pair.kr === r.c.pair.en ? r.c.pair.kr : r.c.pair.kr + ' · ' + r.c.pair.en}`
        textAt(r, cap, B.x, y + 8, 'caption', 500, p.muted)
        textAt(r, s, B.x, y + 8 + capLH + 6, step, wt, p.fg)
        textAt(r, `${wn.toUpperCase()} ${wt}`, B.x + B.w, y + 8 + capLH + 6 + (lineH(step) - lineH('caption')) / 2, 'caption', 600, p.muted, 'right')
        if (i < n - 1) r.ops.push({ t: 'line', x1: B.x, y1: y + rowH - 1, x2: B.x + B.w, y2: y + rowH - 1, stroke: p.rule, w: 1 })
      })
      return
    }

    case 'list': {
      const capW = a.captionCols * (COL_W + GRID.gutter)
      const itemW = B.w - capW
      const gap = 48
      const h = (B.h - gap * (n - 1)) / n
      if (h < 60) issue(r, 'hard', `목록 칸이 ${Math.round(h)}px로 낮습니다`, -20, '항목 수 줄이기')
      items.forEach((pl, i) => {
        const y = B.y + i * (h + gap)
        drawItem(r, pl.item, { x: B.x, y, w: itemW - GRID.gutter * 2, h }, { tile: false, align: 'right', valign: 'middle' })
        const ln = captionLines(r, pl.caption, capW - GRID.gutter, 'lead')
        const th = ln.length * lineH('lead')
        ln.forEach((s, k) => textAt(r, s, B.x + itemW, y + (h - th) / 2 + k * lineH('lead'), 'lead', 500, p.fg))
      })
      return
    }
  }
}

const short = (s: string) => (s.length > 12 ? s.slice(0, 12) + '…' : s)

/* ------------------------------------------------------------------ *
 * 칸: 큰 글자 · 목차 · 면 · 모티브 · 폴리오
 * ------------------------------------------------------------------ */

function slotMega(r: R, s: Extract<Slot, { k: 'mega' }>) {
  const B = areaBox(s.area)
  const raw = s.source === 'title' ? r.c.page.title : r.c.sectionNo
  if (!raw.trim()) return
  const lines = (raw.includes('/') ? splitSlash(raw) : raw.split(/\s+/)).map((x) => (s.source === 'title' ? x.toUpperCase() : x))
  const step = s.step
  const size = STEP[step]
  const pitch = size * LEADING[step]
  const f = font(r, step, 700)
  const cap = size * 0.72
  const blockH = (lines.length - 1) * pitch + cap
  const fill = toneColor(r.p, s.tone)
  if (blockH > PAGE.h - 40) issue(r, 'hard', `${lines.length}줄이라 쪽 높이를 넘칩니다`, -30, '제목을 두 단어 이하로')
  // 쪽 기준 세로 가운데 (재단선까지 쓰는 칸) / 칸 위쪽 (일반 칸)
  const full = s.area.bleed?.includes('t') && s.area.bleed?.includes('b')
  const top = full ? (PAGE.h - blockH) / 2 : B.y
  const x = LIVE.x - size * 0.03 // 글자 옆 여백만큼 당겨 여백선에 시각적으로 맞춘다
  let worst = 0
  lines.forEach((ln, i) => {
    const w = textWidth(ln, f)
    const right = full ? PAGE.w : B.x + B.w
    if (x + w > right) worst = Math.max(worst, (x + w - right) / w)
    r.ops.push({ t: 'text', x, y: top + cap + i * pitch, s: ln, size, weight: 700, fill, anchor: 'left', track: clampTrack(TRACK[step]) })
  })
  const pct = Math.round(worst * 100)
  if (pct > 40) issue(r, 'hard', `큰 글자가 ${pct}% 잘립니다`, -24, '짧은 단어로 바꾸거나 \'/\'로 줄 나누기')
  else if (pct > 15) issue(r, 'soft', `큰 글자 끝이 ${pct}% 재단선 밖으로 나갑니다`, -6)
  else if (pct > 0) issue(r, 'soft', `큰 글자 끝이 ${pct}% 재단선에 걸립니다 (레퍼런스와 같은 의도된 잘림)`, 0)
}

function slotToc(r: R, s: Extract<Slot, { k: 'toc' }>) {
  const B = areaBox(s.area)
  const entries = r.c.toc
  const { p } = r
  if (!entries.length) { issue(r, 'soft', '간지가 없어 목차가 비어 있습니다', -10); return }
  if (s.dir === 'row') {
    const gap = 56
    const n = entries.length
    const w = (B.w - gap * (n - 1)) / n
    const step: Step = 'label'
    const f = font(r, step, 600)
    const h = lineH(step) + 16
    const y = s.valign === 'middle' ? B.y + (B.h - h) / 2 : B.y
    entries.forEach((e, i) => {
      const x = B.x + i * (w + gap)
      const label = e.title.replace(/\//g, ' ').toUpperCase()
      if (textWidth(label, f) > w - 24) issue(r, 'hard', `목차 "${short(label)}"가 칸보다 깁니다 (${n}개를 가로로 세움)`, -24, '세로 목차 레이아웃')
      textAt(r, label, x + w - 24, y, step, 600, p.fg, 'right')
      r.ops.push({ t: 'line', x1: x, y1: y + h, x2: x + w, y2: y + h, stroke: p.fg, w: 2 })
    })
    return
  }
  // 세로 번호 목록
  const n = entries.length
  let rowH = 108
  if (n * rowH > B.h) rowH = B.h / n
  if (rowH < 64) issue(r, 'hard', `목차 ${n}개가 칸을 넘칩니다`, -24, '장 수 줄이기')
  const total = n * rowH
  const y0 = s.valign === 'middle' ? B.y + (B.h - total) / 2 : B.y
  entries.forEach((e, i) => {
    const y = y0 + i * rowH
    const ty = y + (rowH - lineH('h1')) / 2
    if (s.numbered) textAt(r, e.no, B.x, ty, 'h1', 700, p.accent)
    textAt(r, e.title.replace(/\//g, ' '), B.x + (s.numbered ? 120 : 0), ty, 'h1', 500, p.fg)
    r.ops.push({ t: 'line', x1: B.x, y1: y + rowH, x2: B.x + B.w, y2: y + rowH, stroke: p.rule, w: 1 })
  })
}

function slotFill(r: R, s: Extract<Slot, { k: 'fill' }>) {
  const B = areaBox(s.area)
  const primary = r.c.doc.brand.colors[0]?.hex ?? '#2a5bd7'
  const fill = s.tone === 'accent' ? primary : s.tone === 'ink' ? INK : r.p.tile
  r.ops.push({ t: 'rect', ...B, fill })
  // 이 면 위의 글자는 onAccent로 그려야 하므로 팔레트의 onAccent를 면 기준으로 고친다
  r.p = { ...r.p, onAccent: textOn(fill) }
}

/** 심볼에서 딴 모티브 자리표시 — 사선 사각형 윤곽을 겹쳐 크게 */
function slotMotif(r: R, s: Extract<Slot, { k: 'motif' }>) {
  const B = areaBox(s.area)
  const stroke = toneColor(r.p, s.tone) === r.p.bg ? mix(r.p.bg, WHITE, 0.3) : mix(r.p.bg, WHITE, 0.32)
  const h = B.h * 1.1
  const x0 = B.x + B.w * 0.05
  for (let k = 0; k < 3; k++) {
    const ox = x0 + k * B.w * 0.26
    const y = B.y - B.h * 0.05
    r.ops.push({ t: 'poly', pts: [[ox, y + h], [ox + h * 0.42, y], [ox + h * 0.42 + B.w * 0.2, y], [ox + B.w * 0.2, y + h]], fill: 'none', stroke, sw: 1.5 })
  }
}

function slotFolio(r: R, s: Extract<Slot, { k: 'folio' }>) {
  const { brand } = r.c.doc
  const fill = toneColor(r.p, s.tone ?? 'muted')
  const y = PAGE.h - MARGIN.bottom - lineH('caption')
  textAt(r, [brand.nameEn || brand.nameKr, brand.docName].filter(Boolean).join(' '), LIVE.x, y, 'caption', 400, fill)
  if (s.pageNo) textAt(r, String(r.c.pageNo).padStart(2, '0'), LIVE.x + LIVE.w, y, 'caption', 500, fill, 'right')
}

/* ------------------------------------------------------------------ *
 * 장표 하나
 * ------------------------------------------------------------------ */

export function renderPage(l: LayoutDecl, c: Ctx): PageRender {
  const primary = c.doc.brand.colors[0]?.hex ?? '#2a5bd7'
  const r: R = { c, p: palette(l.bg, primary), family: familyOf(c.pair), ops: [], issues: [] }
  r.ops.push({ t: 'rect', x: 0, y: 0, w: PAGE.w, h: PAGE.h, fill: r.p.bg })

  // 시각 항목을 칸에 순서대로 나눠 준다 — 받을 칸이 없는 항목은 남는다
  const all = mediaItems(c.page)
  const captionOf = new Map<MediaItem, string>(all.map((it, i) => [it, c.page.captions[i] ?? '']))
  const left = [...all]

  const basePalette = r.p
  for (const s of l.slots) {
    switch (s.k) {
      case 'text': slotText(r, s); break
      case 'logo': slotLogo(r, s); break
      case 'mega': slotMega(r, s); break
      case 'toc': slotToc(r, s); break
      case 'fill': slotFill(r, s); continue // 다음 칸까지 면 기준 색을 유지
      case 'motif': slotMotif(r, s); break
      case 'folio': slotFolio(r, s); break
      case 'media': {
        const take: Placed[] = []
        for (let i = 0; i < left.length && take.length < s.cap.max; ) {
          if (!s.accepts.includes(left[i].kind)) { i++; continue }
          const item = left.splice(i, 1)[0]
          take.push({ item, caption: captionOf.get(item) ?? '' })
        }
        const n = take.length
        const what = s.accepts.map((k) => MEDIA_LABEL[k]).join('·')
        if (n === 0 && s.required) issue(r, 'hard', `${what} 자리가 비어 장표가 성립하지 않습니다`, -30, `${what} ${s.cap.min}개 넣기`)
        else if (n > 0 && n < s.cap.min) issue(r, 'soft', `${what}가 ${s.cap.min}개 이상일 때를 위한 구성입니다 (지금 ${n})`, -10)
        else if (n < s.cap.best) issue(r, 'soft', `칸이 남습니다 — ${s.cap.best}개일 때 가장 좋습니다 (지금 ${n})`, -Math.min(9, (s.cap.best - n) * 3))
        arrangeMedia(r, areaBox(s.area), take, s.arrange, s.caption)
        break
      }
    }
    r.p = basePalette
  }

  // 남은 항목 — 진짜 문제
  const byKind = new Map<MediaKind, number>()
  left.forEach((it) => byKind.set(it.kind, (byKind.get(it.kind) ?? 0) + 1))
  byKind.forEach((cnt, k) => {
    const cap = l.slots.filter((s): s is Extract<Slot, { k: 'media' }> => s.k === 'media' && s.accepts.includes(k)).reduce((a, s) => a + s.cap.max, 0)
    issue(r, 'hard',
      cap ? `${MEDIA_LABEL[k]} ${cnt}${MEDIA_UNIT[k]}이 넘칩니다 (최대 ${cap})` : `${MEDIA_LABEL[k]}을 놓을 자리가 없습니다`,
      -26, cap ? `${MEDIA_LABEL[k]} ${cnt}${MEDIA_UNIT[k]} 빼기 또는 두 장으로 나누기` : undefined)
  })

  // 글: 들어온 글에 자리가 있는가
  const roles = new Set(l.slots.flatMap((s) => (s.k === 'text' ? s.parts.map((p) => p.role) : [])))
  const megaTitle = l.slots.some((s) => s.k === 'mega' && s.source === 'title')
  if (c.page.body.trim() && !roles.has('body')) issue(r, 'hard', '본문을 놓을 자리가 없습니다', -24, '본문이 들어가는 레이아웃 고르기')
  if (c.page.subtitle.trim() && !roles.has('subtitle')) issue(r, 'soft', '부제가 빠집니다', -6)
  if (c.page.title.trim() && !roles.has('title') && !megaTitle && l.type !== 'toc') issue(r, 'soft', '제목이 빠집니다', -8)
  const needsTitle = l.slots.some((s) => s.k === 'text' && s.needsTitle) || megaTitle
  if (needsTitle && !c.page.title.trim()) issue(r, 'soft', '제목 자리가 비어 있습니다', -12)

  return { ops: r.ops, issues: r.issues }
}

/** 그리드 안내선 — 미리보기에서만 겹쳐 그린다 (같은 Op 형식) */
export function gridOps(): Op[] {
  const ops: Op[] = []
  const stroke = 'rgba(255,0,90,0.35)'
  for (let c = 1; c <= GRID.cols; c++) {
    const b = areaBox({ c: [c, 1], r: [1, GRID.rows] })
    ops.push({ t: 'rect', ...b, fill: 'rgba(255,0,90,0.05)' })
  }
  for (let rr = 1; rr <= GRID.rows; rr++) {
    const b = areaBox({ c: [1, GRID.cols], r: [rr, 1] })
    ops.push({ t: 'line', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, stroke, w: 1 })
    ops.push({ t: 'line', x1: b.x, y1: b.y + b.h, x2: b.x + b.w, y2: b.y + b.h, stroke, w: 1 })
  }
  ops.push({ t: 'rect', x: LIVE.x, y: LIVE.y, w: LIVE.w, h: LIVE.h, fill: 'none', stroke, sw: 1.5 })
  return ops
}
