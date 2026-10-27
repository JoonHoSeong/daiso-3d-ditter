import { DrawerDimension } from './daisoProducts';

export type SpaceCategory =
  | 'all'
  | 'refrigerator'  // ❄️ 냉장고 & 김치냉장고
  | 'kitchen'       // 🍳 주방, 싱크대 & 팬트리
  | 'desk'          // 🖥️ 책상, 서재 & 사무실
  | 'dressing'      // 💄 화장대, 옷장 & 침실
  | 'bathroom'      // 🚿 욕실, 다용도실 & 세탁실
  | 'outdoor';      // 🏕️ 캠핑, 수납박스 & 차량

export type CompartmentZone =
  | 'all'
  | 'main_shelf'    // 🌟 메인 선반 / 메인 공간
  | 'drawer'        // 🗄️ 서랍 / 슬라이딩 바스켓
  | 'door_pocket'   // 🚪 도어 포켓 / 도어 가드
  | 'cabinet';      // 📦 하부장 / 대형 수납함

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
  icon: string;
}

export const SPACE_CATEGORIES: { id: SpaceCategory; label: string; icon: string }[] = [
  { id: 'all', label: '전체 공간', icon: '📐' },
  { id: 'refrigerator', label: '냉장고 & 김치냉장고', icon: '❄️' },
  { id: 'kitchen', label: '주방 & 싱크대 & 팬트리', icon: '🍳' },
  { id: 'desk', label: '책상 & 서재 & 사무실', icon: '🖥️' },
  { id: 'dressing', label: '화장대 & 드레스룸', icon: '💄' },
  { id: 'bathroom', label: '욕실 & 다용도 & 세탁실', icon: '🚿' },
  { id: 'outdoor', label: '캠핑 & 수납박스 & 차량', icon: '🏕️' },
];

export const ZONE_FILTERS: { id: CompartmentZone; label: string; icon: string }[] = [
  { id: 'all', label: '전체 구역', icon: '🔍' },
  { id: 'main_shelf', label: '메인 선반 / 메인 공간', icon: '🌟' },
  { id: 'drawer', label: '서랍 / 슬라이딩 바스켓', icon: '🗄️' },
  { id: 'door_pocket', label: '도어 / 사이드 포켓', icon: '🚪' },
  { id: 'cabinet', label: '하부장 / 대형 수납함', icon: '📦' },
];

export const SPACE_PRESETS: SpacePreset[] = [
  // ==========================================
  // 1. ❄️ 냉장고 & 김치냉장고 (메인 선반 대폭 집중)
  // ==========================================
  {
    id: 'fridge-rm70f91r1a-main-1',
    name: '삼성 비스포크 901L (RM70F91R1A) 냉장실 1단 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
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
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F91R1A',
    series: '비스포크 AI 하이브리드 901L',
    dimensions: { width: 82.5, depth: 48.0, height: 23.0 },
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
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
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
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
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
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
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
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
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
    name: '삼성 비스포크 4도어 프리스탠딩 875L 냉장실 상단 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RF85C9001',
    series: '비스포크 4도어 프리스탠딩',
    dimensions: { width: 80.0, depth: 46.0, height: 22.0 },
    description: '시중 가장 대중적인 875L 프리스탠딩 모델의 메인 선반. 와이드 80cm 공간.',
    recommendedKeywords: ['밀폐용기', '반찬통', '정리바구니'],
    tips: '중형 반찬통 8~10개 또는 팬트리 바구니 3~4개를 나란히 수납 가능합니다.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-bespoke-kitchenfit-main',
    name: '삼성 비스포크 키친핏 Max 615L 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성전자',
    modelCode: 'RM70F64R1X',
    series: '비스포크 키친핏 Max',
    dimensions: { width: 76.0, depth: 36.0, height: 20.0 },
    description: '가구장과 일체감을 주는 깊이 36cm 슬림 메인 선반. 앞뒤가 얕아 한눈에 모든 용기 확인 가능.',
    recommendedKeywords: ['슬림트레이', '반찬용기', '밀폐찬통'],
    tips: '깊이가 36cm로 얕으므로 깊이 30~35cm급 다이소 슬림 정리함이 꼭 맞습니다.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-lg-objet-870-main-1',
    name: 'LG 디오스 AI 오브제컬렉션 870L 냉장실 상단 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG전자',
    modelCode: 'T876MEE1H1',
    series: '디오스 AI 오브제컬렉션',
    dimensions: { width: 81.0, depth: 46.0, height: 23.0 },
    description: 'LG 플래그십 870L 메인 선반. 균일 냉기 순환과 대용량 밀폐찬통 적재에 최적화.',
    recommendedKeywords: ['밀폐용기', '유리반찬통', '수납바구니'],
    tips: '투명 아크릴 정리함이나 손잡이 바구니로 유제품/반찬존을 분리해보세요.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-lg-objet-870-moving-basket',
    name: 'LG 디오스 AI 오브제컬렉션 870L 무빙 바스켓 중간 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG전자',
    modelCode: 'T876MEE1H1',
    series: '디오스 AI 오브제컬렉션',
    dimensions: { width: 81.0, depth: 46.0, height: 22.0 },
    description: '자주 먹는 밑반찬과 요리 재료를 편리하게 꺼낼 수 있는 시선 집중 메인 존.',
    recommendedKeywords: ['반찬통', '트레이', '치즈소시지'],
    tips: '낮은 깊이의 다이소 서랍 정리 트레이를 앞뒤로 배치하여 알뜰하게 활용하세요.',
    isPopular: true,
    icon: '❄️'
  },
  {
    id: 'fridge-lg-objet-kitchenfit-main',
    name: 'LG 디오스 AI 오브제컬렉션 Fit & Max 610L 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG전자',
    modelCode: 'G646GBB021',
    series: '오브제컬렉션 Fit & Max',
    dimensions: { width: 75.0, depth: 35.0, height: 20.0 },
    description: '키친핏 610L 빌트인 규격 메인 선반. 슬림하고 정돈된 냉장고 레이아웃 구축.',
    recommendedKeywords: ['슬림트레이', '밀폐용기', '반찬통'],
    tips: '다이소 1호 수납 바구니(폭 13cm) 5개를 일렬로 놓으면 가로 65~70cm로 정확히 들어찹니다.',
    isPopular: false,
    icon: '❄️'
  },
  {
    id: 'fridge-side-by-side-840-fridge',
    name: '양문형 대용량 냉장고 840L 냉장실 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: '삼성/LG 공용',
    modelCode: 'RS84DB5002',
    series: '양문형 대용량',
    dimensions: { width: 44.0, depth: 52.0, height: 24.0 },
    description: '좌우 분할 양문형 모델 특유의 깊고 좁은 메인 선반 구조. 깊이 52cm 활용이 관건.',
    recommendedKeywords: ['깊은트레이', '손잡이바구니', '슬라이딩정리함'],
    tips: '깊이가 50cm를 넘으므로 손잡이 달린 긴 트레이를 앞뒤로 2단 구성하는 것이 핵심입니다.',
    isPopular: false,
    icon: '❄️'
  },
  {
    id: 'fridge-kimchi-stand-490-main',
    name: '스탠드형 김치냉장고 490L 상칸 다목적 와이드 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'LG/딤채/삼성',
    modelCode: 'Z490MEEF11',
    series: '스탠드형 김치냉장고 490L',
    dimensions: { width: 64.0, depth: 44.0, height: 25.0 },
    description: '김치통뿐 아니라 주류, 음료, 과일, 육류를 신선하게 장기 보관하는 상칸 메인 공간.',
    recommendedKeywords: ['김치통', '맥주캔홀더', '와인랙', '대용량밀폐용기'],
    tips: '김치통 2~3개와 함께 남은 공간에 캔 음료 정리대를 넣으면 미니 음료 냉장고로 변신합니다.',
    isPopular: true,
    icon: '🥬'
  },
  {
    id: 'fridge-kimchi-stand-490-drawer',
    name: '스탠드형 김치냉장고 490L 중칸 김치통 서랍 (4개 수납)',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    brand: 'LG/딤채/삼성',
    modelCode: 'Z490MEEF11',
    series: '스탠드형 김치냉장고 490L',
    dimensions: { width: 48.0, depth: 45.0, height: 28.0 },
    description: '표준 김치통 4개가 딱 맞게 들어가는 중칸 밀폐 서랍 공간.',
    recommendedKeywords: ['김치통', '제습제', '탈취제', '누름독'],
    tips: '다이소 김치통 5L~10L 규격 4개가 정확히 채워지는 표준 규격입니다.',
    isPopular: false,
    icon: '🥬'
  },
  {
    id: 'fridge-one-room-180-main',
    name: '원룸 / 오피스텔 소형 2도어 냉장고 180L 메인 선반',
    category: 'refrigerator',
    categoryLabel: '냉장고 & 김치냉장고',
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
  // 2. 🍳 주방 & 싱크대 & 팬트리
  // ==========================================
  {
    id: 'kitchen-sink-cutlery-45',
    name: '한샘/리바트 싱크대 1단 수저 & 커트러리 서랍',
    category: 'kitchen',
    categoryLabel: '주방 & 싱크대 & 팬트리',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    brand: '한샘/리바트 표준',
    dimensions: { width: 45.0, depth: 45.0, height: 7.0 },
    description: '숟가락, 젓가락, 포크, 디저트스푼, 과도를 칸막이로 분리 수납하는 얕은 서랍.',
    recommendedKeywords: ['커트러리', '수저통', '칸막이정리함', '조리도구트레이'],
    tips: '칸막이 서랍 정리함 1호~4호 조합으로 빈틈없이 직소퍼즐처럼 딱 맞출 수 있습니다.',
    isPopular: true,
    icon: '🍴'
  },
  {
    id: 'kitchen-sink-utensil-60',
    name: '싱크대 2단 조리도구 & 키친툴 서랍 (와이드 60cm)',
    category: 'kitchen',
    categoryLabel: '주방 & 싱크대 & 팬트리',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    dimensions: { width: 60.0, depth: 45.0, height: 12.0 },
    description: '국자, 뒤집개, 집게, 가위, 거품기 등 긴 조리도구를 정돈하는 중형 깊이 서랍.',
    recommendedKeywords: ['조리도구', '긴트레이', '다용도트레이', '키친툴'],
    tips: '길이 30cm 이상의 긴 섹션 트레이를 가로/세로로 섞어 배치하세요.',
    isPopular: true,
    icon: '🍳'
  },
  {
    id: 'kitchen-sink-pot-deep-80',
    name: '싱크대 하부 냄비 & 프라이팬 깊은 대형 서랍',
    category: 'kitchen',
    categoryLabel: '주방 & 싱크대 & 팬트리',
    zone: 'cabinet',
    zoneLabel: '하부장/수납함',
    dimensions: { width: 80.0, depth: 45.0, height: 32.0 },
    description: '궁중팬, 냄비, 뚝배기, 프라이팬을 세워서 보관할 수 있는 높이 32cm 대형 서랍.',
    recommendedKeywords: ['냄비정리대', '후라이팬스탠드', '파일박스', '와이드바구니'],
    tips: '다이소 스탠드 파일박스를 활용해 프라이팬을 세우면 꺼내 쓰기 10배 편해집니다.',
    isPopular: true,
    icon: '🍲'
  },
  {
    id: 'kitchen-spice-pullout-rack',
    name: '주방 슬라이딩 양념망장 (슬림 인출식 양념 서랍)',
    category: 'kitchen',
    categoryLabel: '주방 & 싱크대 & 팬트리',
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
    categoryLabel: '주방 & 싱크대 & 팬트리',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    dimensions: { width: 80.0, depth: 40.0, height: 35.0 },
    description: '라면, 햇반, 참치캔, 과자 등 가공식품을 마트처럼 진열 정리하는 대형 선반.',
    recommendedKeywords: ['팬트리바구니', '라탄바구니', '적층박스', '간식보관함'],
    tips: '팬트리 수납 바구니 2호/3호를 라벨링하여 종류별(라면존, 간식존, 캔존)로 분류하세요.',
    isPopular: true,
    icon: '🥫'
  },
  {
    id: 'kitchen-upper-cabinet-shelf',
    name: '싱크대 상부장 접시 & 머그잔 정리 선반',
    category: 'kitchen',
    categoryLabel: '주방 & 싱크대 & 팬트리',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    dimensions: { width: 75.0, depth: 32.0, height: 28.0 },
    description: '자주 쓰는 밥그릇, 국그릇, 접시, 컵을 보관하는 상부장 1단 선반.',
    recommendedKeywords: ['접시꽂이', '디시랙', '컵정리대', '아크릴선반'],
    tips: '다이소 2단 접시 랙을 넣으면 상하 2층으로 접시를 안전하게 적재할 수 있습니다.',
    isPopular: false,
    icon: '🍽️'
  },

  // ==========================================
  // 3. 🖥️ 책상 & 서재 & 사무실
  // ==========================================
  {
    id: 'desk-ikea-helmer',
    name: '이케아 헬메르 (HELMER) 6단 이동식 철제 서랍장 1칸',
    category: 'desk',
    categoryLabel: '책상 & 서재 & 사무실',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    brand: 'IKEA',
    series: 'HELMER 6단',
    dimensions: { width: 28.0, depth: 41.0, height: 9.0 },
    description: '국민 서재템 이케아 헬메르 서랍 1칸. 필기구, 계산기, 마우스패드, 케이블 정리.',
    recommendedKeywords: ['사무정리함', '섹션케이스', '펜트레이', '케이블정리'],
    tips: '가로 28cm, 깊이 41cm이므로 칸막이 서랍정리함 1호와 2호를 교차 배치하기 좋습니다.',
    isPopular: true,
    icon: '🖥️'
  },
  {
    id: 'desk-ikea-alex-shallow',
    name: '이케아 알렉스 (ALEX) 얕은 상단 서랍 (1~2단)',
    category: 'desk',
    categoryLabel: '책상 & 서재 & 사무실',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    brand: 'IKEA',
    series: 'ALEX 서랍장',
    dimensions: { width: 36.0, depth: 52.0, height: 8.0 },
    description: '데스크 셋업 필수품 알렉스 상단 얕은 서랍. 깊이 52cm의 광활한 수납력.',
    recommendedKeywords: ['데스크오거나이저', '펜트레이', '사무용품', '문구정리'],
    tips: '깊이가 52cm로 매우 깊어 다이소 수납 트레이를 앞뒤 2열로 꽉 채울 수 있습니다.',
    isPopular: true,
    icon: '🖥️'
  },
  {
    id: 'desk-ikea-alex-deep',
    name: '이케아 알렉스 (ALEX) 깊은 하단 서랍 (3~5단)',
    category: 'desk',
    categoryLabel: '책상 & 서재 & 사무실',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    brand: 'IKEA',
    series: 'ALEX 서랍장',
    dimensions: { width: 36.0, depth: 52.0, height: 12.0 },
    description: '헤드셋, 외장하드, 책, 다이어리, 파우치를 보관하는 넉넉한 하단 서랍.',
    recommendedKeywords: ['북엔드', '깊은바구니', '클리어수납함'],
    tips: '높이 12cm까지 수납되므로 부피가 큰 전자기기나 패키지 상자 보관에 적합합니다.',
    isPopular: true,
    icon: '🎧'
  },
  {
    id: 'desk-motion-under-drawer',
    name: '모션데스크 슬림 언더데스크 부착 서랍',
    category: 'desk',
    categoryLabel: '책상 & 서재 & 사무실',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    dimensions: { width: 50.0, depth: 30.0, height: 4.5 },
    description: '무서랍 데스크 상판 밑에 부착하는 초슬림 서랍. 펜, 안경, USB, 포스트잇 수납.',
    recommendedKeywords: ['슬림트레이', '낮은트레이', '부착서랍'],
    tips: '높이가 4.5cm로 낮아 높이 3~4cm 이하의 초슬림 미니 트레이가 최적입니다.',
    isPopular: false,
    icon: '✒️'
  },
  {
    id: 'desk-ikea-kallax-cube',
    name: '이케아 칼락스 (KALLAX) 정사각 오픈 선반 1칸',
    category: 'desk',
    categoryLabel: '책상 & 서재 & 사무실',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    brand: 'IKEA',
    series: 'KALLAX',
    dimensions: { width: 33.5, depth: 39.0, height: 33.5 },
    description: '가로세로 33.5cm의 정사각 큐브 선반. 인서트 박스나 패브릭 정리함 배치.',
    recommendedKeywords: ['패브릭박스', '서류함', '리빙박스', '폴딩박스'],
    tips: '다이소 접이식 패브릭 박스(32x32x32cm) 또는 폴딩박스가 완벽한 핏으로 들어갑니다.',
    isPopular: true,
    icon: '📦'
  },

  // ==========================================
  // 4. 💄 화장대 & 드레스룸 & 침실
  // ==========================================
  {
    id: 'dressing-vanity-lipstick-shallow',
    name: '화장대 콘솔 얕은 립스틱 & 아이섀도우 서랍',
    category: 'dressing',
    categoryLabel: '화장대 & 드레스룸',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    dimensions: { width: 40.0, depth: 35.0, height: 5.5 },
    description: '립스틱 30종, 섀도우 팔레트, 뷰러, 브러쉬를 한눈에 보이게 눕혀 정돈하는 얕은 서랍.',
    recommendedKeywords: ['립스틱홀더', '아크릴화장품정리함', '화장대트레이', '소품정리'],
    tips: '아크릴 립스틱 타워를 눕히거나 다이소 벨벳 악세서리 트레이를 넣으면 고급스럽습니다.',
    isPopular: true,
    icon: '💄'
  },
  {
    id: 'dressing-vanity-skincare-deep',
    name: '화장대 스킨 & 로션 & 향수 스탠딩 깊은 서랍',
    category: 'dressing',
    categoryLabel: '화장대 & 드레스룸',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    dimensions: { width: 40.0, depth: 35.0, height: 22.0 },
    description: '높이 20cm급 토너, 에센스, 바디로션, 헤어미스트를 세워서 보관하는 깊은 서랍.',
    recommendedKeywords: ['화장품바구니', '스킨케어보관함', '향수진열대'],
    tips: '원통형 화장품이 넘어지지 않게 칸막이 바구니로 지지해 주면 깔끔하게 서 있습니다.',
    isPopular: true,
    icon: '🧴'
  },
  {
    id: 'dressing-chest-underwear-socks',
    name: '한샘/일룸 5단 서랍장 1단 속옷 & 양말 분리 서랍',
    category: 'dressing',
    categoryLabel: '화장대 & 드레스룸',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    brand: '한샘/일룸 표준',
    dimensions: { width: 75.0, depth: 45.0, height: 14.0 },
    description: '양말 20켤레, 속옷, 벨트, 넥타이를 흐트러짐 없이 칸별로 정돈하는 의류 서랍.',
    recommendedKeywords: ['양말정리함', '속옷정리함', '허니콤칸막이', '의류수납'],
    tips: '벌집형 칸막이나 24구 속옷 정리대를 넣으면 빨래 후 개어 넣기 매우 편리합니다.',
    isPopular: true,
    icon: '🧦'
  },
  {
    id: 'dressing-chest-tshirt-knit',
    name: '5단 서랍장 2~4단 티셔츠 & 니트 의류 수납 서랍',
    category: 'dressing',
    categoryLabel: '화장대 & 드레스룸',
    zone: 'drawer',
    zoneLabel: '서랍/바스켓',
    dimensions: { width: 75.0, depth: 45.0, height: 20.0 },
    description: '반팔 티셔츠, 맨투맨, 얇은 니트를 3열 세로 수납하는 표준 깊이 의류 서랍.',
    recommendedKeywords: ['의류디바이더', '옷정리트레이', '패브릭수납'],
    tips: '옷을 눕혀 쌓지 않고 세로로 꽂아 넣으면 원하는 옷만 쏙 뽑아 입을 수 있습니다.',
    isPopular: true,
    icon: '👕'
  },

  // ==========================================
  // 5. 🚿 욕실 & 다용도실 & 세탁실
  // ==========================================
  {
    id: 'bathroom-sliding-mirror-1',
    name: '욕실 슬라이딩 거울 수납장 1단 (치약/칫솔/스킨케어)',
    category: 'bathroom',
    categoryLabel: '욕실 & 다용도 & 세탁실',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    dimensions: { width: 60.0, depth: 14.0, height: 18.0 },
    description: '깊이 14cm 슬림 규격. 칫솔 살균기, 면도기, 치약, 폼클렌저 수납.',
    recommendedKeywords: ['욕실정리대', '치약꽂이', '칫솔스탠드', '슬림트레이'],
    tips: '깊이가 14cm로 슬림하므로 폭 10~12cm급 슬림 투명 아크릴 트레이를 나열하세요.',
    isPopular: true,
    icon: '🚿'
  },
  {
    id: 'bathroom-sliding-mirror-towel',
    name: '욕실 슬라이딩 거울 수납장 2단 (수건 10장 수납칸)',
    category: 'bathroom',
    categoryLabel: '욕실 & 다용도 & 세탁실',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    dimensions: { width: 60.0, depth: 14.0, height: 22.0 },
    description: '돌돌 만 호텔 수건 10~12장을 쓰러지지 않게 차곡차곡 적재하는 타월존.',
    recommendedKeywords: ['수건정리함', '와이어바구니', '타월랙'],
    tips: '북엔드로 양쪽을 막아주면 수건을 하나 빼도 옆 수건들이 쓰러지지 않습니다.',
    isPopular: true,
    icon: '🧺'
  },
  {
    id: 'bathroom-laundry-detergent-shelf',
    name: '세탁기 상단 세제 & 섬유유연제 2단 선반 랙',
    category: 'bathroom',
    categoryLabel: '욕실 & 다용도 & 세탁실',
    zone: 'main_shelf',
    zoneLabel: '메인 선반',
    dimensions: { width: 70.0, depth: 30.0, height: 35.0 },
    description: '대용량 액체 세제통, 과탄산소다, 세탁비누, 빨래망을 정돈하는 세탁존 선반.',
    recommendedKeywords: ['손잡이바구니', '세제보관함', '빨래망바구니'],
    tips: '무거운 액체세제는 손잡이가 달린 튼튼한 다이소 리빙 바스켓에 담아두면 안전합니다.',
    isPopular: false,
    icon: '🧼'
  },

  // ==========================================
  // 6. 🏕️ 캠핑 & 수납박스 & 차량
  // ==========================================
  {
    id: 'outdoor-thor-container-53',
    name: '토르(THOR) 라운드 컨테이너 53L 카고박스',
    category: 'outdoor',
    categoryLabel: '캠핑 & 수납박스 & 차량',
    zone: 'cabinet',
    zoneLabel: '대형 수납함',
    brand: 'THOR',
    series: '53L 카고박스',
    dimensions: { width: 60.0, depth: 40.0, height: 27.0 },
    description: '캠퍼들의 필수 수납함 토르 53L. 랜턴, 이소가스, 식기, 코펠을 소분 패킹.',
    recommendedKeywords: ['캠핑소분박스', '이너트레이', '폴딩박스', '양념가방'],
    tips: '토르 박스 내부에 다이소 모듈 박스를 이너 트레이로 넣으면 뒤섞이지 않습니다.',
    isPopular: true,
    icon: '🏕️'
  },
  {
    id: 'outdoor-thor-container-75',
    name: '토르(THOR) 라지 카고박스 75L 대형 콘테이너',
    category: 'outdoor',
    categoryLabel: '캠핑 & 수납박스 & 차량',
    zone: 'cabinet',
    zoneLabel: '대형 수납함',
    brand: 'THOR',
    series: '75L 카고박스',
    dimensions: { width: 65.0, depth: 44.0, height: 38.0 },
    description: '동계 캠핑 난로용품, 침낭, 타프, 릴선, 장작 집게 등 대형 캠핑 장비 전용.',
    recommendedKeywords: ['대형카고박스', '공구박스', '스트랩', '디바이더'],
    tips: '높이가 38cm이므로 2층 적층 구조로 다이소 수납함을 쌓아 2층 구조로 쓰세요.',
    isPopular: true,
    icon: '🏕️'
  },
  {
    id: 'outdoor-camping-wagon-cart',
    name: '캠핑 접이식 웨건 카트 내부 적재 공간',
    category: 'outdoor',
    categoryLabel: '캠핑 & 수납박스 & 차량',
    zone: 'cabinet',
    zoneLabel: '대형 수납함',
    dimensions: { width: 85.0, depth: 48.0, height: 30.0 },
    description: '짐을 실어나르는 캠핑 웨건 바닥면. 폴딩박스 2개와 쿨러백이 쏙 들어가는 광활한 공간.',
    recommendedKeywords: ['폴딩박스', '웨건상판', '아웃도어바스켓'],
    tips: '다이소 5천원 폴딩박스 2개를 나란히 넣고 그 위에 웨건 롤상판을 올리면 간이 테이블 완성.',
    isPopular: true,
    icon: '🛒'
  },
  {
    id: 'outdoor-car-suv-trunk-mid',
    name: '현대 투싼 / 기아 스포티지 준중형 SUV 트렁크 바닥 공간',
    category: 'outdoor',
    categoryLabel: '캠핑 & 수납박스 & 차량',
    zone: 'cabinet',
    zoneLabel: '대형 수납함',
    brand: '현대/기아 공용',
    series: 'SUV 트렁크',
    dimensions: { width: 98.0, depth: 85.0, height: 42.0 },
    description: '세차용품 버킷, 장우산, 워셔액, 비상 공구함, 장바구니를 굴러다니지 않게 정돈.',
    recommendedKeywords: ['트렁크정리함', '세차버킷', '접이식폴딩박스'],
    tips: '미끄럼 방지 패드와 다이소 접이식 트렁크 박스를 조합하면 급정거에도 흔들리지 않습니다.',
    isPopular: false,
    icon: '🚗'
  }
];
