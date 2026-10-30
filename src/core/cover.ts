import type { Doc, El } from './doc'
import type { Content, PageDecl } from './blocks'

/**
 * 표지 변주 — 원본 표지(1쪽)를 기본형으로, 글의 위치·표현·레이아웃·정렬만 바꾼다.
 * 01–05 로고를 크게, 06–10 글로 짠다.
 */

/** 원본 표지 — 기준형. 이 선언으로 그린 것이 원본 재현과 겹쳐야 한다 */
export const BASE: PageDecl = {
  id: 'c00', name: '원본', note: '파랑 바탕 · 좌상단 브랜드명+제목 · 좌하단 로고+폴리오 · 왼쪽 정렬',
  bg: 'blue',
  blocks: [
    { x: 0, y: 0, align: 'left', valign: 'top', items: [
      { k: 'text', part: 'brand', size: 90, font: 'esamanruOTFMedium', tone: 'light', gap: 60 },
      { k: 'text', part: 'title', size: 70, font: 'Pretendard-Medium', tone: 'light', lead: 1.2 },
    ] },
    { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
      { k: 'logo', asset: 'small', h: 55, mode: 'mono', tone: 'light', gap: 16 },
      { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
    ] },
  ],
}

export const COVERS: PageDecl[] = [
  /* ----- 로고를 크게 쓰는 표지 5 ----- */
  {
    id: 'c01', name: '심볼 크게 (재단)', note: '파랑 바탕에 심볼을 단색으로 크게 놓아 오른쪽 재단선 밖으로 흘린다. 제목은 왼쪽 위에 작게',
    bg: 'blue',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'light', gap: 28 },
        { k: 'text', part: 'title', size: 40, font: 'Pretendard-Medium', tone: 'light', lead: 1.3 },
      ] },
      { x: 5, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'logo', asset: 'symbol', h: 520, mode: 'mono', tone: 'light' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
      ] },
    ],
  },
  {
    id: 'c02', name: '로고타입 쪽 폭', note: '흰 바탕 아래에 로고타입을 12단 전체 폭으로. 브랜드명 대신 로고타입이 제목 역할',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'enTitle', size: 48, font: 'Inter-Medium', tone: 'blue', lead: 1.2 },
      ] },
      { x: 12, y: 0, align: 'right', valign: 'top', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'logo', asset: 'logotype', cols: 12, mode: 'mono', tone: 'black' },
      ] },
    ],
  },
  {
    id: 'c03', name: '세로 시그니처 오른쪽', note: '파랑 바탕 오른쪽에 세로형 시그니처를 단색으로 쪽 높이 가까이 크게. 제목은 왼쪽 위, 폴리오는 왼쪽 아래',
    bg: 'blue',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'light', gap: 28 },
        { k: 'text', part: 'title', size: 40, font: 'Pretendard-Medium', tone: 'light', lead: 1.3 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'logo', asset: 'sigV', h: 640, mode: 'mono', tone: 'light' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
      ] },
    ],
  },

  {
    id: 'c04', name: '가로 시그니처 먹색', note: '먹색 바탕 가운데 높이에 가로형 시그니처를 10단 폭으로. 검정 부분은 흰색, 파랑은 그대로',
    bg: 'black',
    blocks: [
      { x: 0, y: 4, align: 'left', valign: 'middle', items: [
        { k: 'logo', asset: 'sigH', cols: 10, mode: 'reverse' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'titleLine', size: 24, font: 'Pretendard-Medium', tone: 'white', gap: 14 },
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'white', opacity: 0.5 },
      ] },
    ],
  },
  {
    id: 'c05', name: '1/3 색면 + 심볼', note: '1/3 분할선 왼쪽은 파랑 면에 제목, 오른쪽 흰 면 가운데에 심볼을 원본 2색으로 크게',
    bg: 'white',
    fields: [{ x0: 'edge', x1: 4, y0: 'edge', y1: 'edge', tone: 'blue' }],
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 56, font: 'esamanruOTFMedium', tone: 'light', gap: 36 },
        { k: 'text', part: 'enTitle', size: 44, font: 'Inter-Medium', tone: 'light', lead: 1.2 },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light', opacity: 0.7 },
      ] },
      { x: 8, y: 4, align: 'center', valign: 'middle', items: [
        { k: 'logo', asset: 'symbol', cols: 6, mode: 'color' },
      ] },
    ],
  },

  /* ----- 글로 짜는 표지 5 ----- */
  {
    id: 'c06', name: '아래로 내린 제목', note: '영문 제목 덩어리를 왼쪽 아래로 내리고 크게. 로고는 왼쪽 위, 폴리오는 오른쪽 아래',
    bg: 'blue',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'logo', asset: 'small', h: 55, mode: 'mono', tone: 'light' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'light', gap: 40 },
        { k: 'text', part: 'enTitle', size: 120, font: 'esamanruOTFMedium', tone: 'light', lead: 1.05 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'light' },
      ] },
    ],
  },
  {
    id: 'c07', name: '흰 바탕', note: '바탕을 흰색으로 뒤집고 제목을 주조색으로. 로고는 원본 2색으로 오른쪽 아래',
    bg: 'white',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'brand', size: 40, font: 'esamanruOTFMedium', tone: 'ink', gap: 48 },
        { k: 'text', part: 'title', size: 100, font: 'Pretendard-SemiBold', tone: 'blue', lead: 1.15 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'logo', asset: 'small', h: 64, mode: 'color' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
    ],
  },
  {
    id: 'c08', name: '영문 제목', note: '먹색 바탕에 영문 제목을 압축 서체 대문자로 크게. 국문은 아래에 한 줄로 작게',
    bg: 'black',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'text', part: 'en', size: 170, font: 'Prohibition-Regular', tone: 'white', lead: 0.92 },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'brand', size: 30, font: 'esamanruOTFMedium', tone: 'white', gap: 14 },
        { k: 'text', part: 'titleLine', size: 24, font: 'Pretendard-Regular', tone: 'white', opacity: 0.6 },
      ] },
      { x: 12, y: 8, align: 'right', valign: 'bottom', items: [
        { k: 'logo', asset: 'small', h: 55, mode: 'reverse' },
      ] },
    ],
  },
  {
    id: 'c09', name: '괘선 위아래', note: '회색 바탕 세로 가운데에 쪽 폭 괘선 하나. 위에 브랜드명, 아래에 한 줄 제목 (원본 목차 장의 괘선 표현)',
    bg: 'gray',
    blocks: [
      { x: 0, y: 0, align: 'left', valign: 'top', items: [
        { k: 'logo', asset: 'small', h: 55, mode: 'color' },
      ] },
      { x: 0, y: 4, align: 'left', valign: 'middle', items: [
        { k: 'text', part: 'brand', size: 64, font: 'esamanruOTFMedium', tone: 'black', gap: 36 },
        { k: 'rule', len: 12, tone: 'black', w: 1, opacity: 0.5, gap: 40 },
        { k: 'text', part: 'titleLine', size: 64, font: 'Pretendard-Medium', tone: 'blue' },
      ] },
      { x: 0, y: 8, align: 'left', valign: 'bottom', items: [
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
    ],
  },
  {
    id: 'c10', name: '가운데 큰 제목', note: '흰 바탕 한가운데에 영문 제목 두 줄을 크게 가운데 정렬. 브랜드명은 위에 주조색으로, 로고는 아래 가운데',
    bg: 'white',
    blocks: [
      { x: 6, y: 3.8, pageCenter: true, align: 'center', valign: 'middle', items: [
        { k: 'text', part: 'brand', size: 36, font: 'esamanruOTFMedium', tone: 'blue', gap: 44 },
        { k: 'text', part: 'enTitle', size: 96, font: 'esamanruOTFMedium', tone: 'black', lead: 1.08 },
      ] },
      { x: 6, y: 8, pageCenter: true, align: 'center', valign: 'bottom', items: [
        { k: 'logo', asset: 'small', h: 48, mode: 'color', gap: 28 },
        { k: 'text', part: 'folio', size: 18, font: 'Inter-Regular', tone: 'mute' },
      ] },
    ],
  },

]


/* ---------- 내용: 원본 표지에서 읽는다 ---------- */

/** 원본의 영문 철자 오기만 바로잡는다 (내용은 지어내지 않는다) */
export const SPELLING: Record<string, string> = { Coperate: 'Corporate', Graysclae: 'Grayscale', MPG: 'MGP' }
export const fixSpelling = (s: string) => s.replace(/\b\w+\b/g, (w) => SPELLING[w] ?? w)

export function coverContent(doc: Doc): Content {
  const texts = doc.pages[0].els.filter((e): e is Extract<El, { t: 'text' }> => e.t === 'text')
  const big = Math.max(...texts.map((t) => t.size))
  const brand = texts.find((t) => t.size === big)?.s ?? ''
  const title = texts.filter((t) => t.size < big && t.size > 30).map((t) => t.s)
  const folio = texts.find((t) => t.size <= 20)?.s ?? ''
  // 영문 제목은 폴리오에서 브랜드명·판 번호를 뗀 것
  const enWords = fixSpelling(folio).replace(/^\S+\s+/, '').replace(/\s+Ver\s*[\d.]+$/i, '').split(/\s+/)
  return {
    brand: [brand],
    title,
    titleLine: [title.join(' ')],
    folio: [folio],
    /** 단어마다 한 줄 (압축 대문자용) */
    en: enWords,
    /** 두 줄 대문자: 'CORPORATE IDENTITY' / 'GUIDELINES' — 표지 제목은 대문자로만 */
    enTitle: [enWords.slice(0, -1).join(' '), enWords[enWords.length - 1]].map((x) => x.toUpperCase()),
    enLine: [enWords.join(' ')],
  }
}
