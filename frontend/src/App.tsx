import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DrawerCanvas3D } from './components/DrawerCanvas3D';
import { ProductCatalog } from './components/ProductCatalog';
import { FittedInspector } from './components/FittedInspector';
import { HeaderNav } from './components/HeaderNav';
import { ProductImageModal } from './components/ProductImageModal';
import { AuthModal } from './components/AuthModal';
import { SaveDrawerModal } from './components/SaveDrawerModal';
import { ExportShoppingListModal } from './components/ExportShoppingListModal';
import { KakaoShareModal } from './components/KakaoShareModal';
import { MyDrawersModal } from './components/MyDrawersModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { StoreStockModal, StoreInfo } from './components/StoreStockModal';
import { LayoutReportModal } from './components/LayoutReportModal';
import {
  DrawerDimension,
  FittedItem,
  DaisoProduct,
  loadLocalDaisoProducts
} from './data/daisoProducts';
import { User, SavedDrawer } from './types/auth';
import {
  fitContainersOnly,
  clearGoodsOnly,
  isNestedGood,
  fillSelectedGoodIntoContainers,
  fillCategoryGoodsIntoContainers,
  fillDiverseGoodsIntoContainers,
  getFitValidation
} from './utils/fitterAlgorithm';
import { checkItemCollision } from './utils/collision';
import {
  isMatOrLiner,
  isDrawerOrganizer,
  calculateRestingY,
  isOpenContainer,
  getItemDimensions,
  getOrientedDimensions,
  getNextPosture,
  getPostureInfo,
  getDistinct3DOrientations
} from './utils/stacking';
import { CheckCircle2, Layers, Printer, Loader2, X } from 'lucide-react';
import { FillGoodsModal } from './components/FillGoodsModal';
import { AiPurposeModal } from './components/AiPurposeModal';
import { FridgeSelectorModal } from './components/FridgeSelectorModal';
import { SpacePresetModal } from './components/SpacePresetModal';
import { CustomPresetModal } from './components/CustomPresetModal';
import { DrawerPurposeModal } from './components/DrawerPurposeModal';
import { PurposePreset } from './data/purposePresets';
import { SpacePreset } from './data/spacePresets';
import { FridgeModel, FridgeCompartment } from './data/fridgeModels';
import { normalizeProduct } from './utils/normalizeProduct';

import { BACKEND_URL } from './config';

export const App: React.FC = () => {
  const [drawer, setDrawer] = useState<DrawerDimension>({
    width: 32.0,
    depth: 40.0,
    height: 7.0
  });

  const [products, setProducts] = useState<DaisoProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [previewProduct, setPreviewProduct] = useState<DaisoProduct | null>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('daiso_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('daiso_auth_token');
  });

  // Saved Drawers state
  const [savedDrawers, setSavedDrawers] = useState<SavedDrawer[]>(() => {
    try {
      const local = localStorage.getItem('daiso_saved_drawers');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isStoreStockModalOpen, setIsStoreStockModalOpen] = useState<boolean>(false);
  const [storeStockModalTab, setStoreStockModalTab] = useState<'all_in_stock' | 'search'>('all_in_stock');
  const [activeStore, setActiveStore] = useState<StoreInfo | null>(() => {
    try {
      const saved = localStorage.getItem('daiso_active_store');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [onlyStoreStock, setOnlyStoreStock] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daiso_only_store_stock') === 'true';
    } catch {
      return false;
    }
  });
  const [storeInStockCodes, setStoreInStockCodes] = useState<Set<string>>(new Set());
  const [storeStockMap, setStoreStockMap] = useState<Record<string, { quantity: number; in_stock: boolean; status_label: string }>>({});
  const [isFilteringStoreStock, setIsFilteringStoreStock] = useState<boolean>(false);
  const [isSaveDrawerModalOpen, setIsSaveDrawerModalOpen] = useState<boolean>(false);
  const [isMyDrawersModalOpen, setIsMyDrawersModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [draftRecovery, setDraftRecovery] = useState<{ drawer: DrawerDimension; items: FittedItem[]; timestamp: number } | null>(null);
  const captureCanvasRef = useRef<() => string | null>(() => null);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  };
  const [isFillGoodsModalOpen, setIsFillGoodsModalOpen] = useState<boolean>(false);
  const [isAiPurposeModalOpen, setIsAiPurposeModalOpen] = useState<boolean>(false);
  const [isFridgeModalOpen, setIsFridgeModalOpen] = useState<boolean>(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [isCustomPresetModalOpen, setIsCustomPresetModalOpen] = useState<boolean>(false);
  const [customPresets, setCustomPresets] = useState<SpacePreset[]>(() => {
    try {
      const local = localStorage.getItem('daiso_custom_space_presets');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });
  const [isPurposeModalOpen, setIsPurposeModalOpen] = useState<boolean>(false);
  const [activePurpose, setActivePurpose] = useState<PurposePreset | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [allowRotation, setAllowRotation] = useState<boolean>(false);
  const [allowHeightExceed, setAllowHeightExceed] = useState<boolean>(false);
  const [margin, setMargin] = useState<number>(0.1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daiso_dark_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [postureMode, setPostureMode] = useState<'auto' | 'standing' | 'flat'>('auto');
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isLayoutReportOpen, setIsLayoutReportOpen] = useState<boolean>(false);

  // Dynamic Window Width & Layout Reflow
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [compactTab, setCompactTab] = useState<'catalog' | 'inspector'>('catalog');
  const [splitRatio, setSplitRatio] = useState<number>(46); // 46% for 3D Viewport, 54% for Menu Panel
  const [isResizingSplit, setIsResizingSplit] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    // W3C Device Posture API (Foldable Galaxy Z Flip 8, iPhone Duo, Flex Mode)
    if (typeof navigator !== 'undefined' && 'devicePosture' in navigator) {
      const posture = (navigator as any).devicePosture;
      const onPostureChange = () => {
        if (posture.type === 'folded') {
          // Half-folded (Flex Mode): Snap split ratio to 50% for physical hinge alignment
          setSplitRatio(50);
        }
      };
      posture.addEventListener?.('change', onPostureChange);
      return () => {
        window.removeEventListener('resize', handleResize);
        posture.removeEventListener?.('change', onPostureChange);
      };
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Deep Link Shared Fitting Restoration (?s={shortId} or ?share={base64})
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('s');
    const shareData = params.get('share');

    if (shareId) {
      fetch(`${BACKEND_URL}/api/drawers/share/${shareId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.drawer && data.items) {
            setDrawer(data.drawer);
            commitItems(data.items);
            if (data.activeStore) setActiveStore(data.activeStore);
            if (data.activePurpose) setActivePurpose(data.activePurpose);
            setToastMessage(`✨ "${data.title || '공유받은 서랍'}" 피팅을 불러왔습니다! (${data.items.length}개 상품)`);
            window.history.replaceState({}, '', window.location.pathname);
          }
        })
        .catch(err => {
          console.warn('Failed to load shared drawer:', err);
        });
    } else if (shareData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(escape(atob(shareData))));
        if (parsed && parsed.drawer && parsed.items) {
          setDrawer(parsed.drawer);
          commitItems(parsed.items);
          if (parsed.activeStore) setActiveStore(parsed.activeStore);
          if (parsed.activePurpose) setActivePurpose(parsed.activePurpose);
          setToastMessage(`✨ 공유받은 서랍 피팅을 성공적으로 불러왔습니다! (${parsed.items.length}개 상품)`);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (e) {
        console.warn('Failed to decode share data:', e);
      }
    } else {
      // Check for auto-saved draft recovery
      try {
        const savedDraft = localStorage.getItem('daiso_draft_state');
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft && draft.drawer && draft.items && Array.isArray(draft.items) && draft.items.length > 0) {
            if (Date.now() - (draft.timestamp || 0) < 7 * 24 * 60 * 60 * 1000) {
              setDraftRecovery(draft);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse draft state:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isResizingSplit) return;
    const handleMove = (clientY: number) => {
      const headerHeight = 60;
      const availableH = Math.max(300, window.innerHeight - headerHeight);
      const pct = ((clientY - headerHeight) / availableH) * 100;
      setSplitRatio(Math.round(Math.max(25, Math.min(72, pct))));
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientY);
    };
    const onEnd = () => setIsResizingSplit(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isResizingSplit]);

  // Dark Mode: html.dark-mode class 토글 + localStorage 지속 저장
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    try {
      localStorage.setItem('daiso_dark_mode', String(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  const handleToggleDarkMode = () => setIsDarkMode(prev => !prev);

  const isCompactLayout = windowWidth < 1024;

  const [items, setItems] = useState<FittedItem[]>([]);
  const initialFitDoneRef = useRef<boolean>(false);

  // 상품 카탈로그 지연 로딩 완료 후 첫 자동 배치 (16MB JSON 동적 로드)
  // After: if user restores a draft or shared link, that layout intentionally overwrites the auto-fit
  useEffect(() => {
    if (initialFitDoneRef.current) return;
    if (products.length === 0) return;
    initialFitDoneRef.current = true;
    commitItems(fitContainersOnly({ width: 32.0, depth: 40.0, height: 7.0 }, products, { allowRotation: false, margin: 0.1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<string | null>(null);

  // ============ 피팅 이력 (Undo/Redo) 시스템 ============
  const MAX_HISTORY = 50;
  const itemsRef = useRef<FittedItem[]>(items);
  const undoStackRef = useRef<FittedItem[][]>([]);
  const redoStackRef = useRef<FittedItem[][]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /**
   * 이력을 자동 기록하는 items 커밋 함수.
   * 기존 setItems를 대체해 모든 상태 변경이 undo/redo 스택에 저장됩니다.
   */
  const commitItems = useCallback((next: FittedItem[] | ((prev: FittedItem[]) => FittedItem[])) => {
    const resolved = typeof next === 'function' ? (next as (prev: FittedItem[]) => FittedItem[])(itemsRef.current) : next;
    if (resolved === itemsRef.current) return; // reference 동일 시 스킵
    undoStackRef.current.push(itemsRef.current);
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    redoStackRef.current = []; // 새 변경 시 redo 스택 초기화
    setCanUndo(true);
    setCanRedo(false);
    setHistoryCount(undoStackRef.current.length);
    itemsRef.current = resolved;
    setItems(resolved);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(itemsRef.current);
    const prev = undoStackRef.current.pop()!;
    itemsRef.current = prev;
    setItems(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setHistoryCount(undoStackRef.current.length);
    setSelectedItemInstanceId(null);
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(itemsRef.current);
    const next = redoStackRef.current.pop()!;
    itemsRef.current = next;
    setItems(next);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setHistoryCount(undoStackRef.current.length);
    setSelectedItemInstanceId(null);
  }, []);

  // Auto-save draft when drawer or items change (debounced 1s)
  useEffect(() => {
    if (items.length > 0) {
      const timer = setTimeout(() => {
        try {
          const draft = {
            drawer,
            items,
            timestamp: Date.now()
          };
          localStorage.setItem('daiso_draft_state', JSON.stringify(draft));
        } catch {}
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [drawer, items]);

  // Catalog Width & Resizing
  const [catalogWidth, setCatalogWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('daiso_catalog_width');
      return saved ? parseInt(saved, 10) : 360;
    } catch {
      return 360;
    }
  });
  const [isResizingCatalog, setIsResizingCatalog] = useState(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingCatalog(true);
  };

  useEffect(() => {
    if (!isResizingCatalog) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(620, e.clientX));
      setCatalogWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingCatalog(false);
      try {
        localStorage.setItem('daiso_catalog_width', catalogWidth.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingCatalog, catalogWidth]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchProductsFromBackend = async () => {
    let loaded = false;
    try {
      const res = await fetch(`${BACKEND_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: DaisoProduct[] = data.map((item: any) => ({
            id: item.id,
            itemCode: item.item_code || item.itemCode,
            name: item.name,
            category: item.category,
            categoryLabel: item.category_label || item.categoryLabel,
            largeCategory: item.large_category || item.largeCategory,
            middleCategory: item.middle_category || item.middleCategory,
            smallCategory: item.small_category || item.smallCategory,
            categoryHierarchy: item.category_hierarchy || item.categoryHierarchy,
            width: item.width,
            depth: item.depth,
            height: item.height,
            dimSource: item.dim_source || item.dimSource,
            price: item.price,
            color: item.color,
            imageUrl: item.image_url || item.imageUrl || '',
            isSoldOut: item.is_sold_out ?? item.isSoldOut,
            description: item.description,
            mallUrl: item.mall_url || item.mallUrl
          }));
          setProducts(mapped);
          loaded = true;
        }
      }
    } catch {
      // network error → local fallback below
    }
    // backend에서 상품을 못 받았으면, 런타임 지연 로딩된 local 16MB 카탈로그로 fallback
    if (!loaded) {
      try {
        const local = await loadLocalDaisoProducts();
        setProducts(local);
      } catch (err) {
        console.error('Failed to load local catalog:', err);
      }
    }
    setIsProductsLoading(false);
  };

  const fetchUserSavedDrawers = async (authToken: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drawers`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.drawers) {
          setSavedDrawers(data.drawers);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user saved drawers:', err);
    }
  };

  const fetchUserCustomPresets = async (authToken: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drawers/custom-presets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.presets && Array.isArray(data.presets)) {
          setCustomPresets(prev => {
            const map = new Map<string, SpacePreset>();
            prev.forEach(p => map.set(p.id, p));
            data.presets.forEach((p: SpacePreset) => map.set(p.id, p));
            const merged = Array.from(map.values());
            localStorage.setItem('daiso_custom_space_presets', JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user custom presets:', err);
    }
  };

  const migrateGuestDrawers = async (authToken: string): Promise<number> => {
    try {
      const localSavedStr = localStorage.getItem('daiso_saved_drawers') || '[]';
      const localDrawers: SavedDrawer[] = JSON.parse(localSavedStr);
      const guestDrawers = localDrawers.filter(d => d.id.startsWith('local-'));

      if (guestDrawers.length > 0) {
        const res = await fetch(`${BACKEND_URL}/api/drawers/migrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ guest_drawers: guestDrawers })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.drawers) {
            setSavedDrawers(data.drawers);
            localStorage.setItem('daiso_saved_drawers', JSON.stringify(data.drawers));
            return guestDrawers.length;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to migrate guest drawers:', e);
    }
    return 0;
  };

  useEffect(() => {
    fetchProductsFromBackend();
    if (token) {
      fetchUserSavedDrawers(token);
      fetchUserCustomPresets(token);
    }
  }, [token]);

  const handleAuthSuccess = async (authedUser: User, authToken: string) => {
    setUser(authedUser);
    setToken(authToken);
    localStorage.setItem('daiso_user', JSON.stringify(authedUser));
    localStorage.setItem('daiso_auth_token', authToken);

    // 1. Migrate any guest drawers into user DB account
    const migratedCount = await migrateGuestDrawers(authToken);
    // 2. Fetch full user drawers and custom space presets from cloud
    await fetchUserSavedDrawers(authToken);
    await fetchUserCustomPresets(authToken);

    if (migratedCount > 0) {
      showToast(`🎉 ${authedUser.username}님, 로그인 완료! 게스트 상태 서랍 ${migratedCount}개가 계정으로 안전하게 연동되었습니다.`);
    } else {
      showToast(`🎉 ${authedUser.username}님, 성공적으로 로그인되었습니다!`);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('daiso_user');
    localStorage.removeItem('daiso_auth_token');
    // Load local drawers fallback
    try {
      const local = localStorage.getItem('daiso_saved_drawers');
      setSavedDrawers(local ? JSON.parse(local) : []);
    } catch {
      setSavedDrawers([]);
    }
    showToast('로그아웃되었습니다.');
  };

  const handleDrawerSaved = (newDrawer: SavedDrawer) => {
    setSavedDrawers(prev => [newDrawer, ...prev.filter(d => d.id !== newDrawer.id)]);
    showToast(`⭐ "${newDrawer.name}" 서랍이 성공적으로 저장되었습니다!`);
  };

  const handleSelectSavedDrawer = (sd: SavedDrawer) => {
    setDrawer({ width: sd.width, depth: sd.depth, height: sd.height });
    if (sd.items && Array.isArray(sd.items) && sd.items.length > 0) {
      commitItems(sd.items);
      showToast(`⭐ "${sd.name}" 서랍 크기 및 배치(${sd.items.length}개)를 불러왔습니다.`);
    } else {
      showToast(`⭐ "${sd.name}" 서랍 크기(${sd.width}×${sd.depth}×${sd.height}cm)를 적용했습니다.`);
    }
  };

  const handleDeleteSavedDrawer = async (id: string) => {
    if (!confirm('정말 이 저장된 서랍을 삭제하시겠습니까?')) return;

    if (token && !id.startsWith('local-')) {
      try {
        await fetch(`${BACKEND_URL}/api/drawers/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }

    setSavedDrawers(prev => {
      const next = prev.filter(d => d.id !== id);
      localStorage.setItem('daiso_saved_drawers', JSON.stringify(next));
      return next;
    });
    showToast('저장된 서랍이 삭제되었습니다.');
  };

  const handleUpdateDrawerName = async (id: string, newName: string) => {
    if (token && !id.startsWith('local-')) {
      try {
        await fetch(`${BACKEND_URL}/api/drawers/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: newName })
        });
      } catch (e) {
        console.warn('Failed to update drawer name on server:', e);
      }
    }

    setSavedDrawers(prev => {
      const next = prev.map(d =>
        d.id === id ? { ...d, name: newName, updatedAt: new Date().toISOString() } : d
      );
      localStorage.setItem('daiso_saved_drawers', JSON.stringify(next));
      return next;
    });
    showToast(`✏️ 서랍 이름이 "${newName}"으로 변경되었습니다.`);
  };

  const handleSyncProducts = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${BACKEND_URL}/api/scraper/sync`, { method: 'POST' });
      setTimeout(async () => {
        await fetchProductsFromBackend();
        setIsSyncing(false);
      }, 3500);
    } catch {
      alert(`백엔드 서버(${BACKEND_URL})가 구동 중인지 확인해주세요.`);
      setIsSyncing(false);
    }
  };

  const fetchStoreInStock = async (storeCode: string) => {
    try {
      setIsFilteringStoreStock(true);
      const containerCodes = products
        .filter(p => isDrawerOrganizer(p) && p.itemCode)
        .slice(0, 100)
        .map(p => p.itemCode);

      if (!containerCodes.length) return;

      const res = await fetch(`${BACKEND_URL}/api/stores/filter-in-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_code: storeCode,
          product_codes: containerCodes
        })
      });
      if (res.ok) {
        const data = await res.json();
        const inCodes: string[] = data.in_stock_codes || [];
        setStoreInStockCodes(new Set(inCodes));
        setStoreStockMap(data.stock_map || {});
      }
    } catch (err) {
      console.error('Error filtering store stock:', err);
    } finally {
      setIsFilteringStoreStock(false);
    }
  };

  useEffect(() => {
    if (activeStore) {
      localStorage.setItem('daiso_active_store', JSON.stringify(activeStore));
      fetchStoreInStock(activeStore.store_code);
    } else {
      localStorage.removeItem('daiso_active_store');
      setStoreInStockCodes(new Set());
      setStoreStockMap({});
    }
  }, [activeStore]);

  const handleToggleOnlyStoreStock = () => {
    setOnlyStoreStock(prev => {
      const next = !prev;
      localStorage.setItem('daiso_only_store_stock', String(next));
      if (next && activeStore && storeInStockCodes.size === 0) {
        fetchStoreInStock(activeStore.store_code);
      }
      return next;
    });
  };

  const handleOpenStoreStockModal = (tab: 'all_in_stock' | 'search' = 'all_in_stock') => {
    setStoreStockModalTab(tab);
    setIsStoreStockModalOpen(true);
  };

  const handleFitWithStoreStock = async (store: StoreInfo) => {
    setActiveStore(store);
    setOnlyStoreStock(true);
    localStorage.setItem('daiso_only_store_stock', 'true');
    setIsFilteringStoreStock(true);
    try {
      const containerCodes = products
        .filter(p => isDrawerOrganizer(p) && p.itemCode)
        .slice(0, 100)
        .map(p => p.itemCode);

      const res = await fetch(`${BACKEND_URL}/api/stores/filter-in-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_code: store.store_code,
          product_codes: containerCodes
        })
      });
      if (res.ok) {
        const data = await res.json();
        const inCodes = new Set<string>(data.in_stock_codes || []);
        setStoreInStockCodes(inCodes);
        setStoreStockMap(data.stock_map || {});

        const inStockCandidates = products.filter(p => inCodes.has(p.itemCode));
        if (inStockCandidates.length > 0) {
          const fitted = fitContainersOnly(drawer, inStockCandidates, { allowRotation, margin });
          if (fitted.length > 0) {
            commitItems(fitted);
            setSelectedItemInstanceId(null);
            showToast(`🎉 [${store.name}] 실시간 재고 수납함으로 피팅 완료! (${fitted.length}개)`);
          } else {
            showToast(`⚠️ [${store.name}]의 재고 수납함 중 현재 서랍 크기에 맞는 배치가 없습니다.`);
          }
        } else {
          showToast(`⚠️ [${store.name}]에 현재 확인된 수납함 재고가 없습니다.`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFilteringStoreStock(false);
    }
  };

  const handleAutoFitContainers = async () => {
    if (activeStore && onlyStoreStock) {
      setIsFilteringStoreStock(true);
      try {
        let targetCodes = storeInStockCodes;
        if (targetCodes.size === 0) {
          const containerCodes = products
            .filter(p => isDrawerOrganizer(p) && p.itemCode)
            .slice(0, 100)
            .map(p => p.itemCode);

          const res = await fetch(`${BACKEND_URL}/api/stores/filter-in-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              store_code: activeStore.store_code,
              product_codes: containerCodes
            })
          });
          if (res.ok) {
            const data = await res.json();
            targetCodes = new Set(data.in_stock_codes || []);
            setStoreInStockCodes(targetCodes);
            setStoreStockMap(data.stock_map || {});
          }
        }

        const inStockCandidates = products.filter(p => targetCodes.has(p.itemCode));
        if (inStockCandidates.length === 0) {
          alert(`선택하신 [${activeStore.name}]의 현재 재고 보유 수납함이 부족합니다. 전체 상품으로 피팅하시거나 다른 매장을 선택해주세요.`);
          return;
        }

        const fitted = fitContainersOnly(drawer, inStockCandidates, { allowRotation, margin });
        if (fitted.length === 0) {
          alert(`[${activeStore.name}]의 재고 수납함 중 현재 서랍 치수(${drawer.width}×${drawer.depth}×${drawer.height}cm)에 딱 맞는 조합이 없습니다.`);
          return;
        }

        commitItems(fitted);
        setSelectedItemInstanceId(null);
        // placement validation included
        const validation = getFitValidation(drawer, fitted, products, { allowRotation, margin });
        const validationSummary = validation.isIdealFit ? '이상적 적합' : '일부 조정 권장';
        const stabilityNote = validation.stackStability && !validation.stackStability.stable
          ? ` ⚠️ ${validation.stackStability.message}`
          : '';
        showToast(`🎉 [${activeStore.name}] 피팅 완료! (${fitted.length}개) [${validationSummary}]${stabilityNote}`);
      } catch (e) {
        console.error('Error auto-fitting with store stock:', e);
        const fitted = fitContainersOnly(drawer, products, { allowRotation, margin });
        commitItems(fitted);
        setSelectedItemInstanceId(null);
      } finally {
        setIsFilteringStoreStock(false);
      }
    } else {
      const fitted = fitContainersOnly(drawer, products, { allowRotation, margin });
      commitItems(fitted);
      setSelectedItemInstanceId(null);
    }
  };

  const handleOpenFillGoodsModal = () => {
    setIsFillGoodsModalOpen(true);
  };

  const handleSelectFridgeCompartment = (
    compartment: FridgeCompartment,
    model: FridgeModel,
    customDim?: DrawerDimension,
    autoFitOrganizers: boolean = false,
    autoFillFoods: boolean = false
  ) => {
    const finalDim: DrawerDimension = customDim || compartment.dimensions;
    setDrawer(finalDim);
    setSelectedItemInstanceId(null);

    if (autoFitOrganizers) {
      // Prioritize refrigerator organizing products matching compartment recommendations
      const kwRegex = new RegExp(compartment.recommendedKeywords.join('|'), 'i');
      const fridgeCandidates = products.filter(p => {
        if (!isDrawerOrganizer(p)) return false;
        if (p.height > finalDim.height) return false;
        return true;
      });

      // Sort: items matching compartment recommended keywords first!
      fridgeCandidates.sort((a, b) => {
        const aKw = kwRegex.test(a.name) ? 1 : 0;
        const bKw = kwRegex.test(b.name) ? 1 : 0;
        if (aKw !== bKw) return bKw - aKw;
        const aFridge = /냉장고|트레이|바스켓|바구니/.test(a.name) ? 1 : 0;
        const bFridge = /냉장고|트레이|바스켓|바구니/.test(b.name) ? 1 : 0;
        return bFridge - aFridge;
      });

      const fitted = fitContainersOnly(finalDim, fridgeCandidates, { allowRotation: false });

      if (autoFillFoods && fitted.length > 0) {
        // Automatically fill placed organizers with real refrigerator food/drink items (e.g. cans, bottles, eggs, condiments)
        const filledRes = fillCategoryGoodsIntoContainers(
          finalDim,
          fitted,
          'kitchen_food',
          products,
          { allowRotation: true, allowHeightExceed: false, postureMode: 'standing' }
        );
        if (filledRes.countPlaced > 0) {
          commitItems(filledRes.updatedItems);
          showToast(
            `❄️ [${model.brand} ${model.capacityLiters}L] "${compartment.name}" 맞춤 수납함 ${fitted.length}개 + 식료품/음료 ${filledRes.countPlaced}개를 풀세팅했습니다!`
          );
          return;
        }
      }

      commitItems(fitted);
      showToast(
        `❄️ [${model.brand} ${model.capacityLiters}L] "${compartment.name}" 맞춤 수납함 ${fitted.length}개를 자동 배치했습니다!`
      );
    } else {
      commitItems(prev =>
        prev.filter(i => {
          const { width: w, depth: d } = getItemDimensions(i);
          return i.x + w <= finalDim.width + 0.1 && i.z + d <= finalDim.depth + 0.1;
        })
      );
      showToast(
        `❄️ [${model.brand} ${model.capacityLiters}L] "${compartment.name}" 규격(${finalDim.width}×${finalDim.depth}×${finalDim.height}cm)을 적용했습니다.`
      );
    }
  };

  const handleSelectSpacePreset = (preset: SpacePreset, customDim?: DrawerDimension) => {
    const finalDim: DrawerDimension = customDim || preset.dimensions;
    setDrawer(finalDim);
    setSelectedItemInstanceId(null);
    commitItems(prev =>
      prev.filter(i => {
        const { width: w, depth: d } = getItemDimensions(i);
        return i.x + w <= finalDim.width + 0.1 && i.z + d <= finalDim.depth + 0.1;
      })
    );
    showToast(`📐 [${preset.name}] 공간 규격(${finalDim.width}×${finalDim.depth}×${finalDim.height}cm)이 적용되었습니다.`);
  };

  const handleSaveCustomPreset = async (preset: SpacePreset) => {
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/drawers/custom-presets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(preset)
        });
      } catch (e) {
        console.warn('Failed to sync custom preset to cloud:', e);
      }
    }

    setCustomPresets(prev => {
      const updated = [preset, ...prev.filter(p => p.id !== preset.id)];
      localStorage.setItem('daiso_custom_space_presets', JSON.stringify(updated));
      return updated;
    });
    setDrawer(preset.dimensions);
    setSelectedItemInstanceId(null);
    showToast(
      `⭐ 새 맞춤 공간 "${preset.name}" (${preset.dimensions.width}×${preset.dimensions.depth}×${preset.dimensions.height}cm)이 저장 및 적용되었습니다.${token ? ' (클라우드 연동)' : ''}`
    );
  };

  const handleDeleteCustomPreset = async (id: string) => {
    if (token && !id.startsWith('custom-local-')) {
      try {
        await fetch(`${BACKEND_URL}/api/drawers/custom-presets/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.warn('Failed to delete custom preset from cloud:', e);
      }
    }

    setCustomPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('daiso_custom_space_presets', JSON.stringify(updated));
      return updated;
    });
    showToast('맞춤 공간 프리셋이 삭제되었습니다.');
  };

  const handleFillCategory = (category: string) => {
    const res = fillCategoryGoodsIntoContainers(drawer, items, category, products, {
      allowRotation,
      allowHeightExceed,
      postureMode
    });
    commitItems(res.updatedItems);
    setSelectedItemInstanceId(null);
    if (res.countPlaced > 0) {
      showToast(`선택하신 테마의 서로 다른 소품 ${res.countPlaced}개를 수납함에 골고루 배치했습니다! (중복 없음)`);
    } else {
      showToast('수납함 속 빈 공간이 부족하여 채울 수 없습니다.');
    }
  };

  const handleApplyAiGoods = (recommendedProducts: DaisoProduct[]) => {
    const normalized = recommendedProducts.map(normalizeProduct);
    const res = fillDiverseGoodsIntoContainers(drawer, items, normalized, {
      allowRotation,
      allowHeightExceed,
      postureMode
    });
    commitItems(res.updatedItems);
    setSelectedItemInstanceId(null);
    if (res.countPlaced > 0) {
      showToast(`✨ AI 맞춤 추천: 서로 다른 소품 ${res.countPlaced}개를 수납함에 다양하게 채웠습니다!`);
    } else {
      showToast('수납함 속 빈 공간이 부족하여 채울 수 없습니다. 수납함을 먼저 배치해주세요.');
    }
  };

  const handleFillSpecificProduct = (product: DaisoProduct) => {
    const res = fillSelectedGoodIntoContainers(drawer, items, product, {
      allowRotation,
      allowHeightExceed,
      postureMode
    });
    commitItems(res.updatedItems);
    setSelectedItemInstanceId(null);
    if (res.countPlaced > 0) {
      showToast(`"${product.name}" ${res.countPlaced}개를 수납함에 최대한 채웠습니다!`);
    } else {
      showToast(`"${product.name}"을 넣을 수 있는 수납함 내부 공간이 없습니다.`);
    }
  };

  const handleClearGoodsOnly = () => {
    const cleared = clearGoodsOnly(items);
    commitItems(cleared);
    setSelectedItemInstanceId(null);
    showToast('수납함 구조는 남겨두고 내부 소품만 비웠습니다.');
  };

  const handleApplyPurposeAndDrawer = (
    targetDrawer: DrawerDimension,
    purpose: PurposePreset,
    fittedItems: FittedItem[]
  ) => {
    setDrawer(targetDrawer);
    commitItems(fittedItems);
    setActivePurpose(purpose);
    setSelectedItemInstanceId(null);
    showToast(
      `🎯 [${purpose.name}] 서랍(${targetDrawer.width}×${targetDrawer.depth}×${targetDrawer.height}cm) & 맞춤 수납함+소품 ${fittedItems.length}개 자동 배치 완료!`
    );
  };

  const handleFilterCatalogOnly = (
    targetDrawer: DrawerDimension,
    purpose: PurposePreset
  ) => {
    setDrawer(targetDrawer);
    setActivePurpose(purpose);
    showToast(
      `🎯 [${purpose.name}] 서랍(${targetDrawer.width}×${targetDrawer.depth}×${targetDrawer.height}cm) 맞춤 카탈로그 필터 적용 (높이 ≤ ${targetDrawer.height}cm)`
    );
  };

  const handleClearPurpose = () => {
    setActivePurpose(null);
    showToast('용도 맞춤 필터가 해제되었습니다.');
  };

  const handleAddProduct = (product: DaisoProduct) => {
    const currentItems = [...items];
    const isLiner = isMatOrLiner(product);
    const isContainerProd = isOpenContainer(product);
    // Allow 3D posture switching (standing/lying) for stored goods; keep open containers upright ('flat') by default
    const candidateOrientations = getDistinct3DOrientations(product, !isLiner && !isContainerProd);
    candidateOrientations.sort((a, b) => {
      if (postureMode === 'standing' && !isContainerProd) {
        if (a.isStanding !== b.isStanding) return a.isStanding ? -1 : 1;
      } else if (postureMode === 'flat') {
        if (a.isStanding !== b.isStanding) return a.isStanding ? 1 : -1;
      } else {
        const aDef = a.posture === 'flat' ? 0 : 1;
        const bDef = b.posture === 'flat' ? 0 : 1;
        if (aDef !== bDef) return aDef - bDef;
      }
      return (a.rotation === 0 ? 0 : 1) - (b.rotation === 0 ? 0 : 1);
    });

    let placed = false;

    // 1. If not a large mat, first try nesting inside an existing open container / basket / tray!
    if (!isLiner) {
      const openContainers = currentItems.filter(i => isOpenContainer(i.product) && (!i.posture || i.posture === 'flat'));
      for (const container of openContainers) {
        const { width: cW, depth: cD } = getItemDimensions(container);

        for (const ori of candidateOrientations) {
          const curW = ori.width;
          const curD = ori.depth;
          const curH = ori.height;

          // Check if product footprint fits inside container cavity
          if (curW <= cW - 0.4 && curD <= cD - 0.4) {
            const startX = container.x + 0.3;
            const endX = container.x + cW - curW - 0.2;
            const startZ = container.z + 0.3;
            const endZ = container.z + cD - curD - 0.2;

            for (let z = startZ; z <= endZ; z += 0.5) {
              for (let x = startX; x <= endX; x += 0.5) {
                const resting = calculateRestingY(
                  {
                    instanceId: 'candidate',
                    productId: product.id,
                    product,
                    x,
                    z,
                    width: curW,
                    depth: curD,
                    rotation: ori.rotation
                  },
                  currentItems,
                  drawer.height
                );

                const collides = checkItemCollision(
                  {
                    instanceId: 'candidate',
                    x,
                    y: resting.y,
                    z,
                    width: curW,
                    depth: curD,
                    height: curH,
                    product
                  },
                  currentItems,
                  drawer
                ).collides;

                if (!collides) {
                  const newItem: FittedItem = {
                    instanceId: `${product.id}-${Date.now()}`,
                    productId: product.id,
                    product,
                    x: Math.round(x * 10) / 10,
                    y: resting.y,
                    z: Math.round(z * 10) / 10,
                    rotation: ori.rotation,
                    posture: ori.posture
                  };
                  commitItems([...currentItems, newItem]);
                  setSelectedItemInstanceId(newItem.instanceId);
                  const postureNote = ori.posture !== 'flat' ? ` (${ori.label})` : '';
                  setToastMessage(`"${product.name}"${postureNote}을(를) "${container.product.name}" 안에 담았습니다.`);
                  setTimeout(() => setToastMessage(null), 3000);
                  placed = true;
                  break;
                }
              }
              if (placed) break;
            }
          }
          if (placed) break;
        }
        if (placed) break;
      }
    }

    // 2. If not nested in a container, search for free space on drawer floor / liner
    if (!placed) {
      for (const ori of candidateOrientations) {
        const curW = ori.width;
        const curD = ori.depth;
        const curH = ori.height;

        for (let z = 0; z <= drawer.depth - curD; z += 0.5) {
          for (let x = 0; x <= drawer.width - curW; x += 0.5) {
            const resting = calculateRestingY(
              {
                instanceId: 'candidate',
                productId: product.id,
                product,
                x,
                z,
                width: curW,
                depth: curD,
                rotation: ori.rotation
              },
              currentItems,
              drawer.height
            );

            const collides = checkItemCollision(
              {
                instanceId: 'candidate',
                x,
                y: resting.y,
                z,
                width: curW,
                depth: curD,
                height: curH,
                product
              },
              currentItems,
              drawer
            ).collides;

            if (!collides) {
              const newItem: FittedItem = {
                instanceId: `${product.id}-${Date.now()}`,
                productId: product.id,
                product,
                x: Math.round(x * 10) / 10,
                y: resting.y,
                z: Math.round(z * 10) / 10,
                rotation: ori.rotation,
                posture: ori.posture
              };
              commitItems([...currentItems, newItem]);
              setSelectedItemInstanceId(newItem.instanceId);
              if (ori.posture !== 'flat' || ori.rotation === 90) {
                showToast(`"${product.name}"을(를) 공간에 맞춰 ${ori.label}${ori.rotation === 90 ? '(90° 회전)' : ''} 형태로 배치했습니다.`);
              }
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
        if (placed) break;
      }
    }

    // 3. User Request: If floor space is not sufficient or exceeds drawer dimensions, allow adding anyway after confirmation!
    if (!placed) {
      const defaultOri = candidateOrientations[0];
      const curW = defaultOri.width;
      const curD = defaultOri.depth;
      let reasonText = '';
      if (curW > drawer.width || curD > drawer.depth) {
        reasonText = `물품의 바닥 면적(${product.width}×${product.depth}cm)이 서랍 크기(${drawer.width}×${drawer.depth}cm)보다 큽니다.`;
      } else {
        reasonText = `서랍 내 빈 공간이 부족하여 다른 물품과 간섭이 발생합니다.`;
      }

      const confirmAdd = window.confirm(
        `[⚠️ 서랍 공간 부족 안내]\n\n${reasonText}\n\n그래도 서랍에 강제로 담으시겠습니까?\n(담은 후 3D 화면에서 직접 90° 회전하거나 세우기/눕히기로 조정할 수 있습니다.)`
      );

      if (!confirmAdd) return;

      // Force place at best-effort offset within drawer
      const cascadeOffset = (currentItems.length * 2.5) % Math.max(2, drawer.width - 4);
      const forceX = Math.max(0, Math.min(Math.max(0, drawer.width - curW), cascadeOffset));
      const forceZ = Math.max(0, Math.min(Math.max(0, drawer.depth - curD), cascadeOffset));

      const resting = calculateRestingY(
        {
          instanceId: 'forced-candidate',
          productId: product.id,
          product,
          x: forceX,
          z: forceZ,
          width: curW,
          depth: curD,
          rotation: defaultOri.rotation
        },
        currentItems,
        drawer.height
      );

      const newItem: FittedItem = {
        instanceId: `${product.id}-${Date.now()}`,
        productId: product.id,
        product,
        x: Math.round(forceX * 10) / 10,
        y: resting.y,
        z: Math.round(forceZ * 10) / 10,
        rotation: defaultOri.rotation,
        posture: defaultOri.posture
      };

      commitItems([...currentItems, newItem]);
      setSelectedItemInstanceId(newItem.instanceId);
      showToast(`⚠️ "${product.name}"을(를) 서랍에 담았습니다. 3D에서 [세우기/눕히기] 또는 [90° 회전]으로 조정해보세요.`);
    }
  };

  const handleRemoveItem = (instanceId: string) => {
    commitItems(prev => prev.filter(i => i.instanceId !== instanceId));
    triggerHaptic();
    if (selectedItemInstanceId === instanceId) {
      setSelectedItemInstanceId(null);
    }
  };

  const handleMoveItem = (instanceId: string, newX: number, newZ: number, newY?: number): boolean => {
    const item = items.find(i => i.instanceId === instanceId);
    if (!item) return false;

    const { width: curW, depth: curD, height: curH } = getItemDimensions(item);

    const finalY =
      newY !== undefined
        ? newY
        : calculateRestingY(
            {
              instanceId,
              productId: item.productId,
              product: item.product,
              x: newX,
              z: newZ,
              width: curW,
              depth: curD,
              rotation: item.rotation
            },
            items,
            drawer.height
          ).y;

    const collision = checkItemCollision(
      {
        instanceId,
        x: newX,
        y: finalY,
        z: newZ,
        width: curW,
        depth: curD,
        height: curH,
        product: item.product
      },
      items,
      drawer
    );

    if (collision.collides) {
      return false;
    }

    commitItems(prev =>
      prev.map(i => (i.instanceId === instanceId ? { ...i, x: newX, y: finalY, z: newZ } : i))
    );
    triggerHaptic();
    return true;
  };

  const handleRotateItem = (instanceId: string) => {
    const item = items.find(i => i.instanceId === instanceId);
    if (!item) return;

    const nextRot: 0 | 90 = item.rotation === 0 ? 90 : 0;
    const { width: nextW, depth: nextD, height: curH } = getOrientedDimensions(
      item.product,
      nextRot,
      item.posture || 'flat'
    );

    // Clamp X/Z slightly if rotating near drawer right/front wall
    const clampedX = Math.max(0, Math.min(item.x, Math.max(0, drawer.width - nextW)));
    const clampedZ = Math.max(0, Math.min(item.z, Math.max(0, drawer.depth - nextD)));

    const resting = calculateRestingY(
      {
        instanceId,
        productId: item.productId,
        product: item.product,
        x: clampedX,
        z: clampedZ,
        width: nextW,
        depth: nextD,
        rotation: nextRot
      },
      items,
      drawer.height
    );

    const collision = checkItemCollision(
      {
        instanceId,
        x: clampedX,
        y: resting.y,
        z: clampedZ,
        width: nextW,
        depth: nextD,
        height: curH,
        product: item.product
      },
      items,
      drawer
    );

    if (collision.collides) {
      const msg = collision.reason === 'wall'
        ? `회전 시 서랍 벽(${drawer.width}×${drawer.depth}cm)을 벗어납니다.\n\n그래도 90도 회전하시겠습니까?`
        : `회전 시 "${collision.collidedWith}"과 겹칩니다.\n\n그래도 90도 회전하시겠습니까?`;
      if (!window.confirm(msg)) {
        return;
      }
    }

    commitItems(prev =>
      prev.map(i =>
        i.instanceId === instanceId
          ? { ...i, x: Math.round(clampedX * 10) / 10, z: Math.round(clampedZ * 10) / 10, rotation: nextRot, y: resting.y }
          : i
      )
    );
    triggerHaptic();
    showToast(`🔄 "${item.product.name}"을(를) 바닥 90° 회전했습니다 (${nextW}×${nextD}×${curH}cm).`);
  };

  const handleToggleItemPosture = (instanceId: string) => {
    const item = items.find(i => i.instanceId === instanceId);
    if (!item || isMatOrLiner(item.product)) return;

    const nextPosture = getNextPosture(item.product, item.posture || 'flat');
    const { width: nextW, depth: nextD, height: nextH } = getOrientedDimensions(
      item.product,
      item.rotation,
      nextPosture
    );
    const postureInfo = getPostureInfo(item.product, item.rotation, nextPosture);

    // Keep item inside drawer bounds when posture changes footprint
    const clampedX = Math.max(0, Math.min(item.x, Math.max(0, drawer.width - nextW)));
    const clampedZ = Math.max(0, Math.min(item.z, Math.max(0, drawer.depth - nextD)));

    const resting = calculateRestingY(
      {
        instanceId,
        productId: item.productId,
        product: item.product,
        x: clampedX,
        z: clampedZ,
        width: nextW,
        depth: nextD,
        rotation: item.rotation
      },
      items,
      drawer.height
    );

    const collision = checkItemCollision(
      {
        instanceId,
        x: clampedX,
        y: resting.y,
        z: clampedZ,
        width: nextW,
        depth: nextD,
        height: nextH,
        product: item.product
      },
      items,
      drawer
    );

    if (collision.collides) {
      const msg =
        collision.reason === 'wall'
          ? `${postureInfo.label}(${nextW}×${nextD}×${nextH}cm)으로 변경 시 서랍 벽을 벗어납니다.\n\n그래도 변경하시겠습니까?`
          : `${postureInfo.label}(${nextW}×${nextD}×${nextH}cm)으로 변경 시 "${collision.collidedWith}"과 겹칩니다.\n\n그래도 변경하시겠습니까?`;
      if (!window.confirm(msg)) {
        return;
      }
    }

    commitItems(prev =>
      prev.map(i =>
        i.instanceId === instanceId
          ? {
              ...i,
              x: Math.round(clampedX * 10) / 10,
              z: Math.round(clampedZ * 10) / 10,
              y: resting.y,
              posture: nextPosture
            }
          : i
      )
    );
    triggerHaptic();
    showToast(
      `${postureInfo.icon} "${item.product.name}" 보관 방향 전환: ${postureInfo.label} (${nextW}×${nextD}×${nextH}cm)`
    );
  };

  const handleReset = () => {
    commitItems([]);
    setSelectedItemInstanceId(null);
  };

  const handleChangeDrawer = (newDim: DrawerDimension) => {
    setDrawer(newDim);
    commitItems(prev =>
      prev.filter(i => {
        const { width: w, depth: d } = getItemDimensions(i);
        // Height can extend above drawer, only check floor boundary (width & depth)
        return i.x + w <= newDim.width + 0.1 && i.z + d <= newDim.depth + 0.1;
      })
    );
  };

  // ============ 키보드 단축키 ============
  // Ctrl/Cmd+Z: 되돌리기 | Ctrl/Cmd+Shift+Z / Ctrl+Y: 재실행
  // Delete/Backspace: 선택 아이템 삭제 | R: 선택 아이템 90° 회전
  // 방향키: 선택 아이템 0.5cm 이동 | Esc: 선택 해제
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Input/textarea에 포커스가 있을 때 단축키 비활성화
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }
      if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 선택 아이템 기반 단축키
      if (selectedItemInstanceId) {
        const selItem = items.find(i => i.instanceId === selectedItemInstanceId);
        if (!selItem) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleRemoveItem(selItem.instanceId);
          return;
        }
        if (e.key.toLowerCase() === 'r' && !isMod) {
          e.preventDefault();
          handleRotateItem(selItem.instanceId);
          return;
        }

        // 방향키로 0.5cm씩 미세 이동
        const step = 0.5;
        const { width: w, depth: d } = getItemDimensions(selItem);
        let dx = 0, dz = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dz = -step;
        else if (e.key === 'ArrowDown') dz = step;
        else return;

        e.preventDefault();
        const newX = Math.max(0, Math.min(drawer.width - w, selItem.x + dx));
        const newZ = Math.max(0, Math.min(drawer.depth - d, selItem.z + dz));
        handleMoveItem(selItem.instanceId, newX, newZ);
        return;
      }

      // 선택 해제
      if (e.key === 'Escape') {
        setSelectedItemInstanceId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItemInstanceId, items, drawer, handleUndo, handleRedo, handleRemoveItem, handleRotateItem, handleMoveItem]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-daiso-canvas">
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Store Stock Live Checking Overlay Badge */}
      {isFilteringStoreStock && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-950/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl border border-emerald-600 animate-in fade-in">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          <span>{activeStore ? `[${activeStore.name}]` : '다이소 매장'} 공식 실시간 재고 대조 중...</span>
        </div>
      )}

      {/* Top Navigation */}
      <HeaderNav
        drawer={drawer}
        onChangeDrawer={handleChangeDrawer}
        onAutoFit={handleAutoFitContainers}
        onFillGoods={handleOpenFillGoodsModal}
        onOpenAiPurposeModal={() => setIsAiPurposeModalOpen(true)}
        hasGoodsPlaced={items.some(isNestedGood)}
        onClearGoodsOnly={handleClearGoodsOnly}
        allowRotation={allowRotation}
        onToggleAllowRotation={() => setAllowRotation(prev => !prev)}
        allowHeightExceed={allowHeightExceed}
        onToggleAllowHeightExceed={() => setAllowHeightExceed(prev => !prev)}
        margin={margin}
        onMarginChange={setMargin}
        onReset={handleReset}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenLayoutReport={() => setIsLayoutReportOpen(true)}
        historyCount={historyCount}
        onSyncProducts={handleSyncProducts}
        isSyncing={isSyncing}
        totalProductsCount={products.length}
        savedDrawers={savedDrawers}
        onSelectSavedDrawer={handleSelectSavedDrawer}
        onDeleteSavedDrawer={handleDeleteSavedDrawer}
        onOpenSaveModal={() => setIsSaveDrawerModalOpen(true)}
        onOpenMyDrawersModal={() => setIsMyDrawersModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenStoreStockModal={handleOpenStoreStockModal}
        activeStore={activeStore}
        onlyStoreStock={onlyStoreStock}
        onToggleOnlyStoreStock={handleToggleOnlyStoreStock}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenFridgeModal={() => setIsFridgeModalOpen(true)}
        onOpenPurposeModal={() => setIsPurposeModalOpen(true)}
        onOpenPresetModal={() => setIsPresetModalOpen(true)}
        customPresets={customPresets}
        onOpenCreateCustomPreset={() => setIsCustomPresetModalOpen(true)}
        activePurposeName={activePurpose?.name}
        onToggleCatalog={() => setIsCatalogOpen(prev => !prev)}
        onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
        isCatalogOpen={isCatalogOpen}
        isInspectorOpen={isInspectorOpen}
      />

      {/* Draft Auto-save Recovery Floating Banner */}
      {draftRecovery && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xl bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center justify-between animate-in slide-in-from-top-4 gap-3">
          <div className="flex items-center space-x-2.5 truncate">
            <span className="text-xl shrink-0">💡</span>
            <div className="truncate">
              <span className="text-xs font-bold text-amber-300 block truncate">
                이전에 작업 중이던 서랍이 남아있습니다!
              </span>
              <span className="text-[11px] text-slate-300 block truncate font-mono">
                {draftRecovery.drawer.width}×{draftRecovery.drawer.depth}×{draftRecovery.drawer.height}cm (수납함 {draftRecovery.items.length}개)
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => {
                setDrawer(draftRecovery.drawer);
                commitItems(draftRecovery.items);
                setDraftRecovery(null);
                showToast(`✨ 이전 작업 서랍(${draftRecovery.items.length}개 수납함)을 성공적으로 복구했습니다.`);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors active:scale-95 shadow-sm"
            >
              이어서 작업
            </button>
            <button
              onClick={() => {
                setDraftRecovery(null);
                localStorage.removeItem('daiso_draft_state');
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="새로 시작 (보관 취소)"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace (Dynamic Layout: Desktop 3-Column vs Compact Dynamic Top/Bottom Split) */}
      <div className="flex flex-1 w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden select-none relative">
        {isCompactLayout ? (
          /* Compact Viewports (< 1024px): Dynamic Vertical Split - 3D Drawer on Top + Menu Windows on Bottom */
          <div className="flex flex-col flex-1 w-full h-full overflow-hidden select-none">
            {/* Top Pane: 3D Drawer Viewport (Does NOT monopolize the screen!) */}
            <div style={{ height: `${splitRatio}%` }} className="w-full relative overflow-hidden bg-slate-900 shrink-0">
              <DrawerCanvas3D
                drawer={drawer}
                items={items}
                selectedItemInstanceId={selectedItemInstanceId}
                onSelectItem={setSelectedItemInstanceId}
                onRemoveItem={handleRemoveItem}
                onRotateItem={handleRotateItem}
                onTogglePosture={handleToggleItemPosture}
                onMoveItem={handleMoveItem}
                onPreviewProduct={setPreviewProduct}
                onRegisterCapture={(fn) => { captureCanvasRef.current = fn; }}
                margin={margin}
              />
            </div>

            {/* Draggable Horizontal Handle for Top/Bottom Split Ratio */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSplit(true);
              }}
              onTouchStart={() => setIsResizingSplit(true)}
              onDoubleClick={() => setSplitRatio(46)}
              className={`w-full h-3 cursor-row-resize flex items-center justify-center shrink-0 transition-colors z-20 ${
                isResizingSplit ? 'bg-daiso-red' : 'bg-slate-200 hover:bg-daiso-red/70'
              }`}
              title="위아래로 드래그하여 3D 화면과 메뉴 창 높이 조절 (더블클릭 시 기본 비율 46% 복원)"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-400" />
            </div>

            {/* Dynamic Segmented Menu Switcher & Real-time Stats Divider */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200 z-10 shrink-0 shadow-2xs">
              <div className="flex items-center space-x-1 bg-slate-200/90 p-0.5 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setCompactTab('catalog')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                    compactTab === 'catalog'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={13} className="text-daiso-red" />
                  <span>상품 카탈로그 ({products.length})</span>
                </button>
                <button
                  onClick={() => setCompactTab('inspector')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                    compactTab === 'inspector'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer size={13} className="text-indigo-600" />
                  <span>피팅 견적 ({items.length}개)</span>
                </button>
              </div>

              {/* Real-time Price Badge */}
              <div className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                총 ₩{items.reduce((sum, item) => sum + item.product.price, 0).toLocaleString()}원
              </div>
            </div>

            {/* Bottom Pane: Active Menu Panel (Catalog or Inspector with full width) */}
            <div className="flex-1 w-full overflow-hidden relative">
              {compactTab === 'catalog' ? (
                <ProductCatalog
                  products={products}
                  drawer={drawer}
                  onAddProduct={handleAddProduct}
                  onFillMaxProduct={handleFillSpecificProduct}
                  onPreviewProduct={setPreviewProduct}
                  isFullWidth={true}
                  activePurpose={activePurpose}
                  onClearPurpose={handleClearPurpose}
                  onOpenPurposeModal={() => setIsPurposeModalOpen(true)}
                  onSelectPurpose={(p) => setActivePurpose(p)}
                  activeStore={activeStore}
                  onlyStoreStock={onlyStoreStock}
                  onToggleOnlyStoreStock={handleToggleOnlyStoreStock}
                  onOpenStoreModal={() => handleOpenStoreStockModal('search')}
                  storeInStockCodes={storeInStockCodes}
                  storeStockMap={storeStockMap}
                  isLoading={isProductsLoading}
                />
              ) : (
                <FittedInspector
                  drawer={drawer}
                  items={items}
                  selectedItemInstanceId={selectedItemInstanceId}
                  onSelectItem={setSelectedItemInstanceId}
                  onRemoveItem={handleRemoveItem}
                  onRotateItem={handleRotateItem}
                  onTogglePosture={handleToggleItemPosture}
                  onClearAll={handleReset}
                  onAutoFit={handleAutoFitContainers}
                  onFillGoods={handleOpenFillGoodsModal}
                  hasGoodsPlaced={items.some(isNestedGood)}
                  onClearGoodsOnly={handleClearGoodsOnly}
                  onPreviewProduct={setPreviewProduct}
                  onOpenExportModal={() => setIsExportModalOpen(true)}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                  onOpenStoreStockModal={handleOpenStoreStockModal}
                  activeStore={activeStore}
                  isFullWidth={true}
                />
              )}
            </div>
          </div>
        ) : (
          /* Desktop Viewports (>= 1024px): 3-Column Side-by-Side View */
          <div className="flex flex-1 w-full h-full overflow-hidden select-none relative">
            {/* Left: Daiso Products Catalog */}
            <ProductCatalog
              products={products}
              drawer={drawer}
              onAddProduct={handleAddProduct}
              onFillMaxProduct={handleFillSpecificProduct}
              onPreviewProduct={setPreviewProduct}
              width={catalogWidth}
              activePurpose={activePurpose}
              onClearPurpose={handleClearPurpose}
              onOpenPurposeModal={() => setIsPurposeModalOpen(true)}
              onSelectPurpose={(p) => setActivePurpose(p)}
              activeStore={activeStore}
              onlyStoreStock={onlyStoreStock}
              onToggleOnlyStoreStock={handleToggleOnlyStoreStock}
              onOpenStoreModal={() => handleOpenStoreStockModal('search')}
              storeInStockCodes={storeInStockCodes}
              storeStockMap={storeStockMap}
              isLoading={isProductsLoading}
            />

            {/* Draggable Divider for Catalog Width */}
            <div
              onMouseDown={handleMouseDownResize}
              className={`w-2 h-full cursor-col-resize hover:bg-daiso-red/80 transition-colors z-20 flex items-center justify-center shrink-0 border-x border-slate-200/80 group ${
                isResizingCatalog ? 'bg-daiso-red ring-2 ring-daiso-red/30' : 'bg-slate-100'
              }`}
              title="좌우로 드래그하여 상품 카탈로그 너비 조절"
            >
              <div className="w-0.5 h-7 rounded-full bg-slate-300 group-hover:bg-white transition-colors" />
            </div>

            {/* Center: 3D Drawer Viewport */}
            <main className="flex-1 h-full relative overflow-hidden">
              <DrawerCanvas3D
                drawer={drawer}
                items={items}
                selectedItemInstanceId={selectedItemInstanceId}
                onSelectItem={setSelectedItemInstanceId}
                onRemoveItem={handleRemoveItem}
                onRotateItem={handleRotateItem}
                onTogglePosture={handleToggleItemPosture}
                onMoveItem={handleMoveItem}
                onPreviewProduct={setPreviewProduct}
                onRegisterCapture={(fn) => { captureCanvasRef.current = fn; }}
                margin={margin}
              />
            </main>

            {/* Right: Bill of Materials & Fitting Inspector */}
            <FittedInspector
              drawer={drawer}
              items={items}
              selectedItemInstanceId={selectedItemInstanceId}
              onSelectItem={setSelectedItemInstanceId}
              onRemoveItem={handleRemoveItem}
              onRotateItem={handleRotateItem}
              onTogglePosture={handleToggleItemPosture}
              onClearAll={handleReset}
              onAutoFit={handleAutoFitContainers}
              onFillGoods={handleOpenFillGoodsModal}
              hasGoodsPlaced={items.some(isNestedGood)}
              onClearGoodsOnly={handleClearGoodsOnly}
              onPreviewProduct={setPreviewProduct}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenShareModal={() => setIsShareModalOpen(true)}
              onOpenStoreStockModal={handleOpenStoreStockModal}
              activeStore={activeStore}
            />
          </div>
        )}
      </div>

      {/* Select Goods to Fill Modal (2단계 사용자 선택 채우기) */}
      <FillGoodsModal
        isOpen={isFillGoodsModalOpen}
        onClose={() => setIsFillGoodsModalOpen(false)}
        products={products}
        onFillCategory={handleFillCategory}
        onFillSpecificProduct={handleFillSpecificProduct}
        onOpenAiPurposeModal={() => setIsAiPurposeModalOpen(true)}
        allowHeightExceed={allowHeightExceed}
        onToggleAllowHeightExceed={() => setAllowHeightExceed(prev => !prev)}
        postureMode={postureMode}
        onChangePostureMode={setPostureMode}
      />

      {/* AI Purpose Recommendation Modal (용도 맞춤 추천) */}
      <AiPurposeModal
        isOpen={isAiPurposeModalOpen}
        onClose={() => setIsAiPurposeModalOpen(false)}
        onApplyAiGoods={handleApplyAiGoods}
        allProducts={products}
        allowHeightExceed={allowHeightExceed}
        onToggleAllowHeightExceed={() => setAllowHeightExceed(prev => !prev)}
      />

      {/* Full Product Photo Preview Modal */}
      <ProductImageModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onAddProduct={handleAddProduct}
      />

      {/* User Login & Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Admin User Management Dashboard Modal */}
      {user?.role === 'admin' && (
        <AdminUsersModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          authToken={token || ''}
          currentUserId={user.id}
        />
      )}

      {/* Save Custom Drawer Modal */}
      <SaveDrawerModal
        isOpen={isSaveDrawerModalOpen}
        onClose={() => setIsSaveDrawerModalOpen(false)}
        drawer={drawer}
        items={items}
        user={user}
        token={token}
        onSaved={handleDrawerSaved}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Samsung & LG Refrigerator Model & Compartment Selector Modal */}
      <FridgeSelectorModal
        isOpen={isFridgeModalOpen}
        onClose={() => setIsFridgeModalOpen(false)}
        onSelectCompartment={handleSelectFridgeCompartment}
        currentDrawer={drawer}
      />

      {/* Rich Space Preset Explorer Modal (Refrigerators & Kitchen Storage) */}
      <SpacePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={handleSelectSpacePreset}
        customPresets={customPresets}
        onOpenCreateCustomPreset={() => setIsCustomPresetModalOpen(true)}
        onDeleteCustomPreset={handleDeleteCustomPreset}
      />

      {/* User Custom Space Preset Creator Modal */}
      <CustomPresetModal
        isOpen={isCustomPresetModalOpen}
        onClose={() => setIsCustomPresetModalOpen(false)}
        onSavePreset={handleSaveCustomPreset}
        initialDimensions={drawer}
      />

      {/* Drawer Dimension & Specific Purpose Recommendation & 3D Auto-Fitting Modal */}
      <DrawerPurposeModal
        isOpen={isPurposeModalOpen}
        onClose={() => setIsPurposeModalOpen(false)}
        currentDrawer={drawer}
        products={products}
        onApplyPurposeAndDrawer={handleApplyPurposeAndDrawer}
        onFilterCatalogOnly={handleFilterCatalogOnly}
      />

      {/* Export & Print Shopping List & Blueprint Modal */}
      <ExportShoppingListModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        drawer={drawer}
        items={items}
        onOpenStoreStock={() => setIsStoreStockModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Real-time Daiso Store Pickup Inventory Checker Modal */}
      <StoreStockModal
        isOpen={isStoreStockModalOpen}
        onClose={() => setIsStoreStockModalOpen(false)}
        items={items}
        activeStore={activeStore}
        onSelectActiveStore={setActiveStore}
        initialTab={storeStockModalTab}
        onFitWithStoreStock={handleFitWithStoreStock}
      />

      {/* KakaoTalk & 3D Interactive Fitting Share Modal */}
      <KakaoShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        drawer={drawer}
        items={items}
        activeStore={activeStore}
        activePurpose={activePurpose}
        onCaptureCanvas={() => captureCanvasRef.current()}
      />

      {/* User Saved Drawers & History Dashboard Modal */}
      <MyDrawersModal
        isOpen={isMyDrawersModalOpen}
        onClose={() => setIsMyDrawersModalOpen(false)}
        savedDrawers={savedDrawers}
        onSelectDrawer={handleSelectSavedDrawer}
        onDeleteDrawer={handleDeleteSavedDrawer}
        onUpdateDrawerName={handleUpdateDrawerName}
        onOpenSaveModal={() => setIsSaveDrawerModalOpen(true)}
        onOpenShareDrawer={(sd) => {
          setDrawer({ width: sd.width, depth: sd.depth, height: sd.height });
          if (sd.items && Array.isArray(sd.items)) commitItems(sd.items);
          setIsShareModalOpen(true);
        }}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentDrawer={drawer}
      />

      {/* Layout Validation Report Modal */}
      <LayoutReportModal
        isOpen={isLayoutReportOpen}
        onClose={() => setIsLayoutReportOpen(false)}
        drawer={drawer}
        items={items}
        products={products}
        options={{ allowRotation, margin }}
      />
    </div>
  );
};
