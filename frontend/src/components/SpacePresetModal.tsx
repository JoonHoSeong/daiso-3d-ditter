import React, { useState, useMemo } from 'react';
import {
  SPACE_PRESETS,
  SPACE_CATEGORIES,
  ZONE_FILTERS,
  SpacePreset,
  SpaceCategory,
  CompartmentZone
} from '../data/spacePresets';
import { DrawerDimension } from '../data/daisoProducts';
import {
  X,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronRight,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SpacePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: SpacePreset, customDim?: DrawerDimension) => void;
  currentDrawer?: DrawerDimension;
}

export const SpacePresetModal: React.FC<SpacePresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<SpaceCategory>('all');
  const [selectedZone, setSelectedZone] = useState<CompartmentZone>('all');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fridge-rm70f91r1a-main-1');

  // Fine-tuning state for currently previewed preset
  const selectedPreset = useMemo(() => {
    return SPACE_PRESETS.find(p => p.id === selectedPresetId) || SPACE_PRESETS[0];
  }, [selectedPresetId]);

  const [customWidth, setCustomWidth] = useState<number>(selectedPreset.dimensions.width);
  const [customDepth, setCustomDepth] = useState<number>(selectedPreset.dimensions.depth);
  const [customHeight, setCustomHeight] = useState<number>(selectedPreset.dimensions.height);

  const handlePickPreset = (preset: SpacePreset) => {
    setSelectedPresetId(preset.id);
    setCustomWidth(preset.dimensions.width);
    setCustomDepth(preset.dimensions.depth);
    setCustomHeight(preset.dimensions.height);
  };

  const handleApply = (preset: SpacePreset) => {
    const finalDim: DrawerDimension = {
      width: customWidth,
      depth: customDepth,
      height: customHeight
    };
    onSelectPreset(preset, finalDim);
    onClose();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedZone('all');
  };

  // Filter presets
  const filteredPresets = useMemo(() => {
    return SPACE_PRESETS.filter(p => {
      // 1. Category Filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // 2. Zone Filter
      if (selectedZone !== 'all' && p.zone !== selectedZone) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const target = `${p.name} ${p.brand || ''} ${p.modelCode || ''} ${p.series || ''} ${p.description} ${p.tips} ${p.recommendedKeywords.join(' ')}`.toLowerCase();
        if (!target.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, selectedZone, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 text-xl font-bold">
              📐
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">맞춤 공간 프리셋 탐색기</h3>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  총 {SPACE_PRESETS.length}개 현실 규격 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                냉장고 메인 선반, 야채실 서랍, 싱크대, 책상, 화장대 등 정리할 가구와 공간을 검색하고 1클릭으로 적용하세요.
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
          {/* Section 1: Search & Multi-tier Filters */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
            {/* Search Input Bar with Clear Button */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="공간명, 모델명, 브랜드 검색 (예: 냉장고 메인, RM70, 헬메르, 싱크대, 화장대, 토르)..."
                className="w-full pl-9 pr-9 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Keyword Shortcuts */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              <span className="text-[10px] text-slate-500 font-bold shrink-0">추천 검색:</span>
              {[
                { label: '⭐ RM70F91R1A 901L (내 냉장고)', query: 'RM70F91R1A' },
                { label: '❄️ 냉장실 메인 선반', query: '메인 선반' },
                { label: '🥬 신선 야채실', query: '야채실' },
                { label: '🍳 싱크대 수저/조리도구', query: '싱크대' },
                { label: '🖥️ 이케아 알렉스/헬메르', query: '이케아' },
                { label: '💄 화장대 서랍', query: '화장대' },
                { label: '🏕️ 토르 캠핑박스', query: '토르' },
              ].map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setSearchQuery(chip.query)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap border text-[10px] font-medium transition-all ${
                    searchQuery === chip.query
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Row 1: Space Categories (1차 공간 대분류) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 flex items-center space-x-1">
                <Layers size={12} />
                <span>공간 유형:</span>
              </span>
              {SPACE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center space-x-1 ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Row 2: Compartment Zone Filters (2차 선반 vs 서랍 vs 도어 vs 하부장) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 flex items-center space-x-1">
                <SlidersHorizontal size={12} />
                <span>구역 필터:</span>
              </span>
              {ZONE_FILTERS.map(zone => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZone(zone.id)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold shrink-0 transition-all border flex items-center space-x-1 ${
                    selectedZone === zone.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{zone.icon}</span>
                  <span>{zone.label}</span>
                </button>
              ))}

              {(searchQuery || selectedCategory !== 'all' || selectedZone !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="ml-auto text-[10px] font-bold text-slate-500 hover:text-rose-600 flex items-center space-x-0.5 shrink-0 px-1.5 py-0.5"
                >
                  <RotateCcw size={10} />
                  <span>필터 초기화</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Preset Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>공간 프리셋 선택</span>
                <span className="text-slate-400 font-normal">
                  (총 {SPACE_PRESETS.length}개 중 {filteredPresets.length}개 표시됨)
                </span>
              </span>
              <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                원하는 카드를 클릭하면 하단에서 정밀 조절 및 적용할 수 있습니다
              </span>
            </div>

            {filteredPresets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="text-3xl">🔍</div>
                <p className="text-xs font-bold text-slate-600">조건에 일치하는 공간 프리셋이 없습니다.</p>
                <p className="text-[11px] text-slate-400">다른 검색어를 입력하시거나 필터를 초기화해 보세요.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center space-x-1 mt-1"
                >
                  <RotateCcw size={12} />
                  <span>필터 전체 초기화</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredPresets.map(preset => {
                  const isSelected = preset.id === selectedPreset.id;
                  const isUserFridge = preset.isUserSelected;
                  const isMainShelf = preset.zone === 'main_shelf';

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handlePickPreset(preset)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 shadow-md ring-2 ring-indigo-500/30'
                          : isUserFridge
                          ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Top Meta Row */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center space-x-1 flex-wrap gap-y-0.5">
                            <span className="text-base shrink-0">{preset.icon}</span>
                            {isUserFridge && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded font-mono">
                                ⭐ 내 냉장고
                              </span>
                            )}
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                                isMainShelf
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200 font-black'
                                  : preset.zone === 'drawer'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : preset.zone === 'door_pocket'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {preset.zoneLabel}
                            </span>
                            {preset.brand && (
                              <span className="text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-medium border border-slate-200">
                                {preset.brand}
                              </span>
                            )}
                          </div>

                          {/* Dimensions Badge */}
                          <span className="text-xs font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                            {preset.dimensions.width}×{preset.dimensions.depth}×{preset.dimensions.height} cm
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug" title={preset.name}>
                          {preset.name}
                        </h4>

                        {/* Description */}
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      {/* Bottom Tags and Select Trigger */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-1 overflow-hidden">
                          {preset.recommendedKeywords.slice(0, 3).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[9.5px] bg-white text-slate-500 px-1.5 py-0.2 rounded border border-slate-200/80 truncate"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>

                        {isSelected ? (
                          <span className="text-indigo-600 font-bold text-[11px] flex items-center space-x-0.5 shrink-0 ml-1">
                            <Check size={13} className="stroke-[3]" />
                            <span>선택됨</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 group-hover:text-indigo-600 font-medium text-[11px] flex items-center space-x-0.5 shrink-0 ml-1 transition-colors">
                            <span>선택</span>
                            <ChevronRight size={13} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Fine-Tuning Preview & Direct Apply Action */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/30 border border-slate-200 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-base">{selectedPreset.icon}</span>
                  <span className="text-xs font-bold text-slate-900">
                    선택된 공간: <strong className="text-indigo-700">{selectedPreset.name}</strong>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono font-bold">
                    {selectedPreset.categoryLabel} · {selectedPreset.zoneLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  💡 {selectedPreset.tips}
                </p>
              </div>

              {/* Steppers & Apply Button */}
              <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
                {/* Steppers */}
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1 mr-1">
                    <Sliders size={12} className="text-slate-400" />
                    <span>규격(cm):</span>
                  </span>

                  {/* W */}
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400 font-mono">가로</span>
                    <input
                      type="number"
                      step={0.5}
                      value={customWidth}
                      onChange={e => setCustomWidth(Math.max(10, Math.min(200, Number(e.target.value))))}
                      className="w-12 text-center text-xs font-mono font-bold bg-slate-50 rounded border border-slate-200 focus:outline-none focus:border-indigo-500 py-0.5"
                    />
                  </div>

                  <span className="text-slate-300">×</span>

                  {/* D */}
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400 font-mono">세로</span>
                    <input
                      type="number"
                      step={0.5}
                      value={customDepth}
                      onChange={e => setCustomDepth(Math.max(10, Math.min(200, Number(e.target.value))))}
                      className="w-12 text-center text-xs font-mono font-bold bg-slate-50 rounded border border-slate-200 focus:outline-none focus:border-indigo-500 py-0.5"
                    />
                  </div>

                  <span className="text-slate-300">×</span>

                  {/* H */}
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400 font-mono">높이</span>
                    <input
                      type="number"
                      step={0.5}
                      value={customHeight}
                      onChange={e => setCustomHeight(Math.max(3, Math.min(100, Number(e.target.value))))}
                      className="w-12 text-center text-xs font-mono font-bold bg-slate-50 rounded border border-slate-200 focus:outline-none focus:border-indigo-500 py-0.5"
                    />
                  </div>
                </div>

                {/* Direct Apply Button */}
                <button
                  type="button"
                  onClick={() => handleApply(selectedPreset)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all active:scale-95 shrink-0"
                >
                  <span>이 공간으로 3D 피팅 적용</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
