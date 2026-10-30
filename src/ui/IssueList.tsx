import type { Issue } from '../core/engine'

export default function IssueList({ issues, compact }: { issues: Issue[]; compact?: boolean }) {
  if (!issues.length) return compact ? null : <p className="gle-issues-none">걸리는 것 없음</p>
  const sorted = [...issues].sort((a, b) => Number(b.level === 'hard') - Number(a.level === 'hard') || a.delta - b.delta)
  return (
    <ul className={compact ? 'gle-issues is-compact' : 'gle-issues'}>
      {sorted.map((i) => (
        <li key={i.msg} className={i.level === 'hard' ? 'is-hard' : 'is-soft'}>
          <span className="gle-issue-tag">{i.level === 'hard' ? '문제' : i.delta ? '취향' : '참고'}</span>
          <span className="gle-issue-msg">
            {i.msg}
            {i.fix && <span className="gle-fix">→ {i.fix}</span>}
          </span>
          <span className="gle-delta">{i.delta || ''}</span>
        </li>
      ))}
    </ul>
  )
}
