import raw from '../../references/samwoo-ci-v1.json'
import type { Assets, Doc } from '../core/doc'
import { FONT_SETS } from '../core/fonts'
import { PageSvg } from '../core/render'

const DOC = raw as unknown as Doc

// 패스 모양·사진은 저장소에 넣지 않는다. 로컬에 뽑아 둔 파일이 있을 때만 붙는다.
const local = import.meta.glob('../../references/local/samwoo-ci-v1.assets.json', { eager: true, import: 'default' })
const ASSETS: Assets = (Object.values(local)[0] as Assets | undefined) ?? {}

export default function App() {
  const fonts = FONT_SETS[0]
  return (
    <div className="gle">
      <header className="gle-bar">
        <h1>삼우건기 CI 가이드라인 v1 — 좌표 재현</h1>
        <p>{DOC.pages.length}장 · 요소 {DOC.pages.reduce((a, p) => a + p.els.length, 0)}개 · 1920×1080 · 글자체 {fonts.name}</p>
      </header>
      <main className="gle-pages">
        {DOC.pages.map((p) => (
          <figure key={p.page} className="gle-page">
            <PageSvg page={p} assets={ASSETS} fonts={fonts} />
            <figcaption>{String(p.page).padStart(2, '0')}</figcaption>
          </figure>
        ))}
      </main>
    </div>
  )
}
