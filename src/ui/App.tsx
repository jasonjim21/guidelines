import { useEffect, useMemo, useState } from 'react'
import { SAMPLE } from '../core/sample'
import { FONT_PAIRS, loadPair, pairById } from '../core/fonts'
import { planDoc } from '../core/score'
import { gridOps } from '../core/engine'
import { PageSvg } from '../core/render'
import { PAGE_TYPE_LABEL, blankPage, type DocInput, type PageInput, type PageType } from '../core/schema'
import BrandPanel from './BrandPanel'
import PageEditor from './PageEditor'
import Candidates from './Candidates'
import IssueList from './IssueList'
import RefView from './RefView'

type View = 'doc' | 'ref' | 'print'

/** #print — 모든 장을 원래 크기로 쌓는다. PDF는 이 화면을 그대로 찍는다 (scripts/pdf.mjs) */
const initialView = (): View => {
  try { return location.hash === '#print' ? 'print' : 'doc' } catch { return 'doc' }
}

export default function App() {
  const [doc, setDoc] = useState<DocInput>(SAMPLE)
  const [pairId, setPairId] = useState('pretendard')
  const [pins, setPins] = useState<Record<string, string>>({})
  const [selId, setSelId] = useState(SAMPLE.pages[3].id)
  const [grid, setGrid] = useState(false)
  const [view, setView] = useState<View>(initialView)
  const [fontTick, setFontTick] = useState(0)

  const pair = pairById(pairId)
  const allText = useMemo(
    () => [doc.brand.nameKr, doc.brand.nameEn, doc.brand.docName, ...doc.brand.colors.map((c) => c.name),
      ...doc.pages.flatMap((p) => [p.title, p.subtitle, p.body, ...p.captions]), '목차 가나다라마바사 아자차카타파하 항목'].join(''),
    [doc],
  )

  // 글자체가 바뀌면 글리프를 받은 뒤 다시 잰다 — 측정값이 서체마다 다르다
  useEffect(() => {
    let dead = false
    loadPair(pair, allText).then(() => { if (!dead) setFontTick((t) => t + 1) })
    return () => { dead = true }
  }, [pair, allText])

  const plan = useMemo(() => planDoc(doc, pair, pins), [doc, pair, pins, fontTick])
  const selIndex = Math.max(0, doc.pages.findIndex((p) => p.id === selId))
  const selPage = doc.pages[selIndex]
  const sel = plan[selIndex]

  const updatePage = (p: PageInput) => setDoc((d) => ({ ...d, pages: d.pages.map((x) => (x.id === p.id ? p : x)) }))
  const addPage = (type: PageType) => {
    const p = blankPage(type)
    if (type === 'content') { p.title = 'New Page'; p.body = '이 장의 설명을 적습니다.'; p.logos = 1 }
    if (type === 'divider') p.title = 'Section'
    setDoc((d) => {
      const pages = [...d.pages]
      pages.splice(selIndex + 1, 0, p)
      return { ...d, pages }
    })
    setSelId(p.id)
  }
  const removePage = (id: string) => {
    if (doc.pages.length <= 1) return
    const i = doc.pages.findIndex((p) => p.id === id)
    const pages = doc.pages.filter((p) => p.id !== id)
    setDoc({ ...doc, pages })
    if (id === selId) setSelId(pages[Math.min(i, pages.length - 1)].id)
  }
  const movePage = (id: string, dir: -1 | 1) => {
    const i = doc.pages.findIndex((p) => p.id === id)
    const j = i + dir
    if (j < 0 || j >= doc.pages.length) return
    const pages = [...doc.pages]
    ;[pages[i], pages[j]] = [pages[j], pages[i]]
    setDoc({ ...doc, pages })
  }
  const pin = (layoutId: string | null) =>
    setPins((p) => {
      const n = { ...p }
      if (layoutId) n[selPage.id] = layoutId
      else delete n[selPage.id]
      return n
    })

  const misfits = plan.filter((p) => !p.chosen.fits).length

  return (
    <div className="gle">
      <header className="gle-bar">
        <div className="gle-brandmark">
          <span className="gle-mark" aria-hidden="true" />
          <div>
            <h1>장표 엔진</h1>
            <p>브랜드 가이드라인 · 1920×1080 · 12단 × 8행</p>
          </div>
        </div>
        <nav className="gle-tabs" aria-label="보기">
          <button type="button" aria-pressed={view === 'doc'} onClick={() => setView('doc')}>문서</button>
          <button type="button" aria-pressed={view === 'ref'} onClick={() => setView('ref')}>레퍼런스 실측</button>
          <button type="button" aria-pressed={view === 'print'} onClick={() => setView('print')}>전체 장표</button>
        </nav>
        <div className="gle-controls">
          <label className="gle-field gle-inline" htmlFor="gle-pair">
            <span>글자체</span>
            <select id="gle-pair" value={pairId} onChange={(e) => setPairId(e.target.value)}>
              {FONT_PAIRS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="gle-check" htmlFor="gle-grid">
            <input id="gle-grid" type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
            <span>그리드</span>
          </label>
        </div>
      </header>

      {view === 'print' ? (
        <main className="gle-print">
          {plan.map((pl, i) => (
            <PageSvg key={doc.pages[i].id} ops={pl.chosen.render.ops} pair={pair} title={`${i + 1} ${pl.chosen.layout.name}`} />
          ))}
        </main>
      ) : view === 'ref' ? (
        <RefView pair={pair} grid={grid} />
      ) : (
        <main className="gle-main">
          <aside className="gle-side">
            <BrandPanel brand={doc.brand} onChange={(brand) => setDoc({ ...doc, brand })} />
            <section className="gle-panel">
              <div className="gle-panel-head">
                <h2>장표 {doc.pages.length}장</h2>
                <span className={misfits ? 'gle-pill gle-pill-bad' : 'gle-pill gle-pill-ok'}>
                  {misfits ? `안 맞음 ${misfits}` : '모두 맞음'}
                </span>
              </div>
              <ol className="gle-pages">
                {doc.pages.map((p, i) => {
                  const pl = plan[i]
                  return (
                    <li key={p.id} className={p.id === selId ? 'is-sel' : ''}>
                      <button type="button" className="gle-page-btn" onClick={() => setSelId(p.id)}>
                        <span className="gle-num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="gle-page-txt">
                          <span className="gle-page-title">
                            <span className={`gle-type gle-type-${p.type}`}>{PAGE_TYPE_LABEL[p.type]}</span>
                            {p.title.replace(/\//g, ' ') || (p.type === 'toc' ? '목차' : '제목 없음')}
                          </span>
                          <span className="gle-page-sub">
                            <span className={pl.chosen.fits ? 'gle-dot gle-dot-ok' : 'gle-dot gle-dot-bad'} aria-hidden="true" />
                            {pl.chosen.layout.name}{pl.pinned ? ' · 고정' : ''}
                          </span>
                        </span>
                      </button>
                      <span className="gle-page-ops">
                        <button type="button" aria-label="위로" onClick={() => movePage(p.id, -1)}>↑</button>
                        <button type="button" aria-label="아래로" onClick={() => movePage(p.id, 1)}>↓</button>
                        <button type="button" aria-label="삭제" onClick={() => removePage(p.id)}>×</button>
                      </span>
                    </li>
                  )
                })}
              </ol>
              <div className="gle-add">
                <span>선택한 장 뒤에 추가</span>
                <div>
                  {(['cover', 'toc', 'divider', 'content'] as PageType[]).map((t) => (
                    <button type="button" key={t} onClick={() => addPage(t)}>{PAGE_TYPE_LABEL[t]}</button>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <section className="gle-center">
            <div className="gle-stage-head">
              <h2>
                <span className="gle-num">{String(selIndex + 1).padStart(2, '0')}</span>
                {sel.chosen.layout.name}
                <span className="gle-muted"> · {PAGE_TYPE_LABEL[selPage.type]} · {sel.chosen.layout.id}</span>
              </h2>
              <span className={`gle-score ${sel.chosen.fits ? 'is-ok' : 'is-bad'}`}>{sel.chosen.score}</span>
            </div>
            <div className="gle-stage">
              <PageSvg ops={sel.chosen.render.ops} pair={pair} overlay={grid ? gridOps() : undefined} title={sel.chosen.layout.name} />
            </div>
            <IssueList issues={sel.chosen.issues} />
            <PageEditor page={selPage} onChange={updatePage} />

            <section className="gle-panel gle-film">
              <div className="gle-panel-head">
                <h2>문서 전체</h2>
                <span className="gle-muted">같은 레이아웃이 연달아 나오지 않게 앞에서부터 고른 결과</span>
              </div>
              <ol className="gle-film-grid">
                {plan.map((pl, i) => (
                  <li key={doc.pages[i].id}>
                    <button type="button" className={doc.pages[i].id === selId ? 'is-sel' : ''} onClick={() => setSelId(doc.pages[i].id)}>
                      <PageSvg ops={pl.chosen.render.ops} pair={pair} title={pl.chosen.layout.name} />
                      <span>
                        <span className="gle-num">{String(i + 1).padStart(2, '0')}</span> {pl.chosen.layout.name}
                        {!pl.chosen.fits && <span className="gle-dot gle-dot-bad" aria-label="안 맞음" />}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          </section>

          <aside className="gle-cands">
            <Candidates
              candidates={sel.candidates}
              chosenId={sel.chosen.layout.id}
              pinned={sel.pinned}
              pair={pair}
              onPick={(id) => pin(id)}
              onUnpin={() => pin(null)}
            />
          </aside>
        </main>
      )}
    </div>
  )
}
