import { forwardRef } from 'react'
import { PAGE } from './system'
import { familyOf, type FontPair } from './fonts'
import type { Op } from './engine'

/**
 * Op 배열 → SVG. 유일한 렌더러다.
 * 화면 미리보기·후보 썸네일·인쇄(PDF) 보기가 전부 이 컴포넌트를 쓴다.
 * 두 번째 렌더러를 만들지 말 것 — 새 출력이 필요하면 Op 배열을 소비하는 쪽을 늘린다.
 */
const anchor = (a: 'left' | 'center' | 'right') => (a === 'left' ? 'start' : a === 'right' ? 'end' : 'middle')

function OpEl({ op, family, k }: { op: Op; family: string; k: number }) {
  switch (op.t) {
    case 'rect':
      return <rect key={k} x={op.x} y={op.y} width={op.w} height={op.h} fill={op.fill} stroke={op.stroke} strokeWidth={op.sw} />
    case 'line':
      return <line key={k} x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2} stroke={op.stroke} strokeWidth={op.w} />
    case 'poly':
      return <polygon key={k} points={op.pts.map((p) => p.join(',')).join(' ')} fill={op.fill} stroke={op.stroke} strokeWidth={op.sw} strokeLinejoin="round" />
    case 'text':
      return (
        <text key={k} x={op.x} y={op.y} fontFamily={family} fontSize={op.size} fontWeight={op.weight} fill={op.fill}
          textAnchor={anchor(op.anchor)} letterSpacing={Math.min(0, op.track) * op.size} xmlSpace="preserve">{op.s}</text>
      )
    case 'img':
      return <image key={k} x={op.x} y={op.y} width={op.w} height={op.h} href={op.src} preserveAspectRatio="xMidYMid meet"
        style={op.mono ? { filter: 'brightness(0) invert(1)' } : undefined} />
    case 'photo': {
      const cx = op.x + op.w / 2, cy = op.y + op.h / 2
      const s = Math.min(op.w, op.h)
      return (
        <g key={k}>
          <rect x={op.x} y={op.y} width={op.w} height={op.h} fill={op.fill} />
          <polygon points={`${op.x},${op.y + op.h} ${op.x + op.w * 0.38},${op.y + op.h * 0.45} ${op.x + op.w * 0.6},${op.y + op.h * 0.72} ${op.x + op.w * 0.76},${op.y + op.h * 0.55} ${op.x + op.w},${op.y + op.h}`} fill={op.fg} opacity={0.55} />
          <circle cx={op.x + op.w * 0.76} cy={op.y + op.h * 0.28} r={s * 0.07} fill={op.fg} opacity={0.7} />
          {s > 120 && (
            <text x={cx} y={cy + 6} fontFamily={family} fontSize={Math.max(14, Math.min(22, s * 0.07))} fontWeight={500} fill={op.fg} textAnchor="middle" opacity={0.95}>{op.label}</text>
          )}
        </g>
      )
    }
  }
}

export interface PageSvgProps {
  ops: Op[]
  pair: FontPair
  overlay?: Op[]
  title?: string
}

export const PageSvg = forwardRef<SVGSVGElement, PageSvgProps>(function PageSvg({ ops, pair, overlay, title }, ref) {
  const family = familyOf(pair)
  return (
    <svg ref={ref} viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
      {ops.map((op, i) => <OpEl key={i} op={op} family={family} k={i} />)}
      {overlay?.map((op, i) => <OpEl key={'o' + i} op={op} family={family} k={i} />)}
    </svg>
  )
})
