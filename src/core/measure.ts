/**
 * 글자 폭 측정과 한글 줄바꿈.
 * 줄바꿈은 어절 단위(word-break: keep-all과 같은 규칙). 한 어절이 칸보다 길 때만 글자 단위로 끊는다.
 */

let ctx: CanvasRenderingContext2D | null | undefined

function getCtx(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx
  if (typeof document === 'undefined') { ctx = null; return ctx }
  ctx = document.createElement('canvas').getContext('2d')
  return ctx
}

export interface Font { size: number; weight: number; family: string; track: number }

export function textWidth(s: string, f: Font): number {
  if (!s) return 0
  const c = getCtx()
  const tr = Math.min(0, f.track) * f.size
  if (!c) return s.length * f.size * 0.92 + tr * (s.length - 1)
  c.font = `${f.weight} ${f.size}px ${f.family}`
  return c.measureText(s).width + tr * Math.max(0, s.length - 1)
}

/** 한 단락을 폭에 맞춰 줄로 나눈다 */
function wrapPara(text: string, width: number, f: Font): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  const push = () => { if (cur) lines.push(cur); cur = '' }
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w
    if (textWidth(next, f) <= width) { cur = next; continue }
    push()
    if (textWidth(w, f) <= width) { cur = w; continue }
    // 어절 하나가 칸보다 길다 — 글자 단위로 끊는다
    let piece = ''
    for (const ch of Array.from(w)) {
      if (textWidth(piece + ch, f) > width && piece) { lines.push(piece); piece = ch } else piece += ch
    }
    cur = piece
  }
  push()
  return lines
}

/**
 * breaks: 강제 줄바꿈 기호. 제목류는 '/', 본문은 줄바꿈 문자만.
 * 빈 단락은 빈 줄로 남긴다 (본문 단락 사이 한 줄).
 */
export function wrap(text: string, width: number, f: Font, breaks: 'slash' | 'newline'): string[] {
  const paras = breaks === 'slash' ? text.split('/').map((s) => s.trim()) : text.split('\n').map((s) => s.trim())
  const out: string[] = []
  paras.forEach((p, i) => {
    if (!p) { if (breaks === 'newline' && i > 0 && i < paras.length - 1) out.push(''); return }
    out.push(...wrapPara(p, width, f))
  })
  return out
}
