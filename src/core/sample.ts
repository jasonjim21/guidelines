import { blankPage, type DocInput, type PageInput } from './schema'

/**
 * 예시 문서 — 가상의 브랜드. 장 구성은 레퍼런스(삼우건기 CI 가이드라인 v1)의 순서를 따랐다.
 */
const page = (type: PageInput['type'], v: Partial<PageInput>): PageInput => ({ ...blankPage(type), ...v })

export const SAMPLE: DocInput = {
  brand: {
    nameKr: '한결기계',
    nameEn: 'HANGYEOL',
    docName: 'Brand Identity Guidelines Ver 1.0',
    colors: [
      { name: 'Hangyeol Green', hex: '#0e6e55' },
      { name: 'Hangyeol Black', hex: '#141414' },
      { name: 'Signal Yellow', hex: '#f2b705' },
    ],
    logo: null,
  },
  pages: [
    page('cover', { title: '브랜드 아이덴티티/가이드라인', subtitle: '2026년 10월 · 1판' }),
    page('toc', {}),
    page('divider', { title: 'Basic/System', subtitle: '심볼, 로고타입, 색, 서체' }),
    page('content', {
      title: 'Symbol',
      body: '심볼은 한결기계의 아이덴티티를 집약한 핵심 요소로, 사명의 이니셜 H를 두 개의 사선 면으로 재해석한 형태입니다.\n모든 적용물의 기준이 되므로 형태·비율·각도를 임의로 수정할 수 없으며, 반드시 제공된 원본 파일을 사용합니다.',
      logos: 1,
    }),
    page('content', {
      title: 'Signature',
      body: '시그니처는 심볼과 로고타입을 결합한 공식 조합입니다. 두 요소 사이의 간격과 크기 비율은 고정값을 따르며, 적용 매체의 비례에 따라 가로형과 세로형 중 적합한 조합을 선택합니다.',
      logos: 1,
    }),
    page('content', {
      title: 'Minimum Size',
      body: '최소 크기 규정은 형태가 판독되는 최소 적용 크기를 정의합니다. 인쇄물과 화면은 재현 해상도가 다르므로 기준을 구분하여 제시합니다.',
      logos: 2,
      captions: ['인쇄물 | 넓이 20mm/화면 | 넓이 60px', '인쇄물 | 넓이 10mm/화면 | 넓이 30px'],
    }),
    page('content', {
      title: 'Color System',
      body: '색상 체계는 브랜드를 대표하는 색을 정의합니다. 매체가 바뀌어도 동일한 인상이 유지되도록 지정된 값만 사용합니다.',
      chips: 3,
    }),
    page('content', {
      title: 'Incorrect Usage',
      body: '사용 위반 규정은 허용되지 않는 적용 사례를 제시합니다. 비율 변형, 색상 임의 변경, 회전, 그림자·외곽선 추가가 이에 해당합니다.',
      logos: 6,
      captions: ['임의로 회전시킨 경우', '비례를 왜곡시킨 경우', '그라데이션을 적용한 경우', '좌우 반전시킨 경우', '임의로 분리한 경우', '복잡한 이미지 위에 쓴 경우'],
    }),
    page('content', {
      title: 'Typeface',
      body: '제목과 본문에 쓰는 글꼴을 정의합니다. 국문과 영문을 한 쌍으로 쓰며, 굵기는 아래 네 단계만 사용합니다.',
      specimens: 4,
    }),
    page('content', {
      title: 'Graphic Motif',
      body: '그래픽 모티브는 심볼에서 파생한 보조 그래픽 요소입니다. 시그니처를 대체하는 용도로는 사용하지 않습니다.',
      images: [1.5, 1.5, 1.5, 1.5],
    }),
    page('divider', { title: 'Application/System', subtitle: '서식류, 사인, 차량' }),
    page('content', {
      title: 'Stationery',
      subtitle: '명함 · 레터헤드 · 봉투',
      body: '서식류는 브랜드를 가장 자주 접하는 적용물입니다. 지정된 판형과 여백을 지키고, 시그니처는 좌상단 고정 위치에 둡니다.',
      images: [1.5, 1.5, 1.5],
      captions: ['명함', '레터헤드', '봉투'],
    }),
  ],
}
