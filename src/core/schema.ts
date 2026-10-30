/** 입력 — 브랜드 정보와 장표별 항목 */

export type PageType = 'cover' | 'toc' | 'divider' | 'content'

export const PAGE_TYPE_LABEL: Record<PageType, string> = {
  cover: '표지', toc: '목차', divider: '간지', content: '내지',
}

export interface BrandColor { name: string; hex: string }

export interface Brand {
  nameKr: string
  nameEn: string
  /** 문서 이름 — 폴리오에 들어간다 */
  docName: string
  colors: BrandColor[]
  /** 업로드한 로고 (data URL). 없으면 자리표시 로고를 그린다 */
  logo: { src: string; ratio: number } | null
}

/** 칸에 들어가는 시각 항목의 종류 */
export type MediaKind = 'logo' | 'image' | 'chip' | 'specimen' | 'icon' | 'table'

export const MEDIA_LABEL: Record<MediaKind, string> = {
  logo: '로고', image: '이미지', chip: '컬러칩', specimen: '서체 견본', icon: '아이콘', table: '표',
}
export const MEDIA_UNIT: Record<MediaKind, string> = {
  logo: '개', image: '장', chip: '개', specimen: '줄', icon: '개', table: '개',
}

export interface PageInput {
  id: string
  type: PageType
  /** '/'가 줄바꿈 지점 */
  title: string
  subtitle: string
  body: string
  /** 시각 항목마다 하나씩, 순서대로 붙는다 */
  captions: string[]
  logos: number
  /** 이미지마다 가로/세로 비율 */
  images: number[]
  chips: number
  specimens: number
  icons: number
  table: { rows: number; cols: number } | null
}

export interface DocInput {
  brand: Brand
  pages: PageInput[]
}

export interface MediaItem { kind: MediaKind; i: number; ratio?: number }

/** 장표의 시각 항목을 순서대로 편다 */
export function mediaItems(p: PageInput): MediaItem[] {
  const out: MediaItem[] = []
  for (let i = 0; i < p.logos; i++) out.push({ kind: 'logo', i })
  p.images.forEach((r, i) => out.push({ kind: 'image', i, ratio: r }))
  for (let i = 0; i < p.chips; i++) out.push({ kind: 'chip', i })
  for (let i = 0; i < p.specimens; i++) out.push({ kind: 'specimen', i })
  for (let i = 0; i < p.icons; i++) out.push({ kind: 'icon', i })
  if (p.table) out.push({ kind: 'table', i: 0 })
  return out
}

export const splitSlash = (s: string) => s.split('/').map((x) => x.trim()).filter(Boolean)

let seq = 0
export const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`

export function blankPage(type: PageType): PageInput {
  return {
    id: newId(), type, title: '', subtitle: '', body: '', captions: [],
    logos: 0, images: [], chips: 0, specimens: 0, icons: 0, table: null,
  }
}

/** '3:2, 1:1' 같은 입력을 비율 배열로 */
export function parseRatios(s: string): number[] {
  return s.split(/[,\s]+/).filter(Boolean).map((t) => {
    const m = t.match(/^(\d+(?:\.\d+)?)[:x×/](\d+(?:\.\d+)?)$/)
    if (m) return Number(m[1]) / Number(m[2])
    const n = Number(t)
    return Number.isFinite(n) && n > 0 ? n : 1.5
  })
}

export function ratioLabel(r: number): string {
  const known: [number, string][] = [[1, '1:1'], [1.5, '3:2'], [4 / 3, '4:3'], [16 / 9, '16:9'], [2 / 3, '2:3'], [3 / 4, '3:4'], [9 / 16, '9:16'], [2, '2:1']]
  const k = known.find(([v]) => Math.abs(v - r) < 0.01)
  return k ? k[1] : r.toFixed(2)
}
