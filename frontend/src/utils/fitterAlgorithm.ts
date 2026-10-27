import { DaisoProduct, DrawerDimension, FittedItem, ItemPosture } from '../data/daisoProducts';
import {
  isMatOrLiner,
  isStackableProduct,
  isDrawerOrganizer,
  isOpenContainer,
  getItemDimensions,
  getDistinct3DOrientations
} from './stacking';

export interface AutoFitOptions {
  allowRotation?: boolean; // default: false (정리를 위한 회전 없는 단정한 정렬)
  allowHeightExceed?: boolean; // default: false (채울 때 서랍 높이 초과 허용 여부)
  postureMode?: 'auto' | 'standing' | 'flat'; // default: 'auto' (자동 3D 세우기/눕히기 | 세워서 보관 우선 | 눕혀서 보관 우선)
}

/**
 * Structured Column-Grid Drawer Organization & Fitting Algorithm
 * 1단계: 수납함 구조 배치 (Containers Only)
 * - 서랍 공간에 딱 맞는 순수 수납함, 트레이, 바구니 틀만 정렬 배치합니다.
 * - 소품/물건류는 일체 배치하지 않고 수납함 골격만 완성합니다.
 */
export function fitContainersOnly(
  drawer: DrawerDimension,
  availableProducts: DaisoProduct[],
  options: AutoFitOptions = { allowRotation: false }
): FittedItem[] {
  const result: FittedItem[] = [];
  const allowRotation = options.allowRotation ?? false;

  // 보관함(수납함/트레이/바구니) 기본 설정: 서랍 높이 초과 금지 (drawer.height 이하만 엄격 필터링)
  const fittingProducts = availableProducts.filter(p => isDrawerOrganizer(p) && p.height <= drawer.height);
  if (fittingProducts.length === 0) return result;

  // Filter out any flat mats/liners for container foundation
  const solidProducts = fittingProducts.filter(p => !isMatOrLiner(p));

  // Occupancy grid for the floor (0.5cm resolution)
  const scale = 2; // 1 unit = 0.5cm
  const gridW = Math.floor(drawer.width * scale);
  const gridD = Math.floor(drawer.depth * scale);
  const occupied: boolean[][] = Array.from({ length: gridW }, () => Array(gridD).fill(false));

  const isFree = (x: number, z: number, w: number, d: number) => {
    if (x + w > gridW || z + d > gridD) return false;
    for (let ix = x; ix < x + w; ix++) {
      for (let iz = z; iz < z + d; iz++) {
        if (occupied[ix][iz]) return false;
      }
    }
    return true;
  };

  const markOccupied = (x: number, z: number, w: number, d: number) => {
    for (let ix = x; ix < x + w; ix++) {
      for (let iz = z; iz < z + d; iz++) {
        occupied[ix][iz] = true;
      }
    }
  };

  // Target organizer candidates: strictly authentic drawer storage boxes, trays, baskets, and acrylic organizers only!
  const organizerProducts = solidProducts.filter(p => isDrawerOrganizer(p));
  if (organizerProducts.length === 0) return result;
  const candidatePool = organizerProducts;

  // Exclude single-piece cutlery dividers unless alone
  const modularCandidates = candidatePool
    .filter(p => p.id !== 'divider-cutlery')
    .sort((a, b) => (b.width * b.depth) - (a.width * a.depth));

  let baseY = 0;

  // --- STRUCTURED ORGANIZER PLACEMENT (COLUMN-ALIGNED LANES) ---
  // The primary foundation layout is configured purely with modular storage containers, trays, and baskets.
  const floorItems: FittedItem[] = [];

  // 1. Column-based structured lane layout
  // We advance across the drawer width (X), carving clean vertical lanes where items stack along depth (Z)
  let curX = 0;
  while (curX < gridW) {
    const remW = gridW - curX;
    if (remW < 8) break; // Less than 4cm remaining

    // Find best candidate for starting/filling this column
    // Prefer modular organizers whose unrotated width fits comfortably in remW
    const fittingColCandidates = modularCandidates.filter(p => {
      const pw = Math.round(p.width * scale);
      const pd = Math.round(p.depth * scale);
      return pw <= remW && pd <= gridD;
    });

    if (fittingColCandidates.length === 0) {
      curX += 2; // advance 1cm
      continue;
    }

    // Pick a primary organizer for this lane
    // Prefer modular organizers with standard widths (e.g. 7cm ~ 20cm)
    const primaryProd = fittingColCandidates[0];
    const colWidth = Math.round(primaryProd.width * scale);

    // Filter products that share this exact column width (or can cleanly tile in this lane)
    const laneProds = fittingColCandidates.filter(p => Math.round(p.width * scale) === colWidth);

    let curZ = 0;
    let itemsInLane = 0;

    while (curZ < gridD) {
      const remD = gridD - curZ;
      if (remD < 8) break; // Less than 4cm remaining

      // Find an organizer that fits in the remaining depth of this lane
      const itemToPlace = laneProds.find(p => Math.round(p.depth * scale) <= remD && isFree(curX, curZ, colWidth, Math.round(p.depth * scale)));

      if (itemToPlace) {
        const itemD = Math.round(itemToPlace.depth * scale);
        markOccupied(curX, curZ, colWidth, itemD);

        const fitted: FittedItem = {
          instanceId: `${itemToPlace.id}-${result.length + 1}`,
          productId: itemToPlace.id,
          product: itemToPlace,
          x: curX / scale,
          y: baseY,
          z: curZ / scale,
          rotation: 0 // Strict 0 deg: NO arbitrary rotation
        };
        result.push(fitted);
        floorItems.push(fitted);

        curZ += itemD;
        itemsInLane++;
      } else {
        // Try any compatible candidate with matching width
        break;
      }
    }

    if (itemsInLane > 0) {
      curX += colWidth;
    } else {
      curX += 2;
    }
  }

  // 2. Secondary Pass: If remaining large gaps exist, place remaining unrotated modular organizers
  for (let z = 0; z < gridD; z += 2) {
    for (let x = 0; x < gridW; x += 2) {
      if (occupied[x][z]) continue;

      for (const prod of modularCandidates) {
        const pw = Math.round(prod.width * scale);
        const pd = Math.round(prod.depth * scale);

        // Always try unrotated first (Strict 0 rotation)
        if (isFree(x, z, pw, pd)) {
          markOccupied(x, z, pw, pd);
          const item: FittedItem = {
            instanceId: `${prod.id}-${result.length + 1}`,
            productId: prod.id,
            product: prod,
            x: x / scale,
            y: baseY,
            z: z / scale,
            rotation: 0
          };
          result.push(item);
          floorItems.push(item);
          break;
        }

        // Try 90deg rotated ONLY if user explicitly enabled allowRotation
        if (allowRotation && isFree(x, z, pd, pw)) {
          markOccupied(x, z, pd, pw);
          const item: FittedItem = {
            instanceId: `${prod.id}-${result.length + 1}-rot`,
            productId: prod.id,
            product: prod,
            x: x / scale,
            y: baseY,
            z: z / scale,
            rotation: 90
          };
          result.push(item);
          floorItems.push(item);
          break;
        }
      }
    }
  }

  // Pass 3: Vertical Stacking (Layer 2)
  // For stackable organizers where drawer height allows stacking, stack a matching 2nd tier right on top!
  for (const baseItem of floorItems) {
    const stackTopY = baseItem.y + baseItem.product.height;
    if (
      isStackableProduct(baseItem.product) &&
      stackTopY + baseItem.product.height <= drawer.height + 0.1
    ) {
      result.push({
        instanceId: `${baseItem.product.id}-stack-${result.length + 1}`,
        productId: baseItem.product.id,
        product: baseItem.product,
        x: baseItem.x,
        y: Math.round(stackTopY * 10) / 10,
        z: baseItem.z,
        rotation: baseItem.rotation
      });
    }
  }

  return result;
}

/**
 * 하위 호환성을 위한 alias: 기본 자동 피팅은 1단계(수납함 구조 배치)를 실행합니다.
 */
export const autoFitDrawer = fitContainersOnly;

/**
 * 사용자가 선택한 특정 상품을 수납함 빈 공간에 들어갈 수 있는 만큼 최대한 채웁니다.
 */
export function fillSelectedGoodIntoContainers(
  drawer: DrawerDimension,
  currentItems: FittedItem[],
  product: DaisoProduct,
  options: AutoFitOptions = { allowRotation: false }
): { updatedItems: FittedItem[]; countPlaced: number } {
  // If no containers exist yet, generate container frame first
  let baseContainers = currentItems.filter(it => isDrawerOrganizer(it.product) || isMatOrLiner(it.product));
  if (baseContainers.length === 0) {
    baseContainers = fitContainersOnly(drawer, [product], options);
  }

  const result: FittedItem[] = [...currentItems];
  let totalPlaced = 0;

  const scale = 2; // 0.5cm resolution
  const postureMode = options.postureMode ?? 'auto';
  const allOrientations = getDistinct3DOrientations(product, true);

  for (const container of baseContainers) {
    if (!isOpenContainer(container.product)) continue;

    const { width: cW, depth: cD } = getItemDimensions(container);
    const margin = 0.5;
    const cavityW = cW - margin * 2;
    const cavityD = cD - margin * 2;
    const cavityY = (container.y || 0) + 0.3;

    // Grid inside this cavity
    const gridW = Math.floor(cavityW * scale);
    const gridD = Math.floor(cavityD * scale);
    if (gridW <= 0 || gridD <= 0) continue;

    // Filter orientations that satisfy height and container footprint
    const validOrientations = allOrientations.filter(ori => {
      if (!options.allowHeightExceed && cavityY + ori.height > drawer.height + 0.1) {
        return false;
      }
      const pw = Math.round(ori.width * scale);
      const pd = Math.round(ori.depth * scale);
      return pw > 0 && pd > 0 && pw <= gridW && pd <= gridD;
    });

    if (validOrientations.length === 0) continue;

    // Sort candidate orientations based on postureMode preference
    validOrientations.sort((a, b) => {
      if (postureMode === 'standing') {
        if (a.isStanding !== b.isStanding) return a.isStanding ? -1 : 1;
        // Among standing, smaller floor area packs more items upright
        const areaDiff = a.width * a.depth - b.width * b.depth;
        if (Math.abs(areaDiff) > 0.1) return areaDiff;
      } else if (postureMode === 'flat') {
        if (a.isStanding !== b.isStanding) return a.isStanding ? 1 : -1;
        const heightDiff = a.height - b.height;
        if (Math.abs(heightDiff) > 0.1) return heightDiff;
      } else {
        // 'auto': prefer default ('flat') if it fits, otherwise pick orientation that fits best
        const aIsDefault = a.posture === 'flat' ? 0 : 1;
        const bIsDefault = b.posture === 'flat' ? 0 : 1;
        if (aIsDefault !== bIsDefault) return aIsDefault - bIsDefault;
      }
      const aRot = a.rotation === 0 ? 0 : 1;
      const bRot = b.rotation === 0 ? 0 : 1;
      return aRot - bRot;
    });

    const chosenOri = validOrientations[0];
    const pw = Math.round(chosenOri.width * scale);
    const pd = Math.round(chosenOri.depth * scale);

    const occupied: boolean[][] = Array.from({ length: gridW }, () => Array(gridD).fill(false));

    // Mark occupied by already existing nested items inside this container
    const existingInside = result.filter(it => {
      if (it.instanceId === container.instanceId) return false;
      const { width: itW, depth: itD } = getItemDimensions(it);
      return (
        it.x >= container.x + margin - 0.2 &&
        it.x + itW <= container.x + cW - margin + 0.2 &&
        it.z >= container.z + margin - 0.2 &&
        it.z + itD <= container.z + cD - margin + 0.2
      );
    });

    for (const ex of existingInside) {
      const { width: exW, depth: exD } = getItemDimensions(ex);
      const relX = Math.max(0, Math.floor((ex.x - (container.x + margin)) * scale));
      const relZ = Math.max(0, Math.floor((ex.z - (container.z + margin)) * scale));
      const relW = Math.ceil(exW * scale);
      const relD = Math.ceil(exD * scale);
      for (let ix = relX; ix < Math.min(gridW, relX + relW); ix++) {
        for (let iz = relZ; iz < Math.min(gridD, relZ + relD); iz++) {
          occupied[ix][iz] = true;
        }
      }
    }

    // Pack as many copies of this product as possible
    for (let z = 0; z <= gridD - pd; z += 1) {
      for (let x = 0; x <= gridW - pw; x += 1) {
        let canPlace = true;
        for (let ix = x; ix < x + pw; ix++) {
          for (let iz = z; iz < z + pd; iz++) {
            if (occupied[ix][iz]) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        if (canPlace) {
          // Mark cells
          for (let ix = x; ix < x + pw; ix++) {
            for (let iz = z; iz < z + pd; iz++) {
              occupied[ix][iz] = true;
            }
          }

          result.push({
            instanceId: `nested-${container.instanceId}-${product.id}-${totalPlaced + 1}`,
            productId: product.id,
            product: product,
            x: Math.round((container.x + margin + x / scale) * 10) / 10,
            y: Math.round(cavityY * 10) / 10,
            z: Math.round((container.z + margin + z / scale) * 10) / 10,
            rotation: chosenOri.rotation,
            posture: chosenOri.posture
          });
          totalPlaced++;
        }
      }
    }
  }

  return { updatedItems: result, countPlaced: totalPlaced };
}

/**
 * 다 다른 물건들(Diverse distinct goods)로 수납함 내부 공간을 채웁니다.
 * 같은 물건을 중복해서 가득 채우지 않고, 가능한 다양한 종류의 소품을 골고루 1개씩 분산 배치합니다.
 */
export function fillDiverseGoodsIntoContainers(
  drawer: DrawerDimension,
  currentItems: FittedItem[],
  candidateGoods: DaisoProduct[],
  options: AutoFitOptions = { allowRotation: false }
): { updatedItems: FittedItem[]; countPlaced: number; placedGoodsNames: string[] } {
  // 1. Keep existing containers
  let baseContainers = currentItems.filter(it => isDrawerOrganizer(it.product) || isMatOrLiner(it.product));
  if (baseContainers.length === 0) {
    baseContainers = fitContainersOnly(drawer, candidateGoods, options);
  }

  const result: FittedItem[] = [...currentItems];
  const usedProductIds = new Set<string>(
    currentItems.filter(it => !isDrawerOrganizer(it.product) && !isMatOrLiner(it.product)).map(it => it.productId)
  );

  const placedNames: string[] = [];
  const scale = 2; // 0.5cm resolution
  const postureMode = options.postureMode ?? 'auto';

  // Loop through open containers
  for (const container of baseContainers) {
    if (!isOpenContainer(container.product)) continue;

    const { width: cW, depth: cD } = getItemDimensions(container);
    const margin = 0.5;
    const cavityW = cW - margin * 2;
    const cavityD = cD - margin * 2;
    const cavityY = (container.y || 0) + 0.3;

    if (cavityW < 2.0 || cavityD < 2.0) continue;

    const gridW = Math.floor(cavityW * scale);
    const gridD = Math.floor(cavityD * scale);
    const occupied: boolean[][] = Array.from({ length: gridW }, () => Array(gridD).fill(false));

    // Mark cells occupied by existing nested items in this container
    const existingInside = result.filter(it => {
      if (it.instanceId === container.instanceId) return false;
      const { width: itW, depth: itD } = getItemDimensions(it);
      return (
        it.x >= container.x + margin - 0.2 &&
        it.x + itW <= container.x + cW - margin + 0.2 &&
        it.z >= container.z + margin - 0.2 &&
        it.z + itD <= container.z + cD - margin + 0.2
      );
    });

    for (const ex of existingInside) {
      const { width: exW, depth: exD } = getItemDimensions(ex);
      const relX = Math.max(0, Math.floor((ex.x - (container.x + margin)) * scale));
      const relZ = Math.max(0, Math.floor((ex.z - (container.z + margin)) * scale));
      const relW = Math.ceil(exW * scale);
      const relD = Math.ceil(exD * scale);
      for (let ix = relX; ix < Math.min(gridW, relX + relW); ix++) {
        for (let iz = relZ; iz < Math.min(gridD, relZ + relD); iz++) {
          occupied[ix][iz] = true;
        }
      }
    }

    // Try placing each unused candidate good into an available space in this container
    for (const prod of candidateGoods) {
      if (usedProductIds.has(prod.id)) continue; // STRICTLY NO DUPLICATE ITEMS!

      // Evaluate all 3D orientations (standing / lying / 90deg rotated) that fit height & footprint
      const candidateOrientations = getDistinct3DOrientations(prod, true).filter(ori => {
        if (!options.allowHeightExceed && cavityY + ori.height > drawer.height + 0.1) {
          return false;
        }
        const pw = Math.round(ori.width * scale);
        const pd = Math.round(ori.depth * scale);
        return pw > 0 && pd > 0 && pw <= gridW && pd <= gridD;
      });

      if (candidateOrientations.length === 0) continue;

      candidateOrientations.sort((a, b) => {
        if (postureMode === 'standing') {
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

      let foundSpot = false;
      let bestX = 0;
      let bestZ = 0;
      let chosenPw = 0;
      let chosenPd = 0;
      let chosenRot: 0 | 90 = 0;
      let chosenPosture: ItemPosture = 'flat';

      for (const ori of candidateOrientations) {
        // If rotation is disabled, still allow 90deg or posture flip when default orientation couldn't fit
        if (!options.allowRotation && ori.rotation === 90 && ori.posture === 'flat') {
          const defaultFits =
            Math.round(prod.width * scale) <= gridW &&
            Math.round(prod.depth * scale) <= gridD &&
            (options.allowHeightExceed || cavityY + prod.height <= drawer.height + 0.1);
          if (defaultFits && foundSpot) continue;
        }

        const pw = Math.round(ori.width * scale);
        const pd = Math.round(ori.depth * scale);

        for (let z = 0; z <= gridD - pd; z++) {
          for (let x = 0; x <= gridW - pw; x++) {
            let fits = true;
            for (let ix = x; ix < x + pw; ix++) {
              for (let iz = z; iz < z + pd; iz++) {
                if (occupied[ix][iz]) {
                  fits = false;
                  break;
                }
              }
              if (!fits) break;
            }
            if (fits) {
              foundSpot = true;
              bestX = x;
              bestZ = z;
              chosenPw = pw;
              chosenPd = pd;
              chosenRot = ori.rotation;
              chosenPosture = ori.posture;
              break;
            }
          }
          if (foundSpot) break;
        }
        if (foundSpot) break;
      }

      if (foundSpot) {
        // Mark occupied
        for (let ix = bestX; ix < bestX + chosenPw; ix++) {
          for (let iz = bestZ; iz < bestZ + chosenPd; iz++) {
            occupied[ix][iz] = true;
          }
        }

        result.push({
          instanceId: `nested-${container.instanceId}-${prod.id}-${Date.now()}-${placedNames.length}`,
          productId: prod.id,
          product: prod,
          x: Math.round((container.x + margin + bestX / scale) * 10) / 10,
          y: Math.round(cavityY * 10) / 10,
          z: Math.round((container.z + margin + bestZ / scale) * 10) / 10,
          rotation: chosenRot,
          posture: chosenPosture
        });

        usedProductIds.add(prod.id);
        placedNames.push(prod.name);
      }
    }
  }

  return {
    updatedItems: result,
    countPlaced: placedNames.length,
    placedGoodsNames: placedNames
  };
}

/**
 * 사용자가 선택한 카테고리(테마)의 일상 물건들을 서로 다른 다양한 소품으로 수납함에 채웁니다 (중복 방지).
 */
export function fillCategoryGoodsIntoContainers(
  drawer: DrawerDimension,
  currentItems: FittedItem[],
  category: string,
  availableProducts: DaisoProduct[],
  options: AutoFitOptions = { allowRotation: false }
): { updatedItems: FittedItem[]; countPlaced: number; placedGoodsNames: string[] } {
  // If no containers exist, fit containers first
  let baseContainers = currentItems.filter(it => isDrawerOrganizer(it.product) || isMatOrLiner(it.product));
  if (baseContainers.length === 0) {
    baseContainers = fitContainersOnly(drawer, availableProducts, options);
  }

  // Filter products for this category
  const matchingGoods = availableProducts.filter(p => {
    if (isDrawerOrganizer(p) || isMatOrLiner(p)) return false;
    if (category !== 'all' && p.category !== category) return false;
    const name = p.name;
    if (/정리함|수납함|트레이|바구니|수납박스|서랍|오거나이저|깔개|매트/.test(name)) return false;
    if (p.width > 24 || p.depth > 24 || p.width < 1.5 || p.depth < 1.5) return false;
    if (/세제|락스|살충제|방향제|탈취|쓰레기|변기/.test(name)) return false;
    return true;
  });

  if (matchingGoods.length === 0) {
    return { updatedItems: currentItems, countPlaced: 0, placedGoodsNames: [] };
  }

  // Fill using diverse, distinct goods placement
  return fillDiverseGoodsIntoContainers(drawer, currentItems, matchingGoods, options);
}

/**
 * 2단계: 수납함 내부 소품/물건 자동 채우기 (Nested Goods Inside Containers)
 * - 이미 배치된 오픈형 수납함/트레이 안쪽 공간(Cavity)에 문구, 화장품, 생활용품 등 실제 소품을 채워 넣습니다.
 * - 수납함이 아직 하나도 없는 경우 자동으로 1단계 수납함 틀을 먼저 배치한 후 물건을 채웁니다.
 */
export function fillContainersWithGoods(
  drawer: DrawerDimension,
  currentItems: FittedItem[],
  availableProducts: DaisoProduct[],
  options: AutoFitOptions = { allowRotation: false }
): FittedItem[] {
  // 1. Keep existing containers / mats (filter out any previously nested goods)
  let baseContainers = currentItems.filter(it => isDrawerOrganizer(it.product) || isMatOrLiner(it.product));
  if (baseContainers.length === 0) {
    baseContainers = fitContainersOnly(drawer, availableProducts, options);
  }

  // 2. Filter pool of everyday goods (문구, 화장품, 소품 등)
  const candidateGoods = availableProducts.filter(p => {
    if (isDrawerOrganizer(p) || isMatOrLiner(p)) return false;
    const name = p.name;
    if (/정리함|수납함|트레이|바구니|수납박스|서랍|오거나이저|깔개|매트/.test(name)) return false;
    // Appropriate size for drawer nesting
    if (p.width > 22 || p.depth > 22 || p.height > 8 || p.width < 1.5 || p.depth < 1.5 || p.height < 0.5) return false;
    if (/세제|락스|살충제|방향제|탈취|쓰레기|변기/.test(name)) return false;
    return true;
  });

  const result: FittedItem[] = [...baseContainers];

  // 3. For each open container, find nestable goods and place them inside the hollow cavity
  baseContainers.forEach((container, cIdx) => {
    if (!isOpenContainer(container.product)) return;

    const cW = container.rotation === 90 ? container.product.depth : container.product.width;
    const cD = container.rotation === 90 ? container.product.width : container.product.depth;
    const margin = 0.6; // Inner wall clearance
    const cavityW = cW - margin * 2;
    const cavityD = cD - margin * 2;
    const cavityY = (container.y || 0) + 0.3; // resting on container inside floor

    if (cavityW < 3 || cavityD < 3) return;

    // Filter goods that fit inside this container footprint (height can exceed drawer)
    const fittingGoods = candidateGoods.filter(g =>
      g.width <= cavityW && g.depth <= cavityD && g.height <= 25.0
    );
    if (fittingGoods.length === 0) return;

    // Sub-layout: tile items along depth (Z)
    let curNestedZ = container.z + margin;
    const maxNestedZ = container.z + margin + cavityD;

    let goodIdx = (cIdx * 7) % fittingGoods.length;
    let placedCount = 0;

    while (curNestedZ < maxNestedZ - 1 && placedCount < 3) {
      const remD = maxNestedZ - curNestedZ;
      const good = fittingGoods.find((g, i) => i >= goodIdx && g.depth <= remD && g.width <= cavityW);
      if (!good) break;

      result.push({
        instanceId: `nested-${container.instanceId}-${good.id}-${placedCount + 1}`,
        productId: good.id,
        product: good,
        x: Math.round((container.x + margin + (cavityW - good.width) / 2) * 10) / 10,
        y: Math.round(cavityY * 10) / 10,
        z: Math.round(curNestedZ * 10) / 10,
        rotation: 0
      });

      curNestedZ += good.depth + 0.5;
      placedCount++;
      goodIdx = (goodIdx + 11) % fittingGoods.length;
    }
  });

  return result;
}

/**
 * 수납함 내부 소품만 비우기 (Containers Preserved)
 */
export function clearGoodsOnly(currentItems: FittedItem[]): FittedItem[] {
  return currentItems.filter(it => isDrawerOrganizer(it.product) || isMatOrLiner(it.product));
}

/**
 * 아이템이 수납함 안쪽에 배치된 물건인지 여부
 */
export function isNestedGood(item: FittedItem): boolean {
  return item.instanceId.startsWith('nested-') || (!isDrawerOrganizer(item.product) && !isMatOrLiner(item.product));
}

export function calculateSpaceMetrics(drawer: DrawerDimension, items: FittedItem[]) {
  const drawerFloorArea = Math.round(drawer.width * drawer.depth);
  const drawerVolume = Math.round(drawer.width * drawer.depth * drawer.height);

  let occupiedVolume = 0;
  let totalPrice = 0;

  const floorGridScale = 2;
  const gridW = Math.floor(drawer.width * floorGridScale);
  const gridD = Math.floor(drawer.depth * floorGridScale);
  const floorCovered: boolean[][] = Array.from({ length: gridW }, () => Array(gridD).fill(false));

  items.forEach(item => {
    const { width: w, depth: d, height: h } = getItemDimensions(item);

    const startX = Math.max(0, Math.floor(item.x * floorGridScale));
    const endX = Math.min(gridW, Math.ceil((item.x + w) * floorGridScale));
    const startZ = Math.max(0, Math.floor(item.z * floorGridScale));
    const endZ = Math.min(gridD, Math.ceil((item.z + d) * floorGridScale));

    for (let ix = startX; ix < endX; ix++) {
      for (let iz = startZ; iz < endZ; iz++) {
        floorCovered[ix][iz] = true;
      }
    }

    occupiedVolume += w * d * h;
    totalPrice += item.product.price;
  });

  let coveredCount = 0;
  for (let ix = 0; ix < gridW; ix++) {
    for (let iz = 0; iz < gridD; iz++) {
      if (floorCovered[ix][iz]) coveredCount++;
    }
  }

  const floorUtilization =
    gridW * gridD > 0 ? Math.min(100, Math.round((coveredCount / (gridW * gridD)) * 100)) : 0;
  const volumeUtilization =
    drawerVolume > 0 ? Math.min(100, Math.round((occupiedVolume / drawerVolume) * 100)) : 0;

  return {
    drawerFloorArea,
    occupiedFloorArea: Math.round((coveredCount / (floorGridScale * floorGridScale))),
    floorUtilization,
    volumeUtilization,
    totalPrice,
    itemCount: items.length
  };
}
