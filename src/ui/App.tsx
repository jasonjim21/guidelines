import raw from '../../references/samwoo-ci-v1.json'
import type { Assets, Doc } from '../core/doc'
import { FONT_SETS } from '../core/fonts'
import { PageSvg } from '../core/render'
import { BASE, COVERS, coverContent, renderCover } from '../core/cover'

const DOC = raw as unknown as Doc

// 패스 모양·사진은 저장소에 넣지 않는다. 로컬에 뽑아 둔 파일이 있을 때만 붙는다.
const local = import.meta.glob('../../references/local/samwoo-ci-v1.assets.json', { eager: true, import: 'default' })
const ASSETS: Assets = (Object.values(local)[0] as Assets | undefined) ?? {}

const CONTENT = coverContent(DOC)

export default function App() {
  const fonts = FONT_SETS[0]
  return (
    <div className="gle">
      <header className="gle-bar">
        <h1>표지 변주 10</h1>
        <p>원본 표지를 기본형으로 글의 위치·표현·레이아웃·정렬을 바꿈 · 배경 그래픽 없음 · 모든 글 자간 −2% · 여백 100, 12단 × 8행</p>
      </header>

      <section className="gle-section">
        <div className="gle-grid">
          {[BASE, ...COVERS].map((d, i) => (
            <figure key={d.id} className="gle-page">
              <PageSvg page={renderCover(d, CONTENT, i)} assets={ASSETS} fonts={fonts} />
              <figcaption>
                <span className="gle-num">{d.id === BASE.id ? '기준' : String(i).padStart(2, '0')}</span>
                <strong>{d.name}</strong>
                <span className="gle-note">{d.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="gle-section">
        <h2>원본 재현 {DOC.pages.length}장</h2>
        <div className="gle-grid">
          {DOC.pages.map((p) => (
            <figure key={p.page} className="gle-page">
              <PageSvg page={p} assets={ASSETS} fonts={fonts} />
              <figcaption><span className="gle-num">{String(p.page).padStart(2, '0')}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  )
}
