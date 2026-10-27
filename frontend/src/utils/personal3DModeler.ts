import * as THREE from 'three';
import { FittedItem } from '../data/daisoProducts';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Cache for generated procedural canvas textures to prevent memory leaks
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a high-resolution canvas texture for beverage cans (Coca Cola, Chilsung Cider, Cass, Pocari, etc.)
 */
export function getCanTexture(name: string, customColor?: string): THREE.CanvasTexture {
  const cacheKey = `can_${name}_${customColor || ''}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const lowerName = name.toLowerCase();
  let bgTop = '#E11D48';
  let bgBottom = '#BE123C';
  let brandText = 'COCA-COLA';
  let subText = 'ORIGINAL TASTE';
  let accentColor = '#FFFFFF';

  if (lowerName.includes('사이다') || lowerName.includes('cider') || lowerName.includes('칠성')) {
    bgTop = '#059669';
    bgBottom = '#047857';
    brandText = '칠성사이다';
    subText = 'Chilsung Cider';
    accentColor = '#FFFFFF';
  } else if (lowerName.includes('맥주') || lowerName.includes('카스') || lowerName.includes('cass') || lowerName.includes('테라')) {
    bgTop = '#1E3A8A';
    bgBottom = '#172554';
    brandText = 'CASS Fresh';
    subText = 'COLD BREWED BEER';
    accentColor = '#FBBF24';
  } else if (lowerName.includes('포카리') || lowerName.includes('이온') || lowerName.includes('pocari')) {
    bgTop = '#0284C7';
    bgBottom = '#0369A1';
    brandText = 'POCARI SWEAT';
    subText = 'ION SUPPLY DRINK';
    accentColor = '#FFFFFF';
  } else if (lowerName.includes('커피') || lowerName.includes('라떼') || lowerName.includes('coffee')) {
    bgTop = '#78350F';
    bgBottom = '#451A03';
    brandText = 'CANTATA COFFEE';
    subText = 'PREMIUM ARABICA';
    accentColor = '#FDE68A';
  } else if (customColor) {
    bgTop = customColor;
    bgBottom = customColor;
    brandText = name.slice(0, 10);
    subText = 'DAISO BEVERAGE';
  }

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Metallic Aluminum Top/Bottom Accent Bands
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(0, 0, 512, 35);
  ctx.fillRect(0, 477, 512, 35);

  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(0, 32, 512, 4);
  ctx.fillRect(0, 475, 512, 4);

  // Central Dynamic Ribbon / Star Accents
  ctx.save();
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(256, 256, 220, 110, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Brand Name Typography
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText(brandText, 256, 240);

  // Subtitle / Volume
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowBlur = 4;
  ctx.fillText(subText, 256, 290);

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('355 ml / 12 fl oz', 256, 330);

  // Barcode decoration
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(40, 380, 100, 45);
  ctx.fillStyle = '#000000';
  for (let x = 45; x < 135; x += 5) {
    if (Math.sin(x * 7) > 0) {
      ctx.fillRect(x, 385, 2.5, 35);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a high-resolution canvas texture for milk and juice gable-top cartons
 */
export function getCartonTexture(name: string): THREE.CanvasTexture {
  const cacheKey = `carton_${name}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const lower = name.toLowerCase();
  let brand = '서울우유';
  let sub = '1급A 원유 100%';
  let mainColor = '#059669';

  if (lower.includes('매일') || lower.includes('maeil')) {
    brand = '매일우유';
    sub = '신선한 국산 100%';
    mainColor = '#2563EB';
  } else if (lower.includes('주스') || lower.includes('오렌지') || lower.includes('juice')) {
    brand = '오렌지 주스';
    sub = '100% 과즙';
    mainColor = '#EA580C';
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 512, 512);

  // Top color banner
  ctx.fillStyle = mainColor;
  ctx.fillRect(0, 0, 512, 140);

  // Brand text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(brand, 256, 75);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(sub, 256, 115);

  // Bottom cow/drop motif
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(256, 320, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('🥛', 256, 325);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('1,000 mL (660 kcal)', 256, 440);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a high-resolution canvas texture for condiment/sauce bottle labels
 */
export function getBottleLabelTexture(name: string): THREE.CanvasTexture {
  const cacheKey = `bottle_${name}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(0, 0, 512, 256);

  // Golden borders
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name.slice(0, 14), 256, 90);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#B45309';
  ctx.fillText('PREMIUM GOURMET SAUCE', 256, 140);
  ctx.fillText('500g · 냉장보관', 256, 180);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a photorealistic 3D Beverage Can Mesh
 */
export function createRealisticCanMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  const isStanding = item.posture === 'stand_front' || item.posture === 'stand_side';
  // If standing, height is along Y; if lying (flat), height was along Z or X
  const canHeight = isStanding ? height : Math.max(width, depth);
  const canDiameter = isStanding ? Math.min(width, depth) : height;
  const radius = (canDiameter / 2) * 0.96;

  // 1. Can Body Cylinder with Label Texture
  const canGeo = new THREE.CylinderGeometry(radius, radius, canHeight * 0.88, 32, 1, false);
  const canTex = getCanTexture(item.product.name, item.product.color);
  const canMat = new THREE.MeshStandardMaterial({
    map: canTex,
    metalness: 0.82,
    roughness: 0.22,
    envMapIntensity: 1.2
  });

  const bodyMesh = new THREE.Mesh(canGeo, canMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 2. Aluminum Top Bevel & Lid
  const lidRadius = radius * 0.92;
  const lidGeo = new THREE.CylinderGeometry(lidRadius, radius, canHeight * 0.06, 32);
  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xE2E8F0,
    metalness: 0.92,
    roughness: 0.15
  });
  const topLid = new THREE.Mesh(lidGeo, silverMat);
  topLid.position.y = (canHeight * 0.88) / 2 + (canHeight * 0.06) / 2;
  group.add(topLid);

  // 3. Realistic Metal Pull-Tab on Top
  const tabGeo = new THREE.BoxGeometry(radius * 0.5, 0.12, radius * 0.8);
  const tabMesh = new THREE.Mesh(tabGeo, silverMat);
  tabMesh.position.set(0, topLid.position.y + 0.07, radius * 0.15);
  group.add(tabMesh);

  // 4. Aluminum Bottom Concave Base
  const baseGeo = new THREE.CylinderGeometry(radius, radius * 0.88, canHeight * 0.06, 32);
  const bottomBase = new THREE.Mesh(baseGeo, silverMat);
  bottomBase.position.y = -(canHeight * 0.88) / 2 - (canHeight * 0.06) / 2;
  group.add(bottomBase);

  // 5. Outer Outline / Selection Highlight
  if (isSelected) {
    const ringGeo = new THREE.TorusGeometry(radius + 0.1, 0.12, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xD61B23 });
    const selRing = new THREE.Mesh(ringGeo, ringMat);
    selRing.rotation.x = Math.PI / 2;
    selRing.position.y = topLid.position.y;
    group.add(selRing);
  }

  // Handle lying vs standing rotation
  if (!isStanding) {
    // Laying down horizontally
    if (width > depth) {
      group.rotation.z = Math.PI / 2;
    } else {
      group.rotation.x = Math.PI / 2;
    }
  }

  return group;
}

/**
 * Creates a photorealistic 3D Gable-Top Milk / Juice Carton Mesh
 */
export function createRealisticCartonMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  const isStanding = item.posture === 'stand_front' || item.posture === 'stand_side';
  const cW = isStanding ? width * 0.95 : height;
  const cD = isStanding ? depth * 0.95 : Math.min(width, depth);
  const cH = isStanding ? height : Math.max(width, depth);

  const bodyH = cH * 0.78;
  const roofH = cH * 0.22;

  // 1. Rectangular Lower Body with Texture
  const bodyGeo = new THREE.BoxGeometry(cW, bodyH, cD);
  const tex = getCartonTexture(item.product.name);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.35,
    metalness: 0.05
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = -roofH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 2. Gable-top Triangular Prism Roof
  const roofGeo = new THREE.CylinderGeometry(0.05, Math.hypot(cW, cD) / 2 * 0.85, roofH, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.3
  });
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.y = bodyMesh.position.y + bodyH / 2 + roofH / 2;
  roofMesh.scale.set(cW / Math.hypot(cW, cD), 1, cD / Math.hypot(cW, cD));
  group.add(roofMesh);

  // 3. Plastic Screw Pour-Cap on Roof
  const capGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2563EB,
    roughness: 0.2,
    metalness: 0.1
  });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.set(cW * 0.2, roofMesh.position.y + roofH * 0.1, cD * 0.15);
  capMesh.rotation.z = -Math.PI / 6;
  group.add(capMesh);

  if (isSelected) {
    const selBox = new THREE.BoxHelper(bodyMesh, 0xD61B23);
    group.add(selBox);
  }

  return group;
}

/**
 * Creates a photorealistic 3D Glass / Plastic Bottle Mesh (Sauce, Water, Dressing, Wine)
 */
export function createRealisticBottleMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  const isStanding = item.posture === 'stand_front' || item.posture === 'stand_side';
  const bHeight = isStanding ? height : Math.max(width, depth);
  const bDiameter = isStanding ? Math.min(width, depth) : height;
  const radius = (bDiameter / 2) * 0.94;

  const lowerH = bHeight * 0.62;
  const shoulderH = bHeight * 0.18;
  const neckH = bHeight * 0.15;
  const capH = bHeight * 0.05;

  const glassColor = item.product.color ? new THREE.Color(item.product.color) : new THREE.Color(0x38BDF8);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: glassColor,
    transparent: true,
    opacity: 0.85,
    roughness: 0.1,
    metalness: 0.05,
    transmission: 0.75,
    ior: 1.5
  });

  // 1. Lower Bottle Cylinder
  const bodyGeo = new THREE.CylinderGeometry(radius, radius * 0.96, lowerH, 32);
  const bodyMesh = new THREE.Mesh(bodyGeo, glassMat);
  bodyMesh.position.y = -bHeight / 2 + lowerH / 2;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 2. Central Label Band
  const labelGeo = new THREE.CylinderGeometry(radius + 0.04, radius + 0.04, lowerH * 0.65, 32);
  const labelTex = getBottleLabelTexture(item.product.name);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.4
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.y = bodyMesh.position.y;
  group.add(labelMesh);

  // 3. Tapered Shoulder
  const shoulderGeo = new THREE.CylinderGeometry(radius * 0.42, radius, shoulderH, 32);
  const shoulderMesh = new THREE.Mesh(shoulderGeo, glassMat);
  shoulderMesh.position.y = bodyMesh.position.y + lowerH / 2 + shoulderH / 2;
  group.add(shoulderMesh);

  // 4. Narrow Neck
  const neckGeo = new THREE.CylinderGeometry(radius * 0.38, radius * 0.42, neckH, 32);
  const neckMesh = new THREE.Mesh(neckGeo, glassMat);
  neckMesh.position.y = shoulderMesh.position.y + shoulderH / 2 + neckH / 2;
  group.add(neckMesh);

  // 5. Screw Cap (Plastic/Gold)
  const capGeo = new THREE.CylinderGeometry(radius * 0.41, radius * 0.41, capH, 24);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xD97706,
    metalness: 0.75,
    roughness: 0.25
  });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = neckMesh.position.y + neckH / 2 + capH / 2;
  group.add(capMesh);

  if (isSelected) {
    const ringGeo = new THREE.TorusGeometry(radius + 0.1, 0.12, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xD61B23 });
    const selRing = new THREE.Mesh(ringGeo, ringMat);
    selRing.rotation.x = Math.PI / 2;
    selRing.position.y = capMesh.position.y;
    group.add(selRing);
  }

  return group;
}

/**
 * Creates a photorealistic 3D Egg Tray Mesh with actual 3D Eggs nestled inside!
 */
export function createRealisticEggTrayMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  // 1. Clear Molded Plastic Tray Base
  const baseH = height * 0.45;
  const trayGeo = new THREE.BoxGeometry(width - 0.3, baseH, depth - 0.3);
  const trayMat = new THREE.MeshPhysicalMaterial({
    color: 0xF8FAFC,
    transparent: true,
    opacity: 0.65,
    roughness: 0.15,
    transmission: 0.7,
    ior: 1.45
  });

  const trayMesh = new THREE.Mesh(trayGeo, trayMat);
  trayMesh.position.y = -height / 2 + baseH / 2;
  group.add(trayMesh);

  // 2. Realistic 3D Ellipsoidal Eggs Grid
  const rows = depth > 20 ? 5 : 3;
  const cols = width > 25 ? 6 : 4;
  const eggRadiusX = (width * 0.8) / (cols * 2);
  const eggRadiusY = height * 0.32;
  const eggRadiusZ = (depth * 0.8) / (rows * 2);

  const eggGeo = new THREE.SphereGeometry(1, 16, 16);
  eggGeo.scale(eggRadiusX, eggRadiusY, eggRadiusZ);

  // Egg colors: Mix of warm organic brown and farm fresh white
  const brownEggMat = new THREE.MeshStandardMaterial({
    color: 0xD4A373,
    roughness: 0.55,
    metalness: 0.02
  });
  const whiteEggMat = new THREE.MeshStandardMaterial({
    color: 0xFDFBF7,
    roughness: 0.5,
    metalness: 0.02
  });

  const startX = -((cols - 1) * eggRadiusX * 2.2) / 2;
  const startZ = -((rows - 1) * eggRadiusZ * 2.2) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isBrown = (r + c) % 3 !== 0;
      const eggMesh = new THREE.Mesh(eggGeo, isBrown ? brownEggMat : whiteEggMat);
      eggMesh.position.set(
        startX + c * eggRadiusX * 2.2,
        trayMesh.position.y + baseH / 2 + eggRadiusY * 0.6,
        startZ + r * eggRadiusZ * 2.2
      );
      // Slight natural tilt
      eggMesh.rotation.z = (Math.sin(r * 5 + c) * Math.PI) / 36;
      eggMesh.rotation.x = (Math.cos(c * 3) * Math.PI) / 36;
      eggMesh.castShadow = true;
      group.add(eggMesh);
    }
  }

  // 3. Clear Flip-top Lid with Hinges
  const lidH = height * 0.45;
  const lidGeo = new THREE.BoxGeometry(width - 0.25, lidH, depth - 0.25);
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    transmission: 0.85
  });
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.position.y = height / 2 - lidH / 2;
  group.add(lidMesh);

  if (isSelected) {
    const boxHelper = new THREE.BoxHelper(lidMesh, 0xD61B23);
    group.add(boxHelper);
  }

  return group;
}

/**
 * Creates a photorealistic 3D Food Airtight Container (밀폐용기, 반찬통, 락앤락)
 */
export function createRealisticAirtightContainerMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  const bodyH = height * 0.85;
  const lidH = height * 0.15;

  // 1. Transparent Glass/Plastic Container Body
  const bodyGeo = new THREE.BoxGeometry(width - 0.3, bodyH, depth - 0.3);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xF0FDFA,
    transparent: true,
    opacity: 0.78,
    roughness: 0.08,
    metalness: 0.02,
    transmission: 0.82,
    ior: 1.5
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = -height / 2 + bodyH / 2;
  group.add(bodyMesh);

  // 2. Silicone Gasket Rim (Teal / Coral / Blue)
  const gasketGeo = new THREE.BoxGeometry(width - 0.2, 0.35, depth - 0.2);
  const gasketMat = new THREE.MeshStandardMaterial({
    color: 0x0D9488,
    roughness: 0.3
  });
  const gasketMesh = new THREE.Mesh(gasketGeo, gasketMat);
  gasketMesh.position.y = bodyMesh.position.y + bodyH / 2;
  group.add(gasketMesh);

  // 3. Clear Airtight Snap Lid
  const lidGeo = new THREE.BoxGeometry(width - 0.15, lidH, depth - 0.15);
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.65,
    roughness: 0.2,
    transmission: 0.65
  });
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.position.y = gasketMesh.position.y + lidH / 2;
  group.add(lidMesh);

  // 4. Four Snap-Locking Wing Clips on each side
  const clipMat = new THREE.MeshStandardMaterial({ color: 0x0F766E, roughness: 0.3 });

  // Front & Back Clips
  const fbClipGeo = new THREE.BoxGeometry(width * 0.45, lidH * 1.2, 0.4);
  const fClip = new THREE.Mesh(fbClipGeo, clipMat);
  fClip.position.set(0, lidMesh.position.y - 0.1, depth / 2 - 0.1);
  group.add(fClip);

  const bClip = new THREE.Mesh(fbClipGeo, clipMat);
  bClip.position.set(0, lidMesh.position.y - 0.1, -depth / 2 + 0.1);
  group.add(bClip);

  // Left & Right Clips
  const lrClipGeo = new THREE.BoxGeometry(0.4, lidH * 1.2, depth * 0.45);
  const lClip = new THREE.Mesh(lrClipGeo, clipMat);
  lClip.position.set(-width / 2 + 0.1, lidMesh.position.y - 0.1, 0);
  group.add(lClip);

  const rClip = new THREE.Mesh(lrClipGeo, clipMat);
  rClip.position.set(width / 2 - 0.1, lidMesh.position.y - 0.1, 0);
  group.add(rClip);

  if (isSelected) {
    const boxHelper = new THREE.BoxHelper(lidMesh, 0xD61B23);
    group.add(boxHelper);
  }

  return group;
}

/**
 * Creates a photorealistic Daiso Refrigerator Handle Tray Mesh with front grip cutout
 */
export function createRealisticFridgeTrayMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  const wallThick = 0.32;
  const floorThick = 0.3;
  const wallH = height - floorThick;

  // Premium transparent acrylic tray material
  const trayMat = new THREE.MeshPhysicalMaterial({
    color: 0xBAE6FD,
    transparent: true,
    opacity: 0.72,
    roughness: 0.12,
    metalness: 0.05,
    transmission: 0.75,
    ior: 1.48
  });

  // 1. Bottom Floor
  const floorGeo = new THREE.BoxGeometry(width - 0.2, floorThick, depth - 0.2);
  const floorMesh = new THREE.Mesh(floorGeo, trayMat);
  floorMesh.position.set(0, -height / 2 + floorThick / 2, 0);
  group.add(floorMesh);

  // 2. Left & Right Walls
  const sideGeo = new THREE.BoxGeometry(wallThick, wallH, depth - 0.2);
  const leftWall = new THREE.Mesh(sideGeo, trayMat);
  leftWall.position.set(-width / 2 + wallThick / 2 + 0.1, -height / 2 + floorThick + wallH / 2, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(sideGeo, trayMat);
  rightWall.position.set(width / 2 - wallThick / 2 - 0.1, -height / 2 + floorThick + wallH / 2, 0);
  group.add(rightWall);

  // 3. Back Wall
  const backGeo = new THREE.BoxGeometry(width - 0.2, wallH, wallThick);
  const backWall = new THREE.Mesh(backGeo, trayMat);
  backWall.position.set(0, -height / 2 + floorThick + wallH / 2, -depth / 2 + wallThick / 2 + 0.1);
  group.add(backWall);

  // 4. Front Wall with Ergonomic Handle Cutout
  const frontWallH = wallH * 0.75;
  const frontGeo = new THREE.BoxGeometry(width - 0.2, frontWallH, wallThick);
  const frontWall = new THREE.Mesh(frontGeo, trayMat);
  frontWall.position.set(0, -height / 2 + floorThick + frontWallH / 2, depth / 2 - wallThick / 2 - 0.1);
  group.add(frontWall);

  // 5. Front Pull Handle Bar
  const handleBarGeo = new THREE.CylinderGeometry(0.35, 0.35, width * 0.5, 16);
  handleBarGeo.rotateZ(Math.PI / 2);
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x0284C7,
    roughness: 0.25,
    metalness: 0.1
  });
  const handleBar = new THREE.Mesh(handleBarGeo, handleMat);
  handleBar.position.set(0, frontWall.position.y + frontWallH / 2 + 0.4, depth / 2 + 0.3);
  group.add(handleBar);

  // 6. Raycast Hit Box
  const hitBoxGeo = new THREE.BoxGeometry(width, height, depth);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hitMesh = new THREE.Mesh(hitBoxGeo, hitMat);
  hitMesh.userData = { instanceId: item.instanceId };
  group.add(hitMesh);

  if (isSelected) {
    const boxHelper = new THREE.BoxHelper(hitMesh, 0xD61B23);
    group.add(boxHelper);
  }

  return group;
}

/**
 * Creates a photorealistic 3D Rotating Turntable (Lazy Susan 23.5 / 30cm)
 */
export function createRealisticTurntableMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: item.instanceId };

  const radius = Math.min(width, depth) / 2 * 0.98;
  const baseH = height * 0.7;

  // 1. Rotating Main Disc
  const discGeo = new THREE.CylinderGeometry(radius, radius, baseH * 0.3, 48);
  const discMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.8,
    roughness: 0.15,
    transmission: 0.6
  });
  const discMesh = new THREE.Mesh(discGeo, discMat);
  discMesh.position.y = -height / 2 + (baseH * 0.3) / 2;
  group.add(discMesh);

  // 2. Outer Raised Perimeter Lip
  const lipGeo = new THREE.CylinderGeometry(radius, radius, baseH, 48, 1, true);
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x0284C7,
    roughness: 0.25,
    side: THREE.DoubleSide
  });
  const lipMesh = new THREE.Mesh(lipGeo, lipMat);
  lipMesh.position.y = discMesh.position.y + baseH / 2;
  group.add(lipMesh);

  // 3. Central Ball Bearing Core
  const coreGeo = new THREE.CylinderGeometry(radius * 0.3, radius * 0.35, 0.4, 24);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x94A3B8,
    metalness: 0.9,
    roughness: 0.2
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = discMesh.position.y + 0.15;
  group.add(coreMesh);

  if (isSelected) {
    const selRingGeo = new THREE.TorusGeometry(radius + 0.1, 0.12, 16, 48);
    const selRingMat = new THREE.MeshBasicMaterial({ color: 0xD61B23 });
    const selRing = new THREE.Mesh(selRingGeo, selRingMat);
    selRing.rotation.x = Math.PI / 2;
    selRing.position.y = lipMesh.position.y + baseH / 2;
    group.add(selRing);
  }

  return group;
}

/**
 * Master Factory: Creates the most realistic 3D Model for any given product
 */
export function createRealisticItemMesh(
  item: FittedItem,
  width: number,
  depth: number,
  height: number,
  isSelected: boolean
): THREE.Group {
  const name = item.product.name.toLowerCase();

  // 1. Egg Tray
  if (name.includes('계란') && (name.includes('보관함') || name.includes('용기') || name.includes('구'))) {
    return createRealisticEggTrayMesh(item, width, depth, height, isSelected);
  }

  // 2. Beverage Cans
  if (
    name.includes('캔') ||
    name.includes('콜라') ||
    name.includes('사이다') ||
    name.includes('맥주') ||
    name.includes('음료') ||
    name.includes('콤부차') ||
    name.includes('탄산') ||
    name.includes('coke')
  ) {
    return createRealisticCanMesh(item, width, depth, height, isSelected);
  }

  // 3. Gable-Top Milk / Juice Cartons
  if (name.includes('우유') || name.includes('주스') || name.includes('두유') || name.includes('팩')) {
    return createRealisticCartonMesh(item, width, depth, height, isSelected);
  }

  // 4. Bottles (Edible Cooking Oil, Sauce, Water, Dressing, Wine)
  const isCookingOilBottle =
    (name.includes('오일병') || name.includes('참기름') || name.includes('들기름') || name.includes('식용유') || name.includes('올리브유') || name.includes('카놀라유')) &&
    !name.includes('클렌징') && !name.includes('헤어') && !name.includes('바디') && !name.includes('엔진') && !name.includes('바이크');

  if (
    name.includes('생수') ||
    name.includes('소스') ||
    name.includes('드레싱') ||
    name.includes('간장') ||
    name.includes('식초') ||
    name.includes('와인') ||
    isCookingOilBottle ||
    name.includes('보틀') ||
    (name.includes('병') && !name.includes('클렌징') && !name.includes('화장품') && !name.includes('향수') && !name.includes('매니큐어'))
  ) {
    return createRealisticBottleMesh(item, width, depth, height, isSelected);
  }

  // 5. Airtight Food Containers (밀폐용기, 반찬통)
  if (name.includes('밀폐용기') || name.includes('반찬통') || name.includes('저장용기') || name.includes('물받이')) {
    return createRealisticAirtightContainerMesh(item, width, depth, height, isSelected);
  }

  // 6. Turntables (회전 트레이)
  if (name.includes('회전') && name.includes('트레이')) {
    return createRealisticTurntableMesh(item, width, depth, height, isSelected);
  }

  // 7. Fridge Handle Trays (냉장고 핸들 트레이)
  if (name.includes('냉장고') && (name.includes('트레이') || name.includes('바스켓') || name.includes('바구니'))) {
    return createRealisticFridgeTrayMesh(item, width, depth, height, isSelected);
  }

  // Fallback default: Clean container or box
  return createRealisticFridgeTrayMesh(item, width, depth, height, isSelected);
}

/**
 * Creates the Realistic Bespoke / Objet Refrigerator Interior Cavity Environment
 */
export function createRealisticFridgeEnvironment(
  width: number,
  depth: number,
  height: number
): THREE.Group {
  const envGroup = new THREE.Group();

  // 1. Samsung Metal Cooling Stainless Steel Rear Panel
  const backPanelGeo = new THREE.BoxGeometry(width + 4.0, height + 8.0, 1.2);
  const metalCoolingMat = new THREE.MeshStandardMaterial({
    color: 0xCBD5E1,
    metalness: 0.88,
    roughness: 0.28,
    envMapIntensity: 1.5
  });
  const backPanel = new THREE.Mesh(backPanelGeo, metalCoolingMat);
  backPanel.position.set(0, height / 2 + 2.0, -depth / 2 - 0.8);
  backPanel.receiveShadow = true;
  envGroup.add(backPanel);

  // Bespoke Metal Cooling Engraved Logo Banner
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BESPOKE AI HYBRID METAL COOLING', 256, 32);
  const logoTex = new THREE.CanvasTexture(canvas);
  const logoGeo = new THREE.PlaneGeometry(width * 0.7, 2.5);
  const logoMat = new THREE.MeshBasicMaterial({ map: logoTex });
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  logoMesh.position.set(0, height - 1.5, -depth / 2 - 0.15);
  envGroup.add(logoMesh);

  // 2. Interior Top LED Light Strip (5500K Cool White Daylight)
  const lightBarGeo = new THREE.BoxGeometry(width * 0.85, 1.0, 2.0);
  const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xF0FDFA });
  const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
  lightBar.position.set(0, height + 4.0, 0);
  envGroup.add(lightBar);

  const topPointLight = new THREE.PointLight(0xF0FDFA, 1.8, 120);
  topPointLight.position.set(0, height + 3.5, 0);
  topPointLight.castShadow = true;
  envGroup.add(topPointLight);

  // 3. Tempered Glass Shelf with Metallic Front Edge Trim
  const glassShelfGeo = new THREE.BoxGeometry(width, 0.8, depth);
  const glassShelfMat = new THREE.MeshPhysicalMaterial({
    color: 0xE0F2FE,
    transparent: true,
    opacity: 0.6,
    roughness: 0.05,
    transmission: 0.9,
    ior: 1.52
  });
  const glassShelf = new THREE.Mesh(glassShelfGeo, glassShelfMat);
  glassShelf.position.set(0, -0.4, 0);
  glassShelf.receiveShadow = true;
  envGroup.add(glassShelf);

  // Metallic front edge band
  const frontTrimGeo = new THREE.BoxGeometry(width, 1.0, 0.6);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x94A3B8,
    metalness: 0.9,
    roughness: 0.2
  });
  const frontTrim = new THREE.Mesh(frontTrimGeo, trimMat);
  frontTrim.position.set(0, -0.4, depth / 2 + 0.3);
  envGroup.add(frontTrim);

  // Side shelf bracket clips
  const bracketGeo = new THREE.BoxGeometry(0.8, 2.0, 4.0);
  const lBracket = new THREE.Mesh(bracketGeo, trimMat);
  lBracket.position.set(-width / 2 - 0.4, 0, 0);
  envGroup.add(lBracket);

  const rBracket = new THREE.Mesh(bracketGeo, trimMat);
  rBracket.position.set(width / 2 + 0.4, 0, 0);
  envGroup.add(rBracket);

  return envGroup;
}

/**
 * Exports the 3D scene layout as standard GLTF (.glb binary) for personal 3D modeling use
 */
export function exportSceneToGLTF(scene: THREE.Scene, filename = 'daiso-fridge-3d-model.glb'): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        resolve();
      },
      (error) => {
        console.error('An error occurred while exporting 3D model:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}
