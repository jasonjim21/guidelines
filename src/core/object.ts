import type { Box, Doc, El } from './doc'

/**
 * 원본 내지 한 쪽의 '개체' — 쪽 제목·설명·폴리오를 뺀 나머지 전부를 한 묶음으로.
 * 색 띠·로고 행렬·견본처럼 로고 하나가 아닌 쪽도 내지 변주에 같은 방식으로 옮기고 키우려고 쓴다.
 * 묶음 안의 잘라내기·투명도·칠 순서는 원본 그대로 둔다 (렌더러가 group을 원본 좌표계로 그린다).
 */

/** 쪽 머리(제목·설명)와 폴리오 — 내지 변주가 따로 그리는 글 */
export function isHeadText(e: El): boolean {
  if (e.t !== 'text') return false
  if (e.size === 18 && e.y > 960) return true // 폴리오
  if (e.size === 30 && e.y < 160) return true // 쪽 제목 (국문·영문)
  if (e.size === 16 && e.font.startsWith('Pretendard') && e.x < 600 && e.y < 300) return true // 설명
  return false
}

function boxOf(e: El): Box {
  if (e.t === 'text') return [e.x, e.y - e.size * 0.8, e.w ?? e.s.length * e.size * 0.6, e.size]
  if (e.t === 'group') return e.box
  const b = e.box
  // 잘린 요소는 잘린 상자만큼만 보인다 (모티브 선처럼 쪽 밖까지 그려 둔 것)
  if (e.clip) {
    const [cx, cy, cw, ch] = e.clip
    const x0 = Math.max(b[0], cx), y0 = Math.max(b[1], cy)
    const x1 = Math.min(b[0] + b[2], cx + cw), y1 = Math.min(b[1] + b[3], cy + ch)
    return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)]
  }
  return b
}

export interface PageObject { els: El[]; box: Box }

const cache = new Map<number, PageObject>()
export function pageObject(doc: Doc, pageNo: number): PageObject {
  const hit = cache.get(pageNo)
  if (hit) return hit
  const page = doc.pages[pageNo - 1]
  const els = page.els.filter((e) => !isHeadText(e) && !(e.t === 'rect' && e.box[2] >= page.w - 1 && e.box[3] >= page.h - 1))
  const bs = els.map(boxOf).filter((b) => b[2] > 0 && b[3] > 0)
  const x0 = Math.min(...bs.map((b) => b[0])), y0 = Math.min(...bs.map((b) => b[1]))
  const x1 = Math.max(...bs.map((b) => b[0] + b[2])), y1 = Math.max(...bs.map((b) => b[1] + b[3]))
  const o: PageObject = { els, box: [x0, y0, x1 - x0, y1 - y0] }
  cache.set(pageNo, o)
  return o
}
