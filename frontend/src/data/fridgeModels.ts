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

export const FRIDGE_MODELS: FridgeModel[] = rawScrapedModels as FridgeModel[];

/**
 * Convenience helper to find a model by ID (defaulting to the user's Samsung Bespoke 901L RM70F91R1A).
 */
export function getFridgeModel(id: string = 'samsung-rm70f91r1a-901l'): FridgeModel {
  return FRIDGE_MODELS.find(m => m.id === id || m.modelCode === 'RM70F91R1A') || FRIDGE_MODELS[0];
}
