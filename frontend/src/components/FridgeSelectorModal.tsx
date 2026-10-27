import React, { useState, useMemo } from 'react';
import {
  FRIDGE_MODELS,
  FridgeModel,
  FridgeCompartment,
  FridgeDoorType,
  FridgeCapacityTier
} from '../data/fridgeModels';
import { DrawerDimension } from '../data/daisoProducts';
import {
  X,
  Sparkles,
  ChevronRight,
  Check,
  Sliders,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  Package
} from 'lucide-react';

interface FridgeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompartment: (
    compartment: FridgeCompartment,
    model: FridgeModel,
    customDim?: DrawerDimension,
    autoFitOrganizers?: boolean,
    autoFillFoods?: boolean
  ) => void;
  currentDrawer?: DrawerDimension;
}

type QuickChipType = 'all' | 'our_fridge' | 'ai_hybrid' | 'large_900' | 'kitchenfit' | 'kimchi' | 'side_by_side';
type SortOption = 'recommended' | 'capacity_desc' | 'capacity_asc' | 'name';

export const FridgeSelectorModal: React.FC<FridgeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectCompartment
}) => {
  // 1. Multi-tier filter states
  const [selectedBrand, setSelectedBrand] = useState<'전체' | '삼성전자' | 'LG전자'>('전체');
  const [selectedDoorType, setSelectedDoorType] = useState<FridgeDoorType>('전체');
  const [selectedCapacityTier, setSelectedCapacityTier] = useState<FridgeCapacityTier>('전체');
  const [activeQuickChip, setActiveQuickChip] = useState<QuickChipType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  // Selected Model (default: Samsung Bespoke AI Hybrid 901L RM70F91R1A)
  const [selectedModelId, setSelectedModelId] = useState<string>('samsung-rm70f91r1a-901l');

  // Quick chip click handler
  const handleQuickChipClick = (chip: QuickChipType) => {
    if (activeQuickChip === chip) {
      setActiveQuickChip('all');
      return;
    }
    setActiveQuickChip(chip);

    // Contextual shortcuts
    if (chip === 'our_fridge') {
      setSelectedBrand('전체');
      setSelectedDoorType('전체');
      setSelectedCapacityTier('전체');
      setSearchQuery('');
      setSelectedModelId('samsung-rm70f91r1a-901l');
    } else if (chip === 'large_900') {
      setSelectedCapacityTier('900L+ 초특대형');
    } else if (chip === 'kitchenfit') {
      setSelectedDoorType('4도어 키친핏');
    } else if (chip === 'kimchi') {
      setSelectedDoorType('김치냉장고');
    } else if (chip === 'side_by_side') {
      setSelectedDoorType('양문형');
    }
  };

  const handleResetFilters = () => {
    setSelectedBrand('전체');
    setSelectedDoorType('전체');
    setSelectedCapacityTier('전체');
    setActiveQuickChip('all');
    setSearchQuery('');
    setSortBy('recommended');
  };

  // Filter models based on brand, doorType, capacityTier, quick chips, and search
  const filteredModels = useMemo(() => {
    let list = FRIDGE_MODELS.filter(m => {
      // 1. Quick Chip Filtering
      if (activeQuickChip === 'our_fridge') {
        return m.isUserSelected || m.modelCode === 'RM70F91R1A';
      }
      if (activeQuickChip === 'ai_hybrid') {
        const isAi = m.subBrand.includes('하이브리드') ||
          (m.features && m.features.some(f => f.includes('하이브리드') || f.includes('AI')));
        if (!isAi) return false;
      }
      if (activeQuickChip === 'large_900') {
        if (m.capacityLiters < 900) return false;
      }
      if (activeQuickChip === 'kitchenfit') {
        if (m.doorType !== '4도어 키친핏' && !m.series.includes('키친핏')) return false;
      }
      if (activeQuickChip === 'kimchi') {
        if (m.doorType !== '김치냉장고') return false;
      }
      if (activeQuickChip === 'side_by_side') {
        if (m.doorType !== '양문형') return false;
      }

      // 2. Brand Filter
      if (selectedBrand !== '전체' && m.brand !== selectedBrand) return false;

      // 3. Door Type Filter
      if (selectedDoorType !== '전체' && m.doorType !== selectedDoorType) return false;

      // 4. Capacity Tier Filter
      if (selectedCapacityTier !== '전체' && m.capacityTier !== selectedCapacityTier) return false;

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inSeries = m.series.toLowerCase().includes(q);
        const inCode = m.modelCode ? m.modelCode.toLowerCase().includes(q) : false;
        const inTag = m.tag.toLowerCase().includes(q);
        const inCap = `${m.capacityLiters}l`.includes(q);
        const inSub = m.subBrand.toLowerCase().includes(q);
        const inFeat = m.features ? m.features.some(f => f.toLowerCase().includes(q)) : false;
        return inSeries || inCode || inTag || inCap || inSub || inFeat;
      }

      return true;
    });

    // Sort models
    if (sortBy === 'capacity_desc') {
      list = [...list].sort((a, b) => b.capacityLiters - a.capacityLiters);
    } else if (sortBy === 'capacity_asc') {
      list = [...list].sort((a, b) => a.capacityLiters - b.capacityLiters);
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.series.localeCompare(b.series));
    } else {
      // 'recommended': user model first, then by capacity descending
      list = [...list].sort((a, b) => {
        if (a.isUserSelected || a.modelCode === 'RM70F91R1A') return -1;
        if (b.isUserSelected || b.modelCode === 'RM70F91R1A') return 1;
        return b.capacityLiters - a.capacityLiters;
      });
    }

    return list;
  }, [selectedBrand, selectedDoorType, selectedCapacityTier, activeQuickChip, sortBy, searchQuery]);

  const selectedModel = useMemo(() => {
    return FRIDGE_MODELS.find(m => m.id === selectedModelId) || FRIDGE_MODELS[0];
  }, [selectedModelId]);

  // Selected Compartment (default: Main shelf)
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string>(() => {
    return selectedModel.compartments[0].id;
  });

  // Current compartment
  const selectedCompartment = useMemo(() => {
    return (
      selectedModel.compartments.find(c => c.id === selectedCompartmentId) ||
      selectedModel.compartments[0]
    );
  }, [selectedModel, selectedCompartmentId]);

  // Fine-tuning dimension state
  const [customWidth, setCustomWidth] = useState<number>(selectedCompartment.dimensions.width);
  const [customDepth, setCustomDepth] = useState<number>(selectedCompartment.dimensions.depth);
  const [customHeight, setCustomHeight] = useState<number>(selectedCompartment.dimensions.height);

  // Sync fine-tuning state when compartment changes
  const handleSelectCompartment = (comp: FridgeCompartment) => {
    setSelectedCompartmentId(comp.id);
    setCustomWidth(comp.dimensions.width);
    setCustomDepth(comp.dimensions.depth);
    setCustomHeight(comp.dimensions.height);
  };

  const handleModelChange = (model: FridgeModel) => {
    setSelectedModelId(model.id);
    const firstComp = model.compartments[0];
    setSelectedCompartmentId(firstComp.id);
    setCustomWidth(firstComp.dimensions.width);
    setCustomDepth(firstComp.dimensions.depth);
    setCustomHeight(firstComp.dimensions.height);
  };

  if (!isOpen) return null;

  const currentDimensions: DrawerDimension = {
    width: customWidth,
    depth: customDepth,
    height: customHeight
  };

  const hasActiveFilters =
    selectedBrand !== '전체' ||
    selectedDoorType !== '전체' ||
    selectedCapacityTier !== '전체' ||
    activeQuickChip !== 'all' ||
    searchQuery.trim() !== '' ||
    sortBy !== 'recommended';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-sky-50/90 via-white to-blue-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 text-xl font-bold">
              ❄️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">삼성 / LG 냉장고 모델 & 선반 맞춤 정리</h3>
                <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200">
                  총 {FRIDGE_MODELS.length}개 모델 정밀 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                냉장고 모델과 선반 위치를 고르면 실측 규격(cm)이 자동 적용되고, 딱 맞는 다이소 정리함 조합을 추천합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Section 1: Multi-Facet Classification & Filter Bar */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
            {/* Row A: Brand Filter + Door Type Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Brand Tabs */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center space-x-1">
                  <SlidersHorizontal size={12} />
                  <span>제조사:</span>
                </span>
                <div className="flex items-center space-x-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
                  {(['전체', '삼성전자', 'LG전자'] as const).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBrand(b)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedBrand === b
                          ? b === '삼성전자'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : b === 'LG전자'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Door Type Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-500 mr-0.5 shrink-0">도어 형태:</span>
                {(
                  [
                    '전체',
                    '4도어 프리스탠딩',
                    '4도어 키친핏',
                    '양문형',
                    '김치냉장고'
                  ] as FridgeDoorType[]
                ).map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setSelectedDoorType(dt)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                      selectedDoorType === dt
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {dt === '전체' ? '전체 형태' : dt}
                  </button>
                ))}
              </div>
            </div>

            {/* Row B: Capacity Tiers + Quick Chips */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60">
              {/* Capacity Tier Selector */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-500 mr-0.5 shrink-0">용량대:</span>
                {(
                  [
                    '전체',
                    '900L+ 초특대형',
                    '800L 대용량',
                    '600L 키친핏/슬림',
                    '500L 이하 / 김치'
                  ] as FridgeCapacityTier[]
                ).map(cap => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setSelectedCapacityTier(cap)}
                    className={`px-2 py-0.8 rounded-lg text-[11px] font-bold shrink-0 transition-all border ${
                      selectedCapacityTier === cap
                        ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                    }`}
                  >
                    {cap === '전체' ? '전체 용량' : cap}
                  </button>
                ))}
              </div>

              {/* Quick Preset Filter Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[11px] font-bold text-amber-600 mr-0.5 shrink-0">⚡ 퀵필터:</span>
                {[
                  { id: 'our_fridge', label: '⭐ 우리집 (901L)', border: 'border-amber-300 text-amber-800 bg-amber-50' },
                  { id: 'ai_hybrid', label: '⚡ AI 하이브리드', border: 'border-blue-300 text-blue-800 bg-blue-50' },
                  { id: 'large_900', label: '🧊 900L+ 초대형', border: 'border-cyan-300 text-cyan-800 bg-cyan-50' },
                  { id: 'kitchenfit', label: '📏 키친핏 (35cm)', border: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
                  { id: 'kimchi', label: '🥬 김치냉장고', border: 'border-purple-300 text-purple-800 bg-purple-50' },
                  { id: 'side_by_side', label: '🚪 양문형', border: 'border-slate-300 text-slate-800 bg-slate-50' }
                ].map(q => {
                  const isActive = activeQuickChip === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleQuickChipClick(q.id as QuickChipType)}
                      className={`px-2.5 py-0.8 rounded-lg text-[11px] font-bold shrink-0 transition-all border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : `${q.border} hover:opacity-80`
                      }`}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row C: Search Bar + Sort & Reset */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
              {/* Search Input Bar */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="모델명, 품번, 특징 검색 (예: RM70F91, 비스포크 901L, T876, RF85, 키친핏, AI...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sort Dropdown & Filter Count & Reset */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs">
                  <ArrowUpDown size={12} className="text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="recommended">⭐ 추천/인기순</option>
                    <option value="capacity_desc">용량 큰 순 (905L→)</option>
                    <option value="capacity_asc">용량 작은 순</option>
                    <option value="name">모델명 가나다순</option>
                  </select>
                </div>

                <span className="text-[11px] font-bold text-sky-800 bg-sky-100/80 px-2.5 py-1 rounded-xl border border-sky-200">
                  {filteredModels.length}개 모델
                </span>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-xl border border-rose-200 flex items-center space-x-1 transition-all"
                  >
                    <RotateCcw size={11} />
                    <span>초기화</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Model Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>1️⃣ 냉장고 모델 선택</span>
                <span className="text-slate-400 font-normal">
                  (총 {FRIDGE_MODELS.length}개 중 {filteredModels.length}개 검색됨)
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredModels.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-400 space-y-2">
                  <div className="text-2xl">🔍</div>
                  <p className="text-xs font-bold">조건에 일치하는 냉장고 모델이 없습니다.</p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-sky-600 hover:underline inline-flex items-center space-x-1"
                  >
                    <RotateCcw size={12} />
                    <span>필터 초기화하기</span>
                  </button>
                </div>
              ) : (
                filteredModels.map(model => {
                  const isSelected = model.id === selectedModel.id;
                  const isUserFridge = model.isUserSelected || model.modelCode === 'RM70F91R1A';

                  return (
                    <div
                      key={model.id}
                      onClick={() => handleModelChange(model)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/90 shadow-sm ring-2 ring-sky-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs'
                      } ${isUserFridge ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-50/30' : ''}`}
                    >
                      <div className="flex items-start space-x-2.5">
                        {/* Product Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                          {model.imageUrl ? (
                            <img
                              src={model.imageUrl}
                              alt={model.series}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-0.5"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-xl">❄️</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full truncate max-w-[140px] ${
                                isUserFridge
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                  : model.brand === '삼성전자'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {model.subBrand || model.brand}
                            </span>
                            <span className="text-[11px] font-mono font-black text-slate-800 shrink-0">
                              {model.capacityLiters}L
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1" title={model.series}>
                            {model.series}
                          </h4>

                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                            {model.modelCode && (
                              <span className="bg-slate-100 px-1 py-0.2 rounded font-bold text-slate-700">
                                {model.modelCode}
                              </span>
                            )}
                            <span className="text-slate-400">·</span>
                            <span>{model.doorType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shelf Depth and Features */}
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-600 truncate max-w-[170px]">
                          {model.shelfDepthType || `선반 ${model.compartments.length}곳`}
                        </span>
                        {isSelected ? (
                          <span className="text-sky-600 font-bold flex items-center space-x-0.5 shrink-0">
                            <Check size={12} className="stroke-[3]" />
                            <span>선택됨</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 group-hover:text-slate-600 flex items-center shrink-0">
                            <span>선택</span>
                            <ChevronRight size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 3: Compartment / Shelf Location Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>2️⃣ 정리할 선반 및 서랍 위치 선택</span>
                <span className="text-slate-400 font-normal">({selectedModel.series})</span>
              </span>
              <span className="text-[11px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                선택 즉시 실측 규격(cm)이 3D 피터에 연동됩니다
              </span>
            </div>

            {/* Compartments List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {selectedModel.compartments.map(comp => {
                const isSelected = comp.id === selectedCompartment.id;

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelectCompartment(comp)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/90 shadow-sm ring-2 ring-sky-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          {isSelected && <span className="text-sky-600 font-black">▶</span>}
                          <span>{comp.name}</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                          {comp.dimensions.width} × {comp.dimensions.depth} × {comp.dimensions.height} cm
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                        {comp.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                        {comp.recommendedKeywords.slice(0, 2).map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-white text-slate-600 px-1.5 py-0.2 rounded border border-slate-200/80 font-medium"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-1">
                        {comp.categoryLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Compartment Dimension Preview & Fine-Tuning */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/30 to-blue-50/30 border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">
                    선택된 선반: <strong className="text-sky-700">{selectedCompartment.name}</strong>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono">
                    {selectedModel.brand} {selectedModel.capacityLiters}L ({selectedModel.doorType})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  💡 {selectedCompartment.tips}
                </p>
              </div>

              {/* Fine Tuning Steppers */}
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
                <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1 mr-1">
                  <Sliders size={12} className="text-slate-400" />
                  <span>미세조절:</span>
                </span>

                {/* Width */}
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-400">W</span>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCustomWidth(prev => Math.max(10, Math.round((prev - 0.5) * 10) / 10))}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseFloat(e.target.value) || customWidth)}
                      className="w-11 text-center text-xs font-mono font-bold py-0.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomWidth(prev => Math.min(150, Math.round((prev + 0.5) * 10) / 10))}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Depth */}
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-400">D</span>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCustomDepth(prev => Math.max(10, Math.round((prev - 0.5) * 10) / 10))}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={customDepth}
                      onChange={(e) => setCustomDepth(parseFloat(e.target.value) || customDepth)}
                      className="w-11 text-center text-xs font-mono font-bold py-0.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomDepth(prev => Math.min(150, Math.round((prev + 0.5) * 10) / 10))}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Height */}
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-400">H</span>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCustomHeight(prev => Math.max(5, Math.round((prev - 0.5) * 10) / 10))}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseFloat(e.target.value) || customHeight)}
                      className="w-11 text-center text-xs font-mono font-bold py-0.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomHeight(prev => Math.min(100, Math.round((prev + 0.5) * 10) / 10))}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-xs text-slate-500 flex items-center space-x-1">
            <span>최종 적용 규격:</span>
            <strong className="text-slate-900 font-mono">
              {customWidth} × {customDepth} × {customHeight} cm
            </strong>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Action 1: Standard Start (Apply dimensions only) */}
            <button
              type="button"
              onClick={() => {
                onSelectCompartment(selectedCompartment, selectedModel, currentDimensions, false, false);
                onClose();
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all active:scale-95 shadow-2xs"
            >
              선반 크기만 적용
            </button>

            {/* Action 2: 1-Click Auto Fit Organizers Only */}
            <button
              type="button"
              onClick={() => {
                onSelectCompartment(selectedCompartment, selectedModel, currentDimensions, true, false);
                onClose();
              }}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-sky-400 hover:bg-sky-50 text-sky-700 text-xs font-bold transition-all active:scale-95 shadow-2xs flex items-center justify-center space-x-1"
            >
              <Package size={13} />
              <span>수납함만 자동 배치</span>
            </button>

            {/* Action 3: 1-Click Auto Fit Organizers + Fill Foods/Drinks */}
            <button
              type="button"
              onClick={() => {
                onSelectCompartment(selectedCompartment, selectedModel, currentDimensions, true, true);
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-sky-600/25 flex items-center justify-center space-x-1.5"
            >
              <Sparkles size={14} />
              <span>🚀 수납함 + 식음료 풀세팅</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
