import { DaisoProduct, FittedItem, ItemPosture } from '../data/daisoProducts';

/**
 * Returns the 3D bounding box dimensions (width on X-axis, depth on Z-axis, height on Y-axis)
 * for a product given its horizontal rotation (0 | 90) and 3D vertical posture ('flat' | 'stand_front' | 'stand_side').
 *
 * - 'flat' (기본 상태): base (W, D, H) -> rot 0: (W, D, H), rot 90: (D, W, H)
 * - 'stand_front' (앞뒤로 세우기/눕히기 — D와 H 교환): base (W, H, D) -> rot 0: (W, H, D), rot 90: (H, W, D)
 * - 'stand_side' (옆으로 세우기/눕히기 — W와 H 교환): base (H, D, W) -> rot 0: (H, D, W), rot 90: (D, H, W)
 */
export function getOrientedDimensions(
  product: DaisoProduct,
  rotation: 0 | 90 = 0,
  posture: ItemPosture = 'flat'
): { width: number; depth: number; height: number } {
  const rawW = product.width;
  const rawD = product.depth;
  const rawH = isMatOrLiner(product) ? getLinerThickness(product) : product.height;

  let baseW = rawW;
  let baseD = rawD;
  let baseH = rawH;

  if (posture === 'stand_front') {
    baseW = rawW;
    baseD = rawH;
    baseH = rawD;
  } else if (posture === 'stand_side') {
    baseW = rawH;
    baseD = rawD;
    baseH = rawW;
  }

  return {
    width: rotation === 90 ? baseD : baseW,
    depth: rotation === 90 ? baseW : baseD,
    height: baseH
  };
}

/**
 * Convenience helper to get the active 3D dimensions (width, depth, height) of a placed FittedItem.
 */
export function getItemDimensions(item: Pick<FittedItem, 'product' | 'rotation' | 'posture'>): {
  width: number;
  depth: number;
  height: number;
} {
  return getOrientedDimensions(item.product, item.rotation, item.posture || 'flat');
}

/**
 * Returns human-readable 3D posture metadata for UI badges and buttons.
 */
export function getPostureInfo(
  product: DaisoProduct,
  rotation: 0 | 90 = 0,
  posture: ItemPosture = 'flat'
): {
  posture: ItemPosture;
  label: string;
  shortLabel: string;
  icon: string;
  isStanding: boolean;
  isModifiedPosture: boolean;
} {
  const { width, depth, height } = getOrientedDimensions(product, rotation, posture);
  const maxDim = Math.max(width, depth, height);
  const minDim = Math.min(width, depth, height);
  const isModifiedPosture = posture !== 'flat';

  if (height >= maxDim - 0.1 && height > Math.min(width, depth) * 1.15) {
    return {
      posture,
      label: '세워서 보관',
      shortLabel: '세움',
      icon: '↕️',
      isStanding: true,
      isModifiedPosture
    };
  }
  if (height <= minDim + 0.1 && height < Math.max(width, depth) * 0.85) {
    return {
      posture,
      label: '눕혀서 보관',
      shortLabel: '눕힘',
      icon: '↔️',
      isStanding: false,
      isModifiedPosture
    };
  }
  return {
    posture,
    label: posture === 'stand_side' ? '옆으로 세움' : posture === 'stand_front' ? '세워서 보관' : '기본 보관',
    shortLabel: posture === 'stand_side' ? '옆면 세움' : posture === 'stand_front' ? '세움' : '기본',
    icon: '📐',
    isStanding: height >= Math.min(width, depth),
    isModifiedPosture
  };
}

/**
 * Cycles to the next distinct 3D posture ('flat' -> 'stand_front' -> 'stand_side' -> 'flat').
 */
export function getNextPosture(product: DaisoProduct, currentPosture: ItemPosture = 'flat'): ItemPosture {
  const order: ItemPosture[] = ['flat', 'stand_front', 'stand_side'];
  const idx = order.indexOf(currentPosture);
  const curDims = getOrientedDimensions(product, 0, currentPosture);

  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(idx + step) % order.length];
    const candDims = getOrientedDimensions(product, 0, candidate);
    if (
      Math.abs(candDims.width - curDims.width) > 0.05 ||
      Math.abs(candDims.depth - curDims.depth) > 0.05 ||
      Math.abs(candDims.height - curDims.height) > 0.05
    ) {
      return candidate;
    }
  }
  return order[(idx + 1) % order.length];
}

/**
 * Generates all physically distinct 3D orientations (up to 6 combinations of posture + rotation) for a product.
 */
export function getDistinct3DOrientations(
  product: DaisoProduct,
  allowPostureChange: boolean = true
): Array<{
  posture: ItemPosture;
  rotation: 0 | 90;
  width: number;
  depth: number;
  height: number;
  isStanding: boolean;
  label: string;
}> {
  const postures: ItemPosture[] = allowPostureChange ? ['flat', 'stand_front', 'stand_side'] : ['flat'];
  const rotations: (0 | 90)[] = [0, 90];
  const seen = new Set<string>();
  const results: Array<{
    posture: ItemPosture;
    rotation: 0 | 90;
    width: number;
    depth: number;
    height: number;
    isStanding: boolean;
    label: string;
  }> = [];

  for (const posture of postures) {
    for (const rotation of rotations) {
      const { width, depth, height } = getOrientedDimensions(product, rotation, posture);
      const key = `${width.toFixed(1)}x${depth.toFixed(1)}x${height.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const info = getPostureInfo(product, rotation, posture);
      results.push({
        posture,
        rotation,
        width,
        depth,
        height,
        isStanding: info.isStanding,
        label: info.label
      });
    }
  }
  return results;
}

/**
 * Checks whether a product name indicates non-container accessories, tools, or fixtures
 * (such as wall hooks, hangers, compression rods, suction cups, magnets, sprays, soft bags).
 */
export function isNonContainerAccessory(name: string): boolean {
  return /훅|후크|걸이|고리|행거|옷걸이|바지걸이|압축봉|선반걸이|도어후크|비누받침|칫솔꽂이|칫솔걸이|홀더|스탠드|꽂이|거치대|선반받침|손잡이|흡착판|자석|마그넷|집게|클립|밴드|벨트|테이프|커버|덮개|먼지털이|수세미|솔|브러쉬|스프레이|세제|방향제|디퓨저|탈취제|매직블럭|압축팩|지퍼백|비닐봉투|파우치|주머니|부직포|패브릭|천수납|접이식.*박스|와이어|철제|스틸|빨래건조대|휴지통|쓰레기통|회전|턴테이블|삼각|코너|부착식|흡착식|베이킹.*트레이|롤러.*트레이|페인트.*트레이|식기.*건조대|프라이팬|강화유리|보호필름|액정|필름|사생활보호|케이블|충전기|보조배터리|사이드포켓|틈새수납|송풍구|선바이저|수저.*세트|수저세트/.test(
    name
  );
}

/**
 * Checks whether a product is a flat floor mat, drawer liner, or protective sheet
 * that lies flat on the drawer floor and allows other organizers/items to sit on top.
 */
export function isMatOrLiner(product: DaisoProduct): boolean {
  const name = product.name;

  // Exclude cosmetics, beauty, body products
  if (/훈증기|향수|샴푸|바디워시|마스크팩|시트마스크|시트러스|물티슈|데오드란트|클렌징|패치/.test(name)) {
    return false;
  }
  if (product.category === 'beauty' || product.category === 'bath_body') {
    return false;
  }

  // Authentic household mats, drawer liners, silicone sheets
  return /식기.*매트|건조.*매트|서랍.*깔개|선반.*깔개|바닥.*매트|데스크.*매트|실리콘.*매트|미끄럼.*방지.*매트|서랍.*시트|항균.*시트|선반.*시트|롤.*깔개|테이블.*매트/.test(
    name
  );
}

/**
 * Physical thickness of a mat or liner when placed in the drawer (cm).
 */
export function getLinerThickness(product: DaisoProduct): number {
  if (isMatOrLiner(product)) {
    return Math.min(0.3, Math.max(0.1, product.height <= 0.8 ? product.height : 0.3));
  }
  return product.height;
}

/**
 * Checks whether a product is an open-top container, basket, tray, or box
 * that has an interior cavity where other items can be placed inside.
 */
export function isOpenContainer(product: DaisoProduct): boolean {
  if (isMatOrLiner(product)) return false;
  if (isNonContainerAccessory(product.name)) return false;

  const name = product.name;

  // Strict clothing and apparel exclusion
  if (
    /팬츠|슬랙스|조거|레깅스|청바지|반바지|속바지|바지|티셔츠|반팔티|긴팔티|맨투맨|후드|스웨터|가디건|니트|원피스|스커트|치마|블라우스|자켓|점퍼|코트|패딩|속옷|팬티|드로즈|브라|잠옷|파자마|내의|내복|양말|덧신|스타킹|타이즈|모자|비니|목도리|장갑/.test(
      name
    )
  ) {
    return false;
  }

  // Prevent false-positive '트레이' substring inside '스트레이트' or '트레이닝'
  if (/스트레이트|트레이닝/.test(name) && !/정리.*트레이|트레이.*정리|수납.*트레이/.test(name)) {
    return false;
  }

  return (
    /정리함|수납함|트레이|바구니|서랍함|수납박스|정리박스|아크릴함|오거나이저|바스켓|다용도함|멀티함|보관함|정리대|케이스/.test(name) ||
    ['storage', 'tray', 'storage_box', 'stackable', 'basket'].includes(product.category)
  );
}

/**
 * Checks whether a product is an actual rigid drawer organizer tray or container
 * suitable for the primary foundation layout of a drawer.
 */
export function isDrawerOrganizer(product: DaisoProduct): boolean {
  if (!isOpenContainer(product)) return false;

  // Minimum dimensions for a standalone drawer organizer container
  if (product.width < 6.0 || product.depth < 6.0 || product.height < 2.0) {
    return false;
  }

  const name = product.name;
  // Exclude single items or tools that are not meant for drawer layout partitioning
  if (/식기|프라이팬|빨래|베이킹|페인트|롤러|아이스.*트레이|얼음.*트레이|네트망|와이어|수저집|휴대용.*케이스|파우치/.test(name)) {
    return false;
  }

  // Prevent accidental matches on clothing/textiles
  if (/스트레이트|트레이닝|팬츠|바지|양말|의류/.test(name)) {
    return false;
  }

  // Pure organizer keywords: 정리함, 수납함, 트레이, 바구니, 서랍, 수납박스, 오거나이저
  return (
    /정리함|수납함|트레이|바구니|서랍|수납박스|정리박스|아크릴|오거나이저|칸막이|바스켓/.test(name) ||
    ['storage', 'tray', 'storage_box', 'stackable', 'basket'].includes(product.category)
  );
}

/**
 * Evaluates whether a product is truly physically stackable on top of another in a drawer.
 */
export function isStackableProduct(product: DaisoProduct): boolean {
  if (!isDrawerOrganizer(product)) return false;

  if (product.width < 7 || product.depth < 7 || product.height < 2.5 || product.height > 14) {
    return false;
  }

  const name = product.name;
  if (
    product.category === 'stackable' ||
    /적재|스택|쌓|포개|적층|2단|3단|모듈|시스템|블록/.test(name)
  ) {
    return true;
  }

  if (/깔끔.*정리|서랍.*트레이|투명.*정리|모듈.*정리|시스템.*트레이/.test(name)) {
    return true;
  }

  return false;
}

/**
 * Calculates the resting Y level for an item placed at (x, z) given the currently placed items.
 * - If nested inside an open container/basket/tray, y = container.y + 0.3 (sitting inside on the container floor).
 * - If sitting on a mat/liner, y = liner.thickness.
 * - If stacked on top of a stackable organizer rim, y = base.y + base.height.
 * - If on the bare drawer floor, y = 0.
 */
export function calculateRestingY(
  target: {
    instanceId: string;
    productId: string;
    product: DaisoProduct;
    x: number;
    z: number;
    width: number;
    depth: number;
    rotation: 0 | 90;
  },
  allItems: FittedItem[],
  _drawerHeight?: number
): { y: number; stackedOnItem?: FittedItem; insideContainer?: FittedItem } {
  if (isMatOrLiner(target.product)) {
    return { y: 0 };
  }

  const margin = 0.15;
  let highestSupportingY = 0;
  let supportingItem: FittedItem | undefined;
  let insideContainer: FittedItem | undefined;

  for (const item of allItems) {
    if (item.instanceId === target.instanceId) continue;

    const { width: itemW, depth: itemD, height: itemH } = getItemDimensions(item);
    const itemY = item.y || 0;

    // Check if target is nested INSIDE an open container/basket/tray
    if (isOpenContainer(item.product) && (!item.posture || item.posture === 'flat')) {
      const isContained =
        target.x >= item.x - margin &&
        target.x + target.width <= item.x + itemW + margin &&
        target.z >= item.z - margin &&
        target.z + target.depth <= item.z + itemD + margin;

      if (isContained) {
        // Can sit inside on the bottom floor of the container (height can extend above drawer)
        const insideFloorY = itemY + 0.3;
        if (insideFloorY >= highestSupportingY) {
          highestSupportingY = insideFloorY;
          supportingItem = item;
          insideContainer = item;
          continue;
        }
      }
    }

    // Check 2D footprint overlap
    const overlapX = target.x < item.x + itemW - margin && target.x + target.width > item.x + margin;
    const overlapZ = target.z < item.z + itemD - margin && target.z + target.depth > item.z + margin;

    if (overlapX && overlapZ) {
      if (isMatOrLiner(item.product)) {
        const linerTop = itemY + getLinerThickness(item.product);
        if (linerTop > highestSupportingY) {
          highestSupportingY = linerTop;
          supportingItem = item;
        }
      } else if (isStackableProduct(item.product) && isStackableProduct(target.product)) {
        // Stacking on top of the rim (height can extend above drawer)
        const stackTop = itemY + itemH;
        if (stackTop > highestSupportingY) {
          highestSupportingY = stackTop;
          supportingItem = item;
        }
      }
    }
  }

  return {
    y: Math.round(highestSupportingY * 10) / 10,
    stackedOnItem: supportingItem,
    insideContainer
  };
}
