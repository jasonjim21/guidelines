/**
 * 글자체는 렌더 인자다. 원자료에는 원본 서체 이름만 있고, 무엇으로 그릴지는 여기서 정한다.
 *
 * 원본 서체 중 상업 배포가 가능한 OFL은 Pretendard·Inter·SUIT뿐이다.
 * 이사만루체(esamanru)·Prohibition은 OFL이 아니어서 대체한다.
 * 장평은 항상 100% — 대체 서체가 원본보다 길거나 짧아도 글자를 늘이거나 줄이지 않는다.
 */
export interface Face {
  family: string
  weight: number
  /** 원본 서체가 대문자 전용 */
  upper?: boolean
}

export interface FontSet {
  id: string
  name: string
  /** 원본 서체 이름(굵기 접미사 뺀 것) → 그릴 서체 */
  map: Record<string, (weight: string) => Face>
}

const W: Record<string, number> = {
  ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800,
}

const PRETENDARD = '"Pretendard Variable", Pretendard, sans-serif'

export const FONT_SETS: FontSet[] = [
  {
    id: 'ofl',
    name: 'OFL 대체 (이사만루 → Pretendard, Prohibition → Barlow Condensed)',
    map: {
      Pretendard: (w) => ({ family: PRETENDARD, weight: W[w] ?? 400 }),
      SUIT: (w) => ({ family: PRETENDARD, weight: W[w] ?? 600 }),
      Inter: (w) => ({ family: '"Inter", sans-serif', weight: W[w] ?? 400 }),
      // 이사만루체 Medium은 획이 두꺼워 한 단계 올려 그린다
      esamanruOTF: (w) => ({ family: PRETENDARD, weight: { Light: 400, Medium: 700, Bold: 800 }[w] ?? 700 }),
      Prohibition: () => ({ family: '"Barlow Condensed", sans-serif', weight: 600, upper: true }),
    },
  },
]

/** 'esamanruOTFMedium' · 'Pretendard-Regular' → 서체 */
export function faceOf(set: FontSet, font: string): Face {
  const m = font.match(/^(.*?)-?(ExtraLight|Light|Regular|Medium|SemiBold|ExtraBold|Bold)$/)
  const fam = m ? m[1] : font
  const wt = m ? m[2] : 'Regular'
  const f = set.map[fam]
  return f ? f(wt) : { family: PRETENDARD, weight: 400 }
}
