import { useEffect, useState } from 'react'
import raw from '../../references/samwoo-ci-v1.json'
import type { Assets, Doc } from '../core/doc'
import { FONT_SETS } from '../core/fonts'
import { PageSvg } from '../core/render'
import { renderPage, type Content, type PageDecl } from '../core/blocks'
import { BASE, COVERS, coverContent } from '../core/cover'
import { tocContent, tocDecls, tocText } from '../core/toc'

const DOC = raw as unknown as Doc

// 패스 모양·사진은 저장소에 넣지 않는다. 로컬에 뽑아 둔 파일이 있을 때만 붙는다.
const local = import.meta.glob('../../references/local/samwoo-ci-v1.assets.json', { eager: true, import: 'default' })
const ASSETS: Assets = (Object.values(local)[0] as Assets | undefined) ?? {}

const TOC = tocContent(DOC)
const CONTENT: Content = { ...coverContent(DOC), ...tocText(TOC) }
const TOC_DECLS = tocDecls(TOC)

/** 정렬을 획 끝으로 맞추려면 실제 서체로 재야 한다 — 서체를 받은 뒤 한 번 더 그린다 */
const FACES = [800, 700, 600, 500, 400, 300].map((w) => `${w} 40px "Pretendard Variable"`)
  .concat([400, 500, 600].map((w) => `${w} 40px "Inter"`), ['600 40px "Barlow Condensed"'])

function Section({ title, sub, decls }: { title: string; sub: string; decls: { d: PageDecl; label: string }[] }) {
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
            <PageSvg page={renderPage(d, CONTENT, DOC, fonts, i)} assets={ASSETS} fonts={fonts} />
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

export default function App() {
  const [, setReady] = useState(0)
  useEffect(() => {
    const sample = Object.values(CONTENT).flat().join('')
    const all = sample + sample.toUpperCase()
    Promise.all(FACES.map((f) => document.fonts.load(f, all).catch(() => null))).then(() => setReady((n) => n + 1))
  }, [])
  const num = (i: number) => String(i).padStart(2, '0')
  return (
    <div className="gle">
      <Section
        title="목차 변주 10"
        sub="원본 목차를 기본형으로 · 응용 시스템은 명함·소봉투·대봉투·쇼핑백·티셔츠 · 자간 −2% · 장평 100%"
        decls={[{ d: TOC_DECLS.base, label: '기준' }, ...TOC_DECLS.variants.map((d, i) => ({ d, label: num(i + 1) }))]}
      />
      <Section
        title="표지 변주 10"
        sub="원본 표지를 기본형으로 · 01–05 로고를 크게, 06–10 글로 짜기 · 02·05·06·10 영문 제목 · 배경 그래픽 없음"
        decls={[{ d: BASE, label: '기준' }, ...COVERS.map((d, i) => ({ d, label: num(i + 1) }))]}
      />
    </div>
  )
}
