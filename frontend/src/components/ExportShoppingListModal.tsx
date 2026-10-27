import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  Layers,
  Camera,
  Store
} from 'lucide-react';
import { DrawerDimension, FittedItem } from '../data/daisoProducts';
import { calculateSpaceMetrics } from '../utils/fitterAlgorithm';
import { isMatOrLiner } from '../utils/stacking';

interface ExportShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawer: DrawerDimension;
  items: FittedItem[];
  onOpenStoreStock?: () => void;
}

export const ExportShoppingListModal: React.FC<ExportShoppingListModalProps> = ({
  isOpen,
  onClose,
  drawer,
  items,
  onOpenStoreStock
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('2d');
  const [snapshot3D, setSnapshot3D] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Capture 3D canvas snapshot when modal opens
  useEffect(() => {
    if (isOpen) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          setSnapshot3D(dataUrl);
        } catch (e) {
          console.warn('Could not capture WebGL snapshot:', e);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const metrics = calculateSpaceMetrics(drawer, items);

  // Group items by productId
  const groupedItems = items.reduce((acc, item) => {
    const existing = acc.find(g => g.product.id === item.product.id);
    if (existing) {
      existing.count += 1;
      existing.instances.push(item);
    } else {
      acc.push({
        product: item.product,
        count: 1,
        instances: [item]
      });
    }
    return acc;
  }, [] as { product: typeof items[0]['product']; count: number; instances: FittedItem[] }[]);

  // Item indexing for blueprint mapping
  const itemIndexMap = new Map<string, number>();
  groupedItems.forEach((group, idx) => {
    group.instances.forEach(instance => {
      itemIndexMap.set(instance.instanceId, idx + 1);
    });
  });

  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Action: Print / PDF
  const handlePrint = () => {
    window.print();
  };

  // Action: Download Text File (.txt)
  const handleDownloadTxt = () => {
    let content = `========================================================\n`;
    content += ` 다이소 서랍 수납 솔루션 - 매장 구매 체크리스트\n`;
    content += ` 출력일시: ${currentDate}\n`;
    content += `========================================================\n\n`;
    content += `[서랍 규격]\n`;
    content += `- 치수: 가로 ${drawer.width}cm × 세로 ${drawer.depth}cm × 높이 ${drawer.height}cm\n`;
    content += `- 공간 활용도: ${metrics.floorUtilization}%\n`;
    content += `- 총 수납 품목: ${groupedItems.length}종 (${items.length}개)\n`;
    content += `- 예상 총 구매 금액: ₩${metrics.totalPrice.toLocaleString()}원\n\n`;
    content += `--------------------------------------------------------\n`;
    content += `[구매 품목 목록 - 다이소 매장 지참용]\n`;
    content += `--------------------------------------------------------\n`;

    groupedItems.forEach((g, idx) => {
      content += `[ ] ${idx + 1}. ${g.product.name}\n`;
      content += `    - 다이소 품번: ${g.product.itemCode}\n`;
      content += `    - 규격: ${g.product.width} × ${g.product.depth} × ${g.product.height} cm\n`;
      content += `    - 단가: ₩${g.product.price.toLocaleString()}원 | 수량: ${g.count}개\n`;
      content += `    - 소계: ₩${(g.product.price * g.count).toLocaleString()}원\n`;
      content += `    - 매장 진열 위치: [      코너]\n\n`;
    });

    content += `========================================================\n`;
    content += `* 팁: 다이소 매장 내 키오스크나 직원분께 8자리 품번을 보여주시면\n`;
    content += `  정확한 재고 및 진열 매대 위치를 바로 찾으실 수 있습니다.\n`;
    content += `========================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `다이소_수납구매리스트_${drawer.width}x${drawer.depth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Action: Download CSV (.csv)
  const handleDownloadCsv = () => {
    let csv = '\uFEFF'; // BOM for Excel UTF-8
    csv += '순번,체크,상품명,다이소품번,가로(cm),세로(cm),높이(cm),단가(원),수량,소계(원),매장진열위치메모\n';

    groupedItems.forEach((g, idx) => {
      const cleanName = `"${g.product.name.replace(/"/g, '""')}"`;
      csv += `${idx + 1},[ ],${cleanName},${g.product.itemCode},${g.product.width},${g.product.depth},${g.product.height},${g.product.price},${g.count},${g.product.price * g.count},""\n`;
    });

    csv += `\n총합계,"",,,,,"",,${items.length},${metrics.totalPrice},""\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `다이소_구매견적서_${drawer.width}x${drawer.depth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Action: Download 2D Blueprint Image (PNG)
  const handleDownloadBlueprintImage = () => {
    if (activeTab === '3d' && snapshot3D) {
      const a = document.createElement('a');
      a.href = snapshot3D;
      a.download = `다이소_서랍3D배치_${drawer.width}x${drawer.depth}.png`;
      a.click();
      return;
    }

    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // High-res
      canvas.width = svgElement.clientWidth * scale;
      canvas.height = svgElement.clientHeight * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngURL;
        a.download = `다이소_서랍배치도_${drawer.width}x${drawer.depth}.png`;
        a.click();
      }
      URLObject.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  // Action: Copy Store List to Clipboard
  const handleCopyText = () => {
    let text = `[다이소 서랍 정리 매장 구매 리스트]\n`;
    text += `서랍 치수: ${drawer.width} × ${drawer.depth} × ${drawer.height} cm\n`;
    text += `총 예상 금액: ₩${metrics.totalPrice.toLocaleString()}원 (${items.length}개)\n`;
    text += `------------------------------------\n`;
    groupedItems.forEach((g, idx) => {
      text += `[ ] ${idx + 1}. ${g.product.name}\n`;
      text += `    • 품번: ${g.product.itemCode} | 수량: ${g.count}개 (₩${(g.product.price * g.count).toLocaleString()})\n`;
    });
    text += `------------------------------------\n`;
    text += `* 다이소 매장 직원 또는 키오스크에서 품번을 검색하세요.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SVG Scaler for 2D Blueprint (fit within 540x360 box)
  const maxViewW = 540;
  const maxViewH = 340;
  const scale = Math.min(maxViewW / drawer.width, maxViewH / drawer.depth);
  const svgW = Math.round(drawer.width * scale);
  const svgH = Math.round(drawer.depth * scale);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      {/* Container - printable ID attached */}
      <div
        id="printable-shopping-report"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Top Header Toolbar (no-print) */}
        <div className="no-print px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-daiso-red flex items-center justify-center text-white font-black text-sm">
              D
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <span>다이소 매장 구매용 리포트 & 배치도</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  인쇄 / 파일 저장 준비 완료
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                인쇄하거나 파일로 다운로드하여 다이소 매장에서 바로 확인하며 구매하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenStoreStock && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStoreStock();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                title="매장별 실시간 재고 확인"
              >
                <Store size={14} />
                <span>🏬 매장 재고 확인</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-daiso-red hover:bg-red-600 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="A4 인쇄 또는 PDF 파일로 저장"
            >
              <Printer size={14} />
              <span>🖨️ 인쇄 / PDF 저장</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Buttons Bar (no-print) */}
        <div className="no-print px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold text-[11px]">파일 다운로드:</span>
            <button
              onClick={handleDownloadBlueprintImage}
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <Camera size={13} className="text-slate-500" />
              <span>배치도 이미지(PNG)</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <FileText size={13} className="text-slate-500" />
              <span>텍스트(.txt)</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <FileSpreadsheet size={13} className="text-slate-500" />
              <span>엑셀(.csv)</span>
            </button>
          </div>

          <button
            onClick={handleCopyText}
            className={`px-3 py-1 rounded font-semibold flex items-center space-x-1 transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? '복사 완료!' : '목록 클립보드 복사'}</span>
          </button>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-900 bg-white">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-daiso-red text-white text-[10px] font-black tracking-wider uppercase rounded">
                    Daiso Fitter Plan
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{currentDate}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
                  다이소 서랍 정리 쇼핑 리스트 & 수납 배치도
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  다이소 매장 방문 시 본 출력물(또는 PDF/사진)을 지참하시면 품번으로 손쉽게 상품을 찾으실 수 있습니다.
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">예상 총 구매 금액</div>
                <div className="text-2xl font-black text-daiso-red font-mono">
                  ₩{metrics.totalPrice.toLocaleString()}
                  <span className="text-xs text-slate-600 font-normal ml-1">원</span>
                </div>
              </div>
            </div>

            {/* Spec Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 block">서랍 내경 규격</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {drawer.width} × {drawer.depth} × {drawer.height} cm
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 block">바닥 공간 활용도</span>
                <span className="text-xs font-bold text-teal-700 font-mono">
                  {metrics.floorUtilization}% 알뜰 채움
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 block">총 수납 품목</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  총 {groupedItems.length}종 / {items.length}개
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 block">구매처</span>
                <span className="text-xs font-bold text-slate-800">
                  전국 다이소 매장 / 다이소몰
                </span>
              </div>
            </div>
          </div>

          {/* 2D Top-down Layout View & 3D Snapshot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <Layers size={15} className="text-daiso-red" />
                <span>서랍 내 수납함 평면 배치도 (Top-down Layout)</span>
              </h2>

              <div className="no-print flex items-center space-x-1 text-xs">
                <button
                  onClick={() => setActiveTab('2d')}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    activeTab === '2d'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  2D 도면도
                </button>
                {snapshot3D && (
                  <button
                    onClick={() => setActiveTab('3d')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      activeTab === '3d'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    3D 뷰포트
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              {activeTab === '2d' ? (
                <div className="relative">
                  {/* Top width indicator */}
                  <div className="text-center font-mono text-[11px] font-semibold text-slate-500 mb-1">
                    ← 가로 {drawer.width} cm →
                  </div>

                  <div className="flex items-center">
                    {/* Left depth indicator */}
                    <div className="font-mono text-[11px] font-semibold text-slate-500 mr-2 -rotate-90 origin-center whitespace-nowrap">
                      ← 세로 {drawer.depth} cm →
                    </div>

                    {/* Scaled SVG Blueprint */}
                    <svg
                      ref={svgRef}
                      width={svgW}
                      height={svgH}
                      viewBox={`0 0 ${drawer.width} ${drawer.depth}`}
                      className="bg-white rounded border-2 border-slate-700 shadow-sm"
                      style={{ maxWidth: '100%' }}
                    >
                      {/* Subtle Grid Pattern */}
                      <defs>
                        <pattern
                          id="blueprint-grid"
                          width="5"
                          height="5"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 5 0 L 0 0 0 5"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="0.15"
                          />
                        </pattern>
                      </defs>
                      <rect
                        width={drawer.width}
                        height={drawer.depth}
                        fill="url(#blueprint-grid)"
                      />

                      {/* Fitted Items sorted by Y so liners are rendered on bottom and stacked on top */}
                      {[...items]
                        .sort((a, b) => (a.y || 0) - (b.y || 0))
                        .map((item) => {
                          const w = item.rotation === 90 ? item.product.depth : item.product.width;
                          const d = item.rotation === 90 ? item.product.width : item.product.depth;
                          const idx = itemIndexMap.get(item.instanceId) || 1;
                          const isLiner = isMatOrLiner(item.product);
                          const isStacked = (item.y || 0) > 0.5;
                          const isOrganizer =
                            ['storage', 'tray', 'basket', 'divider', 'stackable', 'storage_box'].includes(
                              item.product.category
                            ) || (item.product as any).isOrganizer;

                          return (
                            <g key={item.instanceId}>
                              <rect
                                x={item.x}
                                y={item.z}
                                width={w}
                                height={d}
                                rx={0.6}
                                fill={
                                  isLiner
                                    ? '#F0F9FF'
                                    : isStacked
                                    ? '#FEF3C7'
                                    : isOrganizer
                                    ? '#EBF5FF'
                                    : '#F3F4F6'
                                }
                                stroke={
                                  isLiner
                                    ? '#0284C7'
                                    : isStacked
                                    ? '#D97706'
                                    : isOrganizer
                                    ? '#2563EB'
                                    : '#4B5563'
                                }
                                strokeWidth={isStacked ? 0.5 : 0.35}
                                strokeDasharray={isLiner ? '1.5,1' : isStacked ? '2,0.8' : undefined}
                              />
                              {/* Number Badge */}
                              <circle
                                cx={item.x + Math.min(1.8, w / 2)}
                                cy={item.z + Math.min(1.8, d / 2)}
                                r={1.2}
                                fill={isLiner ? '#0284C7' : isStacked ? '#D97706' : isOrganizer ? '#1D4ED8' : '#374151'}
                              />
                              <text
                                x={item.x + Math.min(1.8, w / 2)}
                                y={item.z + Math.min(1.8, d / 2) + 0.4}
                                textAnchor="middle"
                                fontSize={1.2}
                                fontWeight="bold"
                                fill="#ffffff"
                                fontFamily="sans-serif"
                              >
                                {idx}
                              </text>

                              {/* Label text */}
                              {w >= 6 && d >= 4 && (
                                <text
                                  x={item.x + w / 2}
                                  y={item.z + d / 2 + 0.5}
                                  textAnchor="middle"
                                  fontSize={Math.min(1.2, w / 5)}
                                  fontWeight="bold"
                                  fill={isLiner ? '#0369A1' : isStacked ? '#B45309' : '#334155'}
                                  fontFamily="sans-serif"
                                >
                                  {isLiner
                                    ? '바닥 매트'
                                    : isStacked
                                    ? `2단 적재`
                                    : `${item.product.width}×${item.product.depth}cm`}
                                </text>
                              )}
                            </g>
                          );
                        })}
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  {snapshot3D && (
                    <img
                      src={snapshot3D}
                      alt="3D 서랍 피팅 뷰"
                      className="max-h-72 rounded-lg border border-slate-300 shadow-sm"
                    />
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2 text-center">
                도면 내 원형 번호(①, ②, ③...)는 아래 쇼핑 리스트의 순번과 일치합니다.
              </p>
            </div>
          </div>

          {/* Itemized Shopping Checklist Table */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-2.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Store size={15} className="text-daiso-red" />
                <span>매장 구매 체크리스트 (총 {items.length}개)</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                * 매장 키오스크 또는 직원분께 <strong>품번</strong>을 말씀하시면 빠릅니다.
              </span>
            </h2>

            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="py-2.5 px-3 w-10 text-center">확인</th>
                    <th className="py-2.5 px-2 w-10 text-center">도면</th>
                    <th className="py-2.5 px-3">상품명</th>
                    <th className="py-2.5 px-3 font-mono text-daiso-red w-28">다이소 품번</th>
                    <th className="py-2.5 px-3 font-mono text-slate-600 w-28">규격 (W×D×H)</th>
                    <th className="py-2.5 px-2 text-right w-16">수량</th>
                    <th className="py-2.5 px-3 text-right w-20">단가</th>
                    <th className="py-2.5 px-3 text-right w-24">소계</th>
                    <th className="py-2.5 px-3 w-28 text-slate-400 border-l border-slate-200">
                      매장 매대 메모
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {groupedItems.map((g, idx) => (
                    <tr key={g.product.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center">
                        <div className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center mx-auto" />
                      </td>

                      {/* Map index badge */}
                      <td className="py-2 px-2 text-center">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px]">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900">{g.product.name}</span>
                          {isMatOrLiner(g.product) && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">
                              바닥 깔개/매트
                            </span>
                          )}
                          {g.instances.some(i => (i.y || 0) > 0.5) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              2단 적재함
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {g.product.categoryLabel || (['storage', 'tray', 'basket', 'divider', 'stackable', 'storage_box'].includes(g.product.category) ? '정리/수납함' : '생활용품/내용물')}
                        </div>
                      </td>

                      {/* Product Code */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-daiso-red">
                          {g.product.itemCode}
                        </span>
                      </td>

                      {/* Dimensions */}
                      <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                        {g.product.width} × {g.product.depth} × {g.product.height} cm
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2 text-right font-bold text-slate-900">
                        {g.count}개
                      </td>

                      {/* Unit Price */}
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        ₩{g.product.price.toLocaleString()}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₩{(g.product.price * g.count).toLocaleString()}
                      </td>

                      {/* In-store note */}
                      <td className="py-2 px-3 text-slate-400 border-l border-slate-200 text-[11px]">
                        [ &nbsp; &nbsp; &nbsp; ] 코너
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={5} className="py-3 px-3 text-right">
                      합계 (총 {items.length}개 물품)
                    </td>
                    <td className="py-3 px-2 text-right text-daiso-red">{items.length}개</td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-daiso-red">
                      ₩{metrics.totalPrice.toLocaleString()}원
                    </td>
                    <td className="border-l border-slate-200"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Store Tip Notice */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-xs flex items-start space-x-2.5">
            <span className="text-base">💡</span>
            <div>
              <strong className="font-bold">다이소 매장에서 빠르게 찾는 팁:</strong>
              <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                다이소 매장에 방문하셨을 때, 입구 근처 키오스크(상품 위치 검색기)에 <strong>8자리 품번</strong>을 입력하시면 몇 번 통로 몇 번째 선반에 진열되어 있는지 즉시 확인하실 수 있습니다. 키오스크가 없는 매장은 직원분께 본 종이나 휴대폰 화면의 품번을 보여주시면 바로 안내받으실 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
