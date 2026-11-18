import React, { useEffect, useMemo } from 'react';
import { X, AlertTriangle, Lightbulb, CheckCircle2, XCircle, Ruler, Layers } from 'lucide-react';
import { DrawerDimension, FittedItem, DaisoProduct } from '../data/daisoProducts';
import { getFitValidation, FitValidation, AutoFitOptions } from '../utils/fitterAlgorithm';

interface LayoutReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawer: DrawerDimension;
  items: FittedItem[];
  products: DaisoProduct[];
  options: AutoFitOptions;
}

/**
 * 레이아웃 판정 리포트 모달
 * 자동 배치(또는 수동 편집) 결과에 대한 전문 검진 reports을 표시합니다:
 * - 배치/가용 상품 통계
 * - 높이 초과 경고 목록
 * - 빈 공간(void) 분석
 * - 바닥면 커버율
 * - 개선 제안 사항
 */
export const LayoutReportModal: React.FC<LayoutReportModalProps> = ({
  isOpen,
  onClose,
  drawer,
  items,
  products,
  options
}) => {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const report: FitValidation = useMemo(
    () => getFitValidation(drawer, items, products, options),
    [drawer, items, products, options]
  );

  if (!isOpen) return null;

  const coverageColor =
    report.floorCoveragePct >= 70 ? 'text-emerald-600' :
    report.floorCoveragePct >= 40 ? 'text-amber-600' : 'text-rose-600';

  const voidColor =
    report.voidSpacePct <= 30 ? 'text-emerald-600' :
    report.voidSpacePct <= 60 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Panel */}
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Ruler size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">레이아웃 판정 리포트</h2>
              <p className="text-[10px] text-slate-400 font-semibold">
                {drawer.width}×{drawer.depth}×{drawer.height}cm · 마진 {report.marginUsed.toFixed(1)}cm 기준
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Verdict Banner */}
        <div className={`px-5 py-3.5 ${report.isIdealFit ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <div className="flex items-center space-x-2.5">
            {report.isIdealFit ? (
              <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle size={22} className="text-amber-500 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-black ${report.isIdealFit ? 'text-emerald-800' : 'text-amber-800'}`}>
                {report.isIdealFit ? '이상적인 부합 배치가 완성되었습니다!' : '배치는 완료되었으나 일부 항목이 조정 권장됩니다.'}
              </p>
              <p className={`text-[11px] font-semibold ${report.isIdealFit ? 'text-emerald-600' : 'text-amber-600'}`}>
                {report.totalItemsPlaced}개 배치 / 가용 {report.totalItemsAvailable}개
                {report.heightWarnings.length > 0 && ` · 높이 초과 상품 ${report.heightWarnings.length}종`}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 px-5 py-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">바닥 커버율</p>
            <p className={`text-xl font-black ${coverageColor}`}>{report.floorCoveragePct}%</p>
            <p className="text-[10px] text-slate-400 font-semibold">서랍 바닥면 사용률</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">빈 공간</p>
            <p className={`text-xl font-black ${voidColor}`}>{report.voidSpacePct}%</p>
            <p className="text-[10px] text-slate-400 font-semibold">약 {report.voidSpaceCm3.toLocaleString()}cm³</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">배치 상품</p>
            <p className="text-xl font-black text-slate-800">{report.totalItemsPlaced}</p>
            <p className="text-[10px] text-slate-400 font-semibold">가용 {report.totalItemsAvailable}종</p>
          </div>
        </div>

        {/* Height Warnings */}
        {report.heightWarnings.length > 0 && (
          <div className="mx-5 mb-4 rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle size={15} className="text-rose-500" />
              <h3 className="text-xs font-black text-rose-700">
                높이 초과 상품 ({report.heightWarnings.length})
              </h3>
            </div>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {report.heightWarnings.slice(0, 20).map((w, i) => (
                <li key={i} className="text-[11px] text-rose-600 font-semibold leading-relaxed">• {w}</li>
              ))}
              {report.heightWarnings.length > 20 && (
                <li className="text-[11px] text-rose-400 font-semibold">…외 {report.heightWarnings.length - 20}개</li>
              )}
            </ul>
            <p className="text-[10px] text-rose-400 font-semibold mt-2">
              ※ 서랍 높이가 {drawer.height}cm이므로 마진 {report.marginUsed.toFixed(1)}cm를 제외한 가용 높이 {(drawer.height - report.marginUsed).toFixed(1)}cm를 초과하는 상품들은 배치에서 제외되었습니다.
            </p>
          </div>
        )}

        {/* Suggestions */}
        {report.suggestions.length > 0 && (
          <div className="mx-5 mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb size={15} className="text-blue-500" />
              <h3 className="text-xs font-black text-blue-700">개선 제안</h3>
            </div>
            <ul className="space-y-1.5">
              {report.suggestions.map((s, i) => (
                <li key={i} className="text-[11px] text-blue-700 font-semibold leading-relaxed flex items-start">
                  <span className="mr-1.5 shrink-0">💡</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stack Stability Assessment */}
        {report.stackStability && (
          <div className={`mx-5 mb-4 rounded-xl border p-3.5 ${
            report.stackStability.riskLevel === 'high'
              ? 'border-rose-100 bg-rose-50/50'
              : report.stackStability.riskLevel === 'medium'
              ? 'border-amber-100 bg-amber-50/50'
              : 'border-emerald-100 bg-emerald-50/50'
          }`}>
            <div className="flex items-center space-x-2 mb-1.5">
              <Layers size={15} className={
                report.stackStability.riskLevel === 'high'
                  ? 'text-rose-500'
                  : report.stackStability.riskLevel === 'medium'
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              } />
              <h3 className={`text-xs font-black ${
                report.stackStability.riskLevel === 'high'
                  ? 'text-rose-700'
                  : report.stackStability.riskLevel === 'medium'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}>스택 안정성: {
                report.stackStability.riskLevel === 'high' ? '위험' :
                report.stackStability.riskLevel === 'medium' ? '주의' : '안정'
              }</h3>
            </div>
            <p className={`text-[11px] font-semibold ${
              report.stackStability.riskLevel === 'high'
                ? 'text-rose-600'
                : report.stackStability.riskLevel === 'medium'
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}>{report.stackStability.message}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
