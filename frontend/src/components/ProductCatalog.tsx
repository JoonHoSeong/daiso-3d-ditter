import React, { useState, useMemo } from 'react';
import { DaisoProduct, DrawerDimension } from '../data/daisoProducts';
import { PurposePreset, PURPOSE_PRESETS } from '../data/purposePresets';
import { isDrawerCabinet, isDrawerOrganizer } from '../utils/stacking';
import { StoreInfo } from './StoreStockModal';
import {
  Plus,
  Search,
  ExternalLink,
  Image as ImageIcon,
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  CheckCircle2,
  Zap,
  Target,
  Store,
  Loader2
} from 'lucide-react';

interface ProductCatalogProps {
  products: DaisoProduct[];
  drawer: DrawerDimension;
  onAddProduct: (product: DaisoProduct) => void;
  onFillMaxProduct?: (product: DaisoProduct) => void;
  onPreviewProduct: (product: DaisoProduct) => void;
  width?: number;
  isFullWidth?: boolean;
  activePurpose?: PurposePreset | null;
  onClearPurpose?: () => void;
  onOpenPurposeModal?: () => void;
  onSelectPurpose?: (purpose: PurposePreset | null) => void;
  activeStore?: StoreInfo | null;
  onlyStoreStock?: boolean;
  onToggleOnlyStoreStock?: () => void;
  onOpenStoreModal?: () => void;
  storeInStockCodes?: Set<string>;
  storeStockMap?: Record<string, { quantity: number; in_stock: boolean; status_label: string }>;
  isLoading?: boolean;
}

const QUICK_TAGS = [
  '청소 스프레이',
  '회전 트레이',
  '아크릴함',
  '서랍 칸막이',
  'C타입',
  '밀폐용기',
  '화장품',
  '바구니'
];

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  drawer,
  onAddProduct,
  onFillMaxProduct,
  onPreviewProduct,
  width,
  isFullWidth = false,
  activePurpose = null,
  onClearPurpose,
  onOpenPurposeModal,
  onSelectPurpose,
  activeStore = null,
  onlyStoreStock = false,
  onToggleOnlyStoreStock,
  onOpenStoreModal,
  storeInStockCodes,
  storeStockMap,
  isLoading = false
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [fitOnly, setFitOnly] = useState<boolean>(false);
  const [excludeSoldOut, setExcludeSoldOut] = useState<boolean>(false);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(true);
  const [selectedPrice, setSelectedPrice] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'organizer' | 'content'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'volume_asc' | 'volume_desc' | 'name'>('default');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [visibleLimit, setVisibleLimit] = useState<number>(60);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: '전체' },
    { key: 'storage', label: '수납/정리함' },
    { key: 'kitchen', label: '주방용품' },
    { key: 'food', label: '식품/식음료' },
    { key: 'beauty', label: '뷰티/화장품' },
    { key: 'bath_body', label: '욕실/세면용품' },
    { key: 'bath_cleaning', label: '청소/세제용품' },
    { key: 'stationery', label: '문구/사무용품' },
    { key: 'digital', label: '디지털/모바일' },
    { key: 'tools', label: '공구/철물' },
    { key: 'fashion', label: '패션/의류잡화' },
    { key: 'interior', label: '인테리어/원예' },
    { key: 'pet', label: '반려동물' },
    { key: 'hobby', label: '취미/캠핑/레저' },
  ];

  const matchesCategory = (p: DaisoProduct, selected: string, selectedSub: string) => {
    if (selected !== 'all') {
      if (selected === 'storage') {
        const isStorage = ['storage', 'tray', 'basket', 'divider', 'storage_box', 'stackable'].includes(p.category) || p.largeCategory === '수납/정리';
        if (!isStorage) return false;
      } else if (selected === 'kitchen') {
        const isKitchen = p.category === 'kitchen' || p.largeCategory === '주방용품';
        if (!isKitchen) return false;
      } else if (selected === 'food') {
        const isFood = p.category === 'food' || p.largeCategory === '식품';
        if (!isFood) return false;
      } else if (selected === 'beauty') {
        const isBeauty = p.category === 'beauty' || p.largeCategory === '뷰티/위생';
        if (!isBeauty) return false;
      } else if (selected === 'bath') {
        const isBath = p.category === 'bath_body' || (p.largeCategory === '욕실/청소' && (p.middleCategory?.includes('욕실') || p.categoryLabel.includes('욕실')));
        if (!isBath) return false;
      } else if (selected === 'cleaning') {
        const isCleaning = p.category === 'bath_cleaning' || (p.largeCategory === '욕실/청소' && !p.middleCategory?.includes('욕실'));
        if (!isCleaning) return false;
      } else if (selected === 'stationery') {
        const isStationery = p.category === 'stationery' || p.largeCategory === '문구/팬시';
        if (!isStationery) return false;
      } else if (selected === 'digital') {
        const isDigital = p.category === 'digital' || (p.largeCategory === '공구/디지털' && p.middleCategory !== '공구용품');
        if (!isDigital) return false;
      } else if (selected === 'tools') {
        const isTools = p.category === 'tools' || (p.largeCategory === '공구/디지털' && p.middleCategory === '공구용품');
        if (!isTools) return false;
      } else if (selected === 'pet') {
        const isPet = p.category === 'pet' || p.largeCategory === '반려동물';
        if (!isPet) return false;
      } else if (selected === 'hobby') {
        const isHobby = p.category === 'hobby' || p.largeCategory === '스포츠/레저/취미';
        if (!isHobby) return false;
      } else if (selected === 'interior') {
        const isInterior = p.category === 'interior' || p.largeCategory === '인테리어/원예';
        if (!isInterior) return false;
      } else if (selected === 'fashion') {
        const isFashion = p.category === 'fashion' || p.largeCategory === '패션/잡화';
        if (!isFashion) return false;
      } else {
        if (p.category !== selected && p.largeCategory !== selected) return false;
      }
    }

    if (selectedSub !== 'all') {
      if (p.middleCategory !== selectedSub) {
        return false;
      }
    }

    return true;
  };

  const isFiltered =
    Boolean(activePurpose) ||
    search.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedSubCategory !== 'all' ||
    fitOnly ||
    excludeSoldOut ||
    !verifiedOnly ||
    selectedPrice !== 'all' ||
    selectedType !== 'all' ||
    sortBy !== 'default';

  const resetAllFilters = () => {
    if (onClearPurpose) onClearPurpose();
    setSearch('');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setFitOnly(false);
    setExcludeSoldOut(false);
    setVerifiedOnly(true);
    setSelectedPrice('all');
    setSelectedType('all');
    setSortBy('default');
    setVisibleLimit(60);
  };

  // Dynamically extract middle categories for the selected department
  const availableSubCategories = useMemo(() => {
    if (selectedCategory === 'all') return [];
    const subs = new Set<string>();
    products.forEach(p => {
      if (matchesCategory(p, selectedCategory, 'all') && p.middleCategory) {
        subs.add(p.middleCategory);
      }
    });
    return Array.from(subs).filter(s => s && s !== '기타').slice(0, 16);
  }, [products, selectedCategory]);

  const filtered = useMemo(() => {
    const list = products.filter(p => {
      // 0a. Active Purpose matching & Drawer height check
      if (activePurpose) {
        if (p.height > drawer.height) {
          return false;
        }

        // Category restriction
        if (activePurpose.allowedCategories && activePurpose.allowedCategories.length > 0) {
          if (!activePurpose.allowedCategories.includes(p.category)) {
            return false;
          }
        }

        // Excluded keywords check
        if (activePurpose.excludedKeywords && activePurpose.excludedKeywords.length > 0) {
          const textLower = `${p.name} ${p.categoryLabel}`.toLowerCase();
          if (activePurpose.excludedKeywords.some(ex => textLower.includes(ex.toLowerCase()))) {
            return false;
          }
        }

        const allKeywords = [...activePurpose.keywords, ...activePurpose.organizerKeywords];
        const searchTarget = `${p.name} ${p.categoryLabel} ${p.description || ''}`.toLowerCase();
        const matchesPurpose = allKeywords.some(kw => searchTarget.includes(kw.toLowerCase()));
        if (!matchesPurpose) return false;
      }

      // 0b. Official verified spec filter
      if (verifiedOnly && p.dimSource === 'inferred') {
        return false;
      }

      // 0c. Exclude sold out filter
      if (excludeSoldOut && p.isSoldOut) {
        return false;
      }

      // 0d. Active Store Inventory filter
      if (activeStore && onlyStoreStock && storeInStockCodes && storeInStockCodes.size > 0) {
        const code = p.itemCode || p.id;
        if (!storeInStockCodes.has(code)) {
          return false;
        }
      }

      // 1. Text search (multi-word match)
      if (search.trim()) {
        const queryTerms = search.toLowerCase().trim().split(/\s+/);
        const targetStr = `${p.name} ${p.itemCode} ${p.categoryLabel} ${p.description || ''}`.toLowerCase();
        const matchesAll = queryTerms.every(term => targetStr.includes(term));
        if (!matchesAll) return false;
      }

      // 2. Category & SubCategory match
      if (!matchesCategory(p, selectedCategory, selectedSubCategory)) {
        return false;
      }

      // 3. Height fit-only filter
      if (fitOnly && p.height > drawer.height) {
        return false;
      }

      // 4. Price filter
      if (selectedPrice !== 'all' && p.price !== selectedPrice) {
        return false;
      }

      // 5. Organizer vs Content filter
      const isCabinet = isDrawerCabinet(p);
      const isOrg = isDrawerOrganizer(p) && !isCabinet;
      if (selectedType === 'organizer' && (!isOrg || isCabinet)) return false;
      if (selectedType === 'content' && (isOrg || isCabinet)) return false;

      return true;
    });

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'volume_asc') {
        return (a.width * a.depth * a.height) - (b.width * b.depth * b.height);
      }
      if (sortBy === 'volume_desc') {
        return (b.width * b.depth * b.height) - (a.width * a.depth * a.height);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ko');
      }

      // Default smart sorting:
      // 1. Deprioritize standalone drawer cabinets ("서랍장", "미니서랍장") - drawers inside drawers make no sense!
      const aIsCabinet = isDrawerCabinet(a) ? 1 : 0;
      const bIsCabinet = isDrawerCabinet(b) ? 1 : 0;
      if (aIsCabinet !== bIsCabinet) return aIsCabinet - bIsCabinet;

      // 2. Prioritize authentic inner drawer organizers (trays, dividers, baskets)
      const aIsOrg = isDrawerOrganizer(a) ? 1 : 0;
      const bIsOrg = isDrawerOrganizer(b) ? 1 : 0;
      if (aIsOrg !== bIsOrg) return bIsOrg - aIsOrg;

      // 3. Prioritize in-stock and official verified specs
      const aStock = a.isSoldOut ? 1 : 0;
      const bStock = b.isSoldOut ? 1 : 0;
      if (aStock !== bStock) return aStock - bStock;

      return 0;
    });
  }, [products, search, selectedCategory, selectedSubCategory, fitOnly, excludeSoldOut, verifiedOnly, selectedPrice, selectedType, sortBy, drawer.height, activePurpose, activeStore, onlyStoreStock, storeInStockCodes]);

  // Count active advanced filters
  const activeAdvancedFilterCount =
    (selectedPrice !== 'all' ? 1 : 0) +
    (selectedType !== 'all' ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0);

  return (
    <aside
      style={{ width: isFullWidth ? '100%' : (width ? `${width}px` : undefined) }}
      className={`${isFullWidth ? 'w-full border-r-0' : (width ? '' : 'w-88')} h-full flex flex-col bg-white border-r border-slate-200 shadow-sm z-10 flex-shrink-0 transition-[width] duration-75`}
    >
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-daiso-red"></span>
            <h2 className="text-sm font-bold text-slate-800">다이소 상품 카탈로그</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500 font-medium">
              <strong className="text-daiso-red">{filtered.length.toLocaleString()}</strong> / {products.length.toLocaleString()}개
            </span>
            {isFiltered && (
              <button
                onClick={resetAllFilters}
                className="flex items-center space-x-0.5 text-[10px] text-slate-500 hover:text-daiso-red bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
                title="모든 필터 초기화"
              >
                <RotateCcw size={10} />
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Store Inventory Filter Banner */}
        {activeStore && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Store size={13} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-bold text-emerald-950 truncate">[{activeStore.name}] 기준</span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap">
                    실시간 재고 연동
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 truncate">
                  {onlyStoreStock ? '선택 지점에 재고가 있는 상품만 표시 중' : '전체 상품 중 매장 재고 현황 표시'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0 ml-1.5">
              {onToggleOnlyStoreStock && (
                <button
                  type="button"
                  onClick={onToggleOnlyStoreStock}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center space-x-1 ${
                    onlyStoreStock
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={onlyStoreStock ? '전체 상품 표시로 전환' : '이 매장 재고 보유 품목만 표시'}
                >
                  <span>{onlyStoreStock ? '✓ 재고품만' : '전체 보기'}</span>
                </button>
              )}
              {onOpenStoreModal && (
                <button
                  type="button"
                  onClick={onOpenStoreModal}
                  className="text-[10px] bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold px-2 py-1 rounded-lg transition-colors shadow-2xs"
                  title="다른 지점으로 변경"
                >
                  지점 변경
                </button>
              )}
            </div>
          </div>
        )}

        {/* Purpose Filter Active Banner */}
        {activePurpose && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/90 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-xl flex-shrink-0">{activePurpose.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-bold text-indigo-950 truncate">[{activePurpose.name}] 맞춤 필터</span>
                  <span className="text-[10px] bg-indigo-200/80 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap">
                    높이 ≤ {drawer.height}cm
                  </span>
                </div>
                <p className="text-[10px] text-indigo-700/80 truncate">
                  {activePurpose.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0 ml-1.5">
              {onOpenPurposeModal && (
                <button
                  type="button"
                  onClick={onOpenPurposeModal}
                  className="text-[10px] bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold px-2 py-0.5 rounded shadow-2xs transition-colors"
                >
                  서랍/용도 변경
                </button>
              )}
              {onClearPurpose && (
                <button
                  type="button"
                  onClick={onClearPurpose}
                  className="p-1 text-indigo-400 hover:text-indigo-800 hover:bg-indigo-100 rounded transition-colors"
                  title="용도 필터 해제"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search input with Clear Button */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="상품명, 품번(예: 1045002), 키워드 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
              title="검색어 지우기"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Purpose Quick Selector Row */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className="text-[10px] text-purple-700 font-bold flex-shrink-0 flex items-center space-x-0.5">
            <Target size={11} />
            <span>용도:</span>
          </span>
          <button
            type="button"
            onClick={() => onClearPurpose && onClearPurpose()}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors text-[10px] font-medium ${
              !activePurpose
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            전체
          </button>
          {PURPOSE_PRESETS.map((p) => {
            const isSelected = activePurpose?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    if (onClearPurpose) onClearPurpose();
                  } else {
                    if (onSelectPurpose) onSelectPurpose(p);
                  }
                }}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors text-[10px] flex items-center space-x-1 ${
                  isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name.split('/')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 mr-0.5">추천:</span>
          {QUICK_TAGS.map((tag) => {
            const isSelected = search === tag;
            return (
              <button
                key={tag}
                onClick={() => setSearch(isSelected ? '' : tag)}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors text-[10px] ${
                  isSelected
                    ? 'bg-daiso-red text-white font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                setSelectedSubCategory('all');
              }}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-slate-900 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic SubCategory Pills */}
        {availableSubCategories.length > 0 && (
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
            <span className="text-[10px] text-indigo-700 font-bold flex-shrink-0">세부:</span>
            <button
              type="button"
              onClick={() => setSelectedSubCategory('all')}
              className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedSubCategory === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              전체
            </button>
            {availableSubCategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubCategory(selectedSubCategory === sub ? 'all' : sub)}
                className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedSubCategory === sub
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Quick Filter Bar (Verified Spec Toggle, Fit Toggle, Exclude Sold-Out Toggle, Advanced Filter Toggle, Sort Select) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {/* Verified Spec Only Toggle */}
            <button
              onClick={() => setVerifiedOnly(prev => !prev)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition-all text-[11px] whitespace-nowrap ${
                verifiedOnly
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200/80 hover:bg-slate-200'
              }`}
              title="다이소몰 공식 텍스트 규격이 확인된 상품만 표시 (해제 시 통이미지 추정 규격 상품도 포함)"
            >
              {verifiedOnly ? <CheckCircle2 size={11} className="stroke-[2.5]" /> : <Check size={11} />}
              <span>공식 규격만</span>
            </button>

            {/* Fit Only Toggle (Height <= drawer.height) */}
            <button
              onClick={() => setFitOnly(prev => !prev)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition-all text-[11px] whitespace-nowrap ${
                fitOnly
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
              }`}
              title={`높이 ${drawer.height}cm 이하로 서랍에 쏙 들어가는 상품만 표시`}
            >
              {fitOnly ? <CheckCircle2 size={11} className="stroke-[2.5]" /> : <Check size={11} />}
              <span>서랍 맞춤(≤{drawer.height}cm)</span>
            </button>

            {/* Exclude Sold-Out Toggle */}
            <button
              onClick={() => setExcludeSoldOut(prev => !prev)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition-all text-[11px] whitespace-nowrap ${
                excludeSoldOut
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200/80 hover:bg-slate-200'
              }`}
              title="일시품절 상품을 숨기고 구매 가능한 상품만 표시"
            >
              {excludeSoldOut ? <CheckCircle2 size={11} className="stroke-[2.5]" /> : <Check size={11} />}
              <span>품절 제외</span>
            </button>
          </div>

          {/* Filter & Sort Right Controls */}
          <div className="flex items-center space-x-1.5">
            {/* Advanced Filter Toggle Button */}
            <button
              onClick={() => setShowAdvanced(prev => !prev)}
              className={`relative flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                showAdvanced || activeAdvancedFilterCount > 0
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="상세 필터 (가격/유형/정렬)"
            >
              <SlidersHorizontal size={11} />
              <span>필터</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-daiso-red text-white text-[9px] flex items-center justify-center font-bold">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-daiso-red"
              title="정렬 기준"
            >
              <option value="default">기본 추천순</option>
              <option value="price_asc">가격 낮은순 (₩1,000~)</option>
              <option value="price_desc">가격 높은순 (₩5,000~)</option>
              <option value="volume_asc">크기 작은순</option>
              <option value="volume_desc">크기 큰순</option>
              <option value="name">이름순 (가나다)</option>
            </select>
          </div>
        </div>

        {/* Expandable Advanced Filter Panel */}
        {showAdvanced && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1">
            {/* Item Type: All / Organizers / Contents */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">상품 구분</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`py-1 text-[11px] rounded font-medium transition-colors ${
                    selectedType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setSelectedType('organizer')}
                  className={`py-1 text-[11px] rounded font-medium transition-colors ${
                    selectedType === 'organizer'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🗂️ 수납/정리함
                </button>
                <button
                  onClick={() => setSelectedType('content')}
                  className={`py-1 text-[11px] rounded font-medium transition-colors ${
                    selectedType === 'content'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🧴 보관 물품
                </button>
              </div>
            </div>

            {/* Price Filter: All / 1000 / 2000 / 3000 / 5000 */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">가격대 선택</span>
              <div className="flex space-x-1">
                {(['all', 1000, 2000, 3000, 5000] as const).map((pr) => (
                  <button
                    key={pr}
                    onClick={() => setSelectedPrice(pr)}
                    className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                      selectedPrice === pr
                        ? 'bg-daiso-red text-white font-bold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pr === 'all' ? '전체' : `₩${pr.toLocaleString()}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading && filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Loader2 size={32} className="mx-auto text-daiso-red animate-spin stroke-[1.5]" />
            <div>
              <p className="text-xs font-semibold text-slate-600">상품 카탈로그를 불러오는 중…</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                공식 다이소몰 데이터 동기화 또는 로컬 카탈로그 로드
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Search size={32} className="mx-auto text-slate-300 stroke-[1.5]" />
            <div>
              <p className="text-xs font-semibold text-slate-600">검색 및 필터 결과가 없습니다</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                다른 검색어를 입력하거나 필터를 초기화해 보세요
              </p>
            </div>
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RotateCcw size={12} />
              <span>필터 초기화</span>
            </button>
          </div>
        ) : (
          <>
            {filtered.slice(0, visibleLimit).map((prod) => {
              const isTooTall = prod.height > drawer.height;

              return (
                <div
                  key={prod.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isTooTall
                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top row: Thumbnail & Title & External Link */}
                  <div className="flex items-start space-x-3">
                    {/* Clickable Image Thumbnail for Preview Modal */}
                    <button
                      type="button"
                      onClick={() => onPreviewProduct(prod)}
                      className="relative w-14 h-14 rounded-lg bg-slate-100 border border-slate-200/80 flex-shrink-0 overflow-hidden group cursor-pointer hover:border-daiso-red/50 transition-all shadow-2xs"
                      title="클릭하여 실물 사진 크게 보기"
                    >
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: prod.color }}
                        >
                          <ImageIcon size={16} className="text-slate-500 opacity-50" />
                        </div>
                      )}
                      {/* Subtle hover icon */}
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Search size={14} className="text-white" />
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3
                          onClick={() => onPreviewProduct(prod)}
                          className="text-xs font-semibold text-slate-800 leading-snug truncate hover:text-daiso-red cursor-pointer"
                          title={prod.name}
                        >
                          {prod.name}
                        </h3>
                        <a
                          href={prod.mallUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-daiso-red p-0.5 ml-1 transition-colors flex-shrink-0"
                          title="다이소몰 공식 상세페이지 열기"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {prod.description}
                      </p>

                      <div className="mt-1 flex items-center space-x-2 text-[10px] font-mono text-slate-400 flex-wrap gap-y-1">
                        <span>품번: {prod.itemCode}</span>
                        {prod.isSoldOut && (
                          <span className="bg-slate-100 text-slate-500 border border-slate-200/80 px-1 py-0.2 text-[9px] rounded font-sans font-medium">
                            일시품절
                          </span>
                        )}
                        {activeStore && storeStockMap && storeStockMap[prod.itemCode] && (
                          <span className={`px-1.5 py-0.2 text-[9px] rounded font-sans font-bold border ${
                            storeStockMap[prod.itemCode].in_stock
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {storeStockMap[prod.itemCode].in_stock
                              ? `🏬 지점 재고: ${storeStockMap[prod.itemCode].quantity}개`
                              : `🏬 지점 품절`}
                          </span>
                        )}
                      </div>

                      {prod.categoryHierarchy && (
                        <div className="mt-1">
                          <span
                            className="inline-block text-[9.5px] font-medium text-slate-600 bg-slate-100 border border-slate-200/90 px-1.5 py-0.5 rounded max-w-full truncate"
                            title={prod.categoryHierarchy}
                          >
                            🏷️ {prod.categoryHierarchy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dimensions chip & Price & Add button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {prod.dimSource === 'inferred' ? '~ ' : ''}{prod.width} × {prod.depth} × {prod.height} cm
                      </span>
                      {prod.dimSource === 'inferred' ? (
                        <span
                          className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap"
                          title="다이소몰 상세페이지에 텍스트 치수가 미기재되어 품목/용량 기반으로 추정한 규격입니다"
                        >
                          추정 규격
                        </span>
                      ) : (
                        <span
                          className="text-[9px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded whitespace-nowrap"
                          title="다이소몰 공식 상세 스펙 또는 상품명에서 확인된 정식 규격입니다"
                        >
                          공식
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-daiso-red font-mono">
                        ₩{prod.price.toLocaleString()}
                      </span>

                      <div className="flex items-center space-x-1">
                        {isTooTall && (
                          <span
                            className="text-[10px] text-slate-400 font-mono hidden sm:inline mr-0.5"
                            title={`서랍 깊이(${drawer.height}cm)보다 높은 제품입니다 (위로 돌출 배치 허용)`}
                          >
                            H={prod.height}cm
                          </span>
                        )}
                        {onFillMaxProduct && (
                          <button
                            type="button"
                            onClick={() => onFillMaxProduct(prod)}
                            className="px-1.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all active:scale-95 flex items-center space-x-0.5 shadow-2xs"
                            title="수납함 속 빈 공간에 이 물건을 최대한 채웁니다"
                          >
                            <Zap size={10} />
                            <span>최대 채우기</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onAddProduct(prod)}
                          className="flex items-center px-2 py-1 text-xs font-semibold rounded-lg bg-daiso-red hover:bg-daiso-redHover text-white shadow-2xs transition-transform active:scale-95"
                          title="서랍 또는 수납함 내부에 담기"
                        >
                          <Plus size={13} className="mr-0.5 stroke-[3]" /> 담기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleLimit < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleLimit(prev => prev + 60)}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-2xs text-center"
              >
                + 상품 더 보기 (현재 {visibleLimit}개 / 전체 {filtered.length.toLocaleString()}개)
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
