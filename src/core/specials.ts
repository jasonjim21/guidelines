import type { Box, Doc, DocPage, El, GroupEl } from './doc'
import type { FontSet } from './fonts'
import { renderPage, type Content, type PageDecl } from './blocks'
import { FORMAT_SLOTS, formatDecl } from './content'
import { figureLayouts } from './figures'

/**
 * 색상 체계(10쪽)·색상 규정(11쪽)·회색도(12쪽) 전용 표현 — 쪽마다 4개. 틀은 내지 1–4 그대로, 개체 자리 안만 다르다.
 * 개체를 통째로 옮기는 대신 원본에서 구성 요소(색·값·바탕×버전 행렬·농도 단계·로고)를 읽어 다시 짠다.
 * 로고는 원본 쪽의 세 조각(파랑 두 조각 + 몸통)을 묶음째 빌려 옮긴다. 값·이름은 원본 글 그대로.
 */

type Text = Extract<El, { t: 'text' }>
const texts = (doc: Doc, n: number) => doc.pages[n - 1].els.filter((e): e is Text => e.t === 'text')
const inBox = (x: number, y: number, b: Box) => x >= b[0] - 1 && x <= b[0] + b[2] + 1 && y >= b[1] - 1 && y <= b[1] + b[3] + 1
const union = (bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((b) => b[0])), y0 = Math.min(...bs.map((b) => b[1]))
  const x1 = Math.max(...bs.map((b) => b[0] + b[2])), y1 = Math.max(...bs.map((b) => b[1] + b[3]))
  return [x0, y0, x1 - x0, y1 - y0]
}

/** 원본 로고 하나 = 칠 순서대로 연달아 나오는 패스 세 조각 (작은 파랑 둘 + 몸통) */
interface Logo { els: El[]; box: Box; body: string; part: string }
function logos(doc: Doc, n: number): Logo[] {
  const ps = doc.pages[n - 1].els.filter((e): e is Extract<El, { t: 'path' }> => e.t === 'path' && !!e.fill && !e.stroke && e.box[2] < 400)
  const out: Logo[] = []
  for (let i = 0; i + 2 < ps.length; i += 3) {
    const tri = ps.slice(i, i + 3)
    out.push({ els: tri, box: union(tri.map((p) => p.box)), body: tri[2].fill!, part: tri[0].fill! })
  }
  return out
}

let gid = 0
/** 원본 요소 묶음을 상자 (x, y, 높이 h) 기준으로 옮긴다 — 가로 가운데 cx */
function place(els: El[], src: Box, cx: number, cy: number, h: number): GroupEl {
  const k = h / src[3]
  const w = src[2] * k
  const x = cx - w / 2, y = cy - h / 2
  return { t: 'group', id: `sp${gid++}`, box: [x, y, w, h], tf: [k, x - src[0] * k, y - src[1] * k], els }
}

const rect = (x: number, y: number, w: number, h: number, fill: string, opacity?: number): El =>
  ({ t: 'rect', id: `sp${gid++}`, box: [x, y, w, h], fill, opacity })
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, w = 1): El =>
  ({ t: 'line', id: `sp${gid++}`, box: [x1, y1, x2 - x1, y2 - y1], pts: [x1, y1, x2, y2], stroke, sw: w })
const txt = (s: string, x: number, y: number, size: number, font: string, fill: string, o: { anchor?: 'start' | 'middle' | 'end'; opacity?: number } = {}): El =>
  ({ t: 'text', id: `sp${gid++}`, s, x, y, size, font, fill, anchor: o.anchor ?? 'start', opacity: o.opacity })

/* ------------------------------------------------------------------ *
 * 원본에서 읽기
 * ------------------------------------------------------------------ */

export interface Spec { label: string; values: string[] }
export interface Swatch { hex: string; kr: string; en: string; enOpacity: number; specs: Spec[]; weight: number }

/** 10쪽 — 색 띠마다 국문 이름·영문 이름·값(Pantone·RGB·CMYK·HEX) */
export function colorSystem(doc: Doc): Swatch[] {
  const ts = texts(doc, 10)
  const bands = doc.pages[9].els.filter((e): e is Extract<El, { t: 'rect' }> => e.t === 'rect' && e.box[2] > 1000).sort((a, b) => a.box[1] - b.box[1])
  const minH = Math.min(...bands.map((b) => b.box[3]))
  return bands.map((b) => {
    const inside = ts.filter((t) => inBox(t.x, t.y - 5, b.box))
    const vals = inside.filter((t) => t.size < 16)
    const cols = [...new Set(vals.map((t) => Math.round(t.x)))].sort((a, b) => a - b)
    const specs = cols.map((cx) => {
      const col = vals.filter((t) => Math.round(t.x) === cx).sort((a, b) => a.y - b.y)
      return { label: col[0].s, values: col.slice(1).map((t) => t.s) }
    })
    const en = inside.find((t) => t.font.startsWith('Prohibition'))
    return {
      hex: b.fill ?? '#000000',
      kr: inside.find((t) => t.font.startsWith('esamanru'))?.s ?? '',
      en: en?.s ?? '', enOpacity: en?.opacity ?? 0.2,
      specs, weight: Math.round(b.box[3] / minH),
    }
  })
}

export interface Regulation { bgs: string[]; versions: string[]; cells: { row: number; col: number; logo: Logo }[] }

/** 11쪽 — 바탕(행) × 버전(열) 행렬. 칸마다 원본 로고 */
export function colorRegulation(doc: Doc): Regulation {
  const bands = doc.pages[10].els.filter((e): e is Extract<El, { t: 'rect' }> => e.t === 'rect' && e.box[2] > 1000).sort((a, b) => a.box[1] - b.box[1])
  const heads = texts(doc, 11).filter((t) => t.size === 20).sort((a, b) => a.x - b.x)
  const centers = heads.map((t) => t.x + (t.w ?? 0) / 2)
  const cells = logos(doc, 11).map((logo) => {
    const cx = logo.box[0] + logo.box[2] / 2, cy = logo.box[1] + logo.box[3] / 2
    const row = bands.findIndex((b) => cy >= b.box[1] && cy <= b.box[1] + b.box[3])
    const col = centers.reduce((best, c, i) => (Math.abs(c - cx) < Math.abs(centers[best] - cx) ? i : best), 0)
    return { row, col, logo }
  })
  return { bgs: bands.map((b) => b.fill ?? '#ffffff'), versions: heads.map((t) => t.s), cells }
}

export interface Shade { fill: string; opacity: number }
export interface Panel { label: string; note: string; noteFill: string; steps: Shade[]; threshold: number; logos: { logo: Logo; step: number }[] }

/** 12쪽 — 농도 단계 판 두 장 (흑백·파랑). 단계, 화이트 버전을 쓰기 시작하는 단계, 판 위 로고 */
export function grayscale(doc: Doc): Panel[] {
  const els = doc.pages[11].els
  const steps = els.filter((e): e is Extract<El, { t: 'rect' }> => e.t === 'rect' && e.box[2] < 200 && e.box[3] > 300)
  const tops = [...new Set(steps.map((s) => Math.round(s.box[1])))].sort((a, b) => a - b)
  const ts = texts(doc, 12)
  const lines = els.filter((e): e is Extract<El, { t: 'line' }> => e.t === 'line')
  const lg = logos(doc, 12)
  return tops.map((top) => {
    const row = steps.filter((s) => Math.round(s.box[1]) === top).sort((a, b) => a.box[0] - b.box[0])
    const box = union(row.map((s) => s.box))
    const label = ts.find((t) => t.size === 20 && Math.abs(t.y - (top - 16)) < 20)
    const note = ts.find((t) => t.size === 16 && Math.abs(t.y - (top - 16)) < 20)
    // 선 끝점은 위·아래 순서가 섞여 있다
    const ln = lines.find((l) => Math.min(l.pts[1], l.pts[3]) < top + 10 && Math.max(l.pts[1], l.pts[3]) > top + 10)
    const threshold = ln ? row.findIndex((s) => s.box[0] >= ln.pts[0] - 1) : row.length
    return {
      label: label?.s ?? '', note: note?.s ?? '', noteFill: note?.fill ?? '#000000',
      steps: row.map((s) => ({ fill: s.fill ?? '#000000', opacity: s.opacity ?? 1 })), threshold,
      logos: lg.filter((l) => inBox(l.box[0] + l.box[2] / 2, l.box[1] + l.box[3] / 2, box)).map((logo) => ({
        logo, step: row.findIndex((s) => inBox(logo.box[0] + logo.box[2] / 2, s.box[1] + 1, s.box)),
      })),
    }
  })
}

/* ------------------------------------------------------------------ *
 * 표현 — 틀(내지 1–4)은 고정, 개체 자리(Area) 안의 표현만 바꾼다
 * ------------------------------------------------------------------ */

/** 개체 자리 — 내지 틀마다 정해져 있다 (content.ts의 FORMAT_SLOTS) */
export interface Area { x: number; y: number; r: number; b: number }
export interface Special { id: string; name: string; note: string; draw: (a: Area) => El[] }

const WHITE = '#ffffff'
const INK = '#222222'
const MUTE = '#9d9d9d'
const VAL = 'Inter-Medium'

/** 값 한 줄로: 'RGB  R 0  G 78  B 216' */
const specLine = (s: Spec) => `${s.label}  ${s.values.join('  ')}`
const frame = (x: number, y: number, w: number, h: number): El =>
  ({ t: 'path', id: `sp${gid++}`, box: [x, y, w, h], d: `M${x} ${y}H${x + w}V${y + h}H${x}Z`, fill: 'none', stroke: '#e2e2e2', sw: 1 })

function colorLayouts(sw: Swatch[]): Special[] {
  const n = sw.length
  return [
    {
      id: 'cs1', name: '세로 기둥', note: '원본의 가로 띠를 세로 기둥 셋으로. 기둥마다 위에 국문 이름, 가운데 값 네 묶음, 아래 영문 이름(원본 톤온톤)',
      draw: (a) => {
        const out: El[] = []
        const gap = 16, w = (a.r - a.x - gap * (n - 1)) / n
        sw.forEach((s, i) => {
          const x = a.x + i * (w + gap)
          out.push(rect(x, a.y, w, a.b - a.y, s.hex))
          out.push(txt(s.kr, x + 28, a.y + 58, 30, 'esamanruOTFMedium', WHITE))
          s.specs.forEach((sp, k) => {
            const y = a.y + 150 + k * 92
            out.push(txt(sp.label, x + 28, y, 15, VAL, WHITE, { opacity: 0.6 }))
            sp.values.forEach((v, j) => out.push(txt(v, x + 28 + (j % 2) * 90, y + 24 + Math.floor(j / 2) * 22, 15, VAL, WHITE)))
          })
          // 영문 이름은 기둥 폭에 들어가는 크기로 (압축 대문자 한 자 ≈ 0.47em)
          out.push(txt(s.en, x + 24, a.b - 28, Math.min(76, (w - 48) / (s.en.length * 0.47)), 'Prohibition-Regular', WHITE, { opacity: s.enOpacity }))
        })
        return out
      },
    },
    {
      id: 'cs2', name: '칩 + 값 표', note: '칩 셋을 위에 나란히, 칩 아래 흰 바탕에 이름과 값을 표처럼. 값 글이 칩 위에 얹히지 않아 읽기 쉽다',
      draw: (a) => {
        const out: El[] = []
        const gap = 40, w = (a.r - a.x - gap * (n - 1)) / n
        const ch = Math.min(w * 0.78, a.b - a.y - 300)
        sw.forEach((s, i) => {
          const x = a.x + i * (w + gap)
          out.push(rect(x, a.y, w, ch, s.hex))
          let y = a.y + ch + 56
          out.push(txt(s.kr, x, y, 26, 'esamanruOTFMedium', INK))
          out.push(txt(s.en, x, y + 34, 22, 'Prohibition-Regular', MUTE))
          y += 70
          s.specs.forEach((sp) => {
            out.push(line(x, y, x + w, y, '#dddddd'))
            out.push(txt(sp.label, x, y + 26, 15, VAL, MUTE))
            out.push(txt(sp.values.join('  '), x + 92, y + 26, 15, VAL, INK))
            y += 40
          })
        })
        return out
      },
    },
    {
      id: 'cs3', name: '가로 띠 (비율)', note: '개체 자리를 원본 비율(2:1:1)의 가로 띠로 채움. 이름은 왼쪽 위, 영문은 왼쪽 아래 크게, 값은 오른쪽에 한 줄씩',
      draw: (a) => {
        const out: El[] = []
        const total = a.b - a.y
        const sum = sw.reduce((s, x) => s + x.weight, 0)
        let y = a.y
        sw.forEach((s) => {
          const h = (total * s.weight) / sum
          out.push(rect(a.x, y, a.r - a.x, h, s.hex))
          out.push(txt(s.kr, a.x + 28, y + 50, 26, 'esamanruOTFMedium', WHITE))
          out.push(txt(s.en, a.x + 24, y + h - 24, Math.min(100, h * 0.55), 'Prohibition-Regular', WHITE, { opacity: s.enOpacity }))
          s.specs.forEach((sp, k) => out.push(txt(specLine(sp), a.r - 28, y + 42 + k * 22, 14, VAL, WHITE, { anchor: 'end' })))
          y += h
        })
        return out
      },
    },
    {
      id: 'cs4', name: '주조색 큰 면 + 보조색', note: '주조색(첫 색)을 큰 면으로, 나머지 색은 그 아래 작은 면 둘로. 색의 위계를 면적으로 보여 줌',
      draw: (a) => {
        const out: El[] = []
        const [main, ...rest] = sw
        const split = a.y + (a.b - a.y) * 0.62
        out.push(rect(a.x, a.y, a.r - a.x, split - a.y - 8, main.hex))
        out.push(txt(main.kr, a.x + 32, a.y + 62, 34, 'esamanruOTFMedium', WHITE))
        out.push(txt(main.en, a.x + 28, split - 40, Math.min(120, (split - a.y) * 0.4), 'Prohibition-Regular', WHITE, { opacity: main.enOpacity }))
        main.specs.forEach((sp, k) => out.push(txt(specLine(sp), a.r - 32, a.y + 50 + k * 24, 15, VAL, WHITE, { anchor: 'end' })))
        const gap = 16, w = (a.r - a.x - gap * (rest.length - 1)) / rest.length
        rest.forEach((s, i) => {
          const x = a.x + i * (w + gap), y = split + 8
          out.push(rect(x, y, w, a.b - y, s.hex))
          out.push(txt(s.kr, x + 24, y + 48, 26, 'esamanruOTFMedium', WHITE))
          s.specs.forEach((sp, k) => out.push(txt(specLine(sp), x + 24, y + 96 + k * 22, 14, VAL, WHITE)))
        })
        return out
      },
    },
  ]
}

function regulationLayouts(r: Regulation): Special[] {
  const R = r.bgs.length, V = r.versions.length
  const isLight = (hex: string) => hex.toLowerCase() === '#ffffff'
  const cellsOf = (row: number) => r.cells.filter((c) => c.row === row).sort((a, b) => a.col - b.col)
  return [
    {
      id: 'cr1', name: '바탕을 세로 기둥으로', note: '원본 행렬을 돌려 바탕 넷을 세로 기둥으로, 버전 이름은 왼쪽에 행 머리로. 같은 버전이 가로로 한 줄에 선다',
      draw: (a) => {
        const out: El[] = []
        const x0 = a.x + 190, w = (a.r - x0) / R, rh = (a.b - a.y) / V
        r.bgs.forEach((bg, i) => {
          out.push(rect(x0 + i * w, a.y, w, a.b - a.y, bg))
          if (isLight(bg)) out.push(line(x0 + i * w, a.y, x0 + i * w, a.b, '#e2e2e2'), line(x0 + (i + 1) * w, a.y, x0 + (i + 1) * w, a.b, '#e2e2e2'))
        })
        r.versions.forEach((v, j) => out.push(txt(v, x0 - 28, a.y + rh * (j + 0.5) + 7, 20, 'Inter-Light', MUTE, { anchor: 'end' })))
        r.cells.forEach((c) => out.push(place(c.logo.els, c.logo.box, x0 + w * (c.row + 0.5), a.y + rh * (c.col + 0.5), Math.min(40, (w * 0.6) / 3.2))))
        return out
      },
    },
    {
      id: 'cr2', name: '바탕 타일 2×2', note: '바탕마다 한 장의 타일로 2×2. 타일 안에 그 바탕에서 쓸 수 있는 버전만 나란히. 흰 타일은 옅은 테두리',
      draw: (a) => {
        const out: El[] = []
        const gap = 16, w = (a.r - a.x - gap) / 2, h = (a.b - a.y - gap) / 2
        r.bgs.forEach((bg, i) => {
          const x = a.x + (i % 2) * (w + gap), y = a.y + Math.floor(i / 2) * (h + gap)
          out.push(rect(x, y, w, h, bg))
          if (isLight(bg)) out.push(frame(x, y, w, h))
          const cs = cellsOf(i)
          const step = w / (cs.length + 1)
          // 로고 폭(높이의 약 3.2배)이 칸 간격의 70%를 넘지 않게
          const lh = Math.min(44, (step * 0.7) / 3.2)
          cs.forEach((c, k) => out.push(place(c.logo.els, c.logo.box, x + step * (k + 1), y + h / 2, lh)))
        })
        return out
      },
    },
    {
      id: 'cr3', name: '버전 칩', note: '바탕 × 버전 칸마다 정사각 칩 한 장. 행은 바탕, 쓸 수 있는 버전만 왼쪽부터 채우고 칩 아래에 버전 이름',
      draw: (a) => {
        const out: El[] = []
        const gap = 18, rh = (a.b - a.y) / R
        const size = Math.min(rh - 44, (a.r - a.x - gap * 3) / 4)
        r.bgs.forEach((bg, i) => {
          cellsOf(i).forEach((c, k) => {
            const x = a.x + k * (size + gap), y = a.y + i * rh
            out.push(rect(x, y, size, size, bg))
            if (isLight(bg)) out.push(frame(x, y, size, size))
            out.push(place(c.logo.els, c.logo.box, x + size / 2, y + size / 2, size * 0.24))
            out.push(txt(r.versions[c.col], x, y + size + 22, 14, 'Inter-Light', MUTE))
          })
        })
        return out
      },
    },
    {
      id: 'cr4', name: '가로 띠 행렬', note: '바탕을 개체 자리 폭의 가로 띠로 쌓고 버전 이름은 띠 위에 열 머리로, 로고는 그 열에 맞춰 띠마다',
      draw: (a) => {
        const out: El[] = []
        const top = a.y + 44, h = (a.b - top) / R, cw = (a.r - a.x) / V
        r.bgs.forEach((bg, i) => {
          out.push(rect(a.x, top + i * h, a.r - a.x, h, bg))
          if (isLight(bg)) out.push(frame(a.x, top + i * h, a.r - a.x, h))
        })
        r.versions.forEach((v, j) => out.push(txt(v, a.x + cw * (j + 0.5), top - 20, 18, 'Inter-Light', MUTE, { anchor: 'middle' })))
        r.cells.forEach((c) => out.push(place(c.logo.els, c.logo.box, a.x + cw * (c.col + 0.5), top + h * (c.row + 0.5), Math.min(46, h * 0.3, (cw * 0.6) / 3.2))))
        return out
      },
    },
  ]
}

/**
 * 로고 자리 — 검정 버전은 밝은 쪽(경계 앞 단계들) 가운데, 화이트 버전은 어두운 쪽(경계부터) 가운데.
 * 원본도 같은 원칙으로 놓여 있다. 반환값은 단계 번호 기준 가운데 (0.5 = 첫 단계 가운데)
 */
const halfMid = (p: Panel, logo: Logo) => (logo.body.toLowerCase() === '#ffffff' ? (p.threshold + p.steps.length) / 2 : p.threshold / 2)

function grayLayouts(ps: Panel[]): Special[] {
  /** 단계 칠 — 원본은 같은 색에 불투명도를 달리 줬다 */
  const step = (s: Shade, x: number, y: number, w: number, h: number) => rect(x, y, w, h, s.fill, s.opacity < 1 ? s.opacity : undefined)
  const pct = (s: Shade) => `${Math.round(s.opacity * 100)}%`
  const noteFill = (p: Panel) => (p.noteFill === '#000000' ? INK : p.noteFill)
  /** 판 두 장을 가로로 위아래에 — 판 위 흰 면에 이름(왼쪽)·경계 설명(오른쪽) */
  const across = (a: Area, labels: boolean) => {
    const out: El[] = []
    const top = a.y + 34, gap = 72, h = (a.b - top - gap) / 2
    ps.forEach((p, i) => {
      const y = top + i * (h + gap), sw = (a.r - a.x) / p.steps.length
      out.push(txt(p.label, a.x, y - 20, 20, 'Inter-Light', MUTE))
      out.push(txt(p.note, a.r, y - 20, 15, 'Pretendard-Regular', p.noteFill, { anchor: 'end' }))
      p.steps.forEach((s, k) => {
        out.push(step(s, a.x + k * sw, y, sw, h))
        if (labels) out.push(txt(pct(s), a.x + k * sw + 12, y + h - 14, 13, VAL, k >= p.threshold ? WHITE : INK, { opacity: 0.8 }))
      })
      out.push(line(a.x + p.threshold * sw, y - 12, a.x + p.threshold * sw, y + h, p.noteFill))
      p.logos.forEach((l) => out.push(place(l.logo.els, l.logo.box, a.x + halfMid(p, l.logo) * sw, y + h / 2, Math.min(h * 0.3, (sw * p.threshold * 0.7) / 3.2))))
    })
    return out
  }
  return [
    {
      id: 'g1', name: '세로 계단', note: '두 판을 나란히 세우고 단계를 위에서 아래로 쌓음. 로고는 밝은 쪽·어두운 쪽 가운데, 화이트 버전 경계는 가로선. 판 이름·경계 설명은 판 위',
      draw: (a) => {
        const out: El[] = []
        const top = a.y + 34, gap = 40, w = (a.r - a.x - gap) / 2
        ps.forEach((p, i) => {
          const x = a.x + i * (w + gap), sh = (a.b - top) / p.steps.length
          out.push(txt(p.label, x, top - 20, 20, 'Inter-Light', MUTE))
          out.push(txt(p.note, x + w, top - 20, 14, 'Pretendard-Regular', noteFill(p), { anchor: 'end' }))
          p.steps.forEach((s, k) => out.push(step(s, x, top + k * sh, w, sh)))
          const ly = top + p.threshold * sh
          out.push(line(x - 12, ly, x + w + 12, ly, p.noteFill))
          p.logos.forEach((l) => out.push(place(l.logo.els, l.logo.box, x + w / 2, top + halfMid(p, l.logo) * sh, Math.min(sh * 1.1, (w * 0.6) / 3.2))))
        })
        return out
      },
    },
    {
      id: 'g2', name: '가로 단계', note: '원본처럼 두 판을 가로로 위아래에. 판 이름과 경계 설명은 판 위 흰 면에, 로고는 밝은 쪽·어두운 쪽 가운데',
      draw: (a) => across(a, false),
    },
    {
      id: 'g3', name: '단계 칩 + 적용 예', note: '단계를 % 숫자를 단 작은 칩 열 개로 줄이고, 그 아래에 로고를 얹은 적용 예(원본 로고가 놓인 단계의 색)',
      draw: (a) => {
        const out: El[] = []
        const top = a.y + 30, ph = (a.b - top) / 2
        ps.forEach((p, i) => {
          const y = top + i * ph, n = p.steps.length, gap = 8
          const cw = (a.r - a.x - gap * (n - 1)) / n
          out.push(txt(p.label, a.x, y - 16, 20, 'Inter-Light', MUTE))
          p.steps.forEach((s, k) => {
            const x = a.x + k * (cw + gap)
            out.push(step(s, x, y, cw, 56))
            out.push(txt(pct(s), x, y + 78, 13, VAL, k >= p.threshold ? noteFill(p) : MUTE))
          })
          const ex = [...p.logos].sort((l1, l2) => halfMid(p, l1.logo) - halfMid(p, l2.logo))
          const ew = (a.r - a.x - 24) / ex.length, ey = y + 100, eh = ph - 140
          ex.forEach((l, k) => {
            const s = p.steps[Math.floor(halfMid(p, l.logo))] ?? p.steps[0]
            out.push(step(s, a.x + k * (ew + 24), ey, ew, eh))
            out.push(place(l.logo.els, l.logo.box, a.x + k * (ew + 24) + ew / 2, ey + eh / 2, Math.min(eh * 0.36, (ew * 0.6) / 3.2)))
            out.push(txt(pct(s), a.x + k * (ew + 24) + 16, ey + eh - 16, 14, VAL, l.logo.body === WHITE ? WHITE : INK))
          })
          out.push(txt(p.note, a.r, y - 16, 15, 'Pretendard-Regular', p.noteFill, { anchor: 'end' }))
        })
        return out
      },
    },
    {
      id: 'g4', name: '가로 단계 + 눈금', note: '가로 단계 판마다 단계 아래쪽에 % 눈금을 얹음. 화이트 버전 경계 너머는 흰 글',
      draw: (a) => across(a, true),
    },
  ]
}

/** 쪽 번호 → 표현 4개 (내지 틀 1–4에 하나씩) */
export function specialLayouts(doc: Doc, page: number): Special[] {
  if (page === 10) return colorLayouts(colorSystem(doc))
  if (page === 11) return regulationLayouts(colorRegulation(doc))
  if (page === 12) return grayLayouts(grayscale(doc))
  return figureLayouts(doc, page)
}

/**
 * 내지 틀 k(0–3)로 그린다 — 제목·설명·폴리오·회색 면은 틀(contentDecls) 그대로, 개체 자리에 표현을 그린다
 */
export function renderSpecial(sp: Special, k: number, c: Content, doc: Doc, fonts: FontSet, page: number): { decl: PageDecl; page: DocPage } {
  const decl = formatDecl(c, doc, page, k, sp)
  const base = renderPage(decl, c, doc, fonts, page)
  // 그림은 바탕(과 색 면) 위, 글 아래에
  const nf = 1 + (decl.fields?.length ?? 0)
  return { decl, page: { ...base, els: [...base.els.slice(0, nf), ...sp.draw(FORMAT_SLOTS[k]), ...base.els.slice(nf)] } }
}
