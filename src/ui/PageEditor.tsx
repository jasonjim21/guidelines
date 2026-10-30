import { PAGE_TYPE_LABEL, parseRatios, ratioLabel, type PageInput, type PageType } from '../core/schema'

interface Props { page: PageInput; onChange: (p: PageInput) => void }

function Num({ id, label, value, onChange, max = 12 }: { id: string; label: string; value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <label className="gle-field gle-num-field" htmlFor={id}>
      <span>{label}</span>
      <span className="gle-stepper">
        <button type="button" aria-label={`${label} 빼기`} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <input id={id} type="number" min={0} max={max} value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
        <button type="button" aria-label={`${label} 더하기`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </span>
    </label>
  )
}

export default function PageEditor({ page: p, onChange }: Props) {
  const set = (v: Partial<PageInput>) => onChange({ ...p, ...v })
  const chars = p.body.replace(/\s/g, '').length
  const ratioText = p.images.map(ratioLabel).join(', ')
  return (
    <section className="gle-panel gle-editor">
      <div className="gle-panel-head">
        <h2>들어가는 항목</h2>
        <label className="gle-field gle-inline" htmlFor="pe-type">
          <span>유형</span>
          <select id="pe-type" value={p.type} onChange={(e) => set({ type: e.target.value as PageType })}>
            {(Object.keys(PAGE_TYPE_LABEL) as PageType[]).map((t) => <option key={t} value={t}>{PAGE_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
      </div>
      <div className="gle-editor-grid">
        <div className="gle-editor-text">
          <label className="gle-field" htmlFor="pe-title">
            <span>제목 <em>'/'에서 줄을 바꿉니다</em></span>
            <input id="pe-title" value={p.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className="gle-field" htmlFor="pe-sub">
            <span>부제</span>
            <input id="pe-sub" value={p.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
          </label>
          <label className="gle-field" htmlFor="pe-body">
            <span>본문 <em>{chars}자 · 빈 줄로 단락</em></span>
            <textarea id="pe-body" rows={5} value={p.body} onChange={(e) => set({ body: e.target.value })} />
          </label>
          <label className="gle-field" htmlFor="pe-cap">
            <span>캡션 <em>항목마다 한 줄, 순서대로</em></span>
            <textarea id="pe-cap" rows={3} value={p.captions.join('\n')} onChange={(e) => set({ captions: e.target.value.split('\n') })} />
          </label>
        </div>
        <div className="gle-editor-media">
          <Num id="pe-logos" label="로고" value={p.logos} onChange={(n) => set({ logos: n })} />
          <label className="gle-field" htmlFor="pe-images">
            <span>이미지 비율 <em>{p.images.length}장</em></span>
            <input id="pe-images" key={p.id + ratioText} defaultValue={ratioText} placeholder="예: 3:2, 1:1"
              onBlur={(e) => set({ images: e.target.value.trim() ? parseRatios(e.target.value) : [] })}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
          </label>
          <Num id="pe-chips" label="컬러칩" value={p.chips} onChange={(n) => set({ chips: n })} />
          <Num id="pe-spec" label="서체 견본" value={p.specimens} onChange={(n) => set({ specimens: n })} max={8} />
          <Num id="pe-icons" label="아이콘" value={p.icons} onChange={(n) => set({ icons: n })} max={16} />
          <div className="gle-field">
            <span>표</span>
            <span className="gle-table-row">
              <label className="gle-check" htmlFor="pe-table">
                <input id="pe-table" type="checkbox" checked={!!p.table} onChange={(e) => set({ table: e.target.checked ? { rows: 5, cols: 4 } : null })} />
                <span>있음</span>
              </label>
              {p.table && (
                <>
                  <input aria-label="표 행" id="pe-trows" type="number" min={1} max={40} value={p.table.rows} onChange={(e) => set({ table: { ...p.table!, rows: Math.max(1, Number(e.target.value) || 1) } })} />
                  <span className="gle-muted">행</span>
                  <input aria-label="표 열" id="pe-tcols" type="number" min={1} max={12} value={p.table.cols} onChange={(e) => set({ table: { ...p.table!, cols: Math.max(1, Number(e.target.value) || 1) } })} />
                  <span className="gle-muted">열</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
