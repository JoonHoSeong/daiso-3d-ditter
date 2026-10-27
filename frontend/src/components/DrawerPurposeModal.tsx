import React, { useState, useMemo } from 'react';
import { DrawerDimension, DaisoProduct, FittedItem } from '../data/daisoProducts';
import {
  PURPOSE_PRESETS,
  SPACE_PRESET_OPTIONS,
  PurposePreset,
  SpacePresetOption
} from '../data/purposePresets';
import {
  X,
  Sparkles,
  Search,
  Check,
  Package,
  Sliders,
  Filter
} from 'lucide-react';
import { fitContainersOnly, fillCategoryGoodsIntoContainers } from '../utils/fitterAlgorithm';
import { isDrawerOrganizer } from '../utils/stacking';

interface DrawerPurposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDrawer: DrawerDimension;
  products: DaisoProduct[];
  onApplyPurposeAndDrawer: (
    newDrawer: DrawerDimension,
    purpose: PurposePreset,
    fittedItems: FittedItem[]
  ) => void;
  onFilterCatalogOnly: (newDrawer: DrawerDimension, purpose: PurposePreset) => void;
}

export const DrawerPurposeModal: React.FC<DrawerPurposeModalProps> = ({
  isOpen,
  onClose,
  currentDrawer,
  products,
  onApplyPurposeAndDrawer,
  onFilterCatalogOnly
}) => {
  // 1. Selected space / drawer preset (defaults to 'current')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('current');
  const [customWidth, setCustomWidth] = useState<number>(currentDrawer.width);
  const [customDepth, setCustomDepth] = useState<number>(currentDrawer.depth);
  const [customHeight, setCustomHeight] = useState<number>(currentDrawer.height);

  // 2. Selected purpose preset (defaults to 'desk_stationery')
  const [selectedPurposeId, setSelectedPurposeId] = useState<string>('desk_stationery');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');

  // Sync custom dimensions when selecting space preset
  const handleSelectSpace = (space: SpacePresetOption | 'current') => {
    if (space === 'current') {
      setSelectedSpaceId('current');
      setCustomWidth(currentDrawer.width);
      setCustomDepth(currentDrawer.depth);
      setCustomHeight(currentDrawer.height);
    } else {
      setSelectedSpaceId(space.id);
      setCustomWidth(space.dimensions.width);
      setCustomDepth(space.dimensions.depth);
      setCustomHeight(space.dimensions.height);

      // Auto-suggest 1st popular purpose for this space if current purpose not matching
      if (space.popularPurposes.length > 0 && !space.popularPurposes.includes(selectedPurposeId)) {
        setSelectedPurposeId(space.popularPurposes[0]);
      }
    }
  };

  const selectedPurpose = useMemo(() => {
    return PURPOSE_PRESETS.find(p => p.id === selectedPurposeId) || PURPOSE_PRESETS[0];
  }, [selectedPurposeId]);

  const activeDimensions: DrawerDimension = {
    width: customWidth,
    depth: customDepth,
    height: customHeight
  };

  // Filter products matching this purpose and drawer height
  const matchingProducts = useMemo(() => {
    const kwRegex = new RegExp(
      customSearchQuery.trim()
        ? customSearchQuery.trim()
        : [...selectedPurpose.keywords, ...selectedPurpose.organizerKeywords].join('|'),
      'i'
    );

    return products.filter(p => {
      // 1. Must fit in the drawer height
      if (p.height > activeDimensions.height) return false;

      // 2. Category restriction if preset defines allowedCategories
      if (selectedPurpose.allowedCategories && selectedPurpose.allowedCategories.length > 0) {
        if (!selectedPurpose.allowedCategories.includes(p.category)) {
          return false;
        }
      }

      // 3. Excluded keywords check (e.g. cleansing oil/body oil in kitchen, engine oil, etc.)
      if (selectedPurpose.excludedKeywords && selectedPurpose.excludedKeywords.length > 0) {
        const textLower = `${p.name} ${p.categoryLabel}`.toLowerCase();
        if (selectedPurpose.excludedKeywords.some(ex => textLower.includes(ex.toLowerCase()))) {
          return false;
        }
      }

      // 4. Must match purpose keywords
      const matchName = kwRegex.test(p.name);
      const matchCat = p.category.toLowerCase().includes(selectedPurpose.shortLabel);
      return matchName || matchCat;
    });
  }, [products, selectedPurpose, customSearchQuery, activeDimensions.height]);

  // Separate matching into organizers vs contents
  const matchingOrganizers = useMemo(() => {
    return matchingProducts.filter(isDrawerOrganizer);
  }, [matchingProducts]);

  const matchingGoods = useMemo(() => {
    return matchingProducts.filter(p => !isDrawerOrganizer(p));
  }, [matchingProducts]);

  // Calculate 1-Click Auto Fit Recommendation Bundle
  const handleApplyAutoFit = (includeGoods: boolean = true) => {
    // 1. Fit containers that match purpose keywords and fit current drawer height
    const candidates = matchingOrganizers.length > 0 ? matchingOrganizers : products.filter(isDrawerOrganizer);

    const fittedContainers = fitContainersOnly(activeDimensions, candidates, { allowRotation: false });

    let finalItems = fittedContainers;
    if (includeGoods && fittedContainers.length > 0) {
      // 2. Fill diverse matching goods inside the containers
      const goodsCandidates = matchingGoods.length > 0 ? matchingGoods : products;
      const fillRes = fillCategoryGoodsIntoContainers(
        activeDimensions,
        fittedContainers,
        'all',
        goodsCandidates,
        { allowRotation: true, allowHeightExceed: false, postureMode: 'standing' }
      );
      if (fillRes.countPlaced > 0) {
        finalItems = fillRes.updatedItems;
      }
    }

    onApplyPurposeAndDrawer(activeDimensions, selectedPurpose, finalItems);
    onClose();
  };

  const handleApplyFilterCatalogOnly = () => {
    onFilterCatalogOnly(activeDimensions, selectedPurpose);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 text-xl font-bold">
              🎯
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">서랍 & 용도 맞춤 제품 추천 큐레이터</h3>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  스마트 필터 & 피팅 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                정리할 공간(서랍)과 보관 목적(용도)을 지정하면, 딱 맞는 다이소 수납함만 필터링하고 최적 조합을 자동 배치합니다.
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
          {/* STEP 1: 서랍(공간) 지정 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <span>1️⃣ 정리할 서랍(공간) 선택</span>
                <span className="text-slate-400 font-normal">
                  (현재 규격: {activeDimensions.width} × {activeDimensions.depth} × {activeDimensions.height} cm)
                </span>
              </span>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                높이 {activeDimensions.height}cm 이하 상품만 필터링됩니다
              </span>
            </div>

            {/* Space Preset Cards Carousel/Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {/* Option A: Current Drawer */}
              <div
                onClick={() => handleSelectSpace('current')}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedSpaceId === 'current'
                    ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg">📐</span>
                    {selectedSpaceId === 'current' && (
                      <span className="text-indigo-600 font-bold text-xs">
                        <Check size={13} className="stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">현재 서랍 유지</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {currentDrawer.width}×{currentDrawer.depth}×{currentDrawer.height}cm
                  </p>
                </div>
              </div>

              {/* Preset spaces */}
              {SPACE_PRESET_OPTIONS.map(space => {
                const isSelected = selectedSpaceId === space.id;
                return (
                  <div
                    key={space.id}
                    onClick={() => handleSelectSpace(space)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{space.icon}</span>
                        {isSelected && (
                          <span className="text-indigo-600 font-bold text-xs">
                            <Check size={13} className="stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 truncate" title={space.name}>
                        {space.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {space.dimensions.width}×{space.dimensions.depth}×{space.dimensions.height}cm
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Steppers for fine-tuning */}
            <div className="mt-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <Sliders size={12} className="text-slate-400" />
                <span>서랍 크기 미세조절:</span>
              </span>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-400">W</span>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseFloat(e.target.value) || customWidth)}
                    className="w-12 text-center text-xs font-mono font-bold bg-white border border-slate-200 rounded px-1 py-0.5 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">cm</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-400">D</span>
                  <input
                    type="number"
                    value={customDepth}
                    onChange={(e) => setCustomDepth(parseFloat(e.target.value) || customDepth)}
                    className="w-12 text-center text-xs font-mono font-bold bg-white border border-slate-200 rounded px-1 py-0.5 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">cm</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-400">H</span>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseFloat(e.target.value) || customHeight)}
                    className="w-12 text-center text-xs font-mono font-bold bg-white border border-slate-200 rounded px-1 py-0.5 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: 보관할 용도(목적) 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <span>2️⃣ 보관할 용도(목적) 지정</span>
              </span>
              {/* Optional Custom Search */}
              <div className="relative w-48 sm:w-64">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="원하는 용도 직접 검색 (예: 안경, 영양제)..."
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-6 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                {customSearchQuery && (
                  <button
                    onClick={() => setCustomSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Purpose Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PURPOSE_PRESETS.map(purpose => {
                const isSelected = selectedPurposeId === purpose.id && !customSearchQuery;

                return (
                  <div
                    key={purpose.id}
                    onClick={() => {
                      setSelectedPurposeId(purpose.id);
                      setCustomSearchQuery('');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{purpose.icon}</span>
                        {isSelected && (
                          <span className="text-indigo-600 font-bold text-xs">
                            <Check size={14} className="stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">
                        {purpose.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                        {purpose.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>추천 키워드</span>
                      <span className="text-indigo-600 font-bold">#{purpose.shortLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: 맞춤 추천 제품 및 3D 조합 미리보기 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/30 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <span>3️⃣ 맞춤 추천 결과 미리보기</span>
                  <span className="text-indigo-700 bg-indigo-100/80 px-2 py-0.2 rounded-full text-[11px] font-bold border border-indigo-200">
                    수납함 {matchingOrganizers.length}종 · 소품 {matchingGoods.length}종 일치
                  </span>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                선택 서랍: <strong>{activeDimensions.width}×{activeDimensions.depth}×{activeDimensions.height}cm</strong>
              </span>
            </div>

            {/* Recommended Combo Bundle Preview Card */}
            {selectedPurpose.recommendedBundles.length > 0 && (
              <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm">✨</span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedPurpose.recommendedBundles[0].bundleName}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                      추천 1순위 조합
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {selectedPurpose.recommendedBundles[0].description}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  {selectedPurpose.recommendedBundles[0].organizerNames.map((name, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.8 rounded-lg border border-slate-200 flex items-center space-x-1"
                    >
                      <Package size={11} className="text-indigo-600" />
                      <span>{name}</span>
                    </span>
                  ))}
                  <span className="text-[11px] text-slate-500 font-medium">
                    + {selectedPurpose.name} 전용 소품 함께 채움
                  </span>
                </div>
              </div>
            )}

            {/* Matching Products Thumbnail Gallery */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                <span>이 서랍과 용도에 딱 맞는 다이소 추천 수납함 (상위 {Math.min(matchingOrganizers.length, 6)}개)</span>
                <span className="text-slate-400 font-normal">
                  (높이 ≤ {activeDimensions.height}cm 자동 검증 완료)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {matchingOrganizers.slice(0, 6).map(prod => (
                  <div
                    key={prod.id}
                    className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="aspect-square rounded-lg bg-slate-50 overflow-hidden mb-1 flex items-center justify-center">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-lg">📦</span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-900 truncate" title={prod.name}>
                        {prod.name}
                      </h5>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>{prod.width}×{prod.depth}×{prod.height}cm</span>
                        <span className="text-indigo-600 font-bold">₩{prod.price?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <span>지정 서랍:</span>
            <strong className="text-slate-900 font-mono">
              {activeDimensions.width} × {activeDimensions.depth} × {activeDimensions.height} cm
            </strong>
            <span className="text-slate-300">|</span>
            <span>지정 용도:</span>
            <strong className="text-indigo-700 font-bold">
              {selectedPurpose.name}
            </strong>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Action 1: Filter Catalog Only */}
            <button
              type="button"
              onClick={handleApplyFilterCatalogOnly}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all active:scale-95 shadow-2xs flex items-center justify-center space-x-1"
            >
              <Filter size={13} />
              <span>카탈로그만 맞춤 필터</span>
            </button>

            {/* Action 2: 1-Click Auto Fit 3D Layout */}
            <button
              type="button"
              onClick={() => handleApplyAutoFit(true)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-1.5"
            >
              <Sparkles size={14} />
              <span>🚀 3D 수납함 + 소품 자동 맞춤 배치</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
