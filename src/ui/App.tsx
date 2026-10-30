import { useEffect, useState } from 'react'
import raw from '../../references/samwoo-ci-v1.json'
import type { Assets, Doc } from '../core/doc'
import { FONT_SETS } from '../core/fonts'
import { PageSvg } from '../core/render'
import { renderPage, type Content, type PageDecl } from '../core/blocks'
import { BASE, COVERS, coverContent } from '../core/cover'
import { tocContent, tocDecls, tocText } from '../core/toc'
import { DIVIDER_BASE, dividerDecls, dividerDevelop } from '../core/divider'
import { CONTENT_PAGES, contentDecls, contentPageText } from '../core/content'
import { APP_ITEMS, appContent, appDecl } from '../core/application'

const DOC = raw as unknown as Doc

// 패스 모양·사진은 저장소에 넣지 않는다. 로컬에 뽑아 둔 파일이 있을 때만 붙는다.
const local = import.meta.glob('../../references/local/samwoo-ci-v1.assets.json', { eager: true, import: 'default' })
const ASSETS: Assets = (Object.values(local)[0] as Assets | undefined) ?? {}

const TOC = tocContent(DOC)
const CONTENT: Content = { ...coverContent(DOC), ...tocText(TOC), ...contentPageText(DOC, 4) }
/** 내지는 쪽마다 제목·설명이 다르다 */
const PAGE_CONTENT = CONTENT_PAGES.map((p) => ({ ...p, content: { ...CONTENT, ...contentPageText(DOC, p.page) } }))
const TOC_DECLS = tocDecls(TOC)

/** 정렬을 획 끝으로 맞추려면 실제 서체로 재야 한다 — 서체를 받은 뒤 한 번 더 그린다 */
const FACES = [800, 700, 600, 500, 400, 300].map((w) => `${w} 40px "Pretendard Variable"`)
  .concat([400, 500, 600].map((w) => `${w} 40px "Inter"`), ['600 40px "Barlow Condensed"'])

function Section({ title, sub, decls, content = CONTENT }: { title: string; sub: string; decls: { d: PageDecl; label: string }[]; content?: Content }) {
  const fonts = FONT_SETS[0]
  return (
    <section className="gle-section">
      <header className="gle-bar">
        <h1>{title}</h1>
        <p>{sub}</p>
      </header>
      <div className="gle-grid">
        {decls.map(({ d, label }, i) => (
          <figure key={d.id} className="gle-page">
            <PageSvg page={renderPage(d, content, DOC, fonts, i)} assets={ASSETS} fonts={fonts} />
            <figcaption>
              <span className="gle-num">{label}</span>
              <strong>{d.name}</strong>
              <span className="gle-note">{d.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

type Tab = 'cover' | 'toc' | 'divider' | 'content' | 'application'
const TABS: { id: Tab; label: string; ready: boolean }[] = [
  { id: 'cover', label: '표지', ready: true },
  { id: 'toc', label: '목차', ready: true },
  { id: 'divider', label: '간지', ready: true },
  { id: 'content', label: '내지', ready: true },
  { id: 'application', label: '응용 시스템', ready: true },
]
const readHash = (): Tab => {
  try {
    const h = location.hash.slice(1)
    return TABS.some((t) => t.id === h && t.ready) ? (h as Tab) : 'cover'
  } catch { return 'cover' }
}

const route = (() => { try { return location.hash } catch { return '' } })()
const isOriginal = route === '#original'
/** #deck — 전체 장표: 원본 17장에 목차(응용 시스템 5항목)와 응용 시스템 내지 5장을 넣은 문서 순서 */
const isDeck = route === '#deck'

export default function App() {
  const [, setReady] = useState(0)
  const [tab, setTab] = useState<Tab>(readHash)
  useEffect(() => {
    const sample = Object.values(CONTENT).flat().join('')
    const all = sample + sample.toUpperCase()
    Promise.all(FACES.map((f) => document.fonts.load(f, all).catch(() => null))).then(() => setReady((n) => n + 1))
    const onHash = () => setTab(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const pick = (t: Tab) => {
    setTab(t)
    try { history.replaceState(null, '', `#${t}`) } catch { /* 주소를 못 바꿔도 탭은 바뀐다 */ }
  }
  const num = (i: number) => String(i).padStart(2, '0')
  // #original — 원본 재현 17장만 (원본 자간 그대로). scripts/export-html.mjs가 이 화면을 HTML 한 파일로 뽑는다
  if (isDeck) {
    const fonts = FONT_SETS[0]
    const pages = [
      DOC.pages[0],
      renderPage(TOC_DECLS.base, CONTENT, DOC, fonts, 2),
      ...DOC.pages.slice(2),
      ...APP_ITEMS.map((it, i) => renderPage(appDecl(it, { ...CONTENT, ...appContent(it, CONTENT.folio) }), { ...CONTENT, ...appContent(it, CONTENT.folio) }, DOC, fonts, 18 + i)),
    ]
    return (
      <div className="gle">
        <main className="gle-original">
          {pages.map((p, i) => <PageSvg key={i} page={{ ...p, page: i + 1 }} assets={ASSETS} fonts={fonts} track={0} />)}
        </main>
      </div>
    )
  }
  if (isOriginal) {
    return (
      <div className="gle">
        <main className="gle-original">
          {DOC.pages.map((p) => <PageSvg key={p.page} page={p} assets={ASSETS} fonts={FONT_SETS[0]} track={0} />)}
        </main>
      </div>
    )
  }
  return (
    <div className="gle">
      <nav className="gle-tabs" role="tablist" aria-label="장표 유형">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} disabled={!t.ready}
            onClick={() => pick(t.id)}>
            {t.label}{!t.ready && <span className="gle-soon">준비 중</span>}
          </button>
        ))}
      </nav>
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'cover' && (
          <Section
            title="표지 변주 10"
            sub="원본 표지를 기본형으로 · 01–05 로고를 크게, 06–10 글로 짜기 · 영문 제목 대문자 · 배경 그래픽 없음 · 자간 −2% · 장평 100%"
            decls={[{ d: BASE, label: '기준' }, ...COVERS.map((d, i) => ({ d, label: num(i + 1) }))]}
          />
        )}
        {tab === 'application' && APP_ITEMS.map((it, i) => {
          const c = { ...CONTENT, ...appContent(it, CONTENT.folio) }
          return (
            <Section
              key={it.mock}
              title={`${String(i + 1).padStart(2, '0')} ${it.kr} ${it.en}`}
              sub="원본 내지 기준형에 본문 초안과 평면 목업(통용 규격). 목업 속 글은 회색 막대 자리표시"
              content={c}
              decls={[{ d: appDecl(it, c), label: it.kr }]}
            />
          )
        })}
        {tab === 'content' && PAGE_CONTENT.map((p) => {
          const decls = contentDecls(p.content, DOC, p.asset, p.page)
          return (
            <Section
              key={p.page}
              title={`내지 변주 · ${p.content.pkr[0]} (원본 ${p.page}쪽)`}
              sub="원본 심볼 장을 기본형으로 · 제목·설명·개체·하단 캡션 위치와 개체 뒤 상자만 바꿈 · 같은 선언을 쪽마다 그림 · 개체는 단 수·높이 상자 안에 맞춤"
              content={p.content}
              decls={[{ d: decls.base, label: '기준' }, ...decls.variants.map((d) => ({ d, label: d.id.slice(1) }))]}
            />
          )
        })}
        {tab === 'divider' && (
          <Section
            title="간지 디벨롭 · 04 08 09 10"
            sub="고른 넷을 두 갈래씩 더 밀어 봄 · 번호는 원래 변주 번호-갈래"
            decls={dividerDevelop(CONTENT)}
          />
        )}
        {tab === 'divider' && (
          <Section
            title="간지 변주 10"
            sub="원본 간지를 기본형으로 · 기본 시스템 한 장으로만 · 항목 목록·장 번호 없이 (머리표가 필요하면 A.) · 자간 −2% · 장평 100%"
            decls={[{ d: DIVIDER_BASE, label: '기준' }, ...dividerDecls(CONTENT).map((d, i) => ({ d, label: num(i + 1) }))]}
          />
        )}
        {tab === 'toc' && (
          <Section
            title="목차 변주 10"
            sub="원본 목차를 기본형으로 · 응용 시스템은 명함·소봉투·대봉투·쇼핑백·티셔츠 · 구분표 없이 영문을 옅게 · 자간 −2% · 장평 100%"
            decls={[{ d: TOC_DECLS.base, label: '기준' }, ...TOC_DECLS.variants.map((d, i) => ({ d, label: num(i + 1) }))]}
          />
        )}
      </div>
    </div>
  )
}
