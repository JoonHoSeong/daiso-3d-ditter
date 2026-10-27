import React, { useState, useRef, useEffect } from 'react';
import { DrawerDimension, DRAWER_PRESETS } from '../data/daisoProducts';
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
  Layers
} from 'lucide-react';
import { User, SavedDrawer } from '../types/auth';

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
  user: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenFridgeModal?: () => void;
  onOpenPurposeModal?: () => void;
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
  user,
  onOpenAuthModal,
  onLogout,
  onOpenFridgeModal,
  onOpenPurposeModal,
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
        {/* Mobile Catalog Drawer Button (< 1280px) */}
        {onToggleCatalog && (
          <button
            onClick={onToggleCatalog}
            className={`xl:hidden p-1.5 sm:p-2 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-all ${
              isCatalogOpen
                ? 'bg-daiso-red text-white border-daiso-red shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="상품 카탈로그 열기/닫기"
          >
            <Layers size={13} />
            <span className="hidden md:inline text-[11px]">카탈로그</span>
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
              <span className="hidden lg:inline-block text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border border-slate-200">
                Unofficial
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 text-white px-2 py-0.5 rounded-full shadow-xs">
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

            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('saved-')) {
                  const sId = val.replace('saved-', '');
                  const found = savedDrawers.find(sd => sd.id === sId);
                  if (found) onSelectSavedDrawer(found);
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
              <option value="" disabled>📐 공간 프리셋...</option>

              {savedDrawers.length > 0 && (
                <optgroup label="⭐ 내 저장된 서랍">
                  {savedDrawers.map((sd) => (
                    <option key={sd.id} value={`saved-${sd.id}`}>
                      ⭐ {sd.name} ({sd.width}×{sd.depth}×{sd.height}cm)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="⭐ 삼성 비스포크 901L 초특대형 플래그십">
                {DRAWER_PRESETS.filter(p => p.category === '삼성 비스포크 901L').map((p) => (
                  <option key={p.name} value={`preset-${p.name}`}>
                    ⭐ {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="❄️ 냉장고 (시중 4도어/양문형/원룸 규격)">
                {DRAWER_PRESETS.filter(p => p.category === '냉장고').map((p) => (
                  <option key={p.name} value={`preset-${p.name}`}>
                    ❄️ {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🧊 냉동고 (슬라이딩 서랍/급속냉동칸 규격)">
                {DRAWER_PRESETS.filter(p => p.category === '냉동고').map((p) => (
                  <option key={p.name} value={`preset-${p.name}`}>
                    🧊 {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🥬 김치냉장고 (딤채/비스포크/오브제컬렉션)">
                {DRAWER_PRESETS.filter(p => p.category === '김치냉장고').map((p) => (
                  <option key={p.name} value={`preset-${p.name}`}>
                    🥬 {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
                  </option>
                ))}
              </optgroup>

              <optgroup label="📐 표준 가구 & 데스크 서랍">
                {DRAWER_PRESETS.filter(p => !['냉장고', '냉동고', '김치냉장고'].includes(p.category)).map((p) => (
                  <option key={p.name} value={`preset-${p.name}`}>
                    {p.name} ({p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height}cm)
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
          <span className="hidden sm:inline xl:hidden">1단계: 틀</span>
          <span className="sm:hidden">1단계</span>
        </button>

        {/* Step 2: Fill Goods */}
        {onFillGoods && (
          <button
            onClick={onFillGoods}
            className="flex items-center space-x-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 xl:px-3 xl:py-2 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-daiso-red hover:bg-daiso-redHover shadow-sm shadow-red-500/20 active:scale-97 transition-all shrink-0"
            title="2단계: 수납함 안쪽 공간에 실제 문구, 화장품, 소품 등 일상 물건을 채워 넣습니다"
          >
            <Package size={12} className="shrink-0" />
            <span className="hidden xl:inline">2단계: 물건 채우기</span>
            <span className="hidden sm:inline xl:hidden">2단계: 채우기</span>
            <span className="sm:hidden">2단계</span>
          </button>
        )}

        {/* AI Purpose Recommendation CTA */}
        {onOpenAiPurposeModal && (
          <button
            onClick={onOpenAiPurposeModal}
            className="flex items-center space-x-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 xl:px-3 xl:py-2 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-sm shadow-indigo-500/20 active:scale-97 transition-all shrink-0"
            title="AI에게 서랍의 용도를 입력하면, 딱 맞는 서로 다른 물건들을 추천하여 채워줍니다"
          >
            <Sparkles size={12} className="shrink-0 text-amber-300" />
            <span className="hidden md:inline">AI 맞춤 정리</span>
            <span className="md:hidden">AI</span>
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

        {/* Mobile Inspector Drawer Button (< 1280px) */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`xl:hidden p-2 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-all ${
              isInspectorOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="견적 및 구매 목록 열기/닫기"
          >
            <Printer size={14} />
            <span className="hidden md:inline text-[11px]">견적표</span>
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
            <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
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
