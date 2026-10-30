import { LAYOUTS } from './layouts'
import { renderPage, type Ctx, type Issue, type PageRender } from './engine'
import type { LayoutDecl } from './decl'
import type { DocInput } from './schema'
import type { FontPair } from './fonts'

/**
 * 거르지 않고 점수를 매긴다.
 * - 진짜 문제(hard: 항목 수 불일치·넘침·잘림)가 하나라도 있으면 '안 맞는 후보'로 내린다
 * - 취향 문제(soft: 빈칸·연속 반복)는 점수만 깎아 순서를 바꾼다
 * 점수는 실제 렌더 결과에서 나온다 — 선언상 맞아도 물리적으로 넘치면 내려간다.
 * 후보가 0개가 되는 조합은 버그다. 필터를 넣지 말 것.
 */
export interface Candidate {
  layout: LayoutDecl
  score: number
  fits: boolean
  issues: Issue[]
  render: PageRender
}

const sumScore = (issues: Issue[]) => Math.max(1, Math.round(100 + issues.reduce((a, i) => a + i.delta, 0)))

export function contextFor(doc: DocInput, index: number, pair: FontPair): Ctx {
  const dividers = doc.pages.filter((p) => p.type === 'divider')
  const page = doc.pages[index]
  const no = (k: number) => String(k + 1).padStart(2, '0')
  return {
    doc, page, pair,
    pageNo: index + 1,
    sectionNo: page.type === 'divider' ? no(dividers.indexOf(page)) : '',
    toc: dividers.map((d, k) => ({ no: no(k), title: d.title || `${k + 1}장` })),
  }
}

/** 앞 장과 같은 계열·같은 레이아웃이면 순서를 내린다 (취향 문제) */
function repeatIssues(l: LayoutDecl, prev: LayoutDecl | null): Issue[] {
  if (!prev || prev.type !== l.type) return []
  if (prev.id === l.id) return [{ level: 'soft', msg: '앞 장과 같은 레이아웃입니다', delta: -16 }]
  if (prev.family === l.family) return [{ level: 'soft', msg: '앞 장과 같은 계열입니다', delta: -9 }]
  return []
}

export function rankPage(doc: DocInput, index: number, pair: FontPair, prev: LayoutDecl | null): Candidate[] {
  const ctx = contextFor(doc, index, pair)
  return LAYOUTS.filter((l) => l.type === ctx.page.type)
    .map((layout) => {
      const render = renderPage(layout, ctx)
      const issues = [...render.issues, ...repeatIssues(layout, prev)]
      return { layout, render, issues, fits: !issues.some((i) => i.level === 'hard'), score: sumScore(issues) }
    })
    .sort((a, b) => Number(b.fits) - Number(a.fits) || b.score - a.score)
}

export interface PlannedPage { candidates: Candidate[]; chosen: Candidate; pinned: boolean }

/**
 * 문서 전체 — 앞에서부터 차례로 고른다. 앞 장의 선택이 다음 장의 반복 감점에 들어가므로
 * 같은 레이아웃이 연달아 나오지 않고 계열이 섞인다. 사용자가 고정한 장은 그대로 쓴다.
 */
export function planDoc(doc: DocInput, pair: FontPair, pins: Record<string, string>): PlannedPage[] {
  const out: PlannedPage[] = []
  let prev: LayoutDecl | null = null
  doc.pages.forEach((p, i) => {
    const candidates = rankPage(doc, i, pair, prev)
    const pin = pins[p.id]
    const chosen = candidates.find((c) => c.layout.id === pin) ?? candidates[0]
    out.push({ candidates, chosen, pinned: !!pin && chosen.layout.id === pin })
    prev = chosen.layout
  })
  return out
}
