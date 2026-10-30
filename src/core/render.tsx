import type { Assets, DocPage, El } from './doc'
import { faceOf, type FontSet } from './fonts'

/**
 * 장평은 언제나 100%. 글자 폭을 늘이거나 줄이지 않는다 (textLength·scaleX 금지).
 *
 * 좌표 원자료 → SVG. 유일한 렌더러다. 화면 미리보기와 PDF 출력이 이 컴포넌트 하나를 쓴다.
 * 두 번째 렌더러를 만들지 말 것.
 */
/** 자간 -2% — 모든 글에 적용한다 (0을 넘기지 않는다) */
export const TRACK = -0.02

const clipKey = (b: number[]) => b.map((v) => Math.round(v)).join('_')

function ElNode({ el, assets, fonts, cid, pid, track }: { el: El; assets: Assets; fonts: FontSet; cid: (b: number[]) => string; pid: (k: string) => string; track: number }) {
  const shape = el.clipPath && assets[el.clipPath] ? el.clipPath : null
  const common = {
    opacity: el.opacity,
    clipPath: shape ? `url(#${pid(shape)})` : el.clip ? `url(#${cid(el.clip)})` : undefined,
  }
  switch (el.t) {
    case 'group':
      // 안쪽 잘라내기는 원본 좌표로 정의돼 있다 — transform 안에서 쓰면 같이 옮겨진다
      return (
        <g transform={`translate(${el.tf[1]} ${el.tf[2]}) scale(${el.tf[0]})`} opacity={el.opacity}>
          {el.els.map((c) => <ElNode key={c.id} el={c} assets={assets} fonts={fonts} cid={cid} pid={pid} track={track} />)}
        </g>
      )
    case 'rect': {
      const [x, y, w, h] = el.box
      return <rect x={x} y={y} width={w} height={h} fill={el.fill ?? 'none'} fillOpacity={el.fillOpacity} {...common} />
    }
    case 'line': {
      const [x1, y1, x2, y2] = el.pts
      return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={el.stroke} strokeWidth={el.sw} {...common} />
    }
    case 'path': {
      const d = el.d ?? assets[el.ref ?? el.id]
      if (!d) {
        const [x, y, w, h] = el.box
        return <rect x={x} y={y} width={w} height={h} fill={el.fill ? el.fill : 'none'} fillOpacity={el.fill ? 0.25 : undefined} stroke={el.stroke ?? el.fill} strokeWidth={1} {...common} />
      }
      const shape = (
        <path d={d} transform={el.tf ? `translate(${el.tf[1]} ${el.tf[2]}) scale(${el.tf[0]})` : undefined} fill={el.fill ?? 'none'} fillOpacity={el.fillOpacity} fillRule={el.evenodd ? 'evenodd' : 'nonzero'}
          stroke={el.stroke} strokeWidth={el.stroke ? el.sw : undefined} strokeMiterlimit={10} {...(el.tf ? { opacity: el.opacity } : common)} />
      )
      // 옮긴 모양(tf)의 잘라내기는 쪽 좌표 그대로여야 하므로 바깥 묶음에 건다 (path에 걸면 변환된 좌표로 잘린다)
      return el.tf && common.clipPath ? <g clipPath={common.clipPath}>{shape}</g> : shape
    }
    case 'image': {
      const [x, y, w, h] = el.box
      const src = assets[el.id]
      return src
        ? <image href={src} x={x} y={y} width={w} height={h} preserveAspectRatio="none" {...common} />
        : <rect x={x} y={y} width={w} height={h} fill="#cfd6e4" {...common} />
    }
    case 'text': {
      const f = faceOf(fonts, el.font)
      const s = f.upper ? el.s.toUpperCase() : el.s
      return (
        <text x={el.x} y={el.y} fontFamily={f.family} fontSize={el.size} fontWeight={f.weight} fill={el.fill}
          letterSpacing={track ? track * el.size : undefined} textAnchor={el.anchor}
          xmlSpace="preserve" {...common}>{s}</text>
      )
    }
  }
}

/** track: 자간(em). 변주는 −2%, 원본 재현은 원본 그대로(0) */
export function PageSvg({ page, assets, fonts, track = TRACK }: { page: DocPage; assets: Assets; fonts: FontSet; track?: number }) {
  const clips = new Map<string, number[]>()
  const flat: El[] = []
  const walk = (es: El[]) => es.forEach((e) => { flat.push(e); if (e.t === 'group') walk(e.els) })
  walk(page.els)
  flat.forEach((e) => { if (e.clip) clips.set(clipKey(e.clip), e.clip) })
  const cid = (b: number[]) => `c${page.page}_${clipKey(b)}`
  const pid = (k: string) => k.replace(/[^a-z0-9]/gi, '_')
  const shapes = new Set(flat.map((e) => e.clipPath).filter((k): k is string => !!k && !!assets[k]))
  return (
    <svg viewBox={`0 0 ${page.w} ${page.h}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${page.page}쪽`}>
      <defs>
        {[...clips.values()].map((b) => (
          <clipPath key={clipKey(b)} id={cid(b)}><rect x={b[0]} y={b[1]} width={b[2]} height={b[3]} /></clipPath>
        ))}
        {[...shapes].map((k) => <clipPath key={k} id={pid(k)}><path d={assets[k]} /></clipPath>)}
      </defs>
      <rect x={0} y={0} width={page.w} height={page.h} fill="#ffffff" />
      {page.els.map((el) => <ElNode key={el.id} el={el} assets={assets} fonts={fonts} cid={cid} pid={pid} track={track} />)}
    </svg>
  )
}
