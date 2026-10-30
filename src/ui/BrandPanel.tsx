import type { Brand } from '../core/schema'

interface Props { brand: Brand; onChange: (b: Brand) => void }

export default function BrandPanel({ brand: b, onChange }: Props) {
  const set = (v: Partial<Brand>) => onChange({ ...b, ...v })
  const setColor = (i: number, v: Partial<Brand['colors'][number]>) =>
    set({ colors: b.colors.map((c, k) => (k === i ? { ...c, ...v } : c)) })

  const onLogo = (file: File | undefined) => {
    if (!file) return
    const fr = new FileReader()
    fr.onload = () => {
      const src = String(fr.result)
      const img = new Image()
      img.onload = () => set({ logo: { src, ratio: img.naturalWidth / Math.max(1, img.naturalHeight) || 3 } })
      img.src = src
    }
    fr.readAsDataURL(file)
  }

  return (
    <details className="gle-panel gle-brand" open>
      <summary className="gle-panel-head"><h2>브랜드</h2><span className="gle-muted">{b.nameKr}</span></summary>
      <div className="gle-brand-body">
        <div className="gle-two">
          <label className="gle-field" htmlFor="br-kr"><span>국문 이름</span>
            <input id="br-kr" value={b.nameKr} onChange={(e) => set({ nameKr: e.target.value })} /></label>
          <label className="gle-field" htmlFor="br-en"><span>영문 이름</span>
            <input id="br-en" value={b.nameEn} onChange={(e) => set({ nameEn: e.target.value })} /></label>
        </div>
        <label className="gle-field" htmlFor="br-doc"><span>문서 이름 <em>쪽 하단에 들어갑니다</em></span>
          <input id="br-doc" value={b.docName} onChange={(e) => set({ docName: e.target.value })} /></label>
        <div className="gle-field">
          <span>색 <em>첫 색이 주조색</em></span>
          <ul className="gle-colors">
            {b.colors.map((c, i) => (
              <li key={i}>
                <input type="color" aria-label={`${c.name} 색`} id={`br-c${i}`} value={c.hex} onChange={(e) => setColor(i, { hex: e.target.value })} />
                <input aria-label="색 이름" id={`br-cn${i}`} value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} />
                <code>{c.hex.toUpperCase()}</code>
                <button type="button" aria-label="색 빼기" disabled={b.colors.length <= 1} onClick={() => set({ colors: b.colors.filter((_, k) => k !== i) })}>×</button>
              </li>
            ))}
          </ul>
          {b.colors.length < 6 && (
            <button type="button" className="gle-link" onClick={() => set({ colors: [...b.colors, { name: `Color ${b.colors.length + 1}`, hex: '#888888' }] })}>색 추가</button>
          )}
        </div>
        <div className="gle-field">
          <span>로고 <em>SVG·PNG. 없으면 자리표시 로고</em></span>
          <span className="gle-logo-row">
            <input id="br-logo" type="file" accept="image/svg+xml,image/png,image/jpeg" onChange={(e) => onLogo(e.target.files?.[0])} />
            {b.logo && <button type="button" className="gle-link" onClick={() => set({ logo: null })}>지우기</button>}
          </span>
        </div>
      </div>
    </details>
  )
}
