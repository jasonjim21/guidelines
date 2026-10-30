import type { Block, PageDecl } from './blocks'
import { rows, type Line, type TocSection } from './toc'

/**
 * 간지 변주 — 원본 간지(3·17쪽)를 기본형으로.
 * 장마다 한 장씩: 같은 선언을 기본 시스템·응용 시스템에 각각 그려 제목 길이가 다를 때도 본다.
 * 내용 키: kr{n}(국문 장 제목) · en{n}(영문, 단어마다 한 줄) · enl{n}(영문 한 줄) · n{n}(장 번호)
 */

export interface DividerDecl {
  id: string
  name: string
  note: string
  /** 장 번호(0부터)를 받아 그 장의 간지를 선언 */
  page: (si: number, sec: TocSection) => Omit<PageDecl, 'id' | 'name' | 'note'>
}

/** 원본 간지 — 파랑 바탕, 영문 장 제목을 500pt 톤온톤(10%)으로 쪽 가득, 국문 장 제목은 오른쪽 가운데 높이 */
export const DIVIDER_BASE: DividerDecl = {
  id: 'd00', name: '원본',
  note: '파랑 바탕 · 영문 장 제목을 단어마다 한 줄씩 500pt, 불투명도 10% · 국문 장 제목은 오른쪽 여백선에 오른쪽 정렬',
  page: (si) => ({
    bg: 'blue',
    blocks: [
      { x: 0, y: 1.148, align: 'left', valign: 'top', items: [
        { k: 'text', part: `en${si}`, size: 500, font: 'Prohibition-Regular', tone: 'light', opacity: 0.1, lead: 0.86 },
      ] },
      { x: 12, y: 3.77, align: 'right', valign: 'top', items: [
        { k: 'text', part: `kr${si}`, size: 40, font: 'esamanruOTFMedium', tone: 'light' },
      ] },
    ],
  }),
}

const LIST: Line = {
  num: { size: 16, font: 'Inter-Medium', tone: 'blue', w: 44 },
  kr: { size: 22, font: 'Pretendard-Medium', tone: 'black' },
  en: { size: 18, font: 'Inter-Regular', tone: 'black', opacity: 0.45 },
  gap: 26,
}

export const DIVIDERS: DividerDecl[] = [
  {
    id: 'd01', name: '큰 번호', note: '흰 바탕. 영문 장 제목을 왼쪽 위에, 장 번호를 오른쪽 아래에 쪽 높이 절반 크기로',
    page: (si) => ({
      bg: 'white',
      blocks: [
        { x: 0, y: 0, align: 'left', valign: 'top', items: [
          { k: 'text', part: `en${si}`, size: 120, font: 'Prohibition-Regular', tone: 'black', lead: 0.92, gap: 28 },
          { k: 'text', part: `kr${si}`, size: 36, font: 'esamanruOTFMedium', tone: 'blue' },
        ] },
        { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
          { k: 'text', part: `n${si}`, size: 560, font: 'Prohibition-Regular', tone: 'blue' },
        ] },
      ],
    }),
  },
  {
    id: 'd02', name: '먹색 가운데', note: '먹색 바탕 한가운데에 장 번호·영문 장 제목(한 줄)·국문 장 제목을 가운데 정렬. 로고는 아래 가운데',
    page: (si) => ({
      bg: 'black',
      blocks: [
        { x: 6, y: 4, pageCenter: true, align: 'center', valign: 'middle', items: [
          { k: 'text', part: `n${si}`, size: 28, font: 'Inter-Medium', tone: 'blue', gap: 36 },
          { k: 'text', part: `enl${si}`, size: 150, font: 'Prohibition-Regular', tone: 'white', gap: 32 },
          { k: 'text', part: `kr${si}`, size: 36, font: 'esamanruOTFMedium', tone: 'white', opacity: 0.6 },
        ] },
        { x: 6, y: 8, pageCenter: true, align: 'center', valign: 'bottom', items: [
          { k: 'logo', asset: 'small', h: 40, mode: 'reverse' },
        ] },
      ],
    }),
  },
  {
    id: 'd03', name: '1/3 색면', note: '원본 1/3 분할선 왼쪽을 파랑 면으로, 장 번호를 색면 아래에 크게. 흰 면에는 영문·국문 장 제목을 위에',
    page: (si) => ({
      bg: 'white',
      fields: [{ x0: 'edge', x1: 4, y0: 'edge', y1: 'edge', tone: 'blue' }],
      blocks: [
        { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
          { k: 'text', part: `n${si}`, size: 300, font: 'Prohibition-Regular', tone: 'light' },
        ] },
        { x: 4.5, y: 0, align: 'left', valign: 'top', items: [
          { k: 'text', part: `en${si}`, size: 160, font: 'Prohibition-Regular', tone: 'black', lead: 0.9, gap: 36 },
          { k: 'text', part: `kr${si}`, size: 40, font: 'esamanruOTFMedium', tone: 'blue' },
        ] },
      ],
    }),
  },
  {
    id: 'd04', name: '장 제목 + 항목 미리보기', note: '원본 목차의 회색 바탕. 왼쪽에 국문 장 제목을 크게, 오른쪽 1/3에 이 장에 들어가는 항목을 번호와 함께',
    page: (si, sec) => {
      const blocks: Block[] = [
        { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
          { k: 'text', part: `n${si}`, size: 28, font: 'Inter-Medium', tone: 'blue', gap: 24 },
          { k: 'text', part: `enl${si}`, size: 44, font: 'Prohibition-Regular', tone: 'blue', gap: 28 },
          { k: 'text', part: `kr${si}`, size: 140, font: 'esamanruOTFMedium', tone: 'black' },
        ] },
        { x: 8, y: 8, align: 'left', valign: 'bottom', items: [
          { k: 'rule', len: 4, tone: 'black', w: 1, opacity: 0.5, gap: 32 },
          ...rows(sec.items, LIST),
        ] },
        { x: 0, y: 0, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      ]
      return { bg: 'gray', blocks }
    },
  },
]

/** 선언 하나를 장마다 그릴 PageDecl로 편다 */
export function dividerPages(d: DividerDecl, sec: TocSection[]): PageDecl[] {
  return sec.map((s, si) => ({ id: `${d.id}-${si}`, name: d.name, note: d.note, ...d.page(si, s) }))
}
