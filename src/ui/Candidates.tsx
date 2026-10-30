import { PageSvg } from '../core/render'
import type { Candidate } from '../core/score'
import type { FontPair } from '../core/fonts'
import IssueList from './IssueList'

interface Props {
  candidates: Candidate[]
  chosenId: string
  pinned: boolean
  pair: FontPair
  onPick: (id: string) => void
  onUnpin: () => void
}

export default function Candidates({ candidates, chosenId, pinned, pair, onPick, onUnpin }: Props) {
  const fit = candidates.filter((c) => c.fits)
  const misfit = candidates.filter((c) => !c.fits)
  const group = (list: Candidate[], start: number) =>
    list.map((c, k) => (
      <li key={c.layout.id}>
        <button type="button" className={`gle-cand ${c.layout.id === chosenId ? 'is-sel' : ''}`} onClick={() => onPick(c.layout.id)}
          aria-pressed={c.layout.id === chosenId}>
          <span className="gle-cand-thumb"><PageSvg ops={c.render.ops} pair={pair} title={c.layout.name} /></span>
          <span className="gle-cand-head">
            <span className="gle-rank">{start + k + 1}</span>
            <span className="gle-cand-name">{c.layout.name}</span>
            <span className={`gle-score ${c.fits ? 'is-ok' : 'is-bad'}`}>{c.score}</span>
          </span>
          <span className="gle-cand-note">{c.layout.note}{c.layout.ref ? ` · 레퍼런스 ${c.layout.ref}` : ''}</span>
          <IssueList issues={c.issues} compact />
        </button>
      </li>
    ))
  return (
    <section className="gle-panel">
      <div className="gle-panel-head">
        <h2>후보 {candidates.length}</h2>
        {pinned ? <button type="button" className="gle-link" onClick={onUnpin}>고정 풀기</button> : <span className="gle-muted">눌러서 고정</span>}
      </div>
      <h3 className="gle-group">맞는 후보 {fit.length}</h3>
      {fit.length ? <ol className="gle-cand-list">{group(fit, 0)}</ol> : <p className="gle-muted gle-pad">맞는 후보가 없습니다. 아래 이유를 보고 항목을 고치세요.</p>}
      {misfit.length > 0 && (
        <>
          <h3 className="gle-group gle-group-bad">안 맞는 후보 {misfit.length}</h3>
          <ol className="gle-cand-list">{group(misfit, fit.length)}</ol>
        </>
      )}
    </section>
  )
}
