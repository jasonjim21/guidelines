import type { Doc, El } from './doc'
import { logoSrc, type Block, type Content, type Item, type LogoAsset, type PageDecl } from './blocks'

/** 원본 내지 쪽 — 쪽마다 개체(로고 자산)가 다르다 */
export const CONTENT_PAGES: { page: number; asset: LogoAsset }[] = [
  { page: 4, asset: 'symbol' },
  { page: 5, asset: 'logotype' },
  { page: 6, asset: 'sigH' },
  { page: 7, asset: 'sigV' },
]

/**
 * 내지(본장) 변주 — 원본 심볼 장(4쪽)을 기본형으로. 같은 선언을 다음 쪽(로고타입·시그니처)에도 그린다.
 * 바꾸는 것은 제목 · 설명 · 개체(로고·그림) · 하단 캡션(폴리오)의 위치와, 개체 뒤에 까는 상자뿐이다.
 * 내용 키: pkr(국문 제목) · pen(영문 제목) · body(설명, 원본 줄바꿈 그대로) · folio
 */

/** 원본 내지 한 장에서 제목·설명·폴리오를 읽는다 */
export function contentPageText(doc: Doc, pageNo: number): Content {
  const t = doc.pages[pageNo - 1].els.filter((e): e is Extract<El, { t: 'text' }> => e.t === 'text')
  return {
    pkr: [t.find((e) => e.size === 30 && e.font.startsWith('esamanru'))?.s ?? ''],
    pen: [t.find((e) => e.size === 30 && e.font.startsWith('Prohibition'))?.s ?? ''],
    body: t.filter((e) => e.size === 16 && e.font.startsWith('Pretendard')).sort((a, b) => a.y - b.y).map((e) => e.s),
    folio: [t.find((e) => e.size === 18)?.s ?? ''],
  }
}

/** 원본 쪽 제목 — 국문(이사만루) 뒤에 영문(Prohibition, 40%)을 잇는다 */
export const title = (c: Content, tone: 'blue' | 'light' = 'blue', gap = 36): Item => ({
  k: 'row', gap, cells: [
    { s: c.pkr[0], dx: 0, size: 30, font: 'esamanruOTFMedium', tone },
    { s: c.pen[0], dx: 11, flow: true, size: 30, font: 'Prohibition-Regular', tone, opacity: 0.4 },
  ],
})
export const body = (lead = 1.5, tone: 'ink' | 'light' = 'ink', wrap?: number): Item => ({ k: 'text', part: 'body', size: 16, font: 'Pretendard-Regular', tone, lead, wrap })
const folio = (tone: 'mute' | 'light' = 'mute'): Item => ({ k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone, opacity: tone === 'light' ? 0.6 : undefined })
export const folioAt = (x: number, align: Block['align'], tone: 'mute' | 'light' = 'mute'): Block => ({ x, y: 8, align, valign: 'bottom', items: [folio(tone)] })

export function contentDecls(c: Content, doc: Doc, asset: LogoAsset): { base: PageDecl; variants: PageDecl[] } {
  // 기준형의 개체는 원본 쪽에 놓인 자리 그대로 (오른쪽 끝·세로 가운데·높이)
  const [ox, oy, ow, oh] = logoSrc(doc, asset).box
  const colOf = (x: number) => (x - 100) / ((1820 - 100) / 12)
  const rowOf = (y: number) => (y - 100) / ((992 - 100) / 8)
  /** 원본 — 흰 바탕, 왼쪽 위 제목+설명, 오른쪽에 심볼(오른쪽 끝 1784, 세로 가운데), 왼쪽 아래 폴리오 */
  const base: PageDecl = {
    id: 'p00', name: '원본', note: '흰 바탕 · 왼쪽 위 제목(국문+영문 40%)과 설명 4줄 · 오른쪽 8단에 개체를 세로 가운데 · 왼쪽 아래 폴리오',
    bg: 'white',
    blocks: [
      { x: 0, y: 0.055, align: 'left', valign: 'top', items: [title(c, 'blue', 35.9), body()] },
      { x: colOf(ox + ow), y: rowOf(oy + oh / 2), align: 'right', valign: 'middle', items: [{ k: 'logo', asset, h: oh, mode: 'color' }] },
      folioAt(0, 'left'),
    ],
  }

  const variants: PageDecl[] = [
    {
      id: 'p01', name: '오른쪽 상자 위 개체', note: '원본 배치 그대로 두고, 개체 뒤 오른쪽 2/3(4–12단, 위아래 여백까지)에 옅은 상자(주조색 5%). 제목·설명·폴리오는 원본 자리',
      bg: 'white',
      fields: [{ x0: 4, x1: 12, y0: 0, y1: 8, tone: 'tint' }],
      blocks: [
        { x: 0, y: 0, align: 'left', valign: 'top', items: [title(c), body(1.6)] },
        { x: 8, y: 4, align: 'center', valign: 'middle', items: [{ k: 'logo', asset, cols: 6, h: 460, mode: 'color' }] },
        folioAt(0, 'left'),
      ],
    },
    {
      id: 'p02', name: '왼쪽 상자에 글', note: '왼쪽을 옅은 회색 면으로 깔고(3.6단 폭, 원본 1/3보다 좁게) 제목·설명을 그 안 위쪽에. 개체는 흰 면 가운데, 폴리오는 오른쪽 아래',
      bg: 'white',
      fields: [{ x0: 'edge', x1: 3.6, y0: 'edge', y1: 'edge', tone: 'gray' }],
      blocks: [
        { x: 0, y: 0, align: 'left', valign: 'top', items: [title(c), body(1.6)] },
        { x: 7.8, y: 4, align: 'center', valign: 'middle', items: [{ k: 'logo', asset, cols: 6.5, h: 460, mode: 'color' }] },
        folioAt(12, 'right'),
      ],
    },
    {
      id: 'p03', name: '개체 왼쪽 · 글 오른쪽', note: '원본을 좌우로 뒤집음. 개체는 왼쪽 7단 세로 가운데, 제목·설명은 8단 선에서 시작해 바닥으로. 폴리오는 왼쪽 아래',
      bg: 'white',
      blocks: [
        { x: 0, y: 3.6, align: 'left', valign: 'middle', items: [{ k: 'logo', asset, cols: 6.5, h: 560, mode: 'color' }] },
        { x: 8, y: 7.3, align: 'left', valign: 'bottom', items: [title(c), body(1.6)] },
        folioAt(0, 'left'),
      ],
    },
    {
      id: 'p05', name: '개체 위 · 글 아래', note: '개체를 위쪽 가운데에 크게. 제목은 왼쪽, 설명은 4단 선에서 줄을 길게(6단 폭) 다시 짜 같은 바닥선에. 폴리오는 맨 아래 왼쪽',
      bg: 'white',
      blocks: [
        { x: 6, y: 2.9, pageCenter: true, align: 'center', valign: 'middle', items: [{ k: 'logo', asset, cols: 10, h: 380, mode: 'color' }] },
        { x: 0, y: 7.2, align: 'left', valign: 'bottom', items: [{ ...title(c), gap: 0 }] },
        { x: 4, y: 7.2, align: 'left', valign: 'bottom', items: [body(1.6, 'ink', 6)] },
        folioAt(0, 'left'),
      ],
    },
  ]

  return { base, variants }
}
