/**
 * 판형·여백·그리드·글자 단계 — 고정값.
 * 레이아웃은 이 안에서만 고른다. 좌표는 전부 이 파일에서 계산된다.
 *
 * 단위는 화면 장표 기준 1920×1080 (pt = px). 레퍼런스(삼우건기 CI 가이드라인 v1)가
 * 이 판형이었고, PDF로 내보내도 같은 비율이다.
 */
export const PAGE = { w: 1920, h: 1080 } as const

export const MARGIN = { top: 100, side: 100, bottom: 80 } as const

export const GRID = {
  cols: 12,
  rows: 8,
  gutter: 24,
  /** 본문 칸이 끝나는 y. 그 아래는 폴리오(쪽 하단 표기) 띠 */
  contentBottom: 940,
} as const

export const LIVE = {
  x: MARGIN.side,
  y: MARGIN.top,
  w: PAGE.w - MARGIN.side * 2,
  h: GRID.contentBottom - MARGIN.top,
} as const

export const COL_W = (LIVE.w - GRID.gutter * (GRID.cols - 1)) / GRID.cols
export const ROW_H = (LIVE.h - GRID.gutter * (GRID.rows - 1)) / GRID.rows

/**
 * 글자 크기 단계 (1920 기준 px). 레퍼런스 실측값에서 정리했다.
 * caption 14가 최소 — 화면 축소 미리보기에서도 12–13px 아래로 떨어지지 않게
 * 실제 출력 크기 기준 하한을 둔다.
 */
export const STEP = {
  caption: 14,
  body: 16,
  lead: 20,
  label: 24,
  h1: 30,
  display: 48,
  hero: 72,
  big: 140,
  mega: 500,
} as const
export type Step = keyof typeof STEP

/** 행간 계수 — 본문은 1.6 안팎 */
export const LEADING: Record<Step, number> = {
  caption: 1.5,
  body: 1.6,
  lead: 1.55,
  label: 1.35,
  h1: 1.3,
  display: 1.2,
  hero: 1.18,
  big: 1.0,
  mega: 0.86,
}

/** 자간 (em). 0을 넘기지 않는다 */
export const TRACK: Record<Step, number> = {
  caption: 0, body: 0, lead: 0, label: 0, h1: -0.01,
  display: -0.015, hero: -0.02, big: -0.03, mega: -0.03,
}

export const clampTrack = (v: number) => Math.min(0, v)

/** 베이스라인 근사 — 글자 상자 위쪽에서 베이스라인까지 (크기 대비) */
export const ASCENT = 0.8

export type Edge = 'l' | 'r' | 't' | 'b'

/** 그리드 칸 선언. c·r은 1부터 세는 [시작, 칸 수] */
export interface Area {
  c: [number, number]
  r: [number, number]
  /** 해당 변을 재단선까지 밀어낸다 */
  bleed?: Edge[]
}

export interface Box { x: number; y: number; w: number; h: number }

export function areaBox(a: Area): Box {
  const [c0, cs] = a.c
  const [r0, rs] = a.r
  let x = LIVE.x + (c0 - 1) * (COL_W + GRID.gutter)
  let y = LIVE.y + (r0 - 1) * (ROW_H + GRID.gutter)
  let x2 = x + cs * COL_W + (cs - 1) * GRID.gutter
  let y2 = y + rs * ROW_H + (rs - 1) * GRID.gutter
  const b = a.bleed ?? []
  if (b.includes('l')) x = 0
  if (b.includes('t')) y = 0
  if (b.includes('r')) x2 = PAGE.w
  if (b.includes('b')) y2 = PAGE.h
  return { x, y, w: x2 - x, h: y2 - y }
}

/** 실측 좌표를 그리드 단위로 — 레퍼런스 원자료를 선언으로 옮길 때 쓴다 */
export function toGridUnits(b: Box): { c: [number, number]; r: [number, number] } {
  const cp = COL_W + GRID.gutter
  const rp = ROW_H + GRID.gutter
  const r1 = (v: number) => Math.round(v * 10) / 10
  return {
    c: [r1((b.x - LIVE.x) / cp + 1), r1((b.w + GRID.gutter) / cp)],
    r: [r1((b.y - LIVE.y) / rp + 1), r1((b.h + GRID.gutter) / rp)],
  }
}
