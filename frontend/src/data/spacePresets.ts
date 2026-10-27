import { DrawerDimension } from './daisoProducts';

export type SpaceCategory =
  | 'all'
  | 'custom'          // ⭐ 내 맞춤 공간 (사용자 직접 추가/저장)
  | 'samsung'         // ❄️ 삼성 비스포크
  | 'lg'              // ❄️ LG 디오스 오브제
  | 'kimchi'          // 🥬 김치냉장고
  | 'side_by_side'    // 🚪 양문형 & 원룸 소형
  | 'kitchen';        // 🍳 주방 싱크대 & 팬트리

export type CompartmentZone =
  | 'all'
  | 'main_shelf'    // 🌟 메인 선반 / 메인 공간
  | 'crisper'       // 🥬 신선 야채실 / 서랍
  | 'door_pocket'   // 🚪 도어 포켓 바스켓
  | 'freezer';      // 🧊 냉동실 서랍/트레이

export interface SpacePreset {
  id: string;
  name: string;
  category: SpaceCategory;
  categoryLabel: string;
  zone: CompartmentZone;
  zoneLabel: string;
  brand?: string;
  modelCode?: string;
  series?: string;
  dimensions: DrawerDimension;
  description: string;
  recommendedKeywords: string[];
  tips: string;
  isPopular?: boolean;
  isUserSelected?: boolean; // RM70F91R1A 901L
  isCustom?: boolean;       // User created
  icon: string;
}

export const SPACE_CATEGORIES: { id: SpaceCategory; label: string; icon: string }[] = [
  { id: 'all', label: '전체 공간', icon: '📐' },
  { id: 'custom', label: '내 맞춤 공간 (저장됨)', icon: '⭐' },
  { id: 'samsung', label: '삼성 비스포크', icon: '❄️' },
  { id: 'lg', label: 'LG 디오스 오브제', icon: '❄️' },
  { id: 'kimchi', label: '김치냉장고', icon: '🥬' },
  { id: 'side_by_side', label: '양문형 & 2도어', icon: '🚪' },
  { id: 'kitchen', label: '주방 & 팬트리', icon: '🍳' },
];

export const ZONE_FILTERS: { id: CompartmentZone; label: string; icon: string }[] = [
  { id: 'all', label: '전체 구역', icon: '🔍' },
  { id: 'main_shelf', label: '🌟 메인 선반 (1/2/3단)', icon: '🌟' },
  { id: 'crisper', label: '🥬 신선 야채실 / 서랍', icon: '🥬' },
  { id: 'door_pocket', label: '🚪 도어 포켓 바스켓', icon: '🚪' },
  { id: 'freezer', label: '🧊 냉동실 서랍/트레이', icon: '🧊' },
];

export const SPACE_PRESETS: SpacePreset[] = [
  // ==========================================
  // 1. ❄️ 삼성 비스포크 냉장고 모델별 프리셋
  // ==========================================
  {
    id: 'fridge-rm70f91r1a-main-1',
    name: '삼성 비스포크 901L (RM70F91R1A) 냉장실 1단 메인 선반',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 82.5, depth: 48.0, height: 23.0 },
    description: '상단 1단 와이드 메인 선반. 자주 꺼내는 반찬통, 밀폐용기, 계란트레이 다단 적재 공간.',
    recommendedKeywords: ['밀폐용기', '반찬통', '정리함', '트레이', '계란'],
    tips: '다이소 팬트리 바구니 1호/2호 또는 적층형 클리어 반찬용기를 열 맞춰 배치하면 한눈에 보입니다.',
    isPopular: true,
    isUserSelected: true,
    icon: '❄️'
  },
  {
    id: 'fridge-rm70f91r1a-main-2',
    name: '삼성 비스포크 901L (RM70F91R1A) 냉장실 2단 메인 반찬 선반',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 82.5, depth: 48.0, height: 22.0 },
    description: '시선 높이의 핵심 반찬 메인 공간. 손잡이 달린 투명 냉장고 트레이로 깊숙한 곳까지 깔끔 정리.',
    recommendedKeywords: ['손잡이트레이', '냉장고바구니', '반찬통', '저장용기'],
    tips: '손잡이형 냉장고 바구니를 세로로 4~5열 나란히 넣으면 서랍처럼 당겨 쓸 수 있습니다.',
    isPopular: true,
    isUserSelected: true,
    icon: '❄️'
  },
  {
    id: 'fridge-rm70f91r1a-main-3',
    name: '삼성 비스포크 901L (RM70F91R1A) 냉장실 3단 와이드/접이식 메인 선반',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 82.5, depth: 48.0, height: 30.0 },
    description: '높이 30cm의 대형 수납 메인 선반. 큰 냄비, 통수박, 대형 김치통, 음료 피처를 여유롭게 보관.',
    recommendedKeywords: ['대용량김치통', '김치통', '밀폐용기', '수박보관', '캔홀더'],
    tips: '캔 디스펜서 랙이나 대형 김치통을 놓고, 남는 공간에 키 큰 소스병을 배치하기 최적입니다.',
    isPopular: true,
    isUserSelected: true,
    icon: '❄️'
  },
  {
    id: 'fridge-rm70f91r1a-crisper',
    name: '삼성 비스포크 901L (RM70F91R1A) 신선 야채실 / 과일 서랍 (좌측칸)',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'crisper',
    zoneLabel: '신선 야채실',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 39.5, depth: 42.0, height: 18.5 },
    description: '습도 조절 신선 보관실. 대파, 양파, 잎채소, 사과, 토마토 등 신선 식품 분리 보관.',
    recommendedKeywords: ['야채바구니', '지퍼백', '채소보관용기', '칸막이'],
    tips: '신선 야채 보관용 다이소 메쉬 바구니나 통풍형 트레이를 활용해 무름을 방지하세요.',
    isPopular: true,
    isUserSelected: true,
    icon: '🥬'
  },
  {
    id: 'fridge-rm70f91r1a-door',
    name: '삼성 비스포크 901L (RM70F91R1A) 냉장실 도어 포켓 바스켓',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'door_pocket',
    zoneLabel: '도어 포켓',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 38.0, depth: 16.5, height: 18.0 },
    description: '도어 안쪽 소스병 바스켓. 케첩, 마요네즈, 간장, 드레싱 등 키 작은 양념병 전용.',
    recommendedKeywords: ['소스병', '양념통', '도어포켓정리함', '스탠드'],
    tips: '다이소 도어포켓 전용 걸이형 미니 바스켓을 끼우면 와사비나 튜브형 양념도 깔끔히 정돈됩니다.',
    isPopular: true,
    isUserSelected: true,
    icon: '🚪'
  },
  {
    id: 'fridge-rm70f91r1a-freezer',
    name: '삼성 비스포크 901L (RM70F91R1A) 냉동실 슬라이딩 대형 서랍',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'freezer',
    zoneLabel: '냉동실 서랍',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 36.0, depth: 40.0, height: 22.0 },
    description: '하단 냉동실 깊은 슬라이딩 서랍. 냉동만두, 밀키트, 육류, 냉동밥 소분 용기 수납.',
    recommendedKeywords: ['소분용기', '냉동밥용기', '냉동소분', '북엔드', '스탠드트레이'],
    tips: '냉동팩을 눕히지 않고 세워서 보관할 수 있도록 다이소 북엔드나 수납트레이로 구획하세요.',
    isPopular: true,
    isUserSelected: true,
    icon: '🧊'
  },
  {
    id: 'fridge-bespoke-875-main',
    name: '삼성 비스포크 4도어 프리스탠딩 875L (RF85C9001) 메인 선반',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RF85C9001',
    series: '비스포크 4도어 프리스탠딩',
    dimensions: { width: 82.0, depth: 47.5, height: 22.5 },
    description: '대중적인 875L 프리스탠딩 모델 실측 메인 선반. 와이드 82cm 공간.',
    recommendedKeywords: ['밀폐용기', '반찬통', '정리바구니'],
    tips: '중형 반찬통 8~10개 또는 팬트리 바구니 3~4개를 나란히 수납 가능합니다.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-bespoke-kitchenfit-637-main',
    name: '삼성 비스포크 키친핏 Max 637L (RM70F64R1X) 메인 선반',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F64R1X',
    series: '비스포크 키친핏 Max 637L',
    dimensions: { width: 76.8, depth: 35.5, height: 21.0 },
    description: '가구장 일체형 깊이 35.5cm 슬림 메인 선반. 한눈에 모든 용기 확인 가능.',
    recommendedKeywords: ['슬림트레이', '반찬용기', '밀폐찬통'],
    tips: '깊이가 35.5cm이므로 깊이 30~35cm급 다이소 슬림 정리함이 꼭 맞습니다.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-bespoke-kitchenfit-623-main',
    name: '삼성 비스포크 키친핏 Max 623L (RM70F64Q1A) 메인 선반',
    category: 'samsung',
    categoryLabel: '삼성 비스포크',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F64Q1A',
    series: '비스포크 키친핏 Max 623L',
    dimensions: { width: 76.4, depth: 35.2, height: 20.5 },
    description: '키친핏 623L 콤팩트 규격 메인 선반.',
    recommendedKeywords: ['슬림트레이', '반찬통'],
    tips: '폭 13cm급 슬림 트레이 5열 배치가 가능합니다.',
    isPopular: false,
    icon: '❄️'
  },

  // ==========================================
  // 2. ❄️ LG 디오스 오브제컬렉션 모델별 프리셋
  // ==========================================
  {
    id: 'fridge-lg-objet-870-main-1',
    name: 'LG 디오스 AI 오브제컬렉션 870L (T876MEE1H1) 냉장실 1단 메인 선반',
    category: 'lg',
    categoryLabel: 'LG 디오스 오브제',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG전자',
    modelCode: 'T876MEE1H1',
    series: '디오스 AI 오브제컬렉션 870L',
    dimensions: { width: 82.1, depth: 46.2, height: 22.5 },
    description: 'LG 플래그십 870L 실측 메인 선반. 균일 냉기 순환과 대용량 밀폐찬통 적재 최적화.',
    recommendedKeywords: ['밀폐용기', '유리반찬통', '수납바구니'],
    tips: '투명 아크릴 정리함이나 손잡이 바구니로 유제품/반찬존을 분리해보세요.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-lg-objet-870-moving-basket',
    name: 'LG 디오스 AI 오브제컬렉션 870L (T876MEE1H1) 무빙 바스켓 중간 메인 선반',
    category: 'lg',
    categoryLabel: 'LG 디오스 오브제',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG전자',
    modelCode: 'T876MEE1H1',
    series: '디오스 AI 오브제컬렉션 870L',
    dimensions: { width: 82.1, depth: 46.2, height: 22.0 },
    description: '자주 꺼내는 밑반찬과 요리 재료를 보관하는 중심 메인 존.',
    recommendedKeywords: ['반찬통', '트레이', '치즈소시지'],
    tips: '낮은 깊이의 다이소 서랍 정리 트레이를 앞뒤로 배치하여 알뜰하게 활용하세요.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-lg-objet-kitchenfit-610-main',
    name: 'LG 디오스 AI 오브제 Fit & Max 610L (G646GBB021) 메인 선반',
    category: 'lg',
    categoryLabel: 'LG 디오스 오브제',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG전자',
    modelCode: 'G646GBB021',
    series: '오브제 Fit & Max 610L',
    dimensions: { width: 75.5, depth: 34.8, height: 20.0 },
    description: '키친핏 610L 빌트인 규격 메인 선반. 슬림하고 정돈된 냉장고 레이아웃.',
    recommendedKeywords: ['슬림트레이', '밀폐용기', '반찬통'],
    tips: '다이소 1호 수납 바구니(폭 13cm)를 나란히 배치하기 가장 적합합니다.',
    isPopular: false,
    icon: '❄️'
  },

  // ==========================================
  // 3. 🥬 김치냉장고 모델별 프리셋
  // ==========================================
  {
    id: 'fridge-kimchi-stand-490-main',
    name: '스탠드형 김치냉장고 490L (Z490MEEF11) 상칸 다목적 와이드 메인 선반',
    category: 'kimchi',
    categoryLabel: '김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG/딤채/삼성',
    modelCode: 'Z490MEEF11',
    series: '스탠드형 김치냉장고 490L',
    dimensions: { width: 64.5, depth: 43.5, height: 24.5 },
    description: '김치통뿐 아니라 주류, 음료, 과일, 육류를 신선하게 장기 보관하는 상칸 메인 공간.',
    recommendedKeywords: ['김치통', '맥주캔홀더', '와인랙', '대용량밀폐용기'],
    tips: '김치통 2~3개와 함께 남은 공간에 캔 음료 정리대를 넣으면 미니 음료 냉장고로 변신합니다.',
    isPopular: true,
    icon: '🥬'
  },
  {
    id: 'fridge-kimchi-stand-490-drawer',
    name: '스탠드형 김치냉장고 490L (Z490MEEF11) 중칸 김치통 서랍 (4개 수납)',
    category: 'kimchi',
    categoryLabel: '김치냉장고',
    zone: 'crisper',
    zoneLabel: '신선/김치 서랍',
    brand: 'LG/딤채/삼성',
    modelCode: 'Z490MEEF11',
    series: '스탠드형 김치냉장고 490L',
    dimensions: { width: 48.0, depth: 45.0, height: 28.0 },
    description: '표준 김치통 4개가 딱 맞게 들어가는 중칸 밀폐 서랍 공간.',
    recommendedKeywords: ['김치통', '제습제', '탈취제', '누름독'],
    tips: '다이소 김치통 5L~10L 규격 4개가 정확하게 채워지는 표준 규격입니다.',
    isPopular: false,
    icon: '🥬'
  },
  {
    id: 'fridge-kimchi-chest-220',
    name: '뚜껑형 김치냉장고 220L 좌/우 김치 보관 룸',
    category: 'kimchi',
    categoryLabel: '김치냉장고',
    zone: 'crisper',
    zoneLabel: '신선/김치 서랍',
    brand: '공용',
    series: '뚜껑형 김치냉장고 220L',
    dimensions: { width: 46.0, depth: 40.0, height: 38.0 },
    description: '상부 도어를 여는 전통 뚜껑형 김치 룸. 깊이 38cm 대형 공간.',
    recommendedKeywords: ['김치통', '누름독'],
    tips: '2층으로 김치통을 적재할 수 있는 깊이입니다.',
    isPopular: false,
    icon: '🥬'
  },

  // ==========================================
  // 4. 🚪 양문형 & 원룸 2도어 냉장고
  // ==========================================
  {
    id: 'fridge-side-by-side-840-fridge',
    name: '양문형 대용량 냉장고 840L (RS84DB5002) 냉장실 메인 선반',
    category: 'side_by_side',
    categoryLabel: '양문형 & 2도어',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성/LG 공용',
    modelCode: 'RS84DB5002',
    series: '양문형 대용량 840L',
    dimensions: { width: 44.5, depth: 51.5, height: 23.5 },
    description: '좌우 분할 양문형 모델 특유의 깊고 좁은 메인 선반 구조. 깊이 51.5cm 활용이 관건.',
    recommendedKeywords: ['깊은트레이', '손잡이바구니', '슬라이딩정리함'],
    tips: '깊이가 50cm를 넘으므로 손잡이 달린 긴 트레이를 앞뒤로 2단 구성하는 것이 핵심입니다.',
    isPopular: false,
    icon: '🚪'
  },
  {
    id: 'fridge-side-by-side-840-freezer',
    name: '양문형 대용량 냉장고 840L (RS84DB5002) 냉동실 메인 선반',
    category: 'side_by_side',
    categoryLabel: '양문형 & 2도어',
    zone: 'freezer',
    zoneLabel: '냉동실 선반',
    brand: '삼성/LG 공용',
    modelCode: 'RS84DB5002',
    series: '양문형 대용량 840L',
    dimensions: { width: 35.0, depth: 47.5, height: 22.0 },
    description: '냉동식품, 소분 용기를 정돈하는 양문형 냉동실 메인 선반.',
    recommendedKeywords: ['소분용기', '냉동트레이'],
    tips: '냉동밥 용기를 세로로 세워 적재하면 한눈에 파악됩니다.',
    isPopular: false,
    icon: '🧊'
  },
  {
    id: 'fridge-one-room-180-main',
    name: '원룸 / 오피스텔 소형 2도어 냉장고 180L 메인 선반',
    category: 'side_by_side',
    categoryLabel: '양문형 & 2도어',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '공용',
    series: '원룸/오피스텔 180L',
    dimensions: { width: 46.0, depth: 38.0, height: 18.0 },
    description: '1인 가구 원룸 냉장고 메인 선반. 아담한 공간을 2단 적층으로 2배 활용.',
    recommendedKeywords: ['적층정리함', '클리어박스', '미니트레이'],
    tips: '다이소 클리어 적층 정리함(높이 6.5cm)을 2단으로 쌓으면 공간 낭비가 전혀 없습니다.',
    isPopular: true,
    icon: '❄️'
  },

  // ==========================================
  // 5. 🍳 주방 싱크대 & 팬트리 (식품/수저/양념 보관)
  // ==========================================
  {
    id: 'kitchen-sink-cutlery-45',
    name: '싱크대 상단 1단 수저 & 커트러리 서랍',
    category: 'kitchen',
    categoryLabel: '주방 & 팬트리',
    zone: 'crisper',
    zoneLabel: '서랍/바스켓',
    brand: '한샘/리바트 표준',
    dimensions: { width: 45.0, depth: 45.0, height: 7.0 },
    description: '숟가락, 젓가락, 포크, 디저트스푼, 과도를 칸막이로 분리 수납하는 서랍.',
    recommendedKeywords: ['커트러리', '수저통', '칸막이정리함', '조리도구트레이'],
    tips: '칸막이 서랍 정리함 1호~4호 조합으로 빈틈없이 딱 맞출 수 있습니다.',
    isPopular: true,
    icon: '🍴'
  },
  {
    id: 'kitchen-spice-pullout-rack',
    name: '주방 슬라이딩 인출식 양념망장 (간장/오일/양념통)',
    category: 'kitchen',
    categoryLabel: '주방 & 팬트리',
    zone: 'door_pocket',
    zoneLabel: '도어/슬라이딩',
    dimensions: { width: 20.0, depth: 45.0, height: 45.0 },
    description: '가스레인지/인덕션 옆 폭 20cm 슬림 인출식 장. 간장, 오일, 소금, 후추통 보관.',
    recommendedKeywords: ['양념통', '오일병', '소스병', '미니바구니'],
    tips: '사각 유리 오일병과 자석 조미료통을 나란히 놓으면 흔들림 없이 수납됩니다.',
    isPopular: true,
    icon: '🧂'
  },
  {
    id: 'kitchen-pantry-rack-shelf',
    name: '팬트리 4단 철제 랙 선반 (식품/라면/통조림존)',
    category: 'kitchen',
    categoryLabel: '주방 & 팬트리',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    dimensions: { width: 80.0, depth: 40.0, height: 35.0 },
    description: '라면, 햇반, 참치캔, 과자 등 가공식품을 마트처럼 진열 정리하는 대형 선반.',
    recommendedKeywords: ['팬트리바구니', '라탄바구니', '적층박스', '간식보관함'],
    tips: '팬트리 수납 바구니 2호/3호를 라벨링하여 종류별(라면존, 간식존, 캔존)로 분류하세요.',
    isPopular: true,
    icon: '🥫'
  }
];
