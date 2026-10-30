import raw from '../../references/samwoo-ci-v1.json'
import { textOn } from './color'
import { toGridUnits } from './system'
import type { Op } from './engine'

/**
 * 레퍼런스 원자료(실측 칸)를 그대로 그려 본다 — 그림 없이 구조만.
 * 선언으로 옮길 때 그리드 단위가 몇인지 같이 표시한다.
 */
export interface RefCell { label: string; box: number[]; size?: number; lines?: number; note?: string; color?: string; bleed?: string }
export interface RefPage { page: number; type: string; bg: string; layout: string | null; cells: RefCell[] }

export const REF = raw as unknown as { source: string; observed: Record<string, unknown>; pages: RefPage[] }

const LABEL_COLOR: Record<string, string> = {
  title: '#e4572e', body: '#f3a712', caption: '#29a19c', logo: '#7b2cbf', image: '#2f80ed', chip: '#d81159',
  specimen: '#3a7d44', mega: '#ff7a00', motif: '#9c9c9c', folio: '#8f8f8f', 'toc-entry': '#e4572e',
}

export function refOps(p: RefPage): Op[] {
  const ops: Op[] = [{ t: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: p.bg }]
  const on = textOn(p.bg)
  p.cells.forEach((c) => {
    const [x, y, w, h] = c.box
    const col = LABEL_COLOR[c.label] ?? '#555555'
    ops.push({ t: 'rect', x, y, w, h, fill: col + '22', stroke: col, sw: 2 })
    const g = toGridUnits({ x, y, w, h })
    const tag = `${c.label}${c.size ? ` ${c.size}` : ''}  c${g.c[0]}+${g.c[1]} r${g.r[0]}+${g.r[1]}`
    ops.push({ t: 'text', x: x + 6, y: y + 18, s: tag, size: 15, weight: 600, fill: on, anchor: 'left', track: 0 })
  })
  return ops
}
