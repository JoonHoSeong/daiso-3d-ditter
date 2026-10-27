import React, { useState, useEffect } from 'react';
import { DrawerCanvas3D } from './components/DrawerCanvas3D';
import { ProductCatalog } from './components/ProductCatalog';
import { FittedInspector } from './components/FittedInspector';
import { HeaderNav } from './components/HeaderNav';
import { ProductImageModal } from './components/ProductImageModal';
import { AuthModal } from './components/AuthModal';
import { SaveDrawerModal } from './components/SaveDrawerModal';
import { ExportShoppingListModal } from './components/ExportShoppingListModal';
import {
  DAISO_PRODUCTS,
  DrawerDimension,
  FittedItem,
  DaisoProduct
} from './data/daisoProducts';
import { User, SavedDrawer } from './types/auth';
import {
  fitContainersOnly,
  clearGoodsOnly,
  isNestedGood,
  fillSelectedGoodIntoContainers,
  fillCategoryGoodsIntoContainers,
  fillDiverseGoodsIntoContainers
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
import { CheckCircle2, Layers, Printer } from 'lucide-react';
import { FillGoodsModal } from './components/FillGoodsModal';
import { AiPurposeModal } from './components/AiPurposeModal';
import { FridgeSelectorModal } from './components/FridgeSelectorModal';
import { DrawerPurposeModal } from './components/DrawerPurposeModal';
import { PurposePreset } from './data/purposePresets';
import { FridgeModel, FridgeCompartment } from './data/fridgeModels';
import { normalizeProduct } from './utils/normalizeProduct';

import { BACKEND_URL } from './config';

export const App: React.FC = () => {
  const [drawer, setDrawer] = useState<DrawerDimension>({
    width: 32.0,
    depth: 40.0,
    height: 7.0
  });

  const [products, setProducts] = useState<DaisoProduct[]>(DAISO_PRODUCTS);
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
  const [isSaveDrawerModalOpen, setIsSaveDrawerModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isFillGoodsModalOpen, setIsFillGoodsModalOpen] = useState<boolean>(false);
  const [isAiPurposeModalOpen, setIsAiPurposeModalOpen] = useState<boolean>(false);
  const [isFridgeModalOpen, setIsFridgeModalOpen] = useState<boolean>(false);
  const [isPurposeModalOpen, setIsPurposeModalOpen] = useState<boolean>(false);
  const [activePurpose, setActivePurpose] = useState<PurposePreset | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [allowRotation, setAllowRotation] = useState<boolean>(false);
  const [allowHeightExceed, setAllowHeightExceed] = useState<boolean>(false);
  const [postureMode, setPostureMode] = useState<'auto' | 'standing' | 'flat'>('auto');
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

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
    return () => window.removeEventListener('resize', handleResize);
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

  const isCompactLayout = windowWidth < 1024;

  const [items, setItems] = useState<FittedItem[]>(() => {
    return fitContainersOnly({ width: 32.0, depth: 40.0, height: 7.0 }, DAISO_PRODUCTS, { allowRotation: false });
  });

  const [selectedItemInstanceId, setSelectedItemInstanceId] = useState<string | null>(null);

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
        }
      }
    } catch {
      // Fallback to local DAISO_PRODUCTS
    }
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

  useEffect(() => {
    fetchProductsFromBackend();
    if (token) {
      fetchUserSavedDrawers(token);
    }
  }, [token]);

  const handleAuthSuccess = (authedUser: User, authToken: string) => {
    setUser(authedUser);
    setToken(authToken);
    localStorage.setItem('daiso_user', JSON.stringify(authedUser));
    localStorage.setItem('daiso_auth_token', authToken);
    fetchUserSavedDrawers(authToken);
    showToast(`🎉 ${authedUser.username}님, 성공적으로 로그인되었습니다!`);
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
      setItems(sd.items);
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

  const handleAutoFitContainers = () => {
    const fitted = fitContainersOnly(drawer, products, { allowRotation });
    setItems(fitted);
    setSelectedItemInstanceId(null);
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
          setItems(filledRes.updatedItems);
          showToast(
            `❄️ [${model.brand} ${model.capacityLiters}L] "${compartment.name}" 맞춤 수납함 ${fitted.length}개 + 식료품/음료 ${filledRes.countPlaced}개를 풀세팅했습니다!`
          );
          return;
        }
      }

      setItems(fitted);
      showToast(
        `❄️ [${model.brand} ${model.capacityLiters}L] "${compartment.name}" 맞춤 수납함 ${fitted.length}개를 자동 배치했습니다!`
      );
    } else {
      setItems(prev =>
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

  const handleFillCategory = (category: string) => {
    const res = fillCategoryGoodsIntoContainers(drawer, items, category, products, {
      allowRotation,
      allowHeightExceed,
      postureMode
    });
    setItems(res.updatedItems);
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
    setItems(res.updatedItems);
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
    setItems(res.updatedItems);
    setSelectedItemInstanceId(null);
    if (res.countPlaced > 0) {
      showToast(`"${product.name}" ${res.countPlaced}개를 수납함에 최대한 채웠습니다!`);
    } else {
      showToast(`"${product.name}"을 넣을 수 있는 수납함 내부 공간이 없습니다.`);
    }
  };

  const handleClearGoodsOnly = () => {
    const cleared = clearGoodsOnly(items);
    setItems(cleared);
    setSelectedItemInstanceId(null);
    showToast('수납함 구조는 남겨두고 내부 소품만 비웠습니다.');
  };

  const handleApplyPurposeAndDrawer = (
    targetDrawer: DrawerDimension,
    purpose: PurposePreset,
    fittedItems: FittedItem[]
  ) => {
    setDrawer(targetDrawer);
    setItems(fittedItems);
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
                  setItems([...currentItems, newItem]);
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
              setItems([...currentItems, newItem]);
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

      setItems([...currentItems, newItem]);
      setSelectedItemInstanceId(newItem.instanceId);
      showToast(`⚠️ "${product.name}"을(를) 서랍에 담았습니다. 3D에서 [세우기/눕히기] 또는 [90° 회전]으로 조정해보세요.`);
    }
  };

  const handleRemoveItem = (instanceId: string) => {
    setItems(prev => prev.filter(i => i.instanceId !== instanceId));
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

    setItems(prev =>
      prev.map(i => (i.instanceId === instanceId ? { ...i, x: newX, y: finalY, z: newZ } : i))
    );
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

    setItems(prev =>
      prev.map(i =>
        i.instanceId === instanceId
          ? { ...i, x: Math.round(clampedX * 10) / 10, z: Math.round(clampedZ * 10) / 10, rotation: nextRot, y: resting.y }
          : i
      )
    );
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

    setItems(prev =>
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
    showToast(
      `${postureInfo.icon} "${item.product.name}" 보관 방향 전환: ${postureInfo.label} (${nextW}×${nextD}×${nextH}cm)`
    );
  };

  const handleReset = () => {
    setItems([]);
    setSelectedItemInstanceId(null);
  };

  const handleChangeDrawer = (newDim: DrawerDimension) => {
    setDrawer(newDim);
    setItems(prev =>
      prev.filter(i => {
        const { width: w, depth: d } = getItemDimensions(i);
        // Height can extend above drawer, only check floor boundary (width & depth)
        return i.x + w <= newDim.width + 0.1 && i.z + d <= newDim.depth + 0.1;
      })
    );
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-daiso-canvas">
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
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
        onReset={handleReset}
        onSyncProducts={handleSyncProducts}
        isSyncing={isSyncing}
        totalProductsCount={products.length}
        savedDrawers={savedDrawers}
        onSelectSavedDrawer={handleSelectSavedDrawer}
        onDeleteSavedDrawer={handleDeleteSavedDrawer}
        onOpenSaveModal={() => setIsSaveDrawerModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenFridgeModal={() => setIsFridgeModalOpen(true)}
        onOpenPurposeModal={() => setIsPurposeModalOpen(true)}
        activePurposeName={activePurpose?.name}
        onToggleCatalog={() => setIsCatalogOpen(prev => !prev)}
        onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
        isCatalogOpen={isCatalogOpen}
        isInspectorOpen={isInspectorOpen}
      />

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
              />
            </div>

            {/* Draggable Horizontal Handle for Top/Bottom Split Ratio */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSplit(true);
              }}
              onTouchStart={() => setIsResizingSplit(true)}
              className={`w-full h-2.5 cursor-row-resize flex items-center justify-center shrink-0 transition-colors z-20 ${
                isResizingSplit ? 'bg-daiso-red' : 'bg-slate-200 hover:bg-daiso-red/70'
              }`}
              title="위아래로 드래그하여 3D 화면과 메뉴 창 높이 조절"
            >
              <div className="w-10 h-1 rounded-full bg-slate-400" />
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
      />
    </div>
  );
};
