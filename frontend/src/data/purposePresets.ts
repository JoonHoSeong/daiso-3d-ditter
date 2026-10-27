import { DrawerDimension } from './daisoProducts';

export interface PurposePreset {
  id: string;
  name: string;
  shortLabel: string;
  icon: string;
  defaultDrawerType: string;
  defaultDimensions: DrawerDimension;
  description: string;
  keywords: string[];
  organizerKeywords: string[];
  recommendedBundles: {
    bundleName: string;
    description: string;
    organizerNames: string[];
    goodsCategory: string;
  }[];
  badgeColor: string;
  allowedCategories?: string[];
  excludedKeywords?: string[];
}

export interface SpacePresetOption {
  id: string;
  name: string;
  icon: string;
  dimensions: DrawerDimension;
  description: string;
  popularPurposes: string[]; // purpose preset ids
}

export const SPACE_PRESET_OPTIONS: SpacePresetOption[] = [
  {
    id: 'desk_standard',
    name: '표준 책상 서랍',
    icon: '🖥️',
    dimensions: { width: 32, depth: 40, height: 7 },
    description: '이케아 헬메르/알렉스, 일반 사무용 책상 1~2단 얕은 서랍',
    popularPurposes: ['desk_stationery', 'digital_cables', 'first_aid_medicine']
  },
  {
    id: 'desk_wide',
    name: '와이드 사무용 서랍',
    icon: '💻',
    dimensions: { width: 55, depth: 40, height: 8 },
    description: '사무용 데스크 중앙 넓은 서랍, 학습용 대형 서랍',
    popularPurposes: ['desk_stationery', 'digital_cables', 'coffee_tea_snacks']
  },
  {
    id: 'kitchen_cutlery',
    name: '싱크대 수저 서랍',
    icon: '🍴',
    dimensions: { width: 45, depth: 45, height: 7 },
    description: '싱크대 상단 1단 커트러리 및 조리도구 전용 얕은 서랍',
    popularPurposes: ['kitchen_cutlery', 'coffee_tea_snacks']
  },
  {
    id: 'kitchen_spices',
    name: '싱크대 깊은 하부장',
    icon: '🧂',
    dimensions: { width: 45, depth: 45, height: 22 },
    description: '양념통, 소스병, 냄비, 프라이팬 수납용 깊은 서랍',
    popularPurposes: ['kitchen_spices', 'fridge_sides_sauces']
  },
  {
    id: 'vanity_table',
    name: '화장대 / 파우더룸 서랍',
    icon: '💄',
    dimensions: { width: 42, depth: 38, height: 9 },
    description: '스킨케어, 립스틱, 브러쉬, 화장솜 보관용 화장대 서랍',
    popularPurposes: ['vanity_cosmetics', 'first_aid_medicine']
  },
  {
    id: 'closet_drawer',
    name: '옷장 / 드레스룸 서랍',
    icon: '👕',
    dimensions: { width: 70, depth: 45, height: 16 },
    description: '양말, 속옷, 벨트, 넥타이, 계절 패션소품 서랍장',
    popularPurposes: ['closet_socks_underwear']
  },
  {
    id: 'pantry_shelf',
    name: '팬트리 / 다용도 선반',
    icon: '🥫',
    dimensions: { width: 75, depth: 35, height: 25 },
    description: '라면, 통조림, 대용량 스낵, 식료품 바구니 정리 선반',
    popularPurposes: ['coffee_tea_snacks', 'kitchen_spices', 'fridge_sides_sauces']
  },
  {
    id: 'fridge_main',
    name: '냉장고 메인 선반',
    icon: '❄️',
    dimensions: { width: 82.5, depth: 48, height: 23 },
    description: '삼성 비스포크 / LG 오브제 대형 4도어 냉장실 메인 선반',
    popularPurposes: ['fridge_sides_sauces', 'kitchen_spices']
  },
  {
    id: 'bathroom_cabinet',
    name: '욕실 / 세면대 하부장',
    icon: '🛁',
    dimensions: { width: 50, depth: 35, height: 22 },
    description: '치약, 칫솔, 샴푸, 수건, 청소세제 보관 하부장',
    popularPurposes: ['first_aid_medicine', 'vanity_cosmetics']
  },
  {
    id: 'tools_balcony',
    name: '공구함 / 베란다 수납장',
    icon: '🛠️',
    dimensions: { width: 50, depth: 40, height: 16 },
    description: '드라이버, 펜치, 줄자, 나사못, 철물 공구 보관함',
    popularPurposes: ['tools_diy_hardware', 'digital_cables']
  }
];

export const PURPOSE_PRESETS: PurposePreset[] = [
  {
    id: 'desk_stationery',
    name: '문구 · 필기구 · 데스크 정리',
    shortLabel: '문구/사무',
    icon: '✏️',
    defaultDrawerType: '표준 책상 서랍',
    defaultDimensions: { width: 32, depth: 40, height: 7 },
    description: '볼펜, 샤프, 가위, 자, 칼, 포스트잇, 클립 등을 칸칸이 깔끔하게 정돈',
    keywords: ['문구', '볼펜', '가위', '자', '칼', '포스트잇', '테이프', '클립', '지우개', '메모', '샤프', '스탬프'],
    organizerKeywords: ['칸막이 서랍 정리함', '서랍 정리 트레이', '섹션 케이스', '클리어 정리함', '모듈 트레이'],
    allowedCategories: ['stationery', 'storage', 'digital_tools'],
    excludedKeywords: ['양념', '소스', '조미료', '클렌징', '세정제', '화장품', '오일', '치약', '샴푸'],
    recommendedBundles: [
      {
        bundleName: '칸막이 4분할 데스크 세트',
        description: '긴 필기구 트레이 + 소품 3칸 모듈로 펜과 지우개/클립 완벽 분리',
        organizerNames: ['칸막이 서랍 정리함 1호', '칸막이 서랍 정리함 2호', '칸막이 서랍 정리함 3호'],
        goodsCategory: 'stationery'
      },
      {
        bundleName: '투명 아크릴 모듈 세트',
        description: '한눈에 내용물이 보이는 클리어 아크릴 트레이 병렬 배치',
        organizerNames: ['클리어 정리함', '서랍 정리 트레이'],
        goodsCategory: 'stationery'
      }
    ],
    badgeColor: 'border-indigo-300 text-indigo-700 bg-indigo-50'
  },
  {
    id: 'kitchen_cutlery',
    name: '수저 · 커트러리 · 주방소품',
    shortLabel: '수저/커트러리',
    icon: '🍴',
    defaultDrawerType: '싱크대 수저 서랍',
    defaultDimensions: { width: 45, depth: 45, height: 7 },
    description: '수저, 젓가락, 포크, 티스푼, 조리용 집게, 가위를 길이별로 분리 수납',
    keywords: ['수저', '젓가락', '포크', '티스푼', '나이프', '주걱', '조리도구', '집게', '가위', '디저트', '티포크'],
    organizerKeywords: ['수저통', '슬림 트레이', '칸막이 서랍 정리함', '길이 조정 트레이', '모듈 트레이'],
    allowedCategories: ['kitchen_food', 'kitchen', 'storage'],
    excludedKeywords: ['클렌징', '세정제', '화장품', '공구', '볼펜', '오일', '치약', '샴푸'],
    recommendedBundles: [
      {
        bundleName: '커트러리 4열 분리 세트',
        description: '수저용 롱트레이 2열 + 포크/스푼용 미디엄 트레이 2열 조합',
        organizerNames: ['일본제 길이 조정 수납 트레이', '칸막이 서랍 정리함 1호', '서랍 정리 트레이'],
        goodsCategory: 'kitchen_food'
      }
    ],
    badgeColor: 'border-emerald-300 text-emerald-700 bg-emerald-50'
  },
  {
    id: 'kitchen_spices',
    name: '양념통 · 조미료 · 오일병',
    shortLabel: '양념/조미료',
    icon: '🧂',
    defaultDrawerType: '싱크대 깊은 하부장',
    defaultDimensions: { width: 45, depth: 45, height: 22 },
    description: '소금, 설탕, 고춧가루 양념통 및 참기름, 간장, 식용유 오일병 세움 수납',
    keywords: [
      '양념', '조미료', '소스', '식용유', '참기름', '들기름', '올리브유', '올리브오일',
      '카놀라유', '포도씨유', '오일병', '소금', '후추', '시즈닝', '고춧가루', '통깨',
      '설탕', '간장', '식초', '맛술', '굴소스', '케첩', '마요네즈', '고추장', '된장', '쌈장'
    ],
    organizerKeywords: ['핸들 트레이', '팬트리 바구니', '회전 트레이', '양념통 거치대', '수납 바스켓'],
    allowedCategories: ['kitchen_food', 'kitchen', 'storage'],
    excludedKeywords: [
      '클렌징', '바디', '헤어', '세안', '화장', '청소', '락스', '곰팡이', '세정제',
      '변기', '엔진', '바이크', '체인', '방향제', '향수', '비누', '치약', '칫솔', '샴푸', '스크럽'
    ],
    recommendedBundles: [
      {
        bundleName: '핸들 바스켓 + 회전 트레이 세트',
        description: '자주 쓰는 양념 360° 회전 트레이 + 긴 소스병 전용 핸들 바구니 조합',
        organizerNames: ['회전형 원형 트레이', '팬트리 수납 바구니', '브릭스 멀티 바스켓'],
        goodsCategory: 'kitchen_food'
      }
    ],
    badgeColor: 'border-amber-300 text-amber-700 bg-amber-50'
  },
  {
    id: 'vanity_cosmetics',
    name: '화장품 · 립스틱 · 뷰티소품',
    shortLabel: '화장품/뷰티',
    icon: '💄',
    defaultDrawerType: '화장대 서랍',
    defaultDimensions: { width: 42, depth: 38, height: 9 },
    description: '립스틱, 틴트, 팩트, 아이섀도우, 메이크업 브러쉬, 화장솜 정돈',
    keywords: ['화장품', '립스틱', '틴트', '브러쉬', '아이섀도우', '쿠션', '팩트', '뷰러', '향수', '마스카라', '화장솜', '클렌징', '세럼'],
    organizerKeywords: ['아크릴 정리함', '립스틱 홀더', '칸막이 트레이', '클리어 서랍장', '브러쉬 꽂이'],
    allowedCategories: ['beauty', 'bath_body', 'storage'],
    excludedKeywords: ['양념', '간장', '식용유', '엔진', '공구', '반찬', '음료', '김치'],
    recommendedBundles: [
      {
        bundleName: '아크릴 뷰티 오거나이저 세트',
        description: '립스틱 타워 홀더 + 쿠션/팔레트용 와이드 아크릴 트레이 조합',
        organizerNames: ['아크릴 립스틱 홀더', '클리어 정리함', '서랍 정리 트레이'],
        goodsCategory: 'beauty'
      }
    ],
    badgeColor: 'border-pink-300 text-pink-700 bg-pink-50'
  },
  {
    id: 'closet_socks_underwear',
    name: '양말 · 속옷 · 넥타이 소품',
    shortLabel: '양말/속옷',
    icon: '🧦',
    defaultDrawerType: '옷장 / 드레스룸 서랍',
    defaultDimensions: { width: 70, depth: 45, height: 16 },
    description: '양말, 속옷, 벨트, 넥타이, 스카프를 한 칸에 하나씩 깔끔하게 롤링 수납',
    keywords: ['양말', '속옷', '팬티', '넥타이', '벨트', '스카프', '스타킹', '손수건', '드로즈'],
    organizerKeywords: ['속옷 정리함', '양말 정리함', '칸막이 수납함', '패브릭 오거나이저', '수납 박스'],
    allowedCategories: ['living_fashion', 'storage'],
    excludedKeywords: ['양념', '음료', '클렌징', '세정제', '화장품', '공구', '식용유'],
    recommendedBundles: [
      {
        bundleName: '속옷/양말 다분할 수납 세트',
        description: '양말용 12구/15구 칸막이함 2개 + 속옷용 와이드함 1개 조합',
        organizerNames: ['패브릭 오거나이저 수납함 슬림형', '와이드 수납함', '칸막이 정리함'],
        goodsCategory: 'living_fashion'
      }
    ],
    badgeColor: 'border-violet-300 text-violet-700 bg-violet-50'
  },
  {
    id: 'first_aid_medicine',
    name: '상비약 · 영양제 · 구급함',
    shortLabel: '상비약/영양제',
    icon: '💊',
    defaultDrawerType: '가정용 상비약 서랍',
    defaultDimensions: { width: 35, depth: 30, height: 12 },
    description: '타이레놀, 소화제, 대일밴드, 연고, 소독약, 종합비타민 영양제 보관',
    keywords: ['약', '영양제', '밴드', '연고', '소독', '비타민', '체온계', '마스크', '붕대', '파스', '인공눈물'],
    organizerKeywords: ['구급상자', '손잡이 정리함', '칸막이 섹션 케이스', '다용도함', '클리어 케이스'],
    allowedCategories: ['bath_cleaning', 'bath_body', 'beauty', 'storage'],
    excludedKeywords: ['양념', '식용유', '음료', '공구', '클렌징'],
    recommendedBundles: [
      {
        bundleName: '가정용 구급함 + 알약 트레이 세트',
        description: '연고/밴드용 섹션 케이스 + 병약/영양제용 딥 트레이 조합',
        organizerNames: ['손잡이 뚜껑 정리함', '칸막이 섹션 케이스 14칸', '다용도 보관케이스'],
        goodsCategory: 'bath_cleaning'
      }
    ],
    badgeColor: 'border-red-300 text-red-700 bg-red-50'
  },
  {
    id: 'digital_cables',
    name: '케이블 · 충전기 · 디지털 소품',
    shortLabel: '케이블/디지털',
    icon: '🔌',
    defaultDrawerType: '거실/데스크 멀티 서랍',
    defaultDimensions: { width: 35, depth: 35, height: 8 },
    description: 'C타입 케이블, 고속 충전기, 보조배터리, 이어폰, USB 젠더, 외장하드 정돈',
    keywords: ['케이블', '충전기', 'C타입', '어댑터', '보조배터리', '이어폰', '젠더', '메모리', 'USB', '외장하드', '마우스'],
    organizerKeywords: ['케이블 정리함', '섹션 케이스', '투명 모듈 트레이', '칸막이 1호', '다용도함'],
    allowedCategories: ['digital_tools', 'storage'],
    excludedKeywords: ['화장품', '클렌징', '식용유', '양념', '음료', '반찬'],
    recommendedBundles: [
      {
        bundleName: '케이블 개별 칸막이 세트',
        description: '케이블 6~8개 개별 격벽 분리 + 충전기 헤드 보관함 조합',
        organizerNames: ['칸막이 섹션 케이스', '칸막이 서랍 정리함 2호', '클리어 정리함'],
        goodsCategory: 'digital_tools'
      }
    ],
    badgeColor: 'border-cyan-300 text-cyan-700 bg-cyan-50'
  },
  {
    id: 'coffee_tea_snacks',
    name: '커피캡슐 · 티백 · 홈카페/스낵',
    shortLabel: '커피/티백/스낵',
    icon: '☕',
    defaultDrawerType: '홈카페 / 아일랜드 서랍',
    defaultDimensions: { width: 40, depth: 40, height: 10 },
    description: '네스프레소/일리 커피캡슐, 녹차/홍차 티백, 믹스커피 스틱, 개별 간식',
    keywords: ['커피', '캡슐', '티백', '차', '스틱', '시럽', '스낵', '과자', '초콜릿', '캔디', '사탕', '콤부차'],
    organizerKeywords: ['아크릴 캡슐함', '티백 정리함', '디바이더 트레이', '투명 바스켓', '클리어 수납함'],
    allowedCategories: ['kitchen_food', 'kitchen', 'storage'],
    excludedKeywords: ['클렌징', '세정제', '화장품', '엔진', '바디', '오일', '치약'],
    recommendedBundles: [
      {
        bundleName: '홈카페 캡슐 & 티백 오거나이저 세트',
        description: '캡슐 20개 정렬 트레이 + 티백/스틱 분할 트레이 조합',
        organizerNames: ['클리어 적층 정리함', '서랍 정리 트레이', '칸막이 서랍 정리함 3호'],
        goodsCategory: 'kitchen_food'
      }
    ],
    badgeColor: 'border-amber-300 text-amber-800 bg-amber-50'
  },
  {
    id: 'fridge_sides_sauces',
    name: '냉장고 반찬 · 밀폐용기 · 소분',
    shortLabel: '냉장고/반찬',
    icon: '🥬',
    defaultDrawerType: '냉장고 메인 선반',
    defaultDimensions: { width: 82.5, depth: 48, height: 23 },
    description: '반찬통 2단 적재, 밀폐용기, 캔음료, 소스병, 계란 보관함을 서랍형 바스켓으로 정돈',
    keywords: [
      '밀폐용기', '반찬', '김치', '생수', '음료', '우유', '캔', '소스', '계란', '치즈',
      '버터', '샐러드', '요거트', '잼', '장류', '간장', '케첩', '마요네즈', '고추장', '된장', '참기름'
    ],
    organizerKeywords: ['냉장고 수납 바구니', '핸들 트레이', '회전형 원형 트레이', '계란 보관함', '밀폐 용기'],
    allowedCategories: ['kitchen_food', 'kitchen', 'storage'],
    excludedKeywords: [
      '클렌징', '바디', '헤어', '세안', '화장', '청소', '락스', '곰팡이', '세정제',
      '변기', '엔진', '바이크', '체인', '방향제', '치약', '칫솔', '비누', '샴푸', '스크럽', '오일 펜'
    ],
    recommendedBundles: [
      {
        bundleName: '냉장고 깊은 선반 풀패키지 세트',
        description: '다이소 45cm 롱 슬라이딩 바구니 2개 + 30cm 회전 턴테이블 1개 조합',
        organizerNames: ['슬라이딩 바구니', '회전형 원형 트레이 30', '반투명 바구니 5호'],
        goodsCategory: 'kitchen_food'
      }
    ],
    badgeColor: 'border-sky-300 text-sky-700 bg-sky-50'
  },
  {
    id: 'tools_diy_hardware',
    name: '공구 · DIY 부품 · 나사/철물',
    shortLabel: '공구/DIY',
    icon: '🛠️',
    defaultDrawerType: '공구함 / 베란다 수납장',
    defaultDimensions: { width: 50, depth: 40, height: 16 },
    description: '드라이버, 펜치, 줄자, 절연테이프, 나사못, 앙카, 렌치 등 철물 도구 보관',
    keywords: ['공구', '드라이버', '펜치', '줄자', '망치', '나사', '못', '테이프', '철물', '스패너', '니퍼', '수평기'],
    organizerKeywords: ['공구함', '다용도 섹션 케이스', '수납박스', '칸막이 박스', '폴딩 박스'],
    allowedCategories: ['digital_tools', 'storage', 'living_fashion'],
    excludedKeywords: ['클렌징', '화장품', '양념', '반찬', '음료', '김치', '치약', '샴푸'],
    recommendedBundles: [
      {
        bundleName: '나사/소품 섹션 + 핸드툴 바스켓 세트',
        description: '나사못 크기별 분할 케이스 + 드라이버/펜치 공구함 조합',
        organizerNames: ['칸막이 섹션 케이스 14칸', '캠핑 다용도 미니 박스', '카고 수납박스'],
        goodsCategory: 'digital_tools'
      }
    ],
    badgeColor: 'border-slate-400 text-slate-800 bg-slate-100'
  }
];
