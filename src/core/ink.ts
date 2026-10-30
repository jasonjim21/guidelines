import { TRACK } from './render'

/**
 * 글자 잉크 경계 — 정렬을 글자 상자(진행 폭)가 아니라 실제 획 끝에 맞추려고 잰다.
 * 큰 글자는 왼쪽 옆여백이 커서, 상자로 맞추면 작은 글·로고보다 안으로 들어가 보인다.
 * 반환값은 글 원점에서 잉크 왼쪽·오른쪽 끝까지 거리(px). 폰트가 다 받아진 뒤에 재야 맞다.
 */
let ctx: CanvasRenderingContext2D | null | undefined

export function inkBounds(s: string, size: number, family: string, weight: number): { left: number; right: number } {
  if (ctx === undefined) ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (!ctx) return { left: 0, right: s.length * size * 0.9 }
  ctx.font = `${weight} ${size}px ${family}`
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${TRACK * size}px`
  const m = ctx.measureText(s)
  return { left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight }
}
