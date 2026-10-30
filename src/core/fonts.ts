/**
 * 글자체 쌍 — 렌더 인자다. 레이아웃 선언에는 서체가 들어가지 않는다.
 *
 * 국문·영문을 한 쌍으로 고른다. font-family를 "영문, 국문" 순으로 걸어서
 * 라틴 글자는 영문 서체가, 한글은 국문 서체가 그린다.
 * 상업 배포가 가능한 OFL 서체만, 굵기 400–700이 실제로 있는 것만 넣는다.
 * Pretendard는 npm 패키지로 번들, 나머지는 Google Fonts(index.html 링크).
 */
export interface FontPair {
  id: string
  name: string
  kr: string
  en: string
  note: string
}

export const FONT_PAIRS: FontPair[] = [
  { id: 'pretendard', name: 'Pretendard', kr: 'Pretendard Variable', en: 'Pretendard Variable', note: '국·영문 한 서체. 기본값' },
  { id: 'pretendard-inter', name: 'Pretendard + Inter', kr: 'Pretendard Variable', en: 'Inter', note: '레퍼런스와 같은 조합' },
  { id: 'plex', name: 'IBM Plex Sans KR + Plex Sans', kr: 'IBM Plex Sans KR', en: 'IBM Plex Sans', note: '기계적인 인상, 획 끝이 각짐' },
  { id: 'noto-archivo', name: 'Noto Sans KR + Archivo', kr: 'Noto Sans KR', en: 'Archivo', note: '영문 폭이 약간 좁고 단단함' },
  { id: 'gothic-manrope', name: 'Gothic A1 + Manrope', kr: 'Gothic A1', en: 'Manrope', note: '부드럽고 둥근 영문' },
]

export const pairById = (id: string) => FONT_PAIRS.find((p) => p.id === id) ?? FONT_PAIRS[0]

export const familyOf = (p: FontPair) =>
  p.en === p.kr ? `"${p.kr}", sans-serif` : `"${p.en}", "${p.kr}", sans-serif`

/**
 * 측정 전에 실제 글리프를 받아 둔다. 구글 한글 서체는 유니코드 구간별로 쪼개져 있어서
 * 쓰는 글자를 넘겨야 그 구간이 내려온다.
 */
export async function loadPair(p: FontPair, text: string): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (!fonts) return
  const sample = Array.from(new Set(text + '가나다ABCabc0123')).join('')
  const jobs: Promise<unknown>[] = []
  for (const fam of new Set([p.kr, p.en])) {
    for (const w of [400, 500, 600, 700]) jobs.push(fonts.load(`${w} 32px "${fam}"`, sample).catch(() => null))
  }
  await Promise.all(jobs)
}
