import { useEffect, useState } from 'react'
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

/** 정렬을 획 끝으로 맞추려면 실제 서체로 재야 한다 — 서체를 받은 뒤 한 번 더 그린다 */
const FACES = ['800 40px "Pretendard Variable"', '700 40px "Pretendard Variable"', '600 40px "Pretendard Variable"', '500 40px "Pretendard Variable"', '400 40px "Pretendard Variable"', '400 40px "Inter"', '600 40px "Barlow Condensed"']

export default function App() {
  const fonts = FONT_SETS[0]
  const [, setReady] = useState(0)
  useEffect(() => {
    const sample = [CONTENT.brand, ...CONTENT.title, CONTENT.folio, ...CONTENT.en].join('') + CONTENT.en.join('').toUpperCase()
    Promise.all(FACES.map((f) => document.fonts.load(f, sample).catch(() => null))).then(() => setReady((n) => n + 1))
  }, [])
  return (
    <div className="gle">
      <header className="gle-bar">
        <h1>표지 변주 10</h1>
        <p>원본 표지를 기본형으로 · 01–05 로고를 크게, 06–10 글로 짜기 · 배경 그래픽 없음 · 자간 −2% · 장평 100% · 여백 100, 12단 × 8행</p>
      </header>

      <section className="gle-section">
        <div className="gle-grid">
          {[BASE, ...COVERS].map((d, i) => (
            <figure key={d.id} className="gle-page">
              <PageSvg page={renderCover(d, CONTENT, DOC, fonts, i)} assets={ASSETS} fonts={fonts} />
              <figcaption>
                <span className="gle-num">{d.id === BASE.id ? '기준' : String(i).padStart(2, '0')}</span>
                <strong>{d.name}</strong>
                <span className="gle-note">{d.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

    </div>
  )
}
