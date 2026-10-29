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
  Sparkles,
  Check,
  Star,
  Compass,
  ArrowRight,
  Navigation,
  Radio
} from 'lucide-react';
import { FittedItem } from '../data/daisoProducts';
import { BACKEND_URL } from '../config';

export interface StoreInfo {
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
  distance_km?: number | null;
  distance_label?: string;
}

export interface ItemStockResult {
  product_code: string;
  store_code: string;
  quantity: number;
  in_stock: boolean;
  status_label: string;
  sale_status_code: string;
}

export interface StoreStockMap {
  [storeCode: string]: {
    loading: boolean;
    error?: string;
    all_in_stock?: boolean;
    any_in_stock?: boolean;
    items?: ItemStockResult[];
  };
}

export interface EvaluatedStore extends StoreInfo {
  all_in_stock: boolean;
  available_count: number;
  total_items: number;
  items: ItemStockResult[];
}

export interface UserLocation {
  source: 'gps' | 'ip' | 'manual';
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  suburb?: string;
  recommended_keyword: string;
  full_address?: string;
}

interface StoreStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FittedItem[];
  activeStore?: StoreInfo | null;
  onSelectActiveStore?: (store: StoreInfo | null) => void;
  initialTab?: 'all_in_stock' | 'search';
  onFitWithStoreStock?: (store: StoreInfo) => void;
}

export const StoreStockModal: React.FC<StoreStockModalProps> = ({
  isOpen,
  onClose,
  items,
  activeStore = null,
  onSelectActiveStore,
  initialTab = 'all_in_stock',
  onFitWithStoreStock
}) => {
  const [activeTab, setActiveTab] = useState<'all_in_stock' | 'search'>(initialTab);
  const [keyword, setKeyword] = useState<string>('강남');
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(null);
  const [storeStockMap, setStoreStockMap] = useState<StoreStockMap>({});

  // Location detection states (GPS / IP)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);

  // All-in-stock finder states
  const [allInStockStores, setAllInStockStores] = useState<EvaluatedStore[]>([]);
  const [loadingAllInStock, setLoadingAllInStock] = useState<boolean>(false);
  const [allInStockFilterOnly, setAllInStockFilterOnly] = useState<boolean>(false);
  const [allInStockRegion, setAllInStockRegion] = useState<string>('강남');

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

  // Automatic Location Detection on Modal Open
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (!userLocation) {
        detectUserLocation();
      } else {
        const kw = userLocation.recommended_keyword;
        if (productCodes.length > 0) {
          handleFindAllInStock(allInStockRegion || kw, { lat: userLocation.latitude, lon: userLocation.longitude });
        } else {
          setActiveTab('search');
          handleSearchStores(keyword || kw, { lat: userLocation.latitude, lon: userLocation.longitude });
        }
      }
    }
  }, [isOpen]);

  const detectUserLocation = async () => {
    setIsDetectingLocation(true);
    setError(null);

    const fallbackToIp = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/stores/user-location`);
        if (res.ok) {
          const data = await res.json();
          const loc: UserLocation = {
            source: 'ip',
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            district: data.district,
            suburb: data.suburb,
            recommended_keyword: data.recommended_keyword || '강남',
            full_address: data.full_address || data.district
          };
          setUserLocation(loc);
          const kw = loc.recommended_keyword;
          setKeyword(kw);
          setAllInStockRegion(kw);

          if (productCodes.length > 0) {
            handleFindAllInStock(kw, { lat: loc.latitude, lon: loc.longitude });
          } else {
            handleSearchStores(kw, { lat: loc.latitude, lon: loc.longitude });
          }
        }
      } catch (e: any) {
        console.warn('IP location detection fallback failed:', e);
      } finally {
        setIsDetectingLocation(false);
      }
    };

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const res = await fetch(`${BACKEND_URL}/api/stores/reverse-geocode?lat=${lat}&lon=${lon}`);
            if (res.ok) {
              const data = await res.json();
              const loc: UserLocation = {
                source: 'gps',
                latitude: lat,
                longitude: lon,
                city: data.city,
                district: data.district,
                suburb: data.suburb,
                recommended_keyword: data.recommended_keyword || '강남',
                full_address: data.full_address || data.district
              };
              setUserLocation(loc);
              const kw = loc.recommended_keyword;
              setKeyword(kw);
              setAllInStockRegion(kw);

              if (productCodes.length > 0) {
                handleFindAllInStock(kw, { lat, lon });
              } else {
                handleSearchStores(kw, { lat, lon });
              }
            } else {
              await fallbackToIp();
            }
          } catch {
            await fallbackToIp();
          } finally {
            setIsDetectingLocation(false);
          }
        },
        async (geoError) => {
          console.info('HTML5 Geolocation unavailable or declined, falling back to IP:', geoError.message);
          await fallbackToIp();
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      await fallbackToIp();
    }
  };

  const handleSearchStores = async (query: string, coords?: { lat: number; lon: number }) => {
    if (!query.trim()) return;
    setLoadingStores(true);
    setError(null);
    try {
      const latVal = coords?.lat ?? userLocation?.latitude;
      const lonVal = coords?.lon ?? userLocation?.longitude;
      const latParam = latVal ? `&lat=${latVal}` : '';
      const lonParam = lonVal ? `&lon=${lonVal}` : '';

      const res = await fetch(
        `${BACKEND_URL}/api/stores/search?keyword=${encodeURIComponent(query.trim())}${latParam}${lonParam}`
      );
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

  const handleFindAllInStock = async (region: string, coords?: { lat: number; lon: number }) => {
    if (!productCodes.length || !region.trim()) return;
    setLoadingAllInStock(true);
    setError(null);
    try {
      const latVal = coords?.lat ?? userLocation?.latitude;
      const lonVal = coords?.lon ?? userLocation?.longitude;

      const res = await fetch(`${BACKEND_URL}/api/stores/find-all-in-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_codes: productCodes,
          keyword: region.trim(),
          lat: latVal || null,
          lon: lonVal || null
        })
      });
      if (!res.ok) {
        throw new Error('전 품목 보유 매장 검색 통신 실패');
      }
      const data = await res.json();
      setAllInStockStores(data.stores || []);
      const allInCount = (data.stores || []).filter((s: EvaluatedStore) => s.all_in_stock).length;
      if (allInCount > 0) {
        setAllInStockFilterOnly(true);
      } else {
        setAllInStockFilterOnly(false);
      }
    } catch (err: any) {
      setError(err.message || '전 품목 보유 매장 조회 중 오류가 발생했습니다.');
    } finally {
      setLoadingAllInStock(false);
    }
  };

  if (!isOpen) return null;

  const quickSearch = (q: string) => {
    setKeyword(q);
    handleSearchStores(q);
  };

  const quickAllInStock = (q: string) => {
    setAllInStockRegion(q);
    handleFindAllInStock(q);
  };

  const selectedStore = stores.find(s => s.store_code === selectedStoreCode);
  const selectedStockInfo = selectedStoreCode ? storeStockMap[selectedStoreCode] : null;

  const allInStockCount = allInStockStores.filter(s => s.all_in_stock).length;
  const displayedAllInStores = allInStockFilterOnly
    ? allInStockStores.filter(s => s.all_in_stock)
    : allInStockStores;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-0 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-4xl h-full sm:h-[94vh] sm:max-h-[850px] bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50/90 via-white to-amber-50/80">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-daiso-red flex items-center justify-center text-white shadow-md shadow-red-100 shrink-0">
              <Store size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-slate-900">
                  다이소 실시간 매장 재고
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>LIVE</span>
                </span>
                {activeStore && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200 truncate max-w-[130px]">
                    {activeStore.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                GPS 및 IP로 내 위치를 자동 감지하여 가장 가까운 매장의 실시간 재고를 즉시 대조합니다.
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

        {/* User Location Bar (Mobile GPS / IP Auto-detected) */}
        <div className="px-3 sm:px-6 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-800">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs">
            <Navigation size={12} className="text-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-slate-200 hidden sm:inline">내 위치:</span>
            {isDetectingLocation ? (
              <span className="text-emerald-300 flex items-center space-x-1 text-[11px]">
                <Loader2 size={11} className="animate-spin" />
                <span>위치 감지 중...</span>
              </span>
            ) : userLocation ? (
              <span className="text-emerald-300 font-extrabold flex items-center space-x-1.5">
                <span className="truncate max-w-[160px] sm:max-w-none">{userLocation.full_address || userLocation.district}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white font-mono shrink-0">
                  {userLocation.source === 'gps' ? '📱 GPS' : '🌐 IP'}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">위치 미감지 (강남 기준)</span>
            )}
          </div>

          <button
            onClick={() => detectUserLocation()}
            disabled={isDetectingLocation}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] sm:text-[11px] flex items-center space-x-1 border border-white/20 transition-all active:scale-95"
            title="모바일 GPS 또는 IP 위치 정보를 다시 감지합니다"
          >
            <Radio size={11} className="text-emerald-400" />
            <span>재감지</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-3 sm:px-6 pt-2 pb-0 bg-slate-50 border-b border-slate-200 flex items-center space-x-1 sm:space-x-2 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('all_in_stock');
              if (productCodes.length > 0 && allInStockStores.length === 0) {
                handleFindAllInStock(allInStockRegion);
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 font-bold border-b-2 transition-all whitespace-nowrap text-xs ${
              activeTab === 'all_in_stock'
                ? 'border-daiso-red text-daiso-red bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={13} className={activeTab === 'all_in_stock' ? 'text-amber-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">🌟 내 서랍 품목 모두 있는 매장 찾기 (전 품목 올스톡)</span>
            <span className="sm:hidden">🌟 전 품목 보유 매장</span>
            {allInStockCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {allInStockCount}곳
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('search');
              if (stores.length === 0) {
                handleSearchStores(keyword);
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 font-bold border-b-2 transition-all whitespace-nowrap text-xs ${
              activeTab === 'search'
                ? 'border-daiso-red text-daiso-red bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search size={13} />
            <span className="hidden sm:inline">🏬 매장 검색 & 기준 지점 설정</span>
            <span className="sm:hidden">🏬 매장 검색 & 지점</span>
          </button>
        </div>

        {/* Current Placed Items Strip */}
        <div className="px-3 sm:px-6 py-2 bg-white border-b border-slate-100 flex items-center space-x-2 sm:space-x-3 overflow-x-auto text-xs shrink-0 scrollbar-none">
          <div className="flex items-center space-x-1 font-bold text-slate-700 shrink-0">
            <ShoppingBag size={14} className="text-daiso-red" />
            <span>확인 대상 수납함 ({uniqueProductsMap.length}종):</span>
          </div>
          {uniqueProductsMap.length === 0 ? (
            <span className="text-slate-400 text-xs">서랍에 배치된 수납함이 없습니다.</span>
          ) : (
            <div className="flex items-center space-x-2">
              {uniqueProductsMap.map(entry => (
                <div
                  key={entry.product.id}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs shrink-0"
                >
                  <span className="font-semibold text-slate-900 truncate max-w-[120px]">{entry.product.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">({entry.product.itemCode || entry.product.id})</span>
                  <span className="px-1.5 py-0.2 rounded bg-daiso-red/10 text-daiso-red font-bold text-[10px]">
                    ×{entry.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: ALL-IN-STOCK STORES FINDER */}
        {activeTab === 'all_in_stock' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
            {/* Region Search Bar */}
            <div className="p-4 sm:px-6 bg-white border-b border-slate-100 space-y-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFindAllInStock(allInStockRegion);
                }}
                className="flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={allInStockRegion}
                    onChange={(e) => setAllInStockRegion(e.target.value)}
                    placeholder="지역 또는 구/동 검색 (예: 구로, 강남, 마포, 분당, 수원...)"
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingAllInStock || uniqueProductsMap.length === 0}
                  className="px-4 py-2 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white font-bold text-xs shadow-2xs flex items-center space-x-1 shrink-0 disabled:opacity-50"
                >
                  {loadingAllInStock ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-300" />}
                  <span>전 품목 보유 매장 찾기</span>
                </button>
              </form>

              {/* Quick Regional Chips & Filter Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold">인기 지역:</span>
                  {['구로', '강남', '역삼', '매봉', '홍대', '잠실', '신촌', '분당', '수원'].map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => quickAllInStock(loc)}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        allInStockRegion === loc
                          ? 'bg-daiso-red text-white border-daiso-red shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                {allInStockStores.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setAllInStockFilterOnly(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        !allInStockFilterOnly
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      전체 검색 매장 ({allInStockStores.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllInStockFilterOnly(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1 ${
                        allInStockFilterOnly
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <Star size={12} className="fill-current text-amber-300" />
                      <span>전 품목 100% 보유 매장만 ({allInStockCount})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {uniqueProductsMap.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <ShoppingBag size={24} />
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm">
                    아직 3D 서랍에 배치된 수납함이 없습니다
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    좌측 카탈로그에서 수납함을 서랍에 배치하거나 [자동 피팅]을 실행한 후,
                    해당 수납함들이 전부 구비된 오프라인 매장을 즉시 역추적해드립니다.
                  </p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white font-bold text-xs shadow-sm transition-all"
                  >
                    매장 검색 탭으로 이동하여 기준 지점 먼저 선택하기
                  </button>
                </div>
              ) : loadingAllInStock ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
                  <Loader2 size={32} className="animate-spin text-daiso-red" />
                  <span className="font-bold text-xs text-slate-700">
                    '{allInStockRegion}' 일대 다이소 매장의 공식 실시간 재고를 전수 대조 중입니다...
                  </span>
                  <span className="text-[11px] text-slate-400">
                    배치된 수납함 {productCodes.length}개 품목의 매장 픽업 재고 및 사용자 거리 순으로 정렬합니다.
                  </span>
                </div>
              ) : displayedAllInStores.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-2">
                  <Store size={32} className="mx-auto text-slate-300" />
                  <span className="font-bold text-slate-700">
                    {allInStockFilterOnly
                      ? `'${allInStockRegion}' 지역에 전 품목을 100% 보유한 매장이 없습니다.`
                      : `'${allInStockRegion}' 지역 매장 검색 결과가 없습니다.`}
                  </span>
                  <p className="text-slate-400">
                    {allInStockFilterOnly ? (
                      <button
                        onClick={() => setAllInStockFilterOnly(false)}
                        className="text-daiso-red underline font-bold"
                      >
                        [일부 보유 매장 포함 전체 매장 보기]를 클릭해보세요.
                      </button>
                    ) : (
                      '다른 지역명(예: 구로, 강남, 마포, 분당)을 입력해보세요.'
                    )}
                  </p>
                </div>
              ) : (
                <>
                  {/* Highlight Callout */}
                  {allInStockCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-white shadow-md flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <Star size={18} className="fill-amber-300 text-amber-300" />
                        </div>
                        <div>
                          <div className="font-black text-xs sm:text-sm">
                            축하합니다! 내가 구성한 {productCodes.length}개 품목이 모두 있는 매장 {allInStockCount}곳을 발견했습니다!
                          </div>
                          <div className="text-[11px] text-emerald-100">
                            헛걸음 없이 해당 매장에 방문하시면 서랍에 배치된 수납함을 즉시 전부 구매하실 수 있습니다.
                          </div>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block px-2.5 py-1 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shadow-2xs">
                        100% All-in-Stock
                      </span>
                    </div>
                  )}

                  {displayedAllInStores.map(store => {
                    const isCurrentActive = activeStore?.store_code === store.store_code;

                    return (
                      <div
                        key={store.store_code}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          store.all_in_stock
                            ? 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center space-x-2 flex-wrap">
                              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center space-x-1.5">
                                <span>{store.name}</span>
                                <span className="text-xs text-slate-400 font-mono font-normal">
                                  ({store.store_code})
                                </span>
                              </h3>
                              {store.distance_label && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10px] flex items-center space-x-1">
                                  <MapPin size={10} className="text-indigo-500" />
                                  <span>{store.distance_label}</span>
                                </span>
                              )}
                              {store.all_in_stock ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[11px] flex items-center space-x-1 shadow-2xs">
                                  <Star size={11} className="fill-amber-400 text-amber-400" />
                                  <span>전 품목 100% 보유 매장</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  일부 보유 ({store.available_count}/{store.total_items}종)
                                </span>
                              )}
                              {isCurrentActive && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10px]">
                                  📍 내 기준 지점
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span>{store.address}</span>
                            </p>

                            <div className="mt-2 flex items-center space-x-3 text-slate-500 text-[11px] font-mono">
                              <span>영업: {store.open_time} ~ {store.close_time}</span>
                              <span>전화: {store.phone}</span>
                              {store.parking && (
                                <span className="text-emerald-700 font-bold flex items-center space-x-0.5">
                                  <Car size={11} /> <span>주차 가능</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 shrink-0">
                            {onSelectActiveStore && (
                              <button
                                onClick={() => {
                                  onSelectActiveStore(store);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all ${
                                  isCurrentActive
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200'
                                }`}
                                title="이 매장을 내 기준 지점으로 선택하여 향후 피팅 시 해당 지점 재고만으로 구성할 수 있습니다."
                              >
                                {isCurrentActive ? <Check size={13} className="text-purple-600" /> : <Compass size={13} />}
                                <span>{isCurrentActive ? '기준 지점 설정됨' : '이 매장 기준으로 선택'}</span>
                              </button>
                            )}

                            {onFitWithStoreStock && (
                              <button
                                onClick={() => {
                                  onFitWithStoreStock(store);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white font-bold text-xs shadow-2xs flex items-center space-x-1 transition-transform active:scale-95"
                                title="이 매장의 재고 보유 수납함으로 즉시 서랍을 재피팅합니다."
                              >
                                <span>이 지점으로 피팅</span>
                                <ArrowRight size={12} />
                              </button>
                            )}

                            <a
                              href={`https://map.naver.com/v5/search/${encodeURIComponent('다이소 ' + store.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 hover:border-emerald-300 transition-colors"
                              title="네이버 지도 길찾기"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>

                        {/* Placed Items Breakdown Table */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {store.items.map(stk => {
                            const matched = uniqueProductsMap.find(
                              e => (e.product.itemCode || e.product.id) === stk.product_code
                            );
                            const prod = matched?.product;
                            const needed = matched?.count || 1;

                            return (
                              <div
                                key={stk.product_code}
                                className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                                  stk.in_stock
                                    ? 'bg-emerald-50/50 border-emerald-200/70'
                                    : 'bg-rose-50/40 border-rose-200/60'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-slate-800 truncate text-[11px]">
                                    {prod?.name || stk.product_code}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    필요: {needed}개
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  {stk.in_stock ? (
                                    <span className="inline-flex items-center space-x-0.5 text-emerald-700 font-bold text-[11px]">
                                      <CheckCircle2 size={11} className="text-emerald-600" />
                                      <span>{stk.quantity}개 보유</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-0.5 text-rose-600 font-semibold text-[11px]">
                                      <XCircle size={11} className="text-rose-500" />
                                      <span>매장 품절</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STORE SEARCH & LIVE STOCK INSPECTOR */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
                    placeholder="매장명 또는 지역 검색 (예: 구로, 강남, 매봉, 역삼, 홍대, 잠실, 분당, 해운대...)"
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
                {['구로', '강남', '역삼', '매봉', '홍대', '잠실', '신촌', '분당', '수원'].map(loc => (
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
                    const isCurrentActive = activeStore?.store_code === store.store_code;

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
                          <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 flex-wrap">
                            <span>{store.name}</span>
                            {store.distance_label && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold font-mono border border-indigo-200">
                                📍 {store.distance_label}
                              </span>
                            )}
                            {store.pickup_available && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[9px] font-bold border border-sky-200">
                                픽업가능
                              </span>
                            )}
                            {isCurrentActive && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-extrabold border border-purple-200">
                                기준 지점
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
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                              <span>{selectedStore.name}</span>
                              <span className="text-xs text-slate-400 font-mono font-normal">
                                ({selectedStore.store_code})
                              </span>
                            </h3>
                            {selectedStore.distance_label && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-mono font-black text-[10px]">
                                📍 {selectedStore.distance_label}
                              </span>
                            )}
                            {activeStore?.store_code === selectedStore.store_code && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-black text-[10px]">
                                내 기준 지점
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{selectedStore.address}</span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {onSelectActiveStore && (
                            <button
                              onClick={() => {
                                if (activeStore?.store_code === selectedStore.store_code) {
                                  onSelectActiveStore(null);
                                } else {
                                  onSelectActiveStore(selectedStore);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all ${
                                activeStore?.store_code === selectedStore.store_code
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200'
                              }`}
                            >
                              <Compass size={13} />
                              <span>
                                {activeStore?.store_code === selectedStore.store_code
                                  ? '기준 지점 해제'
                                  : '이 지점을 기준으로 설정'}
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => checkStockForStore(selectedStore.store_code)}
                            disabled={selectedStockInfo?.loading}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-daiso-red hover:border-daiso-red shadow-2xs transition-all"
                            title="실시간 재고 새로고침"
                          >
                            <RefreshCw size={14} className={selectedStockInfo?.loading ? 'animate-spin' : ''} />
                          </button>
                        </div>
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
          </div>
        )}

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
