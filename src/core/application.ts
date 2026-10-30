import type { Content, PageDecl } from './blocks'
import { body, folioAt, title } from './content'
import type { MockKind } from './mockup'

/**
 * 응용 시스템 내지 — 항목마다 본문과 평면 목업.
 * 판짜기는 원본 내지(4쪽) 기준형 그대로: 왼쪽 위 제목(국문+영문 40%)·설명, 오른쪽 8단에 목업, 왼쪽 아래 폴리오.
 * 본문은 원본 기본 시스템 설명의 형식(3–4줄, 한 줄 38자 안팎, 정의 → 기준 → 지킬 것)을 따른 초안이다.
 * 목업은 통용 규격(mm) 비율. 실제 사양이 정해지면 mockup.ts의 SPEC만 고친다.
 */
export interface AppItem { kr: string; en: string; body: string[]; mock: MockKind }

export const APP_ITEMS: AppItem[] = [
  {
    kr: '명함', en: 'Business Card', mock: 'card',
    body: [
      '명함은 고객과 처음 마주하는 자리에서 전달되는 기본 적용물입니다.',
      '앞면에는 시그니처를, 뒷면에는 성명·직함·연락처를 정해진 자리에 두며,',
      '서체와 색상은 기본 시스템의 규정을 따릅니다.',
      '용지와 후가공은 지정된 사양 외에 임의로 바꾸지 않습니다.',
    ],
  },
  {
    kr: '소봉투', en: 'Envelope S', mock: 'envS',
    body: [
      '소봉투는 서신과 계약서 등 낱장 문서를 보낼 때 사용합니다.',
      '앞면 좌측 상단에 시그니처와 주소를 고정된 위치로 배치하고,',
      '수신인 영역은 비워 두어 우편 규격에 맞춥니다.',
      '바탕은 흰색을 기본으로 하여 내용이 잘 읽히도록 합니다.',
    ],
  },
  {
    kr: '대봉투', en: 'Envelope L', mock: 'envL',
    body: [
      '대봉투는 제안서와 카탈로그 등 접지 않은 문서를 담는 데 사용합니다.',
      '면적이 넓은 만큼 시그니처를 크게 쓰고, 뒷면에 그래픽 모티브를 적용해',
      '브랜드를 한눈에 알아볼 수 있게 합니다.',
      '주소와 연락처는 소봉투와 같은 서체·크기 체계를 따릅니다.',
    ],
  },
  {
    kr: '쇼핑백', en: 'Shopping Bag', mock: 'bag',
    body: [
      '쇼핑백은 전시회와 행사 현장에서 자료와 기념품을 전달할 때 사용합니다.',
      '멀리서도 알아볼 수 있도록 정면에 시그니처를 크게 적용하고,',
      '바탕은 삼우 블루 또는 흰색 중 하나로 통일합니다.',
      '손잡이와 안쪽 색상도 전용색 범위 안에서 선택합니다.',
    ],
  },
  {
    kr: '티셔츠', en: 'T-Shirt', mock: 'tee',
    body: [
      '티셔츠는 현장 근무와 행사에서 함께 입는 단체복입니다.',
      '가슴에는 심볼을 작게, 등판에는 로고타입을 크게 배치하며,',
      '원단 색에 따라 색상 규정의 바탕별 버전을 적용합니다.',
      '자수와 나염 등 제작 방식이 달라도 형태와 비율은 원본을 따릅니다.',
    ],
  },
]

/** 항목 하나의 내용 (원본 내지와 같은 키) */
export const appContent = (it: AppItem, folio: string[]): Content => ({ pkr: [it.kr], pen: [it.en], body: it.body, folio })

/** 원본 내지 기준형 + 목업 */
export function appDecl(it: AppItem, c: Content): PageDecl {
  return {
    id: `a-${it.mock}`, name: `${it.kr} ${it.en}`,
    note: '원본 내지 기준형 · 왼쪽 위 제목·설명 · 오른쪽 8단 목업(통용 규격) · 왼쪽 아래 폴리오',
    bg: 'white',
    blocks: [
      { x: 0, y: 0.055, align: 'left', valign: 'top', items: [title(c, 'blue', 35.9), body()] },
      { x: 8.25, y: 4.1, align: 'center', valign: 'middle', items: [{ k: 'mock', kind: it.mock, cols: 7.2, h: it.mock === 'card' || it.mock === 'envS' ? 520 : 680 }] },
      folioAt(0, 'left'),
    ],
  }
}
