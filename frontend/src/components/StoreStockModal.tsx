import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Store,
  MapPin,
  Phone,
  Clock,
  Car,
  PackageCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { FittedItem } from '../data/daisoProducts';
import { BACKEND_URL } from '../config';

interface StoreInfo {
  store_code: string;
  name: string;
  address: string;
  phone: string;
  open_time: string;
  close_time: string;
  parking: boolean;
  pickup_available: boolean;
  latitude?: number;
  longitude?: number;
}

interface ItemStockResult {
  product_code: string;
  store_code: string;
  quantity: number;
  in_stock: boolean;
  status_label: string;
  sale_status_code: string;
}

interface StoreStockMap {
  [storeCode: string]: {
    loading: boolean;
    error?: string;
    all_in_stock?: boolean;
    any_in_stock?: boolean;
    items?: ItemStockResult[];
  };
}

interface StoreStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FittedItem[];
}

export const StoreStockModal: React.FC<StoreStockModalProps> = ({
  isOpen,
  onClose,
  items
}) => {
  const [keyword, setKeyword] = useState<string>('강남');
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(null);
  const [storeStockMap, setStoreStockMap] = useState<StoreStockMap>({});

  // Extract unique products currently placed in drawer
  const uniqueProductsMap = React.useMemo(() => {
    const map = new Map<string, { product: FittedItem['product']; count: number }>();
    items.forEach(item => {
      const code = item.product.itemCode || item.product.id;
      if (map.has(code)) {
        map.get(code)!.count += 1;
      } else {
        map.set(code, { product: item.product, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const productCodes = React.useMemo(() => {
    return uniqueProductsMap.map(entry => entry.product.itemCode || entry.product.id);
  }, [uniqueProductsMap]);

  useEffect(() => {
    if (isOpen) {
      handleSearchStores(keyword || '강남');
    }
  }, [isOpen]);

  const handleSearchStores = async (query: string) => {
    if (!query.trim()) return;
    setLoadingStores(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stores/search?keyword=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        throw new Error('매장 정보를 불러오지 못했습니다.');
      }
      const data = await res.json();
      const storeList: StoreInfo[] = data.stores || [];
      setStores(storeList);

      if (storeList.length > 0) {
        const firstCode = storeList[0].store_code;
        setSelectedStoreCode(firstCode);
        checkStockForStore(firstCode);
      } else {
        setSelectedStoreCode(null);
      }
    } catch (err: any) {
      setError(err.message || '매장 검색 중 오류가 발생했습니다.');
    } finally {
      setLoadingStores(false);
    }
  };

  const checkStockForStore = async (storeCode: string) => {
    if (!productCodes.length) return;
    if (storeStockMap[storeCode]?.items) return; // Already cached

    setStoreStockMap(prev => ({
      ...prev,
      [storeCode]: { loading: true }
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/stores/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_code: storeCode,
          product_codes: productCodes
        })
      });

      if (!res.ok) {
        throw new Error('재고 조회 응답 실패');
      }

      const data = await res.json();
      setStoreStockMap(prev => ({
        ...prev,
        [storeCode]: {
          loading: false,
          all_in_stock: data.all_in_stock,
          any_in_stock: data.any_in_stock,
          items: data.items || []
        }
      }));
    } catch (err: any) {
      setStoreStockMap(prev => ({
        ...prev,
        [storeCode]: {
          loading: false,
          error: err.message || '재고 조회 실패'
        }
      }));
    }
  };

  if (!isOpen) return null;

  const quickSearch = (q: string) => {
    setKeyword(q);
    handleSearchStores(q);
  };

  const selectedStore = stores.find(s => s.store_code === selectedStoreCode);
  const selectedStockInfo = selectedStoreCode ? storeStockMap[selectedStoreCode] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-2 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[800px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50/90 via-white to-amber-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-daiso-red flex items-center justify-center text-white shadow-md shadow-red-100">
              <Store size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  다이소 매장별 실시간 재고 파악
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>LIVE 실시간 연동</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                내 3D 서랍에 배치된 수납함이 우리 동네 다이소 매장에 있는지 공식 실시간 재고를 조회합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Placed Items Strip */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center space-x-3 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center space-x-1 font-bold text-slate-700 shrink-0">
            <ShoppingBag size={14} className="text-daiso-red" />
            <span>확인 대상 수납함 ({uniqueProductsMap.length}종):</span>
          </div>
          <div className="flex items-center space-x-2">
            {uniqueProductsMap.map(entry => (
              <div
                key={entry.product.id}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs shrink-0"
              >
                <span className="font-semibold text-slate-900 truncate max-w-[120px]">{entry.product.name}</span>
                <span className="font-mono text-[10px] text-slate-400">({entry.product.itemCode || entry.product.id})</span>
                <span className="px-1.5 py-0.2 rounded bg-daiso-red/10 text-daiso-red font-bold text-[10px]">
                  ×{entry.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Quick Chips */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-white space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchStores(keyword);
            }}
            className="flex items-center space-x-2"
          >
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="매장명 또는 지역 검색 (예: 강남, 매봉, 역삼, 홍대, 잠실, 분당, 해운대...)"
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loadingStores}
              className="px-4 py-2 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white font-bold text-xs shadow-2xs flex items-center space-x-1 shrink-0"
            >
              {loadingStores ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              <span>매장 찾기</span>
            </button>
          </form>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Filter Chips */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold">인기 지역:</span>
            {['강남', '역삼', '매봉', '홍대', '잠실', '신촌', '분당', '수원'].map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => quickSearch(loc)}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  keyword === loc
                    ? 'bg-daiso-red text-white border-daiso-red shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Split: Left Store List | Right Real-time Stock Inspector */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left: Store Candidates */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
            <div className="text-[11px] font-bold text-slate-400 px-1">
              검색된 다이소 매장 ({stores.length}곳)
            </div>

            {loadingStores ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <Loader2 size={24} className="animate-spin text-daiso-red" />
                <span>다이소 매장을 찾는 중...</span>
              </div>
            ) : stores.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Store size={28} className="mx-auto mb-1 text-slate-300" />
                <span>검색된 매장이 없습니다.</span>
              </div>
            ) : (
              stores.map(store => {
                const isSelected = store.store_code === selectedStoreCode;
                const stock = storeStockMap[store.store_code];

                return (
                  <div
                    key={store.store_code}
                    onClick={() => {
                      setSelectedStoreCode(store.store_code);
                      checkStockForStore(store.store_code);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-daiso-red shadow-md ring-1 ring-daiso-red/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-white/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <span>{store.name}</span>
                        {store.pickup_available && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[9px] font-bold border border-sky-200">
                            픽업가능
                          </span>
                        )}
                      </div>

                      {/* Stock Summary Badge */}
                      {stock?.loading ? (
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Loader2 size={10} className="animate-spin" />
                          <span>확인중</span>
                        </span>
                      ) : stock?.items ? (
                        stock.all_in_stock ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            🟢 전품목 보유
                          </span>
                        ) : stock.any_in_stock ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            🟡 일부 보유
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                            🔴 전품목 품절
                          </span>
                        )
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-start space-x-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-1">{store.address}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>영업: {store.open_time} ~ {store.close_time}</span>
                      <span>{store.phone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Live Stock Detail for Selected Store */}
          <div className="w-full md:w-7/12 flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col bg-white">
            {selectedStore ? (
              <div className="space-y-4">
                {/* Store Header Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-rose-50/30 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                        <span>{selectedStore.name}</span>
                        <span className="text-xs text-slate-400 font-mono font-normal">
                          (매장코드: {selectedStore.store_code})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{selectedStore.address}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => checkStockForStore(selectedStore.store_code)}
                      disabled={selectedStockInfo?.loading}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-daiso-red hover:border-daiso-red shadow-2xs transition-all"
                      title="실시간 재고 새로고침"
                    >
                      <RefreshCw size={14} className={selectedStockInfo?.loading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center space-x-4 text-xs text-slate-600 font-medium">
                    <span className="flex items-center space-x-1">
                      <Clock size={13} className="text-slate-400" />
                      <span>{selectedStore.open_time} ~ {selectedStore.close_time}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Phone size={13} className="text-slate-400" />
                      <span>{selectedStore.phone}</span>
                    </span>
                    {selectedStore.parking && (
                      <span className="flex items-center space-x-1 text-emerald-700 font-bold">
                        <Car size={13} />
                        <span>주차 가능</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <PackageCheck size={14} className="text-daiso-red" />
                      <span>서랍 배치 품목 실시간 재고 현황</span>
                    </h4>
                    {selectedStockInfo?.items && (
                      <span className="text-[11px] font-bold text-slate-500">
                        총 {selectedStockInfo.items.length}개 상품 조회됨
                      </span>
                    )}
                  </div>

                  {selectedStockInfo?.loading ? (
                    <div className="p-8 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                      <Loader2 size={24} className="animate-spin text-daiso-red" />
                      <span>공식 다이소 실시간 재고 통신 중...</span>
                    </div>
                  ) : selectedStockInfo?.error ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center space-x-2">
                      <AlertCircle size={15} />
                      <span>{selectedStockInfo.error}</span>
                    </div>
                  ) : selectedStockInfo?.items ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
                      {selectedStockInfo.items.map(stk => {
                        const matched = uniqueProductsMap.find(
                          e => (e.product.itemCode || e.product.id) === stk.product_code
                        );
                        const prod = matched?.product;
                        const needed = matched?.count || 1;

                        return (
                          <div key={stk.product_code} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                            <div className="flex items-center space-x-3 min-w-0">
                              {prod?.imageUrl && (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 truncate">
                                  {prod?.name || stk.product_code}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  품번: {stk.product_code} · 필요 수량: <strong>{needed}개</strong>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 ml-3">
                              <div className="flex items-center space-x-1.5 justify-end">
                                {stk.in_stock ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    <span>{stk.quantity}개 보유</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                                    <XCircle size={12} className="text-rose-500" />
                                    <span>{stk.status_label}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {stk.in_stock && stk.quantity >= needed
                                  ? '✅ 방문 즉시 구매 가능'
                                  : stk.in_stock
                                  ? '⚠️ 필요 수량 대비 부족'
                                  : '방문 전 확인 필요'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {/* Direct Map / Navigation Link */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>실제 매장 방문 전 네이버 지도 또는 다이소몰에서 위치를 확인하세요</span>
                  </div>
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent('다이소 ' + selectedStore.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-emerald-700 font-bold text-xs flex items-center space-x-1 shadow-2xs transition-all"
                  >
                    <span>네이버 길찾기</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Store size={32} className="mb-2 text-slate-300" />
                <span>좌측에서 매장을 선택하면 실시간 재고가 표시됩니다.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            * 본 재고 정보는 공식 다이소몰 매장 픽업 재고 API 실시간 연동 기준이며, 현장 판매 상황에 따라 차이가 있을 수 있습니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
