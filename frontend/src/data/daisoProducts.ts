// @ts-ignore
import rawProducts from './daisoProducts.json';

export type ProductCategory =
  | 'storage'
  | 'bath_cleaning'
  | 'bath_body'
  | 'beauty'
  | 'stationery'
  | 'digital_tools'
  | 'kitchen_food'
  | 'living_fashion'
  | 'pet_hobby'
  | 'tray'
  | 'basket'
  | 'divider'
  | 'stackable'
  | 'storage_box'
  | 'camping'
  | 'kitchen'
  | 'kitchen_consumable'
  | (string & {});

export interface DaisoProduct {
  id: string;
  itemCode: string; // 품번 (예: 1024567)
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  largeCategory?: string; // 대분류 (예: '주방용품', '식품', '수납/정리', '뷰티/위생')
  middleCategory?: string; // 중분류 (예: '밀폐/보관/저장용기', '양념/조미료', '클렌징')
  smallCategory?: string; // 소분류 (예: '오일/밤', '수납바구니')
  categoryHierarchy?: string; // 전체 계층 경로 (예: '주방용품 > 밀폐/보관/저장용기 > 소스병/양념통')
  width: number; // cm (가로)
  depth: number; // cm (세로)
  height: number; // cm (높이)
  dimSource?: 'official_spec' | 'title_regex' | 'inferred' | string; // 규격 출처
  price: number; // KRW
  color: string; // 3D box color (acrylic frosted tint)
  imageUrl?: string; // 다이소몰 공식 CDN 썸네일 URL
  isSoldOut?: boolean; // 품절 여부
  description: string;
  mallUrl: string;
}

export type ItemPosture = 'flat' | 'stand_front' | 'stand_side';

export interface FittedItem {
  instanceId: string;
  productId: string;
  product: DaisoProduct;
  x: number; // cm from left
  y: number; // cm from bottom (stack height)
  z: number; // cm from front
  rotation: 0 | 90; // degrees around Y axis (horizontal floor rotation)
  posture?: ItemPosture; // 3D vertical posture: 'flat' (기본) | 'stand_front' (앞뒤 세우기/눕히기) | 'stand_side' (옆으로 세우기/눕히기)
}

export interface DrawerDimension {
  width: number;  // cm (가로, X)
  depth: number;  // cm (세로/안쪽깊이, Z)
  height: number; // cm (높이, Y)
}

export const DAISO_PRODUCTS: DaisoProduct[] = rawProducts as DaisoProduct[];

export const DRAWER_PRESETS: { name: string; category: string; dimensions: DrawerDimension }[] = [
  // 1. 삼성 비스포크 AI 하이브리드 901L (RM70F91R1A)
  { name: "비스포크 901L(RM70F91R1A) 메인 선반 (1~2단)", category: "삼성 비스포크 901L (RM70F91R1A)", dimensions: { width: 82.5, depth: 48.0, height: 23.0 } },
  { name: "비스포크 901L(RM70F91R1A) 하단 선반 (캔/우유/3단)", category: "삼성 비스포크 901L (RM70F91R1A)", dimensions: { width: 82.5, depth: 48.0, height: 30.0 } },
  { name: "비스포크 901L(RM70F91R1A) 신선 야채실/과일실 서랍", category: "삼성 비스포크 901L (RM70F91R1A)", dimensions: { width: 39.5, depth: 42.0, height: 18.5 } },
  { name: "비스포크 901L(RM70F91R1A) 도어 포켓 바스켓", category: "삼성 비스포크 901L (RM70F91R1A)", dimensions: { width: 38.0, depth: 16.5, height: 18.0 } },
  { name: "비스포크 901L(RM70F91R1A) 냉동실 슬라이딩 대형 서랍", category: "삼성 비스포크 901L (RM70F91R1A)", dimensions: { width: 36.0, depth: 40.0, height: 22.0 } },

  // 2. 냉장고 (시중 4도어/양문형/원룸 냉장고 규격)
  { name: "4도어 냉장고 메인 선반 (LG 오브제/삼성 비스포크)", category: "냉장고", dimensions: { width: 78, depth: 42, height: 22 } },
  { name: "4도어 냉장고 와이드 대형 선반", category: "냉장고", dimensions: { width: 82, depth: 45, height: 28 } },
  { name: "냉장실 신선 야채실 / 과일 서랍", category: "냉장고", dimensions: { width: 38, depth: 38, height: 18 } },
  { name: "냉장실 도어 포켓 (다단 소스 바스켓)", category: "냉장고", dimensions: { width: 38, depth: 15, height: 14 } },
  { name: "원룸 / 오피스텔 소형 냉장고 선반", category: "냉장고", dimensions: { width: 46, depth: 38, height: 18 } },

  // 3. 냉동고 (시중 4도어 냉동실 / 스탠드형 전용 냉동고)
  { name: "4도어 냉동실 슬라이딩 서랍 (하칸)", category: "냉동고", dimensions: { width: 34, depth: 38, height: 18 } },
  { name: "냉동실 급속 냉동 트레이 (상단 얕은 선반)", category: "냉동고", dimensions: { width: 36, depth: 36, height: 8 } },
  { name: "스탠드형 전용 냉동고 대형 서랍 (300L급)", category: "냉동고", dimensions: { width: 42, depth: 40, height: 22 } },
  { name: "냉동실 도어 포켓 바스켓", category: "냉동고", dimensions: { width: 34, depth: 13, height: 12 } },

  // 3. 김치냉장고 (딤채 / 비스포크 / 오브제컬렉션)
  { name: "스탠드형 김치냉장고 상칸 선반 (다목적 보관)", category: "김치냉장고", dimensions: { width: 64, depth: 44, height: 25 } },
  { name: "스탠드형 김치냉장고 중칸 서랍 (김치통 4개칸)", category: "김치냉장고", dimensions: { width: 48, depth: 45, height: 28 } },
  { name: "스탠드형 김치냉장고 하칸 서랍 (야채/쌀 보관)", category: "김치냉장고", dimensions: { width: 48, depth: 42, height: 26 } },
  { name: "뚜껑형 김치냉장고 대형 룸 (좌/우 1칸)", category: "김치냉장고", dimensions: { width: 46, depth: 40, height: 38 } },

  // 4. 표준 가구 및 데스크
  { name: "표준 데스크 서랍 (이케아 헬메르/알렉스)", category: "데스크", dimensions: { width: 32, depth: 40, height: 7 } },
  { name: "와이드 데스크 서랍 (사무용 와이드)", category: "데스크", dimensions: { width: 55, depth: 40, height: 7 } },
  { name: "싱크대 커트러리 수저 서랍", category: "주방", dimensions: { width: 45, depth: 45, height: 7 } },
  { name: "싱크대 하부장 냄비/팬 수납장", category: "주방", dimensions: { width: 60, depth: 45, height: 35 } },
  { name: "팬트리 선반 (수납 바구니 정리용)", category: "팬트리", dimensions: { width: 75, depth: 35, height: 25 } },
  { name: "옷장 / 드레스룸 서랍장", category: "드레스룸", dimensions: { width: 70, depth: 45, height: 16 } },
  { name: "캠핑 웨건 (카트 내부)", category: "캠핑", dimensions: { width: 85, depth: 48, height: 30 } },
  { name: "차량 트렁크 (SUV 중형)", category: "차량/아웃도어", dimensions: { width: 95, depth: 75, height: 35 } }
];
