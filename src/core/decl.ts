import type { Area, Step } from './system'
import type { MediaKind, PageType } from './schema'

/**
 * 레이아웃 선언 타입. 좌표가 아니라 "몇 번째 단부터 몇 단, 무엇이 들어가는가"다.
 * 선언으로 표현이 안 되면 좌표를 넣지 말고 칸(Slot) 종류나 배열(Arrange)을 늘린다.
 */

export type Align = 'left' | 'center' | 'right'
export type VAlign = 'top' | 'middle' | 'bottom'

/** 바탕 */
export type Bg = 'paper' | 'gray' | 'primary' | 'ink'

/**
 * 색 역할 — 실제 색은 브랜드 색과 바탕에서 계산한다.
 * tonal: 바탕색을 살짝 밝힌 톤온톤(간지의 큰 글자)
 * accentSoft: 주조색을 흰색에 40% 섞은 색(레퍼런스의 쪽 제목)
 */
export type Tone = 'fg' | 'muted' | 'accent' | 'accentSoft' | 'tonal' | 'onAccent'

export type TextRole =
  | 'title'      // 장표 제목 (간지·내지) / 문서 제목 (표지)
  | 'subtitle'
  | 'body'
  | 'sectionNo'  // 간지 번호 — 문서 순서에서 자동
  | 'brand'      // 브랜드 이름
  | 'tocHead'    // '목차'

export interface TextPart {
  role: TextRole
  step: Step
  weight?: number
  tone?: Tone
  /** 다음 파트까지 간격 */
  gap?: number
  /** 영문 대문자로 (레퍼런스의 영문 제목 처리) */
  upper?: boolean
}

export type Arrange =
  /** 한 개를 칸 안에 맞춘다 (자르지 않음) */
  | { a: 'single'; align?: Align; valign?: VAlign; /** 칸 높이 대비 최대 크기 */ maxH?: number }
  /** 같은 크기 타일. cols 'auto'면 개수에 맞춰 단 수를 고른다 */
  | { a: 'grid'; cols: number | 'auto'; ratio?: number; gap?: number; valign?: VAlign }
  /** 세로로 쌓은 띠. 첫 번째를 weight배로 키운다 (주조색 강조) */
  | { a: 'bands'; firstWeight: number }
  /** 가로로 나란한 견본 기둥 */
  | { a: 'swatches' }
  /** 줄 단위 견본 — 왼쪽 견본, 오른쪽 굵기 라벨 */
  | { a: 'rows' }
  /** 세로 목록 — 항목은 오른쪽 끝 정렬, 설명은 옆 단 */
  | { a: 'list'; captionCols: number }

export interface Cap { min: number; max: number; best: number }

export type Slot =
  | {
      k: 'text'
      area: Area
      parts: TextPart[]
      valign?: VAlign
      align?: Align
      /** 본문을 몇 단으로 흘릴지 */
      bodyCols?: 1 | 2
      /** 본문이 이 글자 수 안팎일 때 가장 좋다 (절반 아래면 빈 단으로 보고 감점) */
      bodyBest?: number
      /** 제목이 반드시 있어야 하는가 (없으면 점수만 내린다) */
      needsTitle?: boolean
    }
  | {
      k: 'media'
      area: Area
      accepts: MediaKind[]
      arrange: Arrange
      cap: Cap
      caption: 'above' | 'below' | 'side' | 'none'
      /** 0개일 때 칸이 비어 장표가 무너지는가 */
      required: boolean
    }
  /** 브랜드 로고 (표지·목차의 고정 자리) */
  | { k: 'logo'; area: Area; h: number; align?: Align; valign?: VAlign; tone?: 'auto' | 'mono' }
  /** 간지의 큰 글자. '/' 또는 띄어쓰기에서 줄을 나눈다 */
  | { k: 'mega'; area: Area; source: 'title' | 'sectionNo'; step: 'mega' | 'big' | 'hero'; tone: Tone }
  /** 목차 — 문서의 간지 제목을 모은다 */
  | { k: 'toc'; area: Area; dir: 'row' | 'column'; numbered: boolean; valign?: VAlign }
  /** 색 면 */
  | { k: 'fill'; area: Area; tone: 'accent' | 'ink' | 'tint' }
  /** 심볼에서 딴 선 그래픽 (자리표시) */
  | { k: 'motif'; area: Area; tone: Tone }
  /** 쪽 하단 표기 */
  | { k: 'folio'; tone?: Tone; pageNo?: boolean }

export interface LayoutDecl {
  id: string
  name: string
  type: PageType
  /** 계열 — 같은 계열이 연달아 나오면 순서를 내린다 */
  family: string
  /** 레퍼런스 출처 (references/*.json 의 page 번호) */
  ref?: string
  note: string
  bg: Bg
  slots: Slot[]
}
