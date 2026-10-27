import { DrawerDimension } from './daisoProducts';
// @ts-ignore
import rawScrapedModels from './scrapedFridgeModels.json';

export type FridgeDoorType =
  | '전체'
  | '4도어 프리스탠딩'
  | '4도어 키친핏'
  | '양문형'
  | '김치냉장고'
  | '1도어/소형';

export type FridgeCapacityTier =
  | '전체'
  | '900L+ 초특대형'
  | '800L 대용량'
  | '600L 키친핏/슬림'
  | '500L 이하 / 김치';

export interface FridgeCompartment {
  id: string;
  name: string;
  categoryLabel: string;
  zone: 'shelf' | 'crisper' | 'door' | 'freezer_tray' | 'freezer_drawer' | 'pantry';
  dimensions: DrawerDimension;
  description: string;
  recommendedKeywords: string[];
  tips: string;
}

export interface FridgeModel {
  id: string;
  brand: '삼성전자' | 'LG전자';
  series: string;
  modelCode?: string;
  capacityLiters: number;
  fridgeLiters?: number | null;
  freezerLiters?: number | null;
  type: string;
  doorType: FridgeDoorType;
  capacityTier: FridgeCapacityTier;
  subBrand: string;
  shelfDepthType?: string;
  features?: string[];
  dimensionsExterior: { width: number; depth: number; height: number }; // mm
  isUserSelected?: boolean;
  tag: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  compartments: FridgeCompartment[];
}

/**
 * Computes model-specific interior dimensions for each refrigerator model
 * dynamically calculated from its actual exterior width/depth/height (mm) and capacity liters.
 */
function computeModelSpecificDimensions(model: FridgeModel) {
  const extW = model.dimensionsExterior?.width || 912;
  const extD = model.dimensionsExterior?.depth || 930;
  const cap = model.capacityLiters || 850;

  const isKitchenFit =
    model.doorType === '4도어 키친핏' ||
    (model.shelfDepthType && model.shelfDepthType.includes('34~35cm')) ||
    extD <= 730 ||
    cap <= 660;

  const isSideBySide = model.doorType === '양문형';
  const isKimchi = model.doorType === '김치냉장고';

  if (isKimchi) {
    const mainW = Math.round(((extW - 270) / 10) * 10) / 10;
    const mainD = Math.round(((extD - 480) / 10) * 10) / 10;
    const drawerW = Math.round((mainW * 0.75) * 10) / 10;
    const drawerD = Math.round((mainD * 1.02) * 10) / 10;
    return {
      mainW,
      mainD,
      mainH: 25.0,
      midW: mainW,
      midD: mainD,
      midH: 23.0,
      wideW: mainW,
      wideD: mainD,
      wideH: 30.0,
      crisperW: drawerW,
      crisperD: drawerD,
      crisperH: 28.0,
      doorW: 36.0,
      doorD: 15.0,
      doorH: 18.0,
      freezerW: drawerW,
      freezerD: Math.round((drawerD - 3.0) * 10) / 10,
      freezerH: 26.0
    };
  }

  if (isSideBySide) {
    const innerW = (extW - 140) / 10;
    const innerD = (extD - 410) / 10;
    const fridgeW = Math.round((innerW * 0.56) * 10) / 10;
    const freezerW = Math.round((innerW * 0.44) * 10) / 10;
    const shelfD = Math.round(innerD * 10) / 10;
    return {
      mainW: fridgeW,
      mainD: shelfD,
      mainH: 24.0,
      midW: fridgeW,
      midD: shelfD,
      midH: 23.0,
      wideW: fridgeW,
      wideD: shelfD,
      wideH: 29.0,
      crisperW: Math.round((fridgeW - 4.0) * 10) / 10,
      crisperD: Math.round((shelfD - 6.0) * 10) / 10,
      crisperH: 20.0,
      doorW: Math.round((fridgeW - 6.0) * 10) / 10,
      doorD: 15.0,
      doorH: 18.0,
      freezerW,
      freezerD: Math.round((shelfD - 4.0) * 10) / 10,
      freezerH: 22.0
    };
  }

  if (isKitchenFit) {
    const baseW = (extW - 144) / 10;
    const capRatio = cap / 637;
    const mainW = Math.round(baseW * Math.pow(capRatio, 0.25) * 10) / 10;
    const baseD = (extD - 342) / 10;
    const mainD = Math.round(baseD * Math.pow(capRatio, 0.4) * 10) / 10;
    const crisperW = Math.round(((mainW / 2) - 3.0) * 10) / 10;
    const crisperD = Math.round((mainD - 3.5) * 10) / 10;
    return {
      mainW,
      mainD,
      mainH: 21.0,
      midW: mainW,
      midD: mainD,
      midH: 21.0,
      wideW: mainW,
      wideD: mainD,
      wideH: 27.5,
      crisperW,
      crisperD,
      crisperH: 16.5,
      doorW: Math.round(((mainW / 2) - 3.0) * 10) / 10,
      doorD: 14.5,
      doorH: 16.5,
      freezerW: Math.round(((mainW / 2) - 6.0) * 10) / 10,
      freezerD: Math.round((mainD - 3.5) * 10) / 10,
      freezerH: 19.5
    };
  }

  // 4-Door Freestanding (830L ~ 905L 대용량 플래그십)
  const capRatio = cap / 901;
  const baseW = (extW - 87) / 10;
  const mainW = Math.round(baseW * Math.pow(capRatio, 0.2) * 10) / 10;
  const baseD = (extD - 450) / 10;
  const mainD = Math.round(baseD * Math.pow(capRatio, 0.35) * 10) / 10;
  const crisperW = Math.round(((mainW / 2) - 1.75) * 10) / 10;
  const crisperD = Math.round((mainD - 6.0) * 10) / 10;

  return {
    mainW,
    mainD,
    mainH: Math.round((22.0 + (cap > 880 ? 1.0 : 0)) * 10) / 10,
    midW: mainW,
    midD: mainD,
    midH: Math.round((22.0 + (cap > 880 ? 0.5 : 0)) * 10) / 10,
    wideW: mainW,
    wideD: mainD,
    wideH: Math.round((29.0 + (cap > 880 ? 1.0 : 0)) * 10) / 10,
    crisperW,
    crisperD,
    crisperH: Math.round((18.0 + (cap > 880 ? 0.5 : 0)) * 10) / 10,
    doorW: Math.round(((mainW / 2) - 3.25) * 10) / 10,
    doorD: 16.5,
    doorH: 18.0,
    freezerW: Math.round(((mainW / 2) - 5.25) * 10) / 10,
    freezerD: Math.round((mainD - 8.0) * 10) / 10,
    freezerH: 22.0
  };
}

function enrichModelCompartments(model: FridgeModel): FridgeCompartment[] {
  // If model is RM70F91R1A, use verified official flagship dimensions
  if (model.modelCode === 'RM70F91R1A') {
    return [
      {
        id: `${model.id}-main-shelf-1`,
        name: '냉장실 1단 (상단 와이드 메인 선반)',
        categoryLabel: '메인 선반',
        zone: 'shelf',
        dimensions: { width: 82.5, depth: 48.0, height: 23.0 },
        description: '상단 1단 와이드 메인 선반. 자주 꺼내는 반찬통, 밀폐용기, 계란트레이 다단 적재 공간.',
        recommendedKeywords: ['밀폐용기', '반찬통', '정리함', '트레이', '계란'],
        tips: '다이소 팬트리 바구니 1호/2호 또는 적층형 클리어 반찬용기를 열 맞춰 배치하면 한눈에 보입니다.'
      },
      {
        id: `${model.id}-main-shelf-2`,
        name: '냉장실 2단 (중간 메인 반찬 선반)',
        categoryLabel: '메인 선반',
        zone: 'shelf',
        dimensions: { width: 82.5, depth: 48.0, height: 22.0 },
        description: '시선 높이의 핵심 반찬 메인 공간. 손잡이 달린 투명 냉장고 트레이로 깊숙한 곳까지 깔끔 정리.',
        recommendedKeywords: ['손잡이트레이', '냉장고바구니', '반찬통', '저장용기'],
        tips: '손잡이형 냉장고 바구니를 세로로 4~5열 나란히 넣으면 서랍처럼 당겨 쓸 수 있습니다.'
      },
      {
        id: `${model.id}-main-shelf-3`,
        name: '냉장실 3단 (하단 와이드/접이식 메인 선반)',
        categoryLabel: '메인 선반',
        zone: 'shelf',
        dimensions: { width: 82.5, depth: 48.0, height: 30.0 },
        description: '높이 30cm의 대형 수납 메인 선반. 큰 냄비, 통수박, 대형 김치통, 음료 피처를 여유롭게 보관.',
        recommendedKeywords: ['대용량김치통', '김치통', '밀폐용기', '수박보관', '캔홀더'],
        tips: '캔 디스펜서 랙이나 대형 김치통을 놓고, 남는 공간에 키 큰 소스병을 배치하기 최적입니다.'
      },
      {
        id: `${model.id}-crisper-drawer`,
        name: '신선 야채실 / 과일 서랍 (좌측칸)',
        categoryLabel: '신선 서랍',
        zone: 'crisper',
        dimensions: { width: 39.5, depth: 42.0, height: 18.5 },
        description: '습도 조절 신선 보관실. 대파, 양파, 잎채소, 사과, 토마토 등 신선 식품 분리 보관.',
        recommendedKeywords: ['야채바구니', '지퍼백', '채소보관용기', '칸막이'],
        tips: '신선 야채 보관용 다이소 메쉬 바구니나 통풍형 트레이를 활용해 무름을 방지하세요.'
      },
      {
        id: `${model.id}-door-pocket`,
        name: '냉장실 도어 포켓 바스켓',
        categoryLabel: '도어 포켓',
        zone: 'door',
        dimensions: { width: 38.0, depth: 16.5, height: 18.0 },
        description: '도어 안쪽 소스병 바스켓. 케첩, 마요네즈, 간장, 드레싱 등 키 작은 양념병 전용.',
        recommendedKeywords: ['소스병', '양념통', '도어포켓정리함', '스탠드'],
        tips: '다이소 도어포켓 전용 걸이형 미니 바스켓을 끼우면 와사비나 튜브형 양념도 깔끔히 정돈됩니다.'
      },
      {
        id: `${model.id}-freezer-drawer`,
        name: '냉동실 대형 슬라이딩 서랍',
        categoryLabel: '냉동 서랍',
        zone: 'freezer_drawer',
        dimensions: { width: 36.0, depth: 40.0, height: 22.0 },
        description: '하단 냉동실 깊은 슬라이딩 서랍. 냉동만두, 밀키트, 육류, 냉동밥 소분 용기 수납.',
        recommendedKeywords: ['소분용기', '냉동밥용기', '냉동소분', '북엔드', '스탠드트레이'],
        tips: '냉동팩을 눕히지 않고 세워서 보관할 수 있도록 다이소 북엔드나 수납트레이로 구획하세요.'
      }
    ];
  }

  // Model-specific calculated dimensions
  const dims = computeModelSpecificDimensions(model);
  const isKimchi = model.doorType === '김치냉장고';
  const isSideBySide = model.doorType === '양문형';

  if (isKimchi) {
    return [
      {
        id: `${model.id}-upper-main-shelf`,
        name: '상칸 다목적 와이드 메인 선반',
        categoryLabel: '메인 선반',
        zone: 'shelf',
        dimensions: { width: dims.mainW, depth: dims.mainD, height: dims.mainH },
        description: `김치냉장고(${model.capacityLiters}L) 상칸 메인 선반. 대형 김치통, 주류, 과일 전용.`,
        recommendedKeywords: ['김치통', '밀폐용기', '캔홀더', '트레이'],
        tips: '김치통 2개와 캔음료 정리대를 함께 수납하기에 가장 넉넉한 공간입니다.'
      },
      {
        id: `${model.id}-middle-kimchi-drawer`,
        name: '중칸 김치통 전용 밀폐 서랍 (4개 규격)',
        categoryLabel: '김치 서랍',
        zone: 'crisper',
        dimensions: { width: dims.crisperW, depth: dims.crisperD, height: dims.crisperH },
        description: '정온 밀폐 중칸 서랍. 김치통 4개가 정밀하게 들어가는 전문 서랍.',
        recommendedKeywords: ['김치통', '누름독', '제습제', '탈취제'],
        tips: '다이소 5L~10L 김치통 4개가 정확하게 들어가는 표준 규격입니다.'
      },
      {
        id: `${model.id}-lower-pantry-drawer`,
        name: '하칸 야채 / 과일 / 쌀 보관 서랍',
        categoryLabel: '하칸 서랍',
        zone: 'freezer_drawer',
        dimensions: { width: dims.freezerW, depth: dims.freezerD, height: dims.freezerH },
        description: '뿌리채소, 쌀, 잡곡, 대형 식자재를 신선하게 장기 보관하는 하단 서랍.',
        recommendedKeywords: ['야채바구니', '잡곡통', '쌀보관함'],
        tips: '잡곡통이나 다이소 수납 바스켓을 넣어 구획을 나눠 사용하세요.'
      }
    ];
  }

  if (isSideBySide) {
    return [
      {
        id: `${model.id}-fridge-main-shelf-1`,
        name: '냉장실 1단 메인 선반 (상단)',
        categoryLabel: '메인 선반',
        zone: 'shelf',
        dimensions: { width: dims.mainW, depth: dims.mainD, height: dims.mainH },
        description: `양문형(${model.capacityLiters}L) 냉장실 상단 메인 선반. 깊이 ${dims.mainD}cm 공간.`,
        recommendedKeywords: ['깊은트레이', '손잡이트레이', '밀폐용기'],
        tips: '깊이가 50cm를 넘으므로 손잡이형 긴 트레이를 앞뒤로 배치하는 것이 핵심입니다.'
      },
      {
        id: `${model.id}-fridge-main-shelf-2`,
        name: '냉장실 2단 메인 선반 (시선 집중)',
        categoryLabel: '메인 선반',
        zone: 'shelf',
        dimensions: { width: dims.midW, depth: dims.midD, height: dims.midH },
        description: '자주 꺼내는 밑반찬, 유제품, 소스류를 배치하는 중심 메인 공간.',
        recommendedKeywords: ['반찬통', '손잡이바구니', '적층트레이'],
        tips: '다이소 팬트리 바구니를 세로로 2열 배치하면 서랍처럼 쉽게 인출됩니다.'
      },
      {
        id: `${model.id}-fridge-crisper-drawer`,
        name: '냉장실 신선 야채실 / 과일 서랍',
        categoryLabel: '신선 서랍',
        zone: 'crisper',
        dimensions: { width: dims.crisperW, depth: dims.crisperD, height: dims.crisperH },
        description: '야채와 과일을 신선하게 분리 보관하는 밀폐 신선 서랍.',
        recommendedKeywords: ['야채바구니', '지퍼백', '과일트레이'],
        tips: '통풍형 바구니를 넣어 채소 간 무름 현상을 방지하세요.'
      },
      {
        id: `${model.id}-fridge-door-pocket`,
        name: '냉장실 도어 포켓 바스켓',
        categoryLabel: '도어 포켓',
        zone: 'door',
        dimensions: { width: dims.doorW, depth: dims.doorD, height: dims.doorH },
        description: '우유팩, 소스병, 드레싱, 생수를 수납하는 도어 포켓.',
        recommendedKeywords: ['소스병', '양념통', '우유홀더'],
        tips: '미니 걸이형 포켓을 걸면 자잘한 양념 튜브도 쓰러지지 않습니다.'
      },
      {
        id: `${model.id}-freezer-main-shelf`,
        name: '냉동실 메인 선반 (상단)',
        categoryLabel: '냉동 선반',
        zone: 'shelf',
        dimensions: { width: dims.freezerW, depth: dims.freezerD, height: dims.freezerH },
        description: '자주 먹는 냉동식품, 아이스크림, 냉동밥을 적재하는 냉동실 메인 선반.',
        recommendedKeywords: ['냉동소분', '소분용기', '냉동트레이'],
        tips: '소분 용기를 세로로 세워 수납하면 무엇이 들었는지 바로 보입니다.'
      }
    ];
  }

  // 4-Door Freestanding or KitchenFit
  return [
    {
      id: `${model.id}-main-shelf-1`,
      name: '냉장실 1단 (상단 와이드 메인 선반)',
      categoryLabel: '메인 선반',
      zone: 'shelf',
      dimensions: { width: dims.mainW, depth: dims.mainD, height: dims.mainH },
      description: `${model.brand} ${model.capacityLiters}L (${model.doorType}) 상단 메인 선반.`,
      recommendedKeywords: ['밀폐용기', '반찬통', '정리함', '트레이'],
      tips: '다이소 팬트리 바구니 1호/2호 또는 적층형 클리어 반찬용기를 열 맞춰 배치하세요.'
    },
    {
      id: `${model.id}-main-shelf-2`,
      name: '냉장실 2단 (중간 메인 반찬 선반)',
      categoryLabel: '메인 선반',
      zone: 'shelf',
      dimensions: { width: dims.midW, depth: dims.midD, height: dims.midH },
      description: '시선 높이의 매일 반찬 보관 메인 공간. 손잡이 바구니로 깊숙한 곳까지 정리.',
      recommendedKeywords: ['손잡이트레이', '냉장고바구니', '반찬통'],
      tips: '손잡이형 냉장고 바구니를 세로로 나란히 넣으면 서랍처럼 당겨 쓸 수 있습니다.'
    },
    {
      id: `${model.id}-main-shelf-3`,
      name: '냉장실 3단 (하단 와이드/접이식 메인 선반)',
      categoryLabel: '메인 선반',
      zone: 'shelf',
      dimensions: { width: dims.wideW, depth: dims.wideD, height: dims.wideH },
      description: '대형 냄비, 통수박, 대형 김치통, 음료 피처를 보관하는 와이드 메인 선반.',
      recommendedKeywords: ['대용량김치통', '김치통', '밀폐용기', '수박보관'],
      tips: '캔 디스펜서 랙이나 대형 김치통을 놓고 남는 공간에 키 큰 소스병을 배치하세요.'
    },
    {
      id: `${model.id}-crisper-drawer`,
      name: '신선 야채실 / 과일 서랍 (좌측칸)',
      categoryLabel: '신선 서랍',
      zone: 'crisper',
      dimensions: { width: dims.crisperW, depth: dims.crisperD, height: dims.crisperH },
      description: '습도 조절 신선 보관실. 잎채소, 과일, 버섯 분리 보관.',
      recommendedKeywords: ['야채바구니', '지퍼백', '채소보관용기'],
      tips: '신선 야채 보관용 다이소 메쉬 바구니나 통풍형 트레이를 활용해 무름을 방지하세요.'
    },
    {
      id: `${model.id}-door-pocket`,
      name: '냉장실 도어 포켓 바스켓',
      categoryLabel: '도어 포켓',
      zone: 'door',
      dimensions: { width: dims.doorW, depth: dims.doorD, height: dims.doorH },
      description: '도어 안쪽 소스병 바스켓. 양념병, 드레싱, 우유팩 수납.',
      recommendedKeywords: ['소스병', '양념통', '도어포켓정리함'],
      tips: '다이소 도어포켓 전용 걸이형 미니 바스켓을 끼우면 작은 튜브도 쓰러지지 않습니다.'
    },
    {
      id: `${model.id}-freezer-drawer`,
      name: '냉동실 대형 슬라이딩 서랍',
      categoryLabel: '냉동 서랍',
      zone: 'freezer_drawer',
      dimensions: { width: dims.freezerW, depth: dims.freezerD, height: dims.freezerH },
      description: '하단 냉동실 슬라이딩 서랍. 냉동만두, 밀키트, 냉동밥 소분 용기 수납.',
      recommendedKeywords: ['소분용기', '냉동밥용기', '냉동소분', '스탠드트레이'],
      tips: '냉동팩을 눕히지 않고 세워서 보관할 수 있도록 다이소 북엔드로 구획하세요.'
    }
  ];
}

export const FRIDGE_MODELS: FridgeModel[] = (rawScrapedModels as FridgeModel[]).map(m => ({
  ...m,
  compartments: enrichModelCompartments(m)
}));

/**
 * Convenience helper to find a model by ID (defaulting to the user's Samsung Bespoke 901L RM70F91R1A).
 */
export function getFridgeModel(id: string = 'samsung-rm70f91r1a-901l'): FridgeModel {
  return FRIDGE_MODELS.find(m => m.id === id || m.modelCode === 'RM70F91R1A') || FRIDGE_MODELS[0];
}
