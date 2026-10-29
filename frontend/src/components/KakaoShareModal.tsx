import React, { useState, useEffect } from 'react';
import { DrawerDimension, FittedItem } from '../data/daisoProducts';
import { StoreInfo } from './StoreStockModal';
import { PurposePreset } from '../data/purposePresets';
import { BACKEND_URL } from '../config';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ShoppingBag,
  Store,
  Camera
} from 'lucide-react';

interface KakaoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawer: DrawerDimension;
  items: FittedItem[];
  activeStore?: StoreInfo | null;
  activePurpose?: PurposePreset | null;
  onCaptureCanvas?: () => string | null; // Data URL of 3D Canvas
}

// Kakao Icon SVG
const KakaoIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12 3C6.477 3 2 6.478 2 10.768c0 2.756 1.83 5.176 4.609 6.551-.197.743-.715 2.689-.818 3.102-.128.513.187.507.394.37.163-.109 2.585-1.758 3.633-2.47.708.103 1.438.158 2.182.158 5.523 0 10-3.478 10-7.768C22 6.478 17.523 3 12 3z" />
  </svg>
);

export const KakaoShareModal: React.FC<KakaoShareModalProps> = ({
  isOpen,
  onClose,
  drawer,
  items,
  activeStore,
  activePurpose,
  onCaptureCanvas
}) => {
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [canvasSnapshot, setCanvasSnapshot] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const totalPrice = items.reduce((sum, item) => sum + (item.product?.price || 0), 0);
  const kakaoJsKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || '';

  // Calculate unique product breakdown
  const uniqueProducts = React.useMemo(() => {
    const map = new Map<string, { name: string; price: number; count: number; itemCode: string }>();
    items.forEach(it => {
      const id = it.productId;
      if (map.has(id)) {
        map.get(id)!.count += 1;
      } else {
        map.set(id, {
          name: it.product.name,
          price: it.product.price,
          count: 1,
          itemCode: it.product.itemCode || ''
        });
      }
    });
    return Array.from(map.values());
  }, [items]);

  useEffect(() => {
    if (isOpen) {
      // 1. Capture 3D Canvas Snapshot if available
      if (onCaptureCanvas) {
        try {
          const snapshot = onCaptureCanvas();
          if (snapshot) setCanvasSnapshot(snapshot);
        } catch (e) {
          console.warn('Canvas snapshot capture failed:', e);
        }
      }

      // 2. Initialize Kakao SDK if key exists
      if (kakaoJsKey && window.Kakao && !window.Kakao.isInitialized()) {
        try {
          window.Kakao.init(kakaoJsKey);
        } catch (e) {
          console.warn('Kakao init error:', e);
        }
      }

      // 3. Create Share Link on Backend
      generateShareLink();
    }
  }, [isOpen]);

  const generateShareLink = async () => {
    setLoading(true);
    setShareStatus(null);
    try {
      const serializableItems = items.map(it => ({
        instanceId: it.instanceId,
        productId: it.productId,
        x: it.x,
        y: it.y || 0,
        z: it.z,
        rotation: it.rotation,
        posture: it.posture || 'flat'
      }));

      const res = await fetch(`${BACKEND_URL}/api/drawers/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${drawer.width}×${drawer.depth}×${drawer.height}cm 다이소 3D 서랍 피팅`,
          drawer: { width: drawer.width, depth: drawer.depth, height: drawer.height },
          items: serializableItems,
          active_store: activeStore ? { store_code: activeStore.store_code, name: activeStore.name } : null,
          active_purpose: activePurpose ? { id: activePurpose.id, name: activePurpose.name } : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const shortId = data.share_id;
        setShareId(shortId);
        const fullUrl = `${window.location.origin}/?s=${shortId}`;
        setShareUrl(fullUrl);
      } else {
        // Fallback: Client-side compact encoded URL
        const compactPayload = btoa(encodeURIComponent(JSON.stringify({
          w: drawer.width,
          d: drawer.depth,
          h: drawer.height,
          i: serializableItems.map(it => [
            it.productId,
            it.x,
            it.y,
            it.z,
            it.rotation,
            it.posture === 'stand_front' ? 1 : it.posture === 'stand_side' ? 2 : 0
          ])
        })));
        const fallbackUrl = `${window.location.origin}/?share=${compactPayload}`;
        setShareUrl(fallbackUrl);
      }
    } catch (e) {
      console.error('Error generating share link:', e);
      setShareUrl(window.location.href);
    } finally {
      setLoading(false);
    }
  };

  // 1. Official KakaoTalk Share Feed
  const handleKakaoShare = () => {
    const targetUrl = shareUrl || window.location.href;
    const shareTitle = `[다이소 3D 수납 피터] ${drawer.width}×${drawer.depth}×${drawer.height}cm 서랍 피팅 완성!`;
    const shareDesc = `🧺 품목: ${items.length}개 (₩${totalPrice.toLocaleString()}원)${activeStore ? ` | 🏬 ${activeStore.name}` : ''}\n친구의 3D 배치도를 지금 열어보세요!`;

    if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareTitle,
            description: shareDesc,
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/679/679720.png',
            link: {
              mobileWebUrl: targetUrl,
              webUrl: targetUrl
            }
          },
          buttons: [
            {
              title: '3D 피팅 결과 보러가기',
              link: {
                mobileWebUrl: targetUrl,
                webUrl: targetUrl
              }
            }
          ]
        });
        setShareStatus('카카오톡 공유창이 열렸습니다!');
        return;
      } catch (err) {
        console.warn('Kakao Share execution failed, falling back:', err);
      }
    }

    // Fallback 1: Web Share API (Mobile OS Share Sheet with KakaoTalk)
    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: `${shareTitle}\n${shareDesc}`,
        url: targetUrl
      }).then(() => {
        setShareStatus('공유가 완료되었습니다!');
      }).catch((e) => {
        if (e.name !== 'AbortError') {
          handleCopyText();
        }
      });
      return;
    }

    // Fallback 2: Copy Rich Text
    handleCopyText();
  };

  // 2. Web Share API (Native Phone Share Sheet)
  const handleNativeShare = async () => {
    const targetUrl = shareUrl || window.location.href;
    const shareTitle = `[다이소 3D 수납 피터] ${drawer.width}×${drawer.depth}×${drawer.height}cm 피팅 완성!`;
    const shareText = `🧺 총 ${items.length}개 품목 (₩${totalPrice.toLocaleString()}원)${activeStore ? ` | ${activeStore.name}` : ''}\n3D 서랍 배치도를 지금 확인해보세요!\n${targetUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: targetUrl
        });
        setShareStatus('공유가 완료되었습니다!');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyText();
    }
  };

  // 3. Copy Formatted Rich Text for KakaoTalk Chat Room
  const handleCopyText = () => {
    const targetUrl = shareUrl || window.location.href;
    const lines = [
      `🧺 [다이소 3D 수납 피터] 서랍 피팅 결과 공유`,
      `📐 서랍 규격: ${drawer.width} × ${drawer.depth} × ${drawer.height} cm`,
      `📦 배치 수납함: 총 ${items.length}개 (합계 ₩${totalPrice.toLocaleString()}원)`,
      activeStore ? `🏬 기준 지점: ${activeStore.name}` : '',
      activePurpose ? `🎯 용도: ${activePurpose.name}` : '',
      `🔗 3D 배치도 바로가기:`,
      targetUrl
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setShareStatus('카카오톡 채팅방에 붙여넣을 수 있는 텍스트가 복사되었습니다!');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // 4. Copy URL Only
  const handleCopyLink = () => {
    const targetUrl = shareUrl || window.location.href;
    navigator.clipboard.writeText(targetUrl).then(() => {
      setCopied(true);
      setShareStatus('링크가 클립보드에 복사되었습니다!');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // 5. Download 3D Snapshot PNG
  const handleDownloadSnapshot = () => {
    if (!canvasSnapshot) return;
    const a = document.createElement('a');
    a.href = canvasSnapshot;
    a.download = `daiso-3d-drawer-${drawer.width}x${drawer.depth}x${drawer.height}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareStatus('3D 스냅샷 이미지가 다운로드되었습니다!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50/90 via-white to-yellow-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FEE500] text-[#3C1E1E] flex items-center justify-center shadow-md shadow-yellow-200">
              <KakaoIcon />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  카카오톡 & 3D 피팅 공유하기
                </h3>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full">
                  LIVE 3D
                </span>
              </div>
              <p className="text-xs text-slate-500">
                친구나 가족에게 내가 맞춘 3D 서랍 배치도를 실시간으로 공유하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* 3D Preview Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-slate-200">
                  서랍 {drawer.width} × {drawer.depth} × {drawer.height} cm
                </span>
                {activeStore && (
                  <span className="text-[11px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Store size={10} />
                    <span>{activeStore.name}</span>
                  </span>
                )}
              </div>
              <span className="text-amber-400 text-xs font-mono font-black">
                ₩{totalPrice.toLocaleString()}원
              </span>
            </div>

            <div className="flex items-center justify-between relative z-10 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-300 font-semibold block">배치된 다이소 품목: {items.length}개</span>
                <span className="text-[11px] text-slate-400 truncate max-w-[260px] block">
                  {uniqueProducts.slice(0, 3).map(p => `${p.name} ×${p.count}`).join(', ')}
                  {uniqueProducts.length > 3 ? ` 외 ${uniqueProducts.length - 3}종` : ''}
                </span>
              </div>
              {canvasSnapshot && (
                <button
                  type="button"
                  onClick={handleDownloadSnapshot}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold flex items-center space-x-1 transition-all active:scale-95 shrink-0"
                  title="3D 서랍 이미지 PNG 파일 다운로드"
                >
                  <Camera size={12} className="text-amber-400" />
                  <span>3D 사진 저장</span>
                </button>
              )}
            </div>
          </div>

          {/* Action 1: KakaoTalk Share Button (Primary) */}
          <button
            type="button"
            onClick={handleKakaoShare}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] active:scale-98 text-[#3C1E1E] font-black text-sm shadow-md shadow-yellow-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <KakaoIcon />
            <span>카카오톡으로 3D 피팅 결과 공유하기</span>
          </button>

          {/* Action 2: Smartphone Native Share & Copy Link Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200"
              >
                <Share2 size={14} className="text-indigo-600" />
                <span>모바일 앱으로 공유</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyText}
              className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition-all ${
                copied
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-600" />}
              <span>{copied ? '복사 완료!' : '카톡 채팅용 텍스트 복사'}</span>
            </button>
          </div>

          {/* Share URL Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 block">3D 바로가기 링크:</span>
              {shareId && (
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                  단축코드: {shareId}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={loading ? '공유 링크 생성 중...' : shareUrl || '공유 링크 준비 중...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all pr-8"
                />
                {loading && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <Loader2 size={13} className="animate-spin text-amber-600" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={loading || !shareUrl}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold shrink-0 transition-colors"
              >
                링크 복사
              </button>
            </div>
          </div>

          {/* Status Notification Toast */}
          {shareStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 animate-in fade-in">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span>{shareStatus}</span>
            </div>
          )}

          {/* Daiso Mall Purchase Shortcut Info */}
          <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShoppingBag size={15} className="text-daiso-red shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">다이소몰(온라인몰) 원클릭 구매</span>
                <span className="text-[10px] text-slate-500">배치된 품목을 다이소 공식 온라인몰에서 바로 검색·구매할 수 있습니다.</span>
              </div>
            </div>
            <a
              href="https://www.daisomall.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white text-[11px] font-bold flex items-center space-x-1 transition-colors shrink-0 shadow-xs"
            >
              <span>방문</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
