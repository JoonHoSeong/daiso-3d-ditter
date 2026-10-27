import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Cpu,
  HardDrive,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  ChromeAiStatus,
  CHROME_AI_SETUP_STEPS,
  checkChromeGeminiStatus
} from '../utils/chromeAi';

interface ChromeAiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ChromeAiStatus | null;
  onStatusRefresh: (newStatus: ChromeAiStatus) => void;
}

export const ChromeAiGuideModal: React.FC<ChromeAiGuideModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusRefresh
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => {
      setCopiedUrl(null);
    }, 2000);
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      const newStatus = await checkChromeGeminiStatus();
      onStatusRefresh(newStatus);
    } finally {
      setIsChecking(false);
    }
  };

  const isReady = status?.availability === 'available';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Chrome 내장 Gemini Nano 활성화 가이드
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  On-Device AI
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                클라우드 전송 없이 내 컴퓨터 브라우저 안에서 초고속으로 작동하는 순수 온디바이스 Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Status Banner */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {isReady ? (
              <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-xs font-bold">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Gemini Nano 정상 활성화됨 (사용 가능)</span>
              </div>
            ) : status?.availability === 'downloadable' ? (
              <div className="flex items-center space-x-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 text-xs font-bold">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>모델 다운로드 대기 중 (chrome://components)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 text-xs font-bold">
                <ShieldAlert size={14} className="text-rose-600" />
                <span>현재 비활성화 상태 (플래그 설정 필요)</span>
              </div>
            )}
          </div>

          <button
            onClick={handleRecheck}
            disabled={isChecking}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCcw size={12} className={isChecking ? 'animate-spin text-indigo-600' : ''} />
            <span>{isChecking ? '검사 중...' : '상태 다시 확인'}</span>
          </button>
        </div>

        {/* System Requirements Callout */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs">
            <div className="flex items-start space-x-2.5">
              <HardDrive size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <strong className="text-indigo-950 font-bold block">디스크 여유 공간</strong>
                <span className="text-indigo-900/80 text-[11px]">모델 저장용 여유 용량 (최소 22GB 이상 권장)</span>
              </div>
            </div>
            <div className="flex items-start space-x-2.5">
              <Cpu size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <strong className="text-indigo-950 font-bold block">브라우저 및 하드웨어</strong>
                <span className="text-indigo-900/80 text-[11px]">Google Chrome 128+ 및 내장/외장 GPU 지원</span>
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight uppercase">
              단계별 설정 방법 (Chrome 설정 안내)
            </h4>

            {CHROME_AI_SETUP_STEPS.map((step) => (
              <div
                key={step.step}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      {step.step}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{step.title}</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-medium">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {step.settingValue && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold shrink-0 border border-indigo-200/60">
                      {step.settingValue}
                    </span>
                  )}
                </div>

                {/* Copyable URL box */}
                {step.urlToCopy && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                    <code className="text-[11px] font-mono text-indigo-600 select-all font-semibold">
                      {step.urlToCopy}
                    </code>
                    <button
                      onClick={() => handleCopy(step.urlToCopy!)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shadow-2xs active:scale-95 ${
                        copiedUrl === step.urlToCopy
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {copiedUrl === step.urlToCopy ? (
                        <>
                          <Check size={11} />
                          <span>복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>주소 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {step.tip && (
                  <p className="mt-2 text-[10px] text-slate-400 font-medium pl-8">
                    💡 {step.tip}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed font-medium">
            ⚠️ <strong>알림:</strong> Chrome의 보안 정책상 웹페이지에서 <code>chrome://flags</code> 주소를 자동으로 열 수 없습니다. 위의 [주소 복사] 버튼을 누른 후 새 탭의 주소창에 직접 붙여넣어(Ctrl+V / Cmd+V) 이동해 주세요.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href="https://developer.chrome.com/docs/ai/built-in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
          >
            <span>Google Chrome AI 공식 문서</span>
            <ExternalLink size={12} />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-97 shadow-sm"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
