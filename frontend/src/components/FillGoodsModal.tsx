import React, { useState, useMemo } from 'react';
import { DaisoProduct } from '../data/daisoProducts';
import {
  X,
  Sparkles,
  Search,
  Package,
  Pencil,
  Sparkle,
  Smile,
  Zap,
  Coffee
} from 'lucide-react';

interface FillGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: DaisoProduct[];
  onFillCategory: (category: string) => void;
  onFillSpecificProduct: (product: DaisoProduct) => void;
  onOpenAiPurposeModal?: () => void;
  allowHeightExceed?: boolean;
  onToggleAllowHeightExceed?: () => void;
  postureMode?: 'auto' | 'standing' | 'flat';
  onChangePostureMode?: (mode: 'auto' | 'standing' | 'flat') => void;
}

export const FillGoodsModal: React.FC<FillGoodsModalProps> = ({
  isOpen,
  onClose,
  products,
  onFillCategory,
  onFillSpecificProduct,
  onOpenAiPurposeModal,
  allowHeightExceed = false,
  onToggleAllowHeightExceed,
  postureMode = 'auto',
  onChangePostureMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('stationery');

  const categories = [
    { id: 'stationery', label: '문구 / 데스크', icon: Pencil, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'beauty', label: '화장품 / 뷰티', icon: Sparkle, color: 'text-pink-600 bg-pink-50 border-pink-200' },
    { id: 'bath_body', label: '욕실 / 세면', icon: Smile, color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { id: 'digital_tools', label: '디지털 / 공구', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'kitchen_food', label: '주방 / 식품', icon: Coffee, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'all', label: '전체 혼합 채우기', icon: Sparkles, color: 'text-purple-600 bg-purple-50 border-purple-200' }
  ];

  // Filter goods for search or category
  const filteredGoods = useMemo(() => {
    return products.filter(p => {
      // Exclude large furniture or containers or mats
      const name = p.name;
      if (/정리함|수납함|트레이|바구니|수납박스|서랍|오거나이저|깔개|매트/.test(name)) return false;
      const minDim = Math.min(p.width, p.depth, p.height);
      const maxDim = Math.max(p.width, p.depth, p.height);
      if (minDim > 18 || maxDim > 36 || minDim < 0.5) return false;
      if (/세제|락스|살충제|방향제|탈취|쓰레기|변기/.test(name)) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return name.toLowerCase().includes(term) || p.itemCode.includes(term);
      }

      if (selectedCategory !== 'all') {
        return p.category === selectedCategory;
      }

      return ['stationery', 'beauty', 'bath_body', 'digital_tools', 'kitchen_food'].includes(p.category);
    }).slice(0, 12);
  }, [products, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-daiso-red text-white flex items-center justify-center shadow-xs">
              <Package size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">수납함 속 채울 물건 선택</h3>
              <p className="text-[11px] text-slate-500">원하는 물건이나 테마를 고르면 수납함 빈 공간에 최대한 채웁니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* AI Purpose Recommendation CTA Banner */}
          {onOpenAiPurposeModal && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-indigo-200/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    서랍 용도에 맞게 AI가 다 다른 물건을 추천해드릴까요?
                  </div>
                  <div className="text-[10px] text-slate-500">
                    원하는 용도를 입력하면 AI가 꼭 필요한 소품들만 선별하여 골고루 채워드립니다.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiPurposeModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 ml-2 shadow-sm transition-all active:scale-95"
              >
                AI 맞춤 추천
              </button>
            </div>
          )}

          {/* Height Exceed & 3D Posture Mode Options */}
          <div className="space-y-2">
            {onToggleAllowHeightExceed && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowHeightExceed}
                    onChange={onToggleAllowHeightExceed}
                    className="w-4 h-4 text-daiso-red rounded border-slate-300 focus:ring-daiso-red cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">채울 때 높이 초과 허용 (키 큰 소품도 채우기)</span>
                </label>
                <span className="text-[11px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {allowHeightExceed ? '🚀 돌출 허용' : '🔒 서랍 닫힘 높이 준수'}
                </span>
              </div>
            )}

            {onChangePostureMode && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
                <span className="font-bold text-slate-800 pl-1">📐 3D 보관 방향 (세우기 / 눕히기)</span>
                <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-xl">
                  {(
                    [
                      { id: 'auto', label: '✨ 자동 맞춤' },
                      { id: 'standing', label: '↕️ 세워서 보관' },
                      { id: 'flat', label: '↔️ 눕혀서 보관' }
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangePostureMode(opt.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        postureMode === opt.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 1. Theme Quick Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ✨ 테마별로 골라 채우기
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id && !searchTerm;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory(cat.id);
                      onFillCategory(cat.id);
                      onClose();
                    }}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all active:scale-97 ${
                      isSelected
                        ? 'border-daiso-red bg-rose-50/70 text-daiso-red shadow-xs ring-1 ring-daiso-red/30'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${cat.color}`}>
                      <Icon size={14} />
                    </div>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Direct Search or Single Product Pack */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                🔍 특정 상품 골라서 가득 채우기
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                검색 또는 목록에서 선택
              </span>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="치약, 볼펜, 메모지, 립스틱, 선크림 등..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-daiso-red/20 focus:border-daiso-red"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {filteredGoods.map(prod => (
                <div
                  key={prod.id}
                  className="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 hover:border-daiso-red/60 hover:bg-rose-50/30 transition-all bg-white shadow-2xs group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                        D
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                      {prod.name}
                    </h5>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-mono text-slate-500">
                        {prod.width}×{prod.depth}cm
                      </span>
                      <button
                        onClick={() => {
                          onFillSpecificProduct(prod);
                          onClose();
                        }}
                        className="px-2 py-0.5 rounded-lg bg-daiso-red hover:bg-daiso-redHover text-white text-[10px] font-bold shadow-2xs active:scale-95 transition-all flex items-center space-x-0.5"
                        title="이 물건을 수납함에 최대한 채웁니다"
                      >
                        <Zap size={10} />
                        <span>가득 채우기</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>💡 왼쪽 카탈로그의 <strong>[최대 채우기]</strong> 버튼으로도 언제든 채울 수 있습니다.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
