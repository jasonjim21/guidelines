import type { Doc, El } from './doc'
import { logoSrc, type Block, type Content, type Item, type LogoAsset, type PageDecl } from './blocks'
import { isHeadText, pageObject } from './object'

/** 원본 내지 쪽 — 쪽마다 개체(로고 자산)가 다르다 */
export const CONTENT_PAGES: { page: number; asset: LogoAsset | null }[] = [
  { page: 4, asset: 'symbol' },
  { page: 5, asset: 'logotype' },
  { page: 6, asset: 'sigH' },
  { page: 7, asset: 'sigV' },
  // 로고 하나가 아닌 쪽 — 원본 개체 묶음을 통째로 옮긴다 (object.ts)
  ...[8, 9, 10, 11, 12, 13, 14, 15, 16].map((page) => ({ page, asset: null })),
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
    body: t.filter((e) => e.size === 16 && isHeadText(e)).sort((a, b) => a.y - b.y).map((e) => e.s),
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

export function contentDecls(c: Content, doc: Doc, asset: LogoAsset | null, page: number): { base: PageDecl; variants: PageDecl[] } {
  // 기준형의 개체는 원본 쪽에 놓인 자리 그대로 (오른쪽 끝·세로 가운데·높이)
  const [ox, oy, ow, oh] = asset ? logoSrc(doc, asset).box : pageObject(doc, page).box
  /**
   * 레이아웃마다 개체 자리. 로고 쪽은 시각 면적(area)으로, 개체 묶음 쪽은 자리를 채우되 원본보다 키우지 않는다
   */
  const obj = (logo: { cols: number; h: number; area: number }, panel: { cols: number; h: number }): Item =>
    asset ? { k: 'logo', asset, ...logo, mode: 'color' } : { k: 'object', page, ...panel }
  const colOf = (x: number) => (x - 100) / ((1820 - 100) / 12)
  const rowOf = (y: number) => (y - 100) / ((992 - 100) / 8)
  /** 원본 — 흰 바탕, 왼쪽 위 제목+설명, 오른쪽에 심볼(오른쪽 끝 1784, 세로 가운데), 왼쪽 아래 폴리오 */
  const base: PageDecl = {
    id: 'p00', name: '원본', note: '흰 바탕 · 왼쪽 위 제목(국문+영문 40%)과 설명 4줄 · 오른쪽 8단에 개체를 세로 가운데 · 왼쪽 아래 폴리오',
    bg: 'white',
    blocks: [
      { x: 0, y: 0.055, align: 'left', valign: 'top', items: [title(c, 'blue', 35.9), body()] },
      { x: colOf(ox + ow), y: rowOf(oy + oh / 2), align: 'right', valign: 'middle', items: [asset ? { k: 'logo', asset, h: oh, mode: 'color' } : { k: 'object', page }] },
      folioAt(0, 'left'),
    ],
  }

  const variants: PageDecl[] = [
    {
      id: 'p02', name: '왼쪽 상자에 글', note: '왼쪽을 옅은 회색 면으로 깔고(3.6단 폭, 원본 1/3보다 좁게) 제목·설명을 그 안 위쪽에. 개체는 흰 면 가운데, 폴리오는 오른쪽 아래',
      bg: 'white',
      fields: [{ x0: 'edge', x1: 3.6, y0: 'edge', y1: 'edge', tone: 'gray' }],
      blocks: [
        { x: 0, y: 0, align: 'left', valign: 'top', items: [title(c), body(1.6)] },
        { x: 7.8, y: 4, align: 'center', valign: 'middle', items: [obj({ cols: 6, h: 420, area: 200000 }, { cols: 7.6, h: 780 })] },
        folioAt(12, 'right'),
      ],
    },
    {
      id: 'p03', name: '개체 왼쪽 · 글 오른쪽', note: '원본을 좌우로 뒤집음. 개체는 왼쪽 7단 세로 가운데, 제목·설명은 8단 선에서 시작해 바닥으로. 폴리오는 왼쪽 아래',
      bg: 'white',
      blocks: [
        { x: 0, y: 3.9, align: 'left', valign: 'middle', items: [obj({ cols: 6.5, h: 480, area: 230000 }, { cols: 7.3, h: 780 })] },
        { x: 8, y: 7.3, align: 'left', valign: 'bottom', items: [title(c), body(1.6)] },
        folioAt(0, 'left'),
      ],
    },
    {
      id: 'p05', name: '개체 위 · 글 아래', note: '개체를 위쪽 가운데에 크게. 제목은 원래 폴리오 자리(왼쪽 아래 바닥선), 설명은 제목 끝에서 100px 띄워 6단 폭으로 같은 바닥선에. 폴리오는 오른쪽 아래',
      bg: 'white',
      blocks: [
        asset
          ? { x: 6, y: 3.2, pageCenter: true, align: 'center', valign: 'middle', items: [obj({ cols: 9, h: 330, area: 250000 }, { cols: 12, h: 0 })] }
          : { x: 6, y: 0, pageCenter: true, align: 'center', valign: 'top', items: [obj({ cols: 0, h: 0, area: 0 }, { cols: 12, h: 740 })] },
        { x: 0, y: 8, align: 'left', valign: 'bottom', items: [{ ...title(c), gap: 0 }] },
        { x: 0, y: 8, beside: { block: 1, gap: 100 }, align: 'left', valign: 'bottom', items: [body(1.6, 'ink', 6)] },
        folioAt(12, 'right'),
      ],
    },
  ]

  return { base, variants }
}
