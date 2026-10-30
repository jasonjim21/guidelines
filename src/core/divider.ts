import type { Content, PageDecl } from './blocks'

/**
 * 간지 변주 — 원본 간지(3쪽)를 기본형으로. 디자인을 볼 때는 기본 시스템 한 장으로만 그린다.
 * 목차처럼 항목을 넣지 않는다. 장 번호(01) 대신 머리표가 필요하면 'A.'를 쓴다.
 * 내용 키: kr0(국문 장 제목) · en0(영문, 단어마다 한 줄) · enl0(영문 한 줄) · ab0('A.')
 */

/** 원본 간지 — 파랑 바탕, 영문 장 제목을 500pt 톤온톤(10%)으로 쪽 가득, 국문 장 제목은 오른쪽 가운데 높이 */
export const DIVIDER_BASE: PageDecl = {
  id: 'd00', name: '원본',
  note: '파랑 바탕 · 영문 장 제목을 단어마다 한 줄씩 500pt, 불투명도 10% · 국문 장 제목은 오른쪽 여백선에 오른쪽 정렬',
  bg: 'blue',
  blocks: [
    { x: 0, y: 1.148, align: 'left', valign: 'top', items: [
      { k: 'text', part: 'en0', size: 500, font: 'Prohibition-Regular', tone: 'light', opacity: 0.1, lead: 0.86 },
    ] },
    { x: 12, y: 3.77, align: 'right', valign: 'top', items: [
      { k: 'text', part: 'kr0', size: 40, font: 'esamanruOTFMedium', tone: 'light' },
    ] },
  ],
}

/** 줄 칸(row)은 글을 직접 받으므로 내용을 넘겨 선언을 만든다 */
export const dividerDecls = (c: Content): PageDecl[] => [
  {
    id: 'd01', name: '영문 아래로', note: '파랑 바탕. 영문 장 제목을 톤온톤이 아니라 또렷한 흰색으로 줄여 왼쪽 아래에, 국문은 왼쪽 위',
    bg: 'blue',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'kr0', size: 40, font: 'esamanruOTFMedium', tone: 'light' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'en0', size: 240, font: 'Prohibition-Regular', tone: 'light', lead: 0.88 },
      ] },
    ],
  },
  {
    id: 'd02', name: '흰 바탕 톤온톤', note: '원본을 뒤집어 흰 바탕에 영문 장 제목 500pt를 주조색 8%로 깔고, 국문 장 제목은 원본 자리에 주조색으로',
    bg: 'white',
    blocks: [
      { x: 0, y: 1.148, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'en0', size: 500, font: 'Prohibition-Regular', tone: 'blue', opacity: 0.08, lead: 0.86 },
      ] },
      { x: 12, y: 3.77, align: 'right', valign: 'top', items: [
        { k: 'text', part: 'kr0', size: 40, font: 'esamanruOTFMedium', tone: 'blue' },
      ] },
    ],
  },
  {
    id: 'd03', name: '먹색 가운데', note: '먹색 바탕 한가운데에 영문 장 제목 한 줄과 국문 장 제목을 가운데 정렬. 로고는 아래 가운데',
    bg: 'black',
    blocks: [
      { x: 6, y: 4, pageCenter: true, align: 'center', valign: 'middle', items: [
        { k: 'text', part: 'enl0', size: 150, font: 'Prohibition-Regular', tone: 'white', gap: 32 },
        { k: 'text', part: 'kr0', size: 36, font: 'esamanruOTFMedium', tone: 'white', opacity: 0.6 },
      ] },
      { x: 6, y: 8, pageCenter: true, align: 'center', valign: 'bottom', items: [
        { k: 'logo', asset: 'small', h: 40, mode: 'reverse' },
      ] },
    ],
  },
  {
    id: 'd04', name: '1/3 색면 + A.', note: '원본 1/3 분할선 왼쪽을 파랑 면으로, 머리표 A.를 색면 아래에 크게. 흰 면 위쪽에 영문·국문 장 제목',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 4, y0: 'edge', y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'ab0', size: 300, font: 'Prohibition-Regular', tone: 'light' },
      ] },
      { x: 4.5, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'en0', size: 160, font: 'Prohibition-Regular', tone: 'black', lead: 0.9, gap: 36 },
        { k: 'text', part: 'kr0', size: 40, font: 'esamanruOTFMedium', tone: 'blue' },
      ] },
    ],
  },
  {
    id: 'd05', name: 'A. 크게', note: '흰 바탕 왼쪽에 머리표 A.를 쪽 높이 가까이, 장 제목은 오른쪽 아래에 오른쪽 정렬',
    bg: 'white',
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'ab0', size: 900, font: 'Prohibition-Regular', tone: 'blue' },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'text', part: 'kr0', size: 36, font: 'esamanruOTFMedium', tone: 'blue', gap: 20 },
        { k: 'text', part: 'enl0', size: 96, font: 'Prohibition-Regular', tone: 'black' },
      ] },
    ],
  },
  {
    id: 'd06', name: '괘선 위아래', note: '원본 목차의 회색 바탕. 세로 가운데에 쪽 폭 괘선(50%), 위에 영문, 아래에 국문 장 제목을 크게',
    bg: 'gray',
    blocks: [
      { x: 0, y: 4, align: 'left', valign: 'middle', items: [
        { k: 'text', part: 'enl0', size: 48, font: 'Prohibition-Regular', tone: 'blue', gap: 40 },
        { k: 'rule', len: 12, tone: 'black', w: 1, opacity: 0.5, gap: 48 },
        { k: 'text', part: 'kr0', size: 140, font: 'esamanruOTFMedium', tone: 'black' },
      ] },
      { x: 0, y: 0, align: 'left', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
    ],
  },
  {
    id: 'd07', name: '톤온톤 심볼', note: '원본의 톤온톤 표현을 글자 대신 심볼로. 파랑 바탕에 심볼을 흰색 10%로 크게 흘리고, 장 제목은 왼쪽 위',
    bg: 'blue',
    blocks: [
      { x: 3, y: 8.6, align: 'left', valign: 'bottom', items: [
        { k: 'logo', asset: 'symbol', h: 900, mode: 'mono', tone: 'white', opacity: 0.1 },
      ] },
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'en0', size: 120, font: 'Prohibition-Regular', tone: 'light', lead: 0.9, gap: 28 },
        { k: 'text', part: 'kr0', size: 36, font: 'esamanruOTFMedium', tone: 'light' },
      ] },
    ],
  },
  {
    id: 'd08', name: '반 나눔', note: '쪽을 반으로 나눠 왼쪽은 파랑 면에 영문 장 제목을 크게 아래로, 오른쪽 흰 면은 로고만 두고 비운다',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 6, y0: 'edge', y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'en0', size: 220, font: 'Prohibition-Regular', tone: 'light', lead: 0.88 },
      ] },
      { x: 12, y: 0, align: 'right', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
    ],
  },
  {
    id: 'd09', name: '머리표 한 줄', note: '흰 바탕 왼쪽 위에 머리표 A.와 영문 장 제목만 한 줄로. 나머지는 비운다',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'row', cells: [
          { s: c.ab0[0], dx: 0, size: 48, font: 'Prohibition-Regular', tone: 'blue' },
          { s: c.enl0[0], dx: 16, flow: true, size: 48, font: 'Prohibition-Regular', tone: 'black' },
        ] },
      ] },
    ],
  },
  {
    id: 'd10', name: '아래 색 띠', note: '흰 바탕 아래 3/8을 파란 띠로. 영문 장 제목은 띠 안 왼쪽에 한 줄로 크게, 국문은 흰 면 왼쪽 위',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 'edge', y0: 5, y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'kr0', size: 48, font: 'esamanruOTFMedium', tone: 'blue' },
      ] },
      { x: 12, y: 0, align: 'right', valign: 'top', items: [{ k: 'logo', asset: 'small', h: 50, mode: 'color' }] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'enl0', size: 200, font: 'Prohibition-Regular', tone: 'light' },
      ] },
    ],
  },
]
