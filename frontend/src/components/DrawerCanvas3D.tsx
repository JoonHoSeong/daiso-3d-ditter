import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { DrawerDimension, FittedItem, DaisoProduct } from '../data/daisoProducts';
import { checkItemCollision, calculateMagneticSnap, CollisionResult } from '../utils/collision';
import {
  isMatOrLiner,
  calculateRestingY,
  isOpenContainer,
  getItemDimensions,
  getPostureInfo
} from '../utils/stacking';
import {
  Eye,
  RotateCw,
  ArrowUpDown,
  Trash2,
  HelpCircle,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Magnet,
  X
} from 'lucide-react';

interface DrawerCanvas3DProps {
  drawer: DrawerDimension;
  items: FittedItem[];
  selectedItemInstanceId: string | null;
  onSelectItem: (instanceId: string | null) => void;
  onRemoveItem: (instanceId: string) => void;
  onRotateItem: (instanceId: string) => void;
  onTogglePosture?: (instanceId: string) => void;
  onMoveItem: (instanceId: string, newX: number, newZ: number, newY?: number) => boolean;
  onPreviewProduct?: (product: DaisoProduct) => void;
}

export const DrawerCanvas3D: React.FC<DrawerCanvas3DProps> = ({
  drawer,
  items,
  selectedItemInstanceId,
  onSelectItem,
  onRemoveItem,
  onRotateItem,
  onTogglePosture,
  onMoveItem,
  onPreviewProduct
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const itemMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const requestRenderRef = useRef<() => void>(() => {});

  // Magnetic Snap Toggle State (default: ON)
  const [isMagneticSnap, setIsMagneticSnap] = useState<boolean>(true);
  const isMagneticSnapRef = useRef(isMagneticSnap);
  isMagneticSnapRef.current = isMagneticSnap;

  // Dragging state for interactive repositioning
  const [dragFeedback, setDragFeedback] = useState<{
    isDragging: boolean;
    collides: boolean;
    isSnapped?: boolean;
    snapTarget?: string;
    x: number;
    z: number;
    message?: string;
  } | null>(null);

  const [nudgeStep, setNudgeStep] = useState<number>(1.0); // 1cm or 5cm
  const [warningToast, setWarningToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setWarningToast(msg);
    setTimeout(() => {
      setWarningToast(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Set camera perspective
  const setCameraView = (view: 'iso' | 'top' | 'front') => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const maxDim = Math.max(drawer.width, drawer.depth, drawer.height);

    if (view === 'iso') {
      cam.position.set(drawer.width * 0.9, maxDim * 1.5, drawer.depth * 1.3);
      cam.lookAt(0, drawer.height * 0.25, 0);
    } else if (view === 'top') {
      cam.position.set(0, maxDim * 2.1, 0.001);
      cam.lookAt(0, 0, 0);
    } else if (view === 'front') {
      cam.position.set(0, drawer.height * 0.8, maxDim * 1.9);
      cam.lookAt(0, drawer.height * 0.4, 0);
    }
    requestRenderRef.current();
  };

  // References for drag calculation & dynamic handlers
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const drawerRef = useRef(drawer);
  drawerRef.current = drawer;
  const selectedItemInstanceIdRef = useRef(selectedItemInstanceId);
  selectedItemInstanceIdRef.current = selectedItemInstanceId;
  const onSelectItemRef = useRef(onSelectItem);
  onSelectItemRef.current = onSelectItem;
  const onMoveItemRef = useRef(onMoveItem);
  onMoveItemRef.current = onMoveItem;
  const onRemoveItemRef = useRef(onRemoveItem);
  onRemoveItemRef.current = onRemoveItem;
  const onRotateItemRef = useRef(onRotateItem);
  onRotateItemRef.current = onRotateItem;
  const onTogglePostureRef = useRef(onTogglePosture);
  onTogglePostureRef.current = onTogglePosture;

  // 2D Screen Position for 3D Floating Contextual HUD
  const [selectedItemScreenPos, setSelectedItemScreenPos] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const updateScreenPosRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = Math.max(container.clientWidth, 100);
    const height = Math.max(container.clientHeight, 100);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF1F4F8);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    const maxDim = Math.max(drawerRef.current.width, drawerRef.current.depth, drawerRef.current.height);
    camera.position.set(drawerRef.current.width * 0.9, maxDim * 1.5, drawerRef.current.depth * 1.3);
    camera.lookAt(0, drawerRef.current.height * 0.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(40, 80, 50);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xD6E4FF, 0.4);
    fillLight.position.set(-40, 30, -30);
    scene.add(fillLight);

    // Floor plane for mouse raycasting
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeIntersect = new THREE.Vector3();

    // Interaction variables
    let isOrbiting = false;
    let isDraggingItem = false;
    let hasMovedMouse = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = new THREE.Spherical().setFromVector3(camera.position);

    let activeDragInstanceId: string | null = null;
    let dragOffset = new THREE.Vector3();
    let initialItemPos = { x: 0, y: 0, z: 0 };
    let currentDragCollision: CollisionResult = { collides: false };
    let candidateX = 0;
    let candidateY = 0;
    let candidateZ = 0;
    let didSnapMagnetic = false;
    let snapTargetName: string | undefined;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check if clicking on an item mesh
      const meshes: THREE.Object3D[] = [];
      itemMeshesRef.current.forEach(group => meshes.push(...group.children));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && current.parent && !current.userData.instanceId) {
          current = current.parent;
        }

        if (current && current.userData.instanceId) {
          const instId = current.userData.instanceId;
          onSelectItemRef.current(instId);

          const foundItem = itemsRef.current.find(it => it.instanceId === instId);
          if (foundItem) {
            isDraggingItem = true;
            hasMovedMouse = false;
            pointerDownX = e.clientX;
            pointerDownY = e.clientY;
            activeDragInstanceId = instId;
            initialItemPos = { x: foundItem.x, y: foundItem.y || 0, z: foundItem.z };
            candidateX = foundItem.x;
            candidateY = foundItem.y || 0;
            candidateZ = foundItem.z;
            currentDragCollision = { collides: false };

            // Intersect ray with floor plane to find grab offset
            if (raycaster.ray.intersectPlane(floorPlane, planeIntersect)) {
              const meshGroup = itemMeshesRef.current.get(instId);
              if (meshGroup) {
                dragOffset.copy(planeIntersect).sub(meshGroup.position);
              }
            }
            requestRender();
            return;
          }
        }
      }

      // If clicked empty space, start camera orbit
      isOrbiting = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      onSelectItemRef.current(null);
      requestRender();
    };

    const onPointerMove = (e: MouseEvent) => {
      if (isDraggingItem && activeDragInstanceId) {
        if (!hasMovedMouse && Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 4) {
          hasMovedMouse = true;
        }
        if (!hasMovedMouse) {
          return;
        }
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(floorPlane, planeIntersect)) {
          const meshGroup = itemMeshesRef.current.get(activeDragInstanceId);
          const currentItem = itemsRef.current.find(it => it.instanceId === activeDragInstanceId);

          if (meshGroup && currentItem) {
            const { width: curW, depth: curD, height: curH } = getItemDimensions(currentItem);

            const drawerOffsetX = -drawerRef.current.width / 2;
            const drawerOffsetZ = -drawerRef.current.depth / 2;

            // Target Three.js group position
            const targetX = planeIntersect.x - dragOffset.x;
            const targetZ = planeIntersect.z - dragOffset.z;

            // Convert to drawer coordinate
            const rawItemX = targetX - drawerOffsetX - curW / 2;
            const rawItemZ = targetZ - drawerOffsetZ - curD / 2;

            // Magnetic snap vs free snap
            if (isMagneticSnapRef.current) {
              const snapRes = calculateMagneticSnap(
                {
                  instanceId: activeDragInstanceId,
                  x: rawItemX,
                  z: rawItemZ,
                  width: curW,
                  depth: curD
                },
                itemsRef.current,
                drawerRef.current,
                2.2 // 2.2cm attraction threshold
              );
              candidateX = snapRes.snappedX;
              candidateZ = snapRes.snappedZ;
              didSnapMagnetic = snapRes.didSnap;
              snapTargetName = snapRes.snapTarget;
            } else {
              candidateX = Math.round(rawItemX * 2) / 2;
              candidateZ = Math.round(rawItemZ * 2) / 2;
              didSnapMagnetic = false;
              snapTargetName = undefined;
            }

            // Calculate vertical resting position (on floor, on mat, or stacked on tray)
            const resting = calculateRestingY(
              {
                instanceId: activeDragInstanceId,
                productId: currentItem.productId,
                product: currentItem.product,
                x: candidateX,
                z: candidateZ,
                width: curW,
                depth: curD,
                rotation: currentItem.rotation
              },
              itemsRef.current,
              drawerRef.current.height
            );
            candidateY = resting.y;

            // Evaluate collision in real time
            currentDragCollision = checkItemCollision(
              {
                instanceId: activeDragInstanceId,
                x: candidateX,
                y: candidateY,
                z: candidateZ,
                width: curW,
                depth: curD,
                height: curH,
                product: currentItem.product
              },
              itemsRef.current,
              drawerRef.current
            );

            // Update mesh position visually
            const visualX = drawerOffsetX + candidateX + curW / 2;
            const visualY = candidateY + curH / 2;
            const visualZ = drawerOffsetZ + candidateZ + curD / 2;
            meshGroup.position.x = visualX;
            meshGroup.position.y = visualY;
            meshGroup.position.z = visualZ;

            // Visual feedback: outline turns Red if collision, Blue/Emerald if snapped/valid
            const lineSegments = meshGroup.children.find(c => c instanceof THREE.LineSegments) as THREE.LineSegments | undefined;
            if (lineSegments && lineSegments.material instanceof THREE.LineBasicMaterial) {
              if (currentDragCollision.collides) {
                lineSegments.material.color.setHex(0xEF4444); // Red warning
              } else if (didSnapMagnetic) {
                lineSegments.material.color.setHex(0x3B82F6); // Magnetic Blue glow
              } else {
                lineSegments.material.color.setHex(0x10B981); // Emerald valid
              }
            }

            let msg = '';
            if (currentDragCollision.collides) {
              msg = currentDragCollision.reason === 'wall'
                ? '서랍 벽을 벗어남 (배치 불가)'
                : `"${currentDragCollision.collidedWith}"과 겹침 (배치 불가)`;
            }

            setDragFeedback({
              isDragging: true,
              collides: currentDragCollision.collides,
              isSnapped: didSnapMagnetic,
              snapTarget: snapTargetName,
              x: candidateX,
              z: candidateZ,
              message: msg
            });
            requestRender();
          }
        }
        return;
      }

      if (isOrbiting) {
        const deltaX = (e.clientX - prevMouseX) * 0.007;
        const deltaY = (e.clientY - prevMouseY) * 0.007;

        spherical.theta -= deltaX;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY));
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, drawerRef.current.height * 0.25, 0);

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        requestRender();
      }
    };

    const onPointerUp = () => {
      if (isDraggingItem && activeDragInstanceId) {
        if (!hasMovedMouse) {
          // Pure click: keep item selected without moving
          isDraggingItem = false;
          activeDragInstanceId = null;
          setDragFeedback(null);
          requestRender();
          return;
        }

        const meshGroup = itemMeshesRef.current.get(activeDragInstanceId);
        const currentItem = itemsRef.current.find(it => it.instanceId === activeDragInstanceId);

        if (meshGroup && currentItem) {
          const { width: curW, depth: curD, height: curH } = getItemDimensions(currentItem);
          const drawerOffsetX = -drawerRef.current.width / 2;
          const drawerOffsetZ = -drawerRef.current.depth / 2;

          if (!currentDragCollision.collides) {
            // Success: Place item at new coordinates
            onMoveItemRef.current(activeDragInstanceId, candidateX, candidateZ, candidateY);
          } else {
            // Revert back to original valid position
            const revertX = drawerOffsetX + initialItemPos.x + curW / 2;
            const revertY = initialItemPos.y + curH / 2;
            const revertZ = drawerOffsetZ + initialItemPos.z + curD / 2;
            meshGroup.position.x = revertX;
            meshGroup.position.y = revertY;
            meshGroup.position.z = revertZ;

            const lineSegments = meshGroup.children.find(c => c instanceof THREE.LineSegments) as THREE.LineSegments | undefined;
            if (lineSegments && lineSegments.material instanceof THREE.LineBasicMaterial) {
              lineSegments.material.color.setHex(0xD61B23); // Red selected outline
            }

            const errorMsg = currentDragCollision.reason === 'wall'
              ? '서랍 벽을 벗어나 배치할 수 없습니다!'
              : `다른 물품("${currentDragCollision.collidedWith}")과 겹쳐서 배치할 수 없습니다!`;
            showToast(errorMsg);
          }
        }

        isDraggingItem = false;
        activeDragInstanceId = null;
        setDragFeedback(null);
        requestRender();
      }

      isOrbiting = false;
      requestRender();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(20, Math.min(180, spherical.radius + e.deltaY * 0.06));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, drawerRef.current.height * 0.25, 0);
      requestRender();
    };

    // Keyboard Shortcuts: Delete, Rotate(R), Deselect(Esc), Magnet(M)
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const activeId = selectedItemInstanceIdRef.current;
      if (!activeId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRemoveItemRef.current(activeId);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRotateItemRef.current(activeId);
      } else if (e.key === 'v' || e.key === 'V' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onTogglePostureRef.current?.(activeId);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSelectItemRef.current(null);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMagneticSnap(prev => !prev);
      }
    };

    const canvasDom = renderer.domElement;
    canvasDom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvasDom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    // High-performance On-Demand Render Loop (0% idle GPU usage)
    let renderRequested = false;
    let animId: number = 0;

    const updateSelectedScreenPos = () => {
      const activeId = selectedItemInstanceIdRef.current;
      if (!activeId || !camera || !renderer) {
        setSelectedItemScreenPos(null);
        return;
      }
      const meshGroup = itemMeshesRef.current.get(activeId);
      if (!meshGroup) {
        setSelectedItemScreenPos(null);
        return;
      }
      const currentItem = itemsRef.current.find(it => it.instanceId === activeId);
      if (!currentItem) {
        setSelectedItemScreenPos(null);
        return;
      }

      const { height: curH } = getItemDimensions(currentItem);

      const worldPos = new THREE.Vector3();
      meshGroup.getWorldPosition(worldPos);
      worldPos.y += curH / 2 + 1.2;

      worldPos.project(camera);

      if (worldPos.z > 1) {
        setSelectedItemScreenPos(null);
        return;
      }

      const dom = renderer.domElement;
      const screenX = (worldPos.x * 0.5 + 0.5) * dom.clientWidth;
      const screenY = (-(worldPos.y * 0.5) + 0.5) * dom.clientHeight;

      setSelectedItemScreenPos({ x: screenX, y: screenY, visible: true });
    };
    updateScreenPosRef.current = updateSelectedScreenPos;

    const renderScene = () => {
      renderRequested = false;
      if (renderer && scene && camera && container.clientWidth > 0 && container.clientHeight > 0) {
        renderer.render(scene, camera);
        updateSelectedScreenPos();
      }
    };

    const requestRender = () => {
      if (!renderRequested) {
        renderRequested = true;
        animId = requestAnimationFrame(renderScene);
      }
    };
    requestRenderRef.current = requestRender;
    requestRender();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      canvasDom.removeEventListener('mousedown', onPointerDown);
      canvasDom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [showToast]);

  // Update Drawer Box & Grid
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const oldDrawer = scene.getObjectByName('DRAWER_GROUP');
    if (oldDrawer) scene.remove(oldDrawer);

    const drawerGroup = new THREE.Group();
    drawerGroup.name = 'DRAWER_GROUP';

    const w = drawer.width;
    const d = drawer.depth;
    const h = drawer.height;
    const wallThick = 0.8;

    const floorGeo = new THREE.PlaneGeometry(w, d);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.25,
      metalness: 0.05
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    drawerGroup.add(floorMesh);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xCBD5E1, linewidth: 1 });
    const gridGroup = new THREE.Group();
    const step = 2.0;

    for (let x = -w / 2 + step; x < w / 2; x += step) {
      const pts = [new THREE.Vector3(x, 0.02, -d / 2), new THREE.Vector3(x, 0.02, d / 2)];
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    for (let z = -d / 2 + step; z < d / 2; z += step) {
      const pts = [new THREE.Vector3(-w / 2, 0.02, z), new THREE.Vector3(w / 2, 0.02, z)];
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    drawerGroup.add(gridGroup);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      roughness: 0.4,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const backGeo = new THREE.BoxGeometry(w + wallThick * 2, h, wallThick);
    const backWall = new THREE.Mesh(backGeo, wallMat);
    backWall.position.set(0, h / 2, -d / 2 - wallThick / 2);
    drawerGroup.add(backWall);

    const frontWallMat = wallMat.clone();
    frontWallMat.opacity = 0.35;
    const frontWall = new THREE.Mesh(backGeo, frontWallMat);
    frontWall.position.set(0, h / 2, d / 2 + wallThick / 2);
    drawerGroup.add(frontWall);

    const sideGeo = new THREE.BoxGeometry(wallThick, h, d);
    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(-w / 2 - wallThick / 2, h / 2, 0);
    drawerGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideGeo, wallMat);
    rightWall.position.set(w / 2 + wallThick / 2, h / 2, 0);
    drawerGroup.add(rightWall);

    const edgePoints = [
      new THREE.Vector3(-w / 2, h, -d / 2),
      new THREE.Vector3(w / 2, h, -d / 2),
      new THREE.Vector3(w / 2, h, d / 2),
      new THREE.Vector3(-w / 2, h, d / 2),
      new THREE.Vector3(-w / 2, h, -d / 2)
    ];
    drawerGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(edgePoints),
        new THREE.LineBasicMaterial({ color: 0x64748B, linewidth: 2 })
      )
    );

    scene.add(drawerGroup);
    requestRenderRef.current();
  }, [drawer]);

  // Update Fitted Items Meshes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    itemMeshesRef.current.forEach(group => scene.remove(group));
    itemMeshesRef.current.clear();

    const drawerOffsetX = -drawer.width / 2;
    const drawerOffsetZ = -drawer.depth / 2;

    items.forEach(item => {
      const group = new THREE.Group();
      group.userData = { instanceId: item.instanceId };

      const { width: curW, depth: curD, height: curH } = getItemDimensions(item);
      const isLiner = isMatOrLiner(item.product);

      const isSelected = item.instanceId === selectedItemInstanceId;
      const isContainer = isOpenContainer(item.product) && (!item.posture || item.posture === 'flat') && curH >= 2.0;

      const mainColor = new THREE.Color(item.product.color || '#BAE6FD');

      if (isContainer) {
        // High-Performance Hollow Open-Top Container / Basket
        const wallThick = 0.28;
        const floorThick = 0.25;

        // MeshStandardMaterial: Extremely lightweight, zero transmission framebuffer copies!
        const containerMat = new THREE.MeshStandardMaterial({
          color: mainColor,
          roughness: 0.25,
          metalness: 0.05,
          transparent: true,
          opacity: 0.78
        });

        const cGroup = new THREE.Group();
        cGroup.userData = { instanceId: item.instanceId };

        // 1. Bottom Floor
        const floorGeo = new THREE.BoxGeometry(curW - 0.2, floorThick, curD - 0.2);
        const floorMesh = new THREE.Mesh(floorGeo, containerMat);
        floorMesh.position.set(0, -curH / 2 + floorThick / 2, 0);
        floorMesh.userData = { instanceId: item.instanceId };
        cGroup.add(floorMesh);

        // 2. Front Wall
        const wallH = curH - floorThick;
        const frontWallGeo = new THREE.BoxGeometry(curW - 0.2, wallH, wallThick);
        const frontWall = new THREE.Mesh(frontWallGeo, containerMat);
        frontWall.position.set(0, -curH / 2 + floorThick + wallH / 2, (curD - 0.2) / 2 - wallThick / 2);
        frontWall.userData = { instanceId: item.instanceId };
        cGroup.add(frontWall);

        // 3. Back Wall
        const backWall = new THREE.Mesh(frontWallGeo, containerMat);
        backWall.position.set(0, -curH / 2 + floorThick + wallH / 2, -(curD - 0.2) / 2 + wallThick / 2);
        backWall.userData = { instanceId: item.instanceId };
        cGroup.add(backWall);

        // 4. Left Wall
        const sideWallGeo = new THREE.BoxGeometry(wallThick, wallH, Math.max(0.1, curD - 0.2 - wallThick * 2));
        const leftWall = new THREE.Mesh(sideWallGeo, containerMat);
        leftWall.position.set(-(curW - 0.2) / 2 + wallThick / 2, -curH / 2 + floorThick + wallH / 2, 0);
        leftWall.userData = { instanceId: item.instanceId };
        cGroup.add(leftWall);

        // 5. Right Wall
        const rightWall = new THREE.Mesh(sideWallGeo, containerMat);
        rightWall.position.set((curW - 0.2) / 2 - wallThick / 2, -curH / 2 + floorThick + wallH / 2, 0);
        rightWall.userData = { instanceId: item.instanceId };
        cGroup.add(rightWall);

        // Rim and outer edges
        const fullBoxGeo = new THREE.BoxGeometry(curW - 0.2, curH, curD - 0.2);
        const edges = new THREE.EdgesGeometry(fullBoxGeo);
        const lineMat = new THREE.LineBasicMaterial({
          color: isSelected ? 0xD61B23 : 0x0284C7,
          linewidth: isSelected ? 3 : 1
        });
        cGroup.add(new THREE.LineSegments(edges, lineMat));

        // Invisible Raycast Hit Box
        const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
        const hitMesh = new THREE.Mesh(fullBoxGeo, hitMat);
        hitMesh.userData = { instanceId: item.instanceId };
        cGroup.add(hitMesh);

        group.add(cGroup);
      } else {
        // Solid Box / Mat / Item - Lightweight MeshStandardMaterial
        const boxGeo = new THREE.BoxGeometry(curW - 0.2, curH, curD - 0.2);
        const boxMat = isLiner
          ? new THREE.MeshStandardMaterial({
              color: mainColor,
              roughness: 0.5,
              transparent: true,
              opacity: 0.95
            })
          : new THREE.MeshStandardMaterial({
              color: mainColor,
              roughness: 0.28,
              metalness: 0.05,
              transparent: true,
              opacity: 0.92
            });

        const mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.userData = { instanceId: item.instanceId };
        group.add(mesh);

        const edges = new THREE.EdgesGeometry(boxGeo);
        const lineMat = new THREE.LineBasicMaterial({
          color: isSelected ? 0xD61B23 : (isLiner ? 0x0284C7 : 0x475569),
          linewidth: isSelected ? 3 : 1
        });
        group.add(new THREE.LineSegments(edges, lineMat));
      }

      const posX = drawerOffsetX + item.x + curW / 2;
      const posY = (item.y || 0) + curH / 2;
      const posZ = drawerOffsetZ + item.z + curD / 2;

      group.position.set(posX, posY, posZ);
      scene.add(group);
      itemMeshesRef.current.set(item.instanceId, group);
    });
    requestRenderRef.current();
    updateScreenPosRef.current();
  }, [items, drawer, selectedItemInstanceId]);

  const selectedItem = items.find(i => i.instanceId === selectedItemInstanceId);
  const selectedDims = selectedItem ? getItemDimensions(selectedItem) : null;
  const selectedPostureInfo = selectedItem
    ? getPostureInfo(selectedItem.product, selectedItem.rotation, selectedItem.posture || 'flat')
    : null;

  // Directional Nudge Handler
  const handleNudge = (dx: number, dz: number) => {
    if (!selectedItem) return;

    const { width: curW, depth: curD, height: curH } = getItemDimensions(selectedItem);

    let targetX = selectedItem.x + dx;
    let targetZ = selectedItem.z + dz;

    if (isMagneticSnap) {
      const snapRes = calculateMagneticSnap(
        {
          instanceId: selectedItem.instanceId,
          x: targetX,
          z: targetZ,
          width: curW,
          depth: curD
        },
        items,
        drawer,
        1.5
      );
      targetX = snapRes.snappedX;
      targetZ = snapRes.snappedZ;
    } else {
      targetX = Math.round(targetX * 2) / 2;
      targetZ = Math.round(targetZ * 2) / 2;
    }

    const resting = calculateRestingY(
      {
        instanceId: selectedItem.instanceId,
        productId: selectedItem.productId,
        product: selectedItem.product,
        x: targetX,
        z: targetZ,
        width: curW,
        depth: curD,
        rotation: selectedItem.rotation
      },
      items,
      drawer.height
    );

    const collision = checkItemCollision(
      {
        instanceId: selectedItem.instanceId,
        x: targetX,
        y: resting.y,
        z: targetZ,
        width: curW,
        depth: curD,
        height: curH,
        product: selectedItem.product
      },
      items,
      drawer
    );

    if (collision.collides) {
      const msg = collision.reason === 'wall'
        ? '서랍 벽을 벗어나 이동할 수 없습니다!'
        : `"${collision.collidedWith}"과 겹쳐서 이동할 수 없습니다!`;
      showToast(msg);
      return;
    }

    onMoveItem(selectedItem.instanceId, targetX, targetZ, resting.y);
  };

  // Keyboard navigation & Magnet toggle shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Toggle magnetic snap with 'M' key
      if (e.key === 'm' || e.key === 'M') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setIsMagneticSnap(prev => {
          const next = !prev;
          showToast(next ? '🧲 마그네틱 스냅 켜짐 (벽/이웃 트레이 자동 흡착)' : '마그네틱 스냅 꺼짐 (자유 이동)');
          return next;
        });
        return;
      }

      if (!selectedItem) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5.0 : nudgeStep;
        if (e.key === 'ArrowLeft') handleNudge(-step, 0);
        else if (e.key === 'ArrowRight') handleNudge(step, 0);
        else if (e.key === 'ArrowUp') handleNudge(0, -step);
        else if (e.key === 'ArrowDown') handleNudge(0, step);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem, nudgeStep, items, drawer, isMagneticSnap, showToast]);

  return (
    <div className="relative w-full h-full flex flex-col bg-daiso-canvas overflow-hidden">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Real-time Dragging Feedback Badge */}
      {dragFeedback && (
        <div
          className={`absolute top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
            dragFeedback.collides
              ? 'bg-red-600 text-white border-2 border-red-700 animate-pulse'
              : dragFeedback.isSnapped
              ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-blue-500/30'
              : 'bg-emerald-600 text-white border-2 border-emerald-700'
          }`}
        >
          {dragFeedback.collides ? (
            <>
              <AlertCircle size={16} />
              <span>⚠️ {dragFeedback.message}</span>
            </>
          ) : (
            <>
              {dragFeedback.isSnapped ? <Magnet size={16} className="animate-bounce" /> : <CheckCircle2 size={16} />}
              <span>
                위치: X={dragFeedback.x}cm, Z={dragFeedback.z}cm
                {dragFeedback.isSnapped && dragFeedback.snapTarget
                  ? ` (🧲 ${dragFeedback.snapTarget}에 딱 맞춤)`
                  : ' (배치 가능)'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Temporary Warning Toast */}
      {warningToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2 z-30">
          <AlertCircle size={16} className="text-amber-400" />
          <span>{warningToast}</span>
        </div>
      )}

      {/* Camera View & Magnet Toggle Toolbar */}
      <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/90 shadow-sm text-xs font-medium text-slate-700 whitespace-nowrap z-10">
        <span className="text-slate-400 mr-1 flex items-center whitespace-nowrap">
          <Eye size={13} className="mr-1" /> 카메라:
        </span>
        <button
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 rounded-lg hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
        >
          3D 입체
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 rounded-lg hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
        >
          2D 평면
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2 py-1 rounded-lg hover:bg-slate-100 font-medium transition-colors whitespace-nowrap"
        >
          정면
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        {/* Magnetic Snap Toggle Button */}
        <button
          onClick={() => {
            setIsMagneticSnap(prev => {
              const next = !prev;
              showToast(
                next
                  ? '🧲 마그네틱 스냅이 켜졌습니다 (벽/이웃 트레이 자동 흡착)'
                  : '마그네틱 스냅이 꺼졌습니다 (자유 이동)'
              );
              return next;
            });
          }}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
            isMagneticSnap
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          title="마그네틱 자석 스냅 켜기/끄기 (단축키: M)"
        >
          <Magnet size={13} className={isMagneticSnap ? 'text-amber-300' : 'text-slate-400'} />
          <span>자석 스냅 {isMagneticSnap ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Usage Guide */}
      <div className="hidden lg:flex absolute top-4 right-4 items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs text-[11px] text-slate-600 z-10">
        <HelpCircle size={13} className="text-slate-400" />
        <span>3D 물품 클릭: [R] 90° 회전 · [V] 세우기/눕히기 · [Del] 삭제 · 드래그 이동</span>
      </div>

      {/* 3D Contextual Floating Action Pill (Directly Above Selected Item) */}
      {selectedItem && selectedDims && selectedPostureInfo && selectedItemScreenPos && selectedItemScreenPos.visible && !dragFeedback?.isDragging && (
        <div
          style={{
            left: `${selectedItemScreenPos.x}px`,
            top: `${selectedItemScreenPos.y}px`,
            transform: 'translate(-50%, -100%) translateY(-14px)'
          }}
          className="absolute z-40 pointer-events-auto flex items-center space-x-1.5 bg-slate-900/95 text-white p-1.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md select-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Product Name & Dimensions Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800/90 rounded-xl">
            <span className="text-xs font-bold text-white max-w-[120px] truncate" title={selectedItem.product.name}>
              {selectedItem.product.name}
            </span>
            <span className="text-[10px] font-mono text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
              {selectedDims.width}×{selectedDims.depth}×{selectedDims.height}cm
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                selectedPostureInfo.isStanding
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}
            >
              {selectedPostureInfo.shortLabel}
            </span>
          </div>

          {/* Direct 90° Horizontal Rotate Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotateItem(selectedItem.instanceId);
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-blue-600/30 cursor-pointer"
            title="바닥 90도 회전 (단축키: R)"
          >
            <RotateCw size={13} className="stroke-[2.5]" />
            <span>90° 회전</span>
          </button>

          {/* Direct 3D Stand / Lay Posture Toggle Button */}
          {onTogglePosture && !isMatOrLiner(selectedItem.product) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePosture(selectedItem.instanceId);
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-indigo-600/30 cursor-pointer"
              title="세워서 보관 / 눕혀서 보관 / 옆으로 세움 전환 (단축키: V)"
            >
              <ArrowUpDown size={13} className="stroke-[2.5]" />
              <span>세우기/눕히기</span>
            </button>
          )}

          {/* Direct Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveItem(selectedItem.instanceId);
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-rose-600/30 cursor-pointer"
            title="서랍에서 삭제 (단축키: Del / Backspace)"
          >
            <Trash2 size={13} className="stroke-[2.5]" />
            <span>삭제</span>
          </button>

          {/* Preview Details Button */}
          {onPreviewProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewProduct(selectedItem.product);
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="사진 및 상세정보"
            >
              <Eye size={13} />
            </button>
          )}

          {/* Deselect / Close */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(null);
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="선택 해제 (Esc)"
          >
            <X size={13} />
          </button>

          {/* Tooltip downward triangle pointer */}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900/95" />
        </div>
      )}

      {/* Drawer Size Indicator */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-mono">
        <span className="text-slate-400">서랍 공간:</span>
        <span className="text-slate-800 font-semibold">
          가로 {drawer.width} × 세로 {drawer.depth} × 깊이 {drawer.height} cm
        </span>
      </div>

      {/* Selected Item Floating Action Bar with Position Nudge & Controls */}
      {selectedItem && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-2 z-20">
          <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-daiso-red shadow-xl animate-in fade-in slide-in-from-bottom-2">
            {/* Real Thumbnail */}
            {selectedItem.product.imageUrl ? (
              <img
                src={selectedItem.product.imageUrl}
                alt={selectedItem.product.name}
                className="w-11 h-11 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onPreviewProduct && onPreviewProduct(selectedItem.product)}
                title="클릭하여 큰 사진 보기"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-lg border border-slate-300 shadow-inner"
                style={{ backgroundColor: selectedItem.product.color }}
              />
            )}

            <div className="flex flex-col mr-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                  {selectedItem.product.name}
                </span>
                {selectedPostureInfo && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      selectedPostureInfo.isStanding
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}
                  >
                    {selectedPostureInfo.label}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-500">
                {selectedDims && (
                  <span>
                    {selectedDims.width}×{selectedDims.depth}×{selectedDims.height}cm
                  </span>
                )}
                <span>•</span>
                <span>
                  위치: ({selectedItem.x}, {selectedItem.z})
                </span>
                <span>•</span>
                <span>₩{selectedItem.product.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Position Nudge Arrows */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 space-x-0.5">
              <button
                onClick={() => handleNudge(-nudgeStep, 0)}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                title={`왼쪽으로 ${nudgeStep}cm 이동`}
              >
                <ArrowLeft size={13} />
              </button>
              <div className="flex flex-col space-y-0.5">
                <button
                  onClick={() => handleNudge(0, -nudgeStep)}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                  title={`안쪽(뒤)으로 ${nudgeStep}cm 이동`}
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  onClick={() => handleNudge(0, nudgeStep)}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                  title={`앞쪽으로 ${nudgeStep}cm 이동`}
                >
                  <ArrowDown size={11} />
                </button>
              </div>
              <button
                onClick={() => handleNudge(nudgeStep, 0)}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                title={`오른쪽으로 ${nudgeStep}cm 이동`}
              >
                <ArrowRight size={13} />
              </button>

              <button
                onClick={() => setNudgeStep(prev => (prev === 1.0 ? 5.0 : 1.0))}
                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-white rounded-lg transition-colors"
                title="이동 단위 변경 (1cm / 5cm)"
              >
                {nudgeStep}cm
              </button>
            </div>

            <a
              href={selectedItem.product.mallUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="다이소몰 공식 상세페이지 열기"
            >
              <ExternalLink size={12} className="mr-1 text-slate-600" />
              상세
            </a>

            <button
              onClick={() => onRotateItem(selectedItem.instanceId)}
              className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="바닥 90도 회전 (단축키: R)"
            >
              <RotateCw size={12} className="mr-1 text-slate-600" />
              90°
            </button>

            {onTogglePosture && !isMatOrLiner(selectedItem.product) && (
              <button
                onClick={() => onTogglePosture(selectedItem.instanceId)}
                className="flex items-center px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                title="세워서 보관 / 눕혀서 보관 전환 (단축키: V)"
              >
                <ArrowUpDown size={12} className="mr-1 text-indigo-600" />
                세우기/눕히기
              </button>
            )}

            <button
              onClick={() => onRemoveItem(selectedItem.instanceId)}
              className="flex items-center px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
              title="서랍에서 제거"
            >
              <Trash2 size={12} className="mr-1" />
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
