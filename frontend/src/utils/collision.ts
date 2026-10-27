import { FittedItem, DrawerDimension, DaisoProduct } from '../data/daisoProducts';
import { isMatOrLiner, isStackableProduct, isOpenContainer, getItemDimensions } from './stacking';

export interface CollisionResult {
  collides: boolean;
  reason?: 'wall' | 'item';
  collidedWith?: string;
  collidedItemInstanceId?: string;
}

export interface CollisionTarget {
  instanceId: string;
  x: number;
  y?: number;
  z: number;
  width: number;
  depth: number;
  height?: number;
  product?: DaisoProduct;
}

/**
 * Checks whether an item at (x, y, z) with size (width, depth, height)
 * collides with drawer walls or other items, supporting 3D stacking and mats/liners.
 */
export function checkItemCollision(
  target: CollisionTarget,
  allItems: FittedItem[],
  drawer: DrawerDimension
): CollisionResult {
  const margin = 0.05; // 0.5mm tolerance to allow touching edge-to-edge
  const targetY = target.y || 0;
  const targetH = target.height ?? (target.product ? target.product.height : 5);

  // 1. Check drawer boundary (X, Z on floor, and Y cannot be below floor).
  // Note: Items are allowed to extend vertically above drawer height (open drawer).
  if (
    target.x < -margin ||
    target.z < -margin ||
    target.x + target.width > drawer.width + margin ||
    target.z + target.depth > drawer.depth + margin ||
    targetY < -margin
  ) {
    return { collides: true, reason: 'wall' };
  }

  // 2. Check 3D overlap with other placed items
  for (const item of allItems) {
    if (item.instanceId === target.instanceId) continue;

    const { width: itemW, depth: itemD, height: itemH } = getItemDimensions(item);
    const itemY = item.y || 0;

    // Strict 2D AABB Overlap on floor
    const overlapX = target.x < item.x + itemW - margin && target.x + target.width > item.x + margin;
    const overlapZ = target.z < item.z + itemD - margin && target.z + target.depth > item.z + margin;

    if (overlapX && overlapZ) {
      // Case A: Bottom item is a mat/liner and target is placed on top of it
      if (isMatOrLiner(item.product) && !isMatOrLiner(target.product || ({} as any))) {
        if (targetY >= itemY + itemH - margin) {
          // Perfectly resting on top of the mat -> NOT a collision!
          continue;
        }
      }

      // Case B: Target is placed above the bottom item (vertical stacking)
      if (targetY >= itemY + itemH - margin) {
        if (isStackableProduct(item.product) || isMatOrLiner(item.product)) {
          // Supported on top of stackable item/liner -> NOT a collision!
          continue;
        }
      }

      // Case C: Target is placed below the top item
      if (itemY >= targetY + targetH - margin) {
        if (isStackableProduct(target.product || ({} as any)) || isMatOrLiner(target.product || ({} as any))) {
          // Supports item above -> NOT a collision!
          continue;
        }
      }

      // Case D: Target is placed INSIDE an open container/basket/tray
      if (isOpenContainer(item.product) && item.instanceId !== target.instanceId) {
        const isContained =
          target.x >= item.x - margin &&
          target.x + target.width <= item.x + itemW + margin &&
          target.z >= item.z - margin &&
          target.z + target.depth <= item.z + itemD + margin;

        if (isContained && targetY >= itemY + 0.15 - margin) {
          // Resting inside the open container cavity -> NOT a collision with the container!
          continue;
        }
      }

      // Case E: Item is placed INSIDE target (if target is an open container)
      if (target.product && isOpenContainer(target.product) && item.instanceId !== target.instanceId) {
        const isContained =
          item.x >= target.x - margin &&
          item.x + itemW <= target.x + target.width + margin &&
          item.z >= target.z - margin &&
          item.z + itemD <= target.z + target.depth + margin;

        if (isContained && itemY >= targetY + 0.15 - margin) {
          // Item is inside target container -> NOT a collision!
          continue;
        }
      }

      // Check vertical 3D overlap
      const overlapY = targetY < itemY + itemH - margin && targetY + targetH > itemY + margin;

      if (overlapY) {
        return {
          collides: true,
          reason: 'item',
          collidedWith: item.product.name,
          collidedItemInstanceId: item.instanceId
        };
      }
    }
  }

  return { collides: false };
}

/**
 * Calculates magnetic snapping for an item against drawer walls and neighboring items.
 * Sticks flush to edges when within the snap threshold (e.g. 2.0 cm).
 */
export function calculateMagneticSnap(
  target: {
    instanceId: string;
    x: number;
    y?: number;
    z: number;
    width: number;
    depth: number;
    height?: number;
    product?: DaisoProduct;
  },
  allItems: FittedItem[],
  drawer: DrawerDimension,
  threshold: number = 2.0
): {
  snappedX: number;
  snappedZ: number;
  didSnap: boolean;
  snapTarget?: string;
} {
  let bestX = target.x;
  let bestZ = target.z;
  let minDiffX = threshold;
  let minDiffZ = threshold;
  let didSnapX = false;
  let didSnapZ = false;
  let snapTargetName: string | undefined;

  // 1. Snap to Drawer Walls
  // Left wall (x = 0)
  if (Math.abs(target.x - 0) < minDiffX) {
    minDiffX = Math.abs(target.x - 0);
    bestX = 0;
    didSnapX = true;
    snapTargetName = '좌측 벽';
  }
  // Right wall (x = drawer.width - width)
  const rightWallX = drawer.width - target.width;
  if (Math.abs(target.x - rightWallX) < minDiffX) {
    minDiffX = Math.abs(target.x - rightWallX);
    bestX = rightWallX;
    didSnapX = true;
    snapTargetName = '우측 벽';
  }
  // Back wall (z = 0)
  if (Math.abs(target.z - 0) < minDiffZ) {
    minDiffZ = Math.abs(target.z - 0);
    bestZ = 0;
    didSnapZ = true;
    snapTargetName = '안쪽 벽';
  }
  // Front wall (z = drawer.depth - depth)
  const frontWallZ = drawer.depth - target.depth;
  if (Math.abs(target.z - frontWallZ) < minDiffZ) {
    minDiffZ = Math.abs(target.z - frontWallZ);
    bestZ = frontWallZ;
    didSnapZ = true;
    snapTargetName = '앞쪽 벽';
  }

  // 2. Snap to Neighboring Items
  for (const item of allItems) {
    if (item.instanceId === target.instanceId) continue;
    const { width: itemW, depth: itemD } = getItemDimensions(item);

    // Only snap X if item is aligned or in proximity on Z axis
    const inZProximity = target.z < item.z + itemD + 3.0 && target.z + target.depth > item.z - 3.0;
    if (inZProximity) {
      // Right edge of neighbor: target.x = item.x + itemW
      const rightEdge = item.x + itemW;
      if (Math.abs(target.x - rightEdge) < minDiffX) {
        minDiffX = Math.abs(target.x - rightEdge);
        bestX = rightEdge;
        didSnapX = true;
        snapTargetName = item.product.name;
      }
      // Left edge of neighbor: target.x = item.x - target.width
      const leftEdge = item.x - target.width;
      if (Math.abs(target.x - leftEdge) < minDiffX) {
        minDiffX = Math.abs(target.x - leftEdge);
        bestX = leftEdge;
        didSnapX = true;
        snapTargetName = item.product.name;
      }
      // Align left edges
      if (Math.abs(target.x - item.x) < minDiffX) {
        minDiffX = Math.abs(target.x - item.x);
        bestX = item.x;
        didSnapX = true;
      }
      // Align right edges
      const alignRight = item.x + itemW - target.width;
      if (Math.abs(target.x - alignRight) < minDiffX) {
        minDiffX = Math.abs(target.x - alignRight);
        bestX = alignRight;
        didSnapX = true;
      }
    }

    // Only snap Z if item is aligned or in proximity on X axis
    const inXProximity = target.x < item.x + itemW + 3.0 && target.x + target.width > item.x - 3.0;
    if (inXProximity) {
      // Front edge of neighbor: target.z = item.z + itemD
      const frontEdge = item.z + itemD;
      if (Math.abs(target.z - frontEdge) < minDiffZ) {
        minDiffZ = Math.abs(target.z - frontEdge);
        bestZ = frontEdge;
        didSnapZ = true;
        snapTargetName = item.product.name;
      }
      // Back edge of neighbor: target.z = item.z - target.depth
      const backEdge = item.z - target.depth;
      if (Math.abs(target.z - backEdge) < minDiffZ) {
        minDiffZ = Math.abs(target.z - backEdge);
        bestZ = backEdge;
        didSnapZ = true;
        snapTargetName = item.product.name;
      }
      // Align back edges
      if (Math.abs(target.z - item.z) < minDiffZ) {
        minDiffZ = Math.abs(target.z - item.z);
        bestZ = item.z;
        didSnapZ = true;
      }
      // Align front edges
      const alignFront = item.z + itemD - target.depth;
      if (Math.abs(target.z - alignFront) < minDiffZ) {
        minDiffZ = Math.abs(target.z - alignFront);
        bestZ = alignFront;
        didSnapZ = true;
      }
    }
  }

  // 3. Verify collision safety of snapped coordinates
  const fullCheck = checkItemCollision(
    {
      instanceId: target.instanceId,
      x: bestX,
      y: target.y,
      z: bestZ,
      width: target.width,
      depth: target.depth,
      height: target.height,
      product: target.product
    },
    allItems,
    drawer
  );

  if (fullCheck.collides) {
    // Try X only
    const xOnlyCheck = checkItemCollision(
      {
        instanceId: target.instanceId,
        x: bestX,
        y: target.y,
        z: target.z,
        width: target.width,
        depth: target.depth,
        height: target.height,
        product: target.product
      },
      allItems,
      drawer
    );
    if (!xOnlyCheck.collides) {
      return {
        snappedX: Math.round(bestX * 2) / 2,
        snappedZ: Math.round(target.z * 2) / 2,
        didSnap: true,
        snapTarget: snapTargetName
      };
    }

    // Try Z only
    const zOnlyCheck = checkItemCollision(
      {
        instanceId: target.instanceId,
        x: target.x,
        y: target.y,
        z: bestZ,
        width: target.width,
        depth: target.depth,
        height: target.height,
        product: target.product
      },
      allItems,
      drawer
    );
    if (!zOnlyCheck.collides) {
      return {
        snappedX: Math.round(target.x * 2) / 2,
        snappedZ: Math.round(bestZ * 2) / 2,
        didSnap: true,
        snapTarget: snapTargetName
      };
    }

    // Collides: don't snap
    return {
      snappedX: Math.round(target.x * 2) / 2,
      snappedZ: Math.round(target.z * 2) / 2,
      didSnap: false
    };
  }

  return {
    snappedX: Math.round(bestX * 2) / 2,
    snappedZ: Math.round(bestZ * 2) / 2,
    didSnap: didSnapX || didSnapZ,
    snapTarget: snapTargetName
  };
}
