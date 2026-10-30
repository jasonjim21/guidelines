/**
 * 좌표 원자료 — scripts/extract_ai.py가 .ai에서 뽑은 것.
 * 이 배열이 유일한 원본이다. 화면과 PDF가 같은 배열을 같은 렌더러로 그린다.
 * 단위는 대지 pt (1920×1080 = px). 글자 y는 베이스라인.
 */
export type Box = [number, number, number, number]

interface Base {
  id: string
  opacity?: number
  /** 잘라내기 상자 */
  clip?: Box
  /** 상자가 아닌 잘라내기 모양 — assets의 키 (로고 윤곽 안에 그라데이션 등) */
  clipPath?: string
}

export type El =
  | (Base & { t: 'rect'; box: Box; fill?: string; fillOpacity?: number })
  | (Base & { t: 'line'; box: Box; pts: [number, number, number, number]; stroke: string; sw: number; dash?: string })
  | (Base & {
      t: 'path'; box: Box; fill?: string; fillOpacity?: number; stroke?: string; sw?: number; evenodd?: boolean; dash?: string
      /** 다른 요소의 모양을 빌려 쓴다 (assets 키). 없으면 자기 id */
      ref?: string
      /** 빌린 모양을 옮기고 키운다: [배율, x 이동, y 이동] */
      tf?: [number, number, number]
    })
  | (Base & { t: 'image'; box: Box })
  | (Base & {
      t: 'text'; s: string; x: number; y: number; size: number; font: string; fill: string
      /** 원본 줄 폭. 있으면 대체 서체를 이 폭에 맞춘다 (원본 재현용) */
      w?: number
      anchor?: 'start' | 'middle' | 'end'
    })

export interface DocPage { page: number; w: number; h: number; els: El[] }
export interface Doc { source: string; unit: string; fonts: string[]; pages: DocPage[] }

/** 패스 모양·사진은 저장소 밖(references/local, gitignore)에 있다. 없으면 상자로 그린다 */
export type Assets = Record<string, string>
