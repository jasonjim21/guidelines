import { useState } from 'react'
import { REF, refOps } from '../core/reference'
import { layoutById } from '../core/layouts'
import { gridOps } from '../core/engine'
import { PageSvg } from '../core/render'
import { toGridUnits } from '../core/system'
import type { FontPair } from '../core/fonts'

/** 레퍼런스 원자료 — 그림 없이 실측 칸만. 선언으로 옮길 때 대조용 */
export default function RefView({ pair, grid }: { pair: FontPair; grid: boolean }) {
  const [i, setI] = useState(0)
  const p = REF.pages[i]
  const decl = p.layout ? layoutById(p.layout) : undefined
  return (
    <main className="gle-main gle-ref">
      <aside className="gle-side">
        <section className="gle-panel">
          <div className="gle-panel-head"><h2>실측 {REF.pages.length}장</h2></div>
          <p className="gle-muted gle-pad">{REF.source}</p>
          <ol className="gle-pages">
            {REF.pages.map((r, k) => (
              <li key={r.page} className={k === i ? 'is-sel' : ''}>
                <button type="button" className="gle-page-btn" onClick={() => setI(k)}>
                  <span className="gle-num">p{r.page}</span>
                  <span className="gle-page-txt">
                    <span className="gle-page-title">{r.type} · 칸 {r.cells.length}</span>
                    <span className="gle-page-sub">{r.layout ? `→ ${layoutById(r.layout)?.name ?? r.layout}` : '선언 없음'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </aside>
      <section className="gle-center">
        <div className="gle-stage-head">
          <h2><span className="gle-num">p{p.page}</span>{p.type}<span className="gle-muted"> · {decl ? `선언 ${decl.id}` : '아직 선언으로 옮기지 않음'}</span></h2>
        </div>
        <div className="gle-stage">
          <PageSvg ops={refOps(p)} pair={pair} overlay={grid ? gridOps() : undefined} title={`레퍼런스 p${p.page}`} />
        </div>
        <section className="gle-panel">
          <div className="gle-panel-head"><h2>칸 목록</h2><span className="gle-muted">단위 pt · 그리드 c=단 r=행 (시작+칸 수)</span></div>
          <div className="gle-table-wrap">
            <table className="gle-table">
              <thead><tr><th>종류</th><th>x</th><th>y</th><th>w</th><th>h</th><th>그리드</th><th>크기</th><th>메모</th></tr></thead>
              <tbody>
                {p.cells.map((c, k) => {
                  const [x, y, w, h] = c.box
                  const g = toGridUnits({ x, y, w, h })
                  return (
                    <tr key={k}>
                      <td>{c.label}</td><td>{x}</td><td>{y}</td><td>{w}</td><td>{h}</td>
                      <td>c{g.c[0]}+{g.c[1]} r{g.r[0]}+{g.r[1]}</td>
                      <td>{c.size ?? ''}</td><td className="gle-note">{c.note ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      <aside className="gle-cands">
        <section className="gle-panel">
          <div className="gle-panel-head"><h2>관찰</h2></div>
          <dl className="gle-obs">
            {Object.entries(REF.observed).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{typeof v === 'string' ? v : JSON.stringify(v).replace(/[{}"]/g, '').replace(/,/g, ', ')}</dd></div>
            ))}
          </dl>
        </section>
      </aside>
    </main>
  )
}
