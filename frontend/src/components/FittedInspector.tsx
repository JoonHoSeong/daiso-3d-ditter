import React, { useState, useEffect, useRef } from 'react';
import { FittedItem, DrawerDimension, DaisoProduct } from '../data/daisoProducts';
import { calculateSpaceMetrics, isNestedGood } from '../utils/fitterAlgorithm';
import { isMatOrLiner, getItemDimensions, getPostureInfo } from '../utils/stacking';
import {
  Copy,
  Check,
  ShoppingCart,
  Trash2,
  ExternalLink,
  Sparkles,
  Printer,
  Maximize2,
  RotateCw,
  ArrowUpDown,
  Store
} from 'lucide-react';

interface FittedInspectorProps {
  drawer: DrawerDimension;
  items: FittedItem[];
  selectedItemInstanceId: string | null;
  onSelectItem: (instanceId: string | null) => void;
  onRemoveItem: (instanceId: string) => void;
  onRotateItem?: (instanceId: string) => void;
  onTogglePosture?: (instanceId: string) => void;
  onClearAll: () => void;
  onAutoFit: () => void;
  onFillGoods?: () => void;
  hasGoodsPlaced?: boolean;
  onClearGoodsOnly?: () => void;
  onPreviewProduct?: (product: DaisoProduct) => void;
  onOpenExportModal?: () => void;
  onOpenStoreStockModal?: () => void;
  isFullWidth?: boolean;
}

export const FittedInspector: React.FC<FittedInspectorProps> = ({
  drawer,
  items,
  selectedItemInstanceId,
  onSelectItem,
  onRemoveItem,
  onRotateItem,
  onTogglePosture,
  onClearAll,
  onAutoFit,
  onFillGoods,
  hasGoodsPlaced = false,
  onClearGoodsOnly,
  onPreviewProduct,
  onOpenExportModal,
  onOpenStoreStockModal,
  isFullWidth = false
}) => {
  const [copied, setCopied] = useState(false);
  const metrics = calculateSpaceMetrics(drawer, items);

  // Group items by productId for clean shopping list
  const groupedItems = items.reduce((acc, item) => {
    const existing = acc.find(g => g.product.id === item.product.id);
    if (existing) {
      existing.count += 1;
      existing.instances.push(item.instanceId);
    } else {
      acc.push({
        product: item.product,
        count: 1,
        instances: [item.instanceId]
      });
    }
    return acc;
  }, [] as { product: typeof items[0]['product']; count: number; instances: string[] }[]);

  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll inside list container only without moving page viewport
  useEffect(() => {
    if (selectedItemInstanceId && listRef.current) {
      const el = listRef.current.querySelector(`[data-selected="true"]`) as HTMLElement | null;
      if (el) {
        const targetTop = el.offsetTop - listRef.current.offsetTop - 10;
        listRef.current.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }
  }, [selectedItemInstanceId]);

  const handleCopyStoreList = () => {
    if (groupedItems.length === 0) return;

    let text = `[다이소 서랍 정리 쇼핑 리스트]\n`;
    text += `서랍 규격: ${drawer.width} × ${drawer.depth} × ${drawer.height} cm\n`;
    text += `공간 채움률: ${metrics.floorUtilization}%\n`;
    text += `------------------------------------\n`;
    groupedItems.forEach((g, idx) => {
      text += `${idx + 1}. ${g.product.name}\n`;
      text += `   - 품번: ${g.product.itemCode}\n`;
      text += `   - 수량: ${g.count}개 (₩${(g.product.price * g.count).toLocaleString()})\n`;
    });
    text += `------------------------------------\n`;
    text += `총 예상 금액: ₩${metrics.totalPrice.toLocaleString()}원`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className={`${isFullWidth ? 'w-full border-l-0' : 'w-[360px]'} h-full flex flex-col bg-white border-l border-slate-200 shadow-sm z-10 flex-shrink-0`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">피팅 결과 & 쇼핑 견적</h2>
          <p className="text-[11px] text-slate-400">서랍 공간 분석 및 구매 목록</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            전체 비우기
          </button>
        )}
      </div>

      {/* Space Efficiency Card */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700">바닥 공간 활용도</span>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              metrics.floorUtilization >= 80
                ? 'bg-teal-100 text-teal-800'
                : metrics.floorUtilization >= 50
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {metrics.floorUtilization}% 채움
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              metrics.floorUtilization >= 80
                ? 'bg-daiso-cyan'
                : metrics.floorUtilization >= 50
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
            style={{ width: `${metrics.floorUtilization}%` }}
          />
        </div>

        {/* Metric breakdown */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
            <span className="text-slate-400 block text-[10px]">수납함 / 소품:</span>
            <strong className="text-slate-800 text-xs font-mono">
              수납함 {items.filter(i => !isNestedGood(i)).length}개 · 소품 {items.filter(i => isNestedGood(i)).length}개
            </strong>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
            <span className="text-slate-400 block text-[10px]">서랍 면적:</span>
            <strong className="text-slate-800 text-xs font-mono">{metrics.drawerFloorArea}cm²</strong>
          </div>
        </div>

        {items.length === 0 ? (
          <button
            onClick={onAutoFit}
            className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-98"
          >
            <Sparkles size={14} />
            <span>1단계: 수납함 틀 자동 배치</span>
          </button>
        ) : (
          <div className="mt-2.5 flex items-center space-x-2">
            {onFillGoods && (
              <button
                onClick={onFillGoods}
                className="flex-1 py-1.5 bg-daiso-red hover:bg-daiso-redHover text-white rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all shadow-2xs active:scale-98"
                title="수납함 안에 실제 문구/화장품/욕실 등 소품을 채워 넣습니다"
              >
                <span>📦 수납함 속 물건 채우기</span>
              </button>
            )}
            {hasGoodsPlaced && onClearGoodsOnly && (
              <button
                onClick={onClearGoodsOnly}
                className="px-2.5 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold transition-colors"
                title="수납함 구조는 두고 물건만 비우기"
              >
                <span>물건 비우기</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items list with Photo Thumbnails & Daiso Mall Links & Bi-directional Highlighting */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {groupedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
            <ShoppingCart size={32} className="stroke-[1.5] text-slate-300" />
            <p className="text-xs">서랍에 배치된 수납함이 없습니다.</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              왼쪽 카탈로그에서 트레이를 담거나<br />상단의 자동 채우기를 눌러보세요.
            </p>
          </div>
        ) : (
          groupedItems.map((group) => {
            const isSelected = !!selectedItemInstanceId && group.instances.includes(selectedItemInstanceId);
            const activeInstanceId = isSelected && selectedItemInstanceId ? selectedItemInstanceId : group.instances[0];
            const activeItem = items.find(i => i.instanceId === activeInstanceId);
            const activeDims = activeItem ? getItemDimensions(activeItem) : null;
            const activePosture = activeItem
              ? getPostureInfo(activeItem.product, activeItem.rotation, activeItem.posture || 'flat')
              : null;
            const isLiner = isMatOrLiner(group.product);
            const isGood = group.instances.some(instId => {
              const it = items.find(i => i.instanceId === instId);
              return it && isNestedGood(it);
            });
            const hasStacked = group.instances.some(instId => {
              const it = items.find(i => i.instanceId === instId);
              return it && it.y > 0.5;
            });

            return (
              <div
                key={group.product.id}
                data-selected={isSelected}
                onClick={() => onSelectItem(isSelected ? null : group.instances[0])}
                className={`p-3 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-rose-50/80 border-daiso-red ring-2 ring-daiso-red/30 shadow-md scale-[1.01]'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {/* Product Photo Thumbnail */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewProduct?.(group.product);
                    }}
                    className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 relative group/thumb cursor-zoom-in shadow-2xs"
                    title="클릭하여 큰 사진 보기"
                  >
                    {group.product.imageUrl ? (
                      <img
                        src={group.product.imageUrl}
                        alt={group.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-0.5 group-hover/thumb:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center text-[10px] font-bold text-slate-500"
                        style={{ backgroundColor: group.product.color }}
                      >
                        <span className="text-[9px] font-mono opacity-80">DAISO</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Maximize2 size={12} />
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1">
                        {group.product.name}
                      </h4>
                      {isLiner ? (
                        <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 text-[9px] font-bold shrink-0">
                          바닥 매트
                        </span>
                      ) : isGood ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold shrink-0">
                          수납 소품
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[9px] font-bold shrink-0">
                          수납함
                        </span>
                      )}
                      {hasStacked && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                          2단 적재
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-bold shrink-0 animate-pulse">
                          선택됨
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[11px] font-mono text-slate-500">
                        품번: <strong className="text-daiso-red">{group.product.itemCode}</strong>
                      </span>

                      {/* Direct Daiso Mall Link */}
                      {group.product.mallUrl && (
                        <a
                          href={group.product.mallUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-0.5 text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                          title="다이소몰 공식 상품 페이지 새 창으로 열기"
                        >
                          <span>다이소몰</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500">
                        <span>
                          규격: {activeDims ? `${activeDims.width}×${activeDims.depth}×${activeDims.height}` : `${group.product.width}×${group.product.depth}×${group.product.height}`}cm
                        </span>
                        {activePosture && (isGood || activePosture.isModifiedPosture) && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold ${
                              activePosture.isStanding
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {activePosture.label}
                          </span>
                        )}
                      </div>

                      {/* Quick 3D Orientation Controls */}
                      {!isLiner && (onRotateItem || onTogglePosture) && (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          {onRotateItem && (
                            <button
                              type="button"
                              onClick={() => onRotateItem(activeInstanceId)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center space-x-0.5 transition-colors"
                              title="바닥 90도 회전 (단축키: R)"
                            >
                              <RotateCw size={10} />
                              <span>90°</span>
                            </button>
                          )}
                          {onTogglePosture && (
                            <button
                              type="button"
                              onClick={() => onTogglePosture(activeInstanceId)}
                              className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold flex items-center space-x-0.5 transition-colors"
                              title="세워서 보관 / 눕혀서 보관 전환 (단축키: V)"
                            >
                              <ArrowUpDown size={10} />
                              <span>세우기/눕히기</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(group.instances[0]);
                    }}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0"
                    title="1개 제거"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Subtotal & Quantity */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    단가 ₩{group.product.price.toLocaleString()}원 × {group.count}개
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₩{(group.product.price * group.count).toLocaleString()}원
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Checkout / Summary */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-slate-600">예상 총 구매 금액</span>
          <div className="text-right">
            <span className="text-lg font-bold text-daiso-red font-mono">
              ₩{metrics.totalPrice.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 ml-1">원</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {onOpenStoreStockModal && (
            <button
              onClick={onOpenStoreStockModal}
              disabled={groupedItems.length === 0}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm ${
                groupedItems.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 shadow-md'
              }`}
            >
              <Store size={14} />
              <span>🏬 내 주변 매장 재고 확인 (실시간)</span>
            </button>
          )}

          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              disabled={groupedItems.length === 0}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm ${
                groupedItems.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-daiso-red hover:bg-red-600 text-white active:scale-98 shadow-md hover:shadow-lg'
              }`}
            >
              <Printer size={14} />
              <span>🖨️ 매장 구매표 인쇄 / 파일 저장</span>
            </button>
          )}

          <button
            onClick={handleCopyStoreList}
            disabled={groupedItems.length === 0}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm ${
              copied
                ? 'bg-teal-600 text-white'
                : groupedItems.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? '쇼핑 목록 복사 완료!' : '매장용 품번 목록 복사하기'}</span>
          </button>

          <a
            href="https://www.daisomall.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <ExternalLink size={13} />
            <span>다이소몰 온라인 바로가기</span>
          </a>
        </div>
      </div>
    </aside>
  );
};
