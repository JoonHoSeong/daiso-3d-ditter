import React, { useState, useRef, useEffect } from 'react';
import { DrawerDimension, DRAWER_PRESETS } from '../data/daisoProducts';
import { SPACE_PRESETS, SpacePreset } from '../data/spacePresets';
import {
  RotateCcw,
  RotateCw,
  Sliders,
  RefreshCw,
  Bookmark,
  User as UserIcon,
  LogOut,
  Trash2,
  Printer,
  LayoutGrid,
  Package,
  Sparkles,
  ArrowUpToLine,
  MoreHorizontal,
  ChevronDown,
  X,
  Layers,
  Shield,
  Store
} from 'lucide-react';
import { User, SavedDrawer } from '../types/auth';
import { StoreInfo } from './StoreStockModal';

interface HeaderNavProps {
  drawer: DrawerDimension;
  onChangeDrawer: (newDimensions: DrawerDimension) => void;
  onAutoFit: () => void;
  onFillGoods?: () => void;
  onOpenAiPurposeModal?: () => void;
  hasGoodsPlaced?: boolean;
  onClearGoodsOnly?: () => void;
  allowRotation?: boolean;
  onToggleAllowRotation?: () => void;
  allowHeightExceed?: boolean;
  onToggleAllowHeightExceed?: () => void;
  onReset: () => void;
  onSyncProducts?: () => void;
  isSyncing?: boolean;
  totalProductsCount?: number;
  savedDrawers: SavedDrawer[];
  onSelectSavedDrawer: (drawer: SavedDrawer) => void;
  onDeleteSavedDrawer: (id: string) => void;
  onOpenSaveModal: () => void;
  onOpenExportModal?: () => void;
  onOpenStoreStockModal?: (defaultTab?: 'all_in_stock' | 'search') => void;
  activeStore?: StoreInfo | null;
  onlyStoreStock?: boolean;
  onToggleOnlyStoreStock?: () => void;
  user: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenAdminModal?: () => void;
  onOpenFridgeModal?: () => void;
  onOpenPurposeModal?: () => void;
  onOpenPresetModal?: () => void;
  customPresets?: SpacePreset[];
  onOpenCreateCustomPreset?: () => void;
  activePurposeName?: string | null;
  // Responsive sidebar toggles for compact viewports
  onToggleCatalog?: () => void;
  onToggleInspector?: () => void;
  isCatalogOpen?: boolean;
  isInspectorOpen?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  drawer,
  onChangeDrawer,
  onAutoFit,
  onFillGoods,
  onOpenAiPurposeModal,
  hasGoodsPlaced = false,
  onClearGoodsOnly,
  allowRotation = false,
  onToggleAllowRotation,
  allowHeightExceed = false,
  onToggleAllowHeightExceed,
  onReset,
  onSyncProducts,
  isSyncing = false,
  totalProductsCount = 27506,
  savedDrawers,
  onSelectSavedDrawer,
  onDeleteSavedDrawer,
  onOpenSaveModal,
  onOpenExportModal,
  onOpenStoreStockModal,
  activeStore = null,
  onlyStoreStock = false,
  onToggleOnlyStoreStock,
  user,
  onOpenAuthModal,
  onLogout,
  onOpenAdminModal,
  onOpenFridgeModal,
  onOpenPurposeModal,
  onOpenPresetModal,
  customPresets = [],
  onOpenCreateCustomPreset,
  activePurposeName,
  onToggleCatalog,
  onToggleInspector,
  isCatalogOpen = false,
  isInspectorOpen = false
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isDimPopoverOpen, setIsDimPopoverOpen] = useState<boolean>(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const dimPopoverRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (dimPopoverRef.current && !dimPopoverRef.current.contains(e.target as Node)) {
        setIsDimPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDim = (key: keyof DrawerDimension, delta: number) => {
    const newVal = Math.max(5, Math.min(150, Math.round((drawer[key] + delta) * 10) / 10));
    onChangeDrawer({ ...drawer, [key]: newVal });
  };

  const handleManualInput = (key: keyof DrawerDimension, valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 5 && val <= 200) {
      onChangeDrawer({ ...drawer, [key]: val });
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-1.5 sm:px-4 lg:px-5 flex items-center justify-between z-30 flex-shrink-0 relative select-none">
      {/* 1. Left: Brand & Mobile Panel Toggles */}
      <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0">
        {/* Tablet Catalog Drawer Button (>= 1024px and < 1280px) */}
        {onToggleCatalog && (
          <button
            onClick={onToggleCatalog}
            className={`hidden lg:flex xl:hidden p-1.5 sm:p-2 rounded-xl border text-xs font-bold items-center space-x-1 transition-all ${
              isCatalogOpen
                ? 'bg-daiso-red text-white border-daiso-red shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="상품 카탈로그 열기/닫기"
          >
            <Layers size={13} />
            <span className="text-[11px]">카탈로그</span>
          </button>
        )}

        {/* Logo and Brand Title */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-daiso-red flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm shrink-0">
            D
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                <span className="hidden md:inline">다이소 서랍 3D 피터</span>
                <span className="hidden sm:inline md:hidden">다이소 3D</span>
              </h1>
              <span className="hidden 2xl:inline-block text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border border-slate-200">
                Unofficial
              </span>
              <span className="hidden xl:inline-flex items-center space-x-1 text-[10px] font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                <span>✨ Personal 3D Edition</span>
              </span>
            </div>
            <p className="hidden 2xl:block text-[10px] text-slate-400">내 공간에 딱 맞는 다이소 수납 솔루션</p>
          </div>
        </div>
      </div>

      {/* 2. Center: Drawer Dimensions & Presets (Dynamic Responsive Layout) */}
      <div className="flex items-center space-x-1 sm:space-x-2 mx-0.5 sm:mx-1 shrink-0">
        {/* Desktop View (>= 1280px): Full inline steppers */}
        <div className="hidden xl:flex items-center space-x-2 xl:space-x-2.5 bg-slate-50 px-2.5 xl:px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <div className="hidden xl:flex items-center text-[11px] font-semibold text-slate-600 mr-0.5">
            <Sliders size={12} className="mr-1 text-slate-400" />
            <span>크기:</span>
          </div>

          {/* Width W */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-mono text-slate-400">W</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <button
                onClick={() => updateDim('width', -1)}
                className="hidden xl:inline-block px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[10px] font-bold"
              >
                -
              </button>
              <input
                type="number"
                value={drawer.width}
                onChange={(e) => handleManualInput('width', e.target.value)}
                className="w-10 text-center text-xs font-mono font-semibold py-0.5 focus:outline-none"
              />
              <button
                onClick={() => updateDim('width', 1)}
                className="hidden xl:inline-block px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[10px] font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Depth D */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-mono text-slate-400">D</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <button
                onClick={() => updateDim('depth', -1)}
                className="hidden xl:inline-block px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[10px] font-bold"
              >
                -
              </button>
              <input
                type="number"
                value={drawer.depth}
                onChange={(e) => handleManualInput('depth', e.target.value)}
                className="w-10 text-center text-xs font-mono font-semibold py-0.5 focus:outline-none"
              />
              <button
                onClick={() => updateDim('depth', 1)}
                className="hidden xl:inline-block px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[10px] font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Height H */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-mono text-slate-400">H</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <button
                onClick={() => updateDim('height', -0.5)}
                className="hidden xl:inline-block px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[10px] font-bold"
              >
                -
              </button>
              <input
                type="number"
                step="0.5"
                value={drawer.height}
                onChange={(e) => handleManualInput('height', e.target.value)}
                className="w-10 text-center text-xs font-mono font-semibold py-0.5 focus:outline-none"
              />
              <button
                onClick={() => updateDim('height', 0.5)}
                className="hidden xl:inline-block px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[10px] font-bold"
              >
                +
              </button>
            </div>
          </div>

            {/* Preset Selector Dropdown */}
          <div className="border-l border-slate-200 pl-2 flex items-center space-x-1">
            {/* Dedicated Refrigerator Model Selector Button */}
            {onOpenFridgeModal && (
              <button
                type="button"
                onClick={onOpenFridgeModal}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
                title="삼성 비스포크 / LG 오브제컬렉션 냉장고 모델 및 선반 위치 선택"
              >
                <span>❄️ 냉장고 모델</span>
                <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-bold">
                  RM70F91R1A (901L)
                </span>
              </button>
            )}

            {/* Dedicated Drawer & Purpose Matcher Button */}
            {onOpenPurposeModal && (
              <button
                type="button"
                onClick={onOpenPurposeModal}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                  activePurposeName
                    ? 'bg-purple-600 text-white border border-purple-700 shadow-sm ring-1 ring-purple-400'
                    : 'bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-800 border border-indigo-200'
                }`}
                title="서랍과 정리 용도를 지정하여 맞춤 제품 추천, 필터 및 3D 자동 피팅"
              >
                <span>🎯 서랍 & 용도 맞춤</span>
                {activePurposeName && (
                  <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-bold">
                    {activePurposeName}
                  </span>
                )}
              </button>
            )}

            {/* Dedicated Space Preset Explorer Modal Button */}
            {onOpenPresetModal && (
              <button
                type="button"
                onClick={onOpenPresetModal}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
                title="냉장고 모델별 맞춤 공간 프리셋 검색 및 탐색기 열기"
              >
                <span>📐 공간 프리셋</span>
                <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-bold">
                  {SPACE_PRESETS.length + customPresets.length}개
                </span>
              </button>
            )}

            {/* Custom Preset Creation Direct Button */}
            {onOpenCreateCustomPreset && (
              <button
                type="button"
                onClick={onOpenCreateCustomPreset}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-2xs active:scale-95"
                title="사람이 직접 크기(가로/세로/높이)를 정해서 내 프리셋으로 저장"
              >
                <span>➕ 직접 추가</span>
              </button>
            )}

            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('saved-')) {
                  const sId = val.replace('saved-', '');
                  const found = savedDrawers.find(sd => sd.id === sId);
                  if (found) onSelectSavedDrawer(found);
                } else if (val.startsWith('sp-')) {
                  const spId = val.replace('sp-', '');
                  const sp = customPresets.find(p => p.id === spId) || SPACE_PRESETS.find(p => p.id === spId);
                  if (sp) onChangeDrawer(sp.dimensions);
                } else if (val.startsWith('preset-')) {
                  const pName = val.replace('preset-', '');
                  const preset = DRAWER_PRESETS.find(p => p.name === pName);
                  if (preset) onChangeDrawer(preset.dimensions);
                }
                e.target.value = '';
              }}
              defaultValue=""
              className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer max-w-[110px] xl:max-w-[140px] truncate"
            >
              <option value="" disabled>📐 빠른 공간 선택...</option>

              {customPresets.length > 0 && (
                <optgroup label="⭐ 내가 직접 추가한 맞춤 프리셋">
                  {customPresets.map((cp) => (
                    <option key={cp.id} value={`sp-${cp.id}`}>
                      ⭐ {cp.name} ({cp.dimensions.width}×{cp.dimensions.depth}×{cp.dimensions.height}cm)
                    </option>
                  ))}
                </optgroup>
              )}

              {savedDrawers.length > 0 && (
                <optgroup label="💾 저장된 서랍">
                  {savedDrawers.map((sd) => (
                    <option key={sd.id} value={`saved-${sd.id}`}>
                      💾 {sd.name} ({sd.width}×{sd.depth}×{sd.height}cm)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="🌟 냉장고 메인 선반 (1/2/3단)">
                {SPACE_PRESETS.filter(p => p.zone === 'main_shelf').map((p) => (
                  <option key={p.id} value={`sp-${p.id}`}>
                    🌟 {p.name.split(' (')[0]} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🥬 신선 야채실 / 과일 서랍">
                {SPACE_PRESETS.filter(p => p.zone === 'crisper').map((p) => (
                  <option key={p.id} value={`sp-${p.id}`}>
                    🥬 {p.name.split(' (')[0]} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🚪 도어 포켓 바스켓">
                {SPACE_PRESETS.filter(p => p.zone === 'door_pocket').map((p) => (
                  <option key={p.id} value={`sp-${p.id}`}>
                    🚪 {p.name.split(' (')[0]} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🧊 냉동실 서랍/트레이">
                {SPACE_PRESETS.filter(p => p.zone === 'freezer').map((p) => (
                  <option key={p.id} value={`sp-${p.id}`}>
                    🧊 {p.name.split(' (')[0]} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🍳 주방 싱크대 & 팬트리">
                {SPACE_PRESETS.filter(p => p.category === 'kitchen').map((p) => (
                  <option key={p.id} value={`sp-${p.id}`}>
                    🍳 {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>
            </select>

            {savedDrawers.length > 0 && (
              <button
                onClick={() => {
                  const promptText = savedDrawers
                    .map((d, i) => `${i + 1}. ${d.name} (${d.width}×${d.depth}×${d.height}cm)`)
                    .join('\n');
                  const selected = prompt(`삭제할 저장 서랍의 번호를 입력하세요:\n\n${promptText}`);
                  if (selected) {
                    const num = parseInt(selected, 10);
                    if (!isNaN(num) && num >= 1 && num <= savedDrawers.length) {
                      onDeleteSavedDrawer(savedDrawers[num - 1].id);
                    }
                  }
                }}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200/80 rounded transition-colors"
                title="저장된 서랍 목록 삭제"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Compact View (< 1280px): Sleek clickable dimension badge with popup */}
        <div className="xl:hidden relative" ref={dimPopoverRef}>
          <button
            onClick={() => setIsDimPopoverOpen(!isDimPopoverOpen)}
            className="flex items-center space-x-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] sm:text-xs font-mono font-bold text-slate-800 shadow-2xs hover:bg-slate-100 transition-all active:scale-95"
            title="서랍 치수 변경 및 공간 프리셋 선택"
          >
            <span>{drawer.width}×{drawer.depth}×{drawer.height}<span className="hidden sm:inline">cm</span></span>
            <ChevronDown size={11} className={`text-slate-400 transition-transform ${isDimPopoverOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dimension Popover for Tablets / Mobile */}
          {isDimPopoverOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">서랍 치수 및 프리셋</span>
                <button
                  onClick={() => setIsDimPopoverOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Number Inputs */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">가로(W)</span>
                  <input
                    type="number"
                    value={drawer.width}
                    onChange={(e) => handleManualInput('width', e.target.value)}
                    className="w-full text-center py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">세로(D)</span>
                  <input
                    type="number"
                    value={drawer.depth}
                    onChange={(e) => handleManualInput('depth', e.target.value)}
                    className="w-full text-center py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">높이(H)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={drawer.height}
                    onChange={(e) => handleManualInput('height', e.target.value)}
                    className="w-full text-center py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Preset Selector in Popover */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">공간 프리셋 선택</label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('preset-')) {
                      const pName = val.replace('preset-', '');
                      const preset = DRAWER_PRESETS.find(p => p.name === pName);
                      if (preset) {
                        onChangeDrawer(preset.dimensions);
                        setIsDimPopoverOpen(false);
                      }
                    }
                  }}
                  defaultValue=""
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                >
                  <option value="" disabled>시중 냉장고/가구 프리셋 불러오기...</option>
                  <optgroup label="❄️ 냉장고">
                    {DRAWER_PRESETS.filter(p => p.category === '냉장고').map((p) => (
                      <option key={p.name} value={`preset-${p.name}`}>
                        ❄️ {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🥬 김치냉장고">
                    {DRAWER_PRESETS.filter(p => p.category === '김치냉장고').map((p) => (
                      <option key={p.name} value={`preset-${p.name}`}>
                        🥬 {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📐 표준 가구 서랍">
                    {DRAWER_PRESETS.filter(p => !['냉장고', '냉동고', '김치냉장고'].includes(p.category)).map((p) => (
                      <option key={p.name} value={`preset-${p.name}`}>
                        {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right: Action Buttons & Options Dropdown (Adaptive Layout) */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Step 1: Framework Container Fitting */}
        <button
          onClick={onAutoFit}
          className="flex items-center space-x-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 xl:px-3 xl:py-2 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 active:scale-97 transition-all shrink-0"
          title="1단계: 서랍 공간에 딱 맞는 수납함·트레이 골격을 먼저 배치합니다"
        >
          <LayoutGrid size={12} className="shrink-0" />
          <span className="hidden xl:inline">1단계: 수납함 틀 배치</span>
          <span className="xl:hidden">1단계</span>
        </button>

        {/* Step 2: Fill Goods (Visible on Desktop >= 1280px) */}
        {onFillGoods && (
          <button
            onClick={onFillGoods}
            className="hidden xl:flex items-center space-x-1 px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-xl text-xs font-bold text-white bg-daiso-red hover:bg-daiso-redHover shadow-sm shadow-red-500/20 active:scale-97 transition-all shrink-0"
            title="2단계: 수납함 안쪽 공간에 실제 문구, 화장품, 소품 등 일상 물건을 채워 넣습니다"
          >
            <Package size={12} className="shrink-0" />
            <span>2단계: 물건 채우기</span>
          </button>
        )}

        {/* AI Purpose Recommendation CTA (Visible on Desktop >= 1280px) */}
        {onOpenAiPurposeModal && (
          <button
            onClick={onOpenAiPurposeModal}
            className="hidden xl:flex items-center space-x-1 px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-sm shadow-indigo-500/20 active:scale-97 transition-all shrink-0"
            title="AI에게 서랍의 용도를 입력하면, 딱 맞는 서로 다른 물건들을 추천하여 채워줍니다"
          >
            <Sparkles size={12} className="shrink-0 text-amber-300" />
            <span>AI 맞춤 정리</span>
          </button>
        )}

        {/* Rotation Toggle (Visible on Desktop >= 1440px) */}
        {onToggleAllowRotation && (
          <button
            onClick={onToggleAllowRotation}
            className={`hidden 2xl:flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              allowRotation
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={allowRotation ? '회전 허용 활성화 중' : '회전 금지 (단정 정렬)'}
          >
            <RotateCw size={12} className={allowRotation ? 'text-amber-600' : 'text-slate-400'} />
            <span>{allowRotation ? '90° 회전' : '회전 없음'}</span>
          </button>
        )}

        {/* Height Exceed Toggle (Visible on Desktop >= 1440px) */}
        {onToggleAllowHeightExceed && (
          <button
            onClick={onToggleAllowHeightExceed}
            className={`hidden 2xl:flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              allowHeightExceed
                ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={allowHeightExceed ? '높이 초과 허용 중' : '높이 제한 (닫힘)'}
          >
            <ArrowUpToLine size={12} className={allowHeightExceed ? 'text-purple-600' : 'text-slate-400'} />
            <span>{allowHeightExceed ? '높이 초과' : '높이 제한'}</span>
          </button>
        )}

        {/* Quick Reset Button (Visible on Desktop >= 1200px) */}
        <button
          onClick={onReset}
          className="hidden lg:flex items-center px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          title="서랍 전체 비우기"
        >
          <RotateCcw size={12} className="mr-1 text-slate-400" />
          <span>비우기</span>
        </button>

        {/* Mobile Inspector Drawer Button (Only on Desktop 1024px-1279px, mobile uses bottom tabs) */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`hidden lg:flex xl:hidden p-2 rounded-xl border text-xs font-bold items-center space-x-1 transition-all ${
              isInspectorOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="견적 및 구매 목록 열기/닫기"
          >
            <Printer size={14} />
            <span className="text-[11px]">견적표</span>
          </button>
        )}

        {/* Admin Dashboard Button (Only visible for admin accounts) */}
        {user?.role === 'admin' && onOpenAdminModal && (
          <button
            onClick={onOpenAdminModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
            title="회원 관리 대시보드 열기"
          >
            <Shield size={13} className="text-purple-200" />
            <span className="hidden xl:inline">회원 관리</span>
          </button>
        )}

        {/* Branch / Store Selector Badge Button */}
        {onOpenStoreStockModal && (
          <button
            onClick={() => onOpenStoreStockModal('search')}
            className={`flex items-center space-x-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold border transition-all active:scale-95 shadow-2xs shrink-0 ${
              activeStore
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-emerald-500/10'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={activeStore ? `현재 기준 지점: ${activeStore.name} (클릭하여 변경)` : '다이소 지점 선택 (재고 기반 피팅)'}
          >
            <Store size={12} className={activeStore ? 'text-emerald-600' : 'text-slate-500'} />
            <span className="hidden xl:inline max-w-[85px] truncate">{activeStore ? activeStore.name : '지점 선택'}</span>
            {activeStore && (
              <span className="hidden 2xl:inline text-[9px] px-1 py-0.2 rounded bg-emerald-200/80 text-emerald-900 font-black">
                재고연동
              </span>
            )}
          </button>
        )}

        {/* Direct Auth / User Profile Button (Prominent & immediately visible) */}
        {user ? (
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : user.provider === 'kakao' ? (
              <div className="w-5 h-5 rounded-full bg-[#FEE500] text-black flex items-center justify-center text-[10px] font-black shrink-0">
                💬
              </div>
            ) : user.provider === 'google' ? (
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
                G
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-daiso-red text-white flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                {user.username ? user.username.slice(0, 1) : 'U'}
              </div>
            )}
            <span className="hidden xl:inline max-w-[80px] truncate">{user.username}님</span>
            {user.role === 'admin' && (
              <span className="hidden 2xl:inline text-[9px] px-1 py-0.2 rounded font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                Admin
              </span>
            )}
            {user.provider && user.provider !== 'local' && (
              <span className={`hidden md:inline text-[9px] px-1 py-0.2 rounded font-semibold ${
                user.provider === 'kakao' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
              }`}>
                {user.provider === 'kakao' ? '카카오' : '구글'}
              </span>
            )}
            <button
              onClick={onLogout}
              className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
              title="로그아웃"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs border border-slate-200 active:scale-95"
            title="로그인 또는 회원가입 (구글/카카오 연동 지원)"
          >
            <UserIcon size={13} className="text-slate-500" />
            <span className="hidden sm:inline">로그인 / 연동</span>
          </button>
        )}

        {/* Adaptive More Options [···] Menu Button (Guarantees zero overflow on any width!) */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all active:scale-95 shadow-2xs"
            title="추가 옵션 및 관리 메뉴 열기"
          >
            <MoreHorizontal size={16} />
          </button>

          {/* More Options Dropdown */}
          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
              {/* Mobile Actions (< sm only) */}
              <div className="sm:hidden border-b border-slate-100 pb-2 mb-1 px-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  모바일 단계 & AI
                </div>
                {onFillGoods && (
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onFillGoods();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Package size={13} className="text-daiso-red" />
                      <span>2단계: 수납함 속 물건 채우기</span>
                    </div>
                    <span className="text-[10px] bg-red-100 text-daiso-red px-1.5 py-0.2 rounded font-bold">실행</span>
                  </button>
                )}
                {onOpenAiPurposeModal && (
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenAiPurposeModal();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center space-x-2 transition-colors mt-0.5"
                  >
                    <Sparkles size={13} className="text-purple-600" />
                    <span>✨ AI 맞춤 정리 추천</span>
                  </button>
                )}
              </div>

              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                피팅 옵션 & 서랍 관리
              </div>

              {/* Rotation Option */}
              {onToggleAllowRotation && (
                <button
                  onClick={() => {
                    onToggleAllowRotation();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between text-slate-700"
                >
                  <div className="flex items-center space-x-2">
                    <RotateCw size={13} className={allowRotation ? 'text-amber-500' : 'text-slate-400'} />
                    <span>90° 회전 배치 허용</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    allowRotation ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {allowRotation ? '허용 ON' : '금지 OFF'}
                  </span>
                </button>
              )}

              {/* Height Exceed Option */}
              {onToggleAllowHeightExceed && (
                <button
                  onClick={() => {
                    onToggleAllowHeightExceed();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between text-slate-700"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowUpToLine size={13} className={allowHeightExceed ? 'text-purple-500' : 'text-slate-400'} />
                    <span>물건 높이 초과 허용</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    allowHeightExceed ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {allowHeightExceed ? '돌출 ON' : '닫힘 준수'}
                  </span>
                </button>
              )}

              {/* Only Store Stock Toggle (when activeStore is set) */}
              {activeStore && onToggleOnlyStoreStock && (
                <button
                  onClick={() => {
                    onToggleOnlyStoreStock();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between text-slate-700"
                >
                  <div className="flex items-center space-x-2 truncate pr-1">
                    <Store size={13} className={onlyStoreStock ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="truncate">[{activeStore.name}] 재고 품목만 피팅</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    onlyStoreStock ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {onlyStoreStock ? '재고 우선' : '전체 상품'}
                  </span>
                </button>
              )}

              <div className="h-[1px] bg-slate-100 my-1" />

              {/* Save Drawer */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenSaveModal();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 flex items-center space-x-2 text-slate-700"
              >
                <Bookmark size={13} className="text-amber-500" />
                <span>현재 서랍 크기 저장하기</span>
              </button>

              {/* Print & Export */}
              {onOpenExportModal && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 flex items-center space-x-2 text-slate-700"
                >
                  <Printer size={13} className="text-daiso-red" />
                  <span>매장 구매표 인쇄 / PDF 저장</span>
                </button>
              )}

              {/* Find All-in-Stock Stores */}
              {onOpenStoreStockModal && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenStoreStockModal('all_in_stock');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-emerald-50 text-emerald-800 flex items-center space-x-2"
                >
                  <Sparkles size={13} className="text-amber-500" />
                  <span>🌟 내가 구성한 제품 다 있는 매장 찾기</span>
                </button>
              )}

              {/* Check Store Stock & Set Active Branch */}
              {onOpenStoreStockModal && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenStoreStockModal('search');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-emerald-50 text-emerald-800 flex items-center space-x-2"
                >
                  <Store size={13} className="text-emerald-600" />
                  <span>🏬 매장 검색 & 기준 지점 설정</span>
                </button>
              )}

              {/* Product Sync */}
              {onSyncProducts && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onSyncProducts();
                  }}
                  disabled={isSyncing}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 flex items-center space-x-2 text-slate-700"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin text-daiso-red' : 'text-slate-400'} />
                  <span>다이소 최신 상품 갱신 ({totalProductsCount}개)</span>
                </button>
              )}

              <div className="h-[1px] bg-slate-100 my-1" />

              {/* Clear Goods Only */}
              {hasGoodsPlaced && onClearGoodsOnly && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onClearGoodsOnly();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-rose-50 text-rose-600 flex items-center space-x-2"
                >
                  <Trash2 size={13} />
                  <span>수납함 속 물건만 비우기</span>
                </button>
              )}

              {/* Full Reset */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onReset();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-rose-50 text-rose-600 flex items-center space-x-2"
              >
                <RotateCcw size={13} />
                <span>서랍 전체 비우기</span>
              </button>

              {/* Admin Dashboard in Menu */}
              {user?.role === 'admin' && onOpenAdminModal && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenAdminModal();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-purple-50 text-purple-700 flex items-center space-x-2 border-t border-purple-100 bg-purple-50/40"
                >
                  <Shield size={13} className="text-purple-600" />
                  <span>회원 관리 대시보드 (Admin)</span>
                </button>
              )}

              <div className="h-[1px] bg-slate-100 my-1" />

              {/* User Account / Auth */}
              {user ? (
                <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between rounded-b-xl">
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800 block truncate">{user.username}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">저장 {savedDrawers.length}개</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onLogout();
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                    title="로그아웃"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <UserIcon size={14} className="text-slate-500" />
                  <span>로그인 / 회원가입</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
