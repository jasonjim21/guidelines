/** 색 계산 — 바탕별 색 역할을 브랜드 색에서 뽑는다 */

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (!Number.isFinite(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

/** a를 b 쪽으로 t만큼 섞는다 */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b)
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}

export function luminance(hex: string): number {
  const c = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** 바탕 위에 올릴 글자색 — 흰색과 먹색 중 대비가 큰 쪽 */
export const textOn = (bg: string) => (luminance(bg) > 0.42 ? '#141414' : '#ffffff')

export function rgbLabel(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `R${r} G${g} B${b}`
}
