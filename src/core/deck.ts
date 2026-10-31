import type { Doc, DocPage } from './doc'
import type { FontSet } from './fonts'
import { renderPage, type Content, type PageDecl } from './blocks'
import { BASE, COVERS, coverContent } from './cover'
import { tocContent, tocDecls, tocText } from './toc'
import { DIVIDER_BASE, dividerDecls } from './divider'
import { CONTENT_PAGES, contentDecls, contentPageText } from './content'
import { renderSpecial, specialLayouts } from './specials'
import { APP_ITEMS, appContent, appDecl } from './application'

/**
 * 전체 장표 — 산출물의 진입점.
 * 표지·목차·간지는 기준(0)과 변주 1–10 중 하나, 내지는 틀 1–4 중 하나를 골라 모든 내지를 같은 틀로 잇는다.
 *
 *   표지 · 목차 · 간지(기본 시스템) · 내지 13장(원본 4–16쪽) · 간지(응용 시스템, 원본 17쪽 자리) · 응용 시스템 5장 = 22장
 *
 * 각 장은 { page, track } — track을 비우면 변주 자간 −2%(TRACK).
 * 그리기는 render.tsx의 PageSvg 하나로: <PageSvg page={p.page} assets={assets} fonts={fonts} track={p.track} />
 */
export interface DeckChoice {
  /** 0 = 원본, 1–10 = 변주 번호 */
  cover: number
  toc: number
  divider: number
  /** 내지 틀 1–4 (1 원본 · 2 왼쪽 회색 면 · 3 개체 왼쪽 · 4 개체 위) */
  format: 1 | 2 | 3 | 4
}
export interface DeckPage { page: DocPage; track?: number; kind: 'cover' | 'toc' | 'divider' | 'content' | 'application'; name: string }

export const DEFAULT_CHOICE: DeckChoice = { cover: 0, toc: 0, divider: 0, format: 1 }

/** 원본에서 읽은 공통 내용 (브랜드명·제목·폴리오·목차 항목·장 제목) */
export function deckContent(doc: Doc): Content {
  return { ...coverContent(doc), ...tocText(tocContent(doc)), ...contentPageText(doc, 4) }
}

const pick = (base: PageDecl, vs: PageDecl[], n: number) => (n <= 0 ? base : vs[Math.min(n, vs.length) - 1])

export function buildDeck(doc: Doc, fonts: FontSet, choice: DeckChoice = DEFAULT_CHOICE): DeckPage[] {
  const c = deckContent(doc)
  const k = choice.format - 1
  const out: DeckPage[] = []
  const add = (kind: DeckPage['kind'], name: string, page: DocPage, track?: number) => out.push({ kind, name, page: { ...page, page: out.length + 1 }, track })

  add('cover', '표지', renderPage(pick(BASE, COVERS, choice.cover), c, doc, fonts, 1))
  const toc = tocDecls(tocContent(doc))
  add('toc', '목차', renderPage(pick(toc.base, toc.variants, choice.toc), c, doc, fonts, 2))

  // 간지 선언은 0번 장(kr0·en0·enl0·ab0)을 읽는다 — 응용 시스템 장은 1번 키를 0번 자리에 넣어 같은 선언으로
  const divider = (i: number) => {
    const ci = { ...c, kr0: c[`kr${i}`], en0: c[`en${i}`], enl0: c[`enl${i}`], ab0: c[`ab${i}`] }
    return renderPage(pick(DIVIDER_BASE, dividerDecls(ci), choice.divider), ci, doc, fonts, 3)
  }
  add('divider', c.kr0[0], divider(0))

  for (const p of CONTENT_PAGES) {
    const pc = { ...c, ...contentPageText(doc, p.page) }
    const special = specialLayouts(doc, p.page)
    if (special.length) add('content', pc.pkr[0], renderSpecial(special[k], k, pc, doc, fonts, p.page).page)
    else {
      const d = contentDecls(pc, doc, p.asset, p.page)
      add('content', pc.pkr[0], renderPage([d.base, ...d.variants][k], pc, doc, fonts, p.page))
    }
  }

  add('divider', c.kr1[0], divider(1))
  APP_ITEMS.forEach((it, i) => {
    const ac = { ...c, ...appContent(it, c.folio) }
    const d = k === 0 ? appDecl(it, ac) : contentDecls(ac, doc, null, 0, it.mock).variants[k - 1]
    add('application', it.kr, renderPage(d, ac, doc, fonts, 18 + i))
  })

  return out
}

/** 주소 해시에서 고르기 — #deck?cover=3&toc=2&divider=4&format=2 */
export function choiceFromQuery(q: string): DeckChoice {
  const p = new URLSearchParams(q)
  const n = (key: string, max: number, def: number) => {
    const v = Number(p.get(key))
    return Number.isInteger(v) && v >= 0 && v <= max ? v : def
  }
  return { cover: n('cover', 10, 0), toc: n('toc', 10, 0), divider: n('divider', 10, 0), format: n('format', 4, 1) as DeckChoice['format'] || 1 }
}
