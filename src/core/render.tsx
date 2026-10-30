import type { Assets, DocPage, El } from './doc'
import { faceOf, type FontSet } from './fonts'

/**
 * 좌표 원자료 → SVG. 유일한 렌더러다. 화면 미리보기와 PDF 출력이 이 컴포넌트 하나를 쓴다.
 * 두 번째 렌더러를 만들지 말 것.
 */
const clipKey = (b: number[]) => b.map((v) => Math.round(v)).join('_')

function ElNode({ el, assets, fonts, cid, pid }: { el: El; assets: Assets; fonts: FontSet; cid: (b: number[]) => string; pid: (k: string) => string }) {
  const shape = el.clipPath && assets[el.clipPath] ? el.clipPath : null
  const common = {
    opacity: el.opacity,
    clipPath: shape ? `url(#${pid(shape)})` : el.clip ? `url(#${cid(el.clip)})` : undefined,
  }
  switch (el.t) {
    case 'rect': {
      const [x, y, w, h] = el.box
      return <rect x={x} y={y} width={w} height={h} fill={el.fill ?? 'none'} fillOpacity={el.fillOpacity} {...common} />
    }
    case 'line': {
      const [x1, y1, x2, y2] = el.pts
      return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={el.stroke} strokeWidth={el.sw} {...common} />
    }
    case 'path': {
      const d = assets[el.id]
      if (!d) {
        const [x, y, w, h] = el.box
        return <rect x={x} y={y} width={w} height={h} fill={el.fill ? el.fill : 'none'} fillOpacity={el.fill ? 0.25 : undefined} stroke={el.stroke ?? el.fill} strokeWidth={1} {...common} />
      }
      return (
        <path d={d} fill={el.fill ?? 'none'} fillOpacity={el.fillOpacity} fillRule={el.evenodd ? 'evenodd' : 'nonzero'}
          stroke={el.stroke} strokeWidth={el.stroke ? el.sw : undefined} strokeMiterlimit={10} {...common} />
      )
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
          textLength={f.fit ? el.w : undefined} lengthAdjust={f.fit ? 'spacingAndGlyphs' : undefined}
          xmlSpace="preserve" {...common}>{s}</text>
      )
    }
  }
}

export function PageSvg({ page, assets, fonts }: { page: DocPage; assets: Assets; fonts: FontSet }) {
  const clips = new Map<string, number[]>()
  page.els.forEach((e) => { if (e.clip) clips.set(clipKey(e.clip), e.clip) })
  const cid = (b: number[]) => `c${page.page}_${clipKey(b)}`
  const pid = (k: string) => k.replace(/[^a-z0-9]/gi, '_')
  const shapes = new Set(page.els.map((e) => e.clipPath).filter((k): k is string => !!k && !!assets[k]))
  return (
    <svg viewBox={`0 0 ${page.w} ${page.h}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${page.page}쪽`}>
      <defs>
        {[...clips.values()].map((b) => (
          <clipPath key={clipKey(b)} id={cid(b)}><rect x={b[0]} y={b[1]} width={b[2]} height={b[3]} /></clipPath>
        ))}
        {[...shapes].map((k) => <clipPath key={k} id={pid(k)}><path d={assets[k]} /></clipPath>)}
      </defs>
      <rect x={0} y={0} width={page.w} height={page.h} fill="#ffffff" />
      {page.els.map((el) => <ElNode key={el.id} el={el} assets={assets} fonts={fonts} cid={cid} pid={pid} />)}
    </svg>
  )
}
