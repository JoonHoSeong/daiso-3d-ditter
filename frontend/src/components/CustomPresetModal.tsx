import React, { useState } from 'react';
import { SpacePreset, CompartmentZone } from '../data/spacePresets';
import { DrawerDimension } from '../data/daisoProducts';
import {
  X,
  BookmarkPlus,
  Sliders,
  ArrowRight
} from 'lucide-react';

interface CustomPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreset: (preset: SpacePreset) => void;
  initialDimensions?: DrawerDimension;
}

export const CustomPresetModal: React.FC<CustomPresetModalProps> = ({
  isOpen,
  onClose,
  onSavePreset,
  initialDimensions = { width: 80.0, depth: 45.0, height: 22.0 }
}) => {
  const [name, setName] = useState<string>('');
  const [width, setWidth] = useState<number>(initialDimensions.width);
  const [depth, setDepth] = useState<number>(initialDimensions.depth);
  const [height, setHeight] = useState<number>(initialDimensions.height);
  const [zone, setZone] = useState<CompartmentZone>('main_shelf');
  const [description, setDescription] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `내 맞춤 공간 (${width}×${depth}×${height}cm)`;

    const zoneLabel =
      zone === 'main_shelf'
        ? '메인 선반'
        : zone === 'crisper'
        ? '신선 야채실/서랍'
        : zone === 'door_pocket'
        ? '도어 포켓'
        : '냉동실';

    const icon =
      zone === 'main_shelf'
        ? '🌟'
        : zone === 'crisper'
        ? '🥬'
        : zone === 'door_pocket'
        ? '🚪'
        : '🧊';

    const newPreset: SpacePreset = {
      id: `custom-${Date.now()}`,
      name: finalName,
      category: 'custom',
      categoryLabel: '내 맞춤 공간',
      zone,
      zoneLabel,
      dimensions: {
        width: Math.max(10, Math.min(200, width)),
        depth: Math.max(10, Math.min(200, depth)),
        height: Math.max(3, Math.min(100, height))
      },
      description: description.trim() || `사용자 직접 입력 규격 (${width} × ${depth} × ${height} cm)`,
      recommendedKeywords: ['밀폐용기', '정리함', '바구니', '트레이'],
      tips: '사용자가 직접 등록한 맞춤 규격입니다. 다이소 정리함으로 효율적으로 채워보세요.',
      isCustom: true,
      icon
    };

    onSavePreset(newPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 via-white to-sky-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 text-lg font-bold">
              📐
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">새 맞춤 공간 프리셋 직접 추가</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                냉장고나 가구 크기를 직접 정하고 저장하여 언제든 원클릭으로 불러오세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Preset Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              공간 명칭 <span className="text-daiso-red">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 우리집 3번 선반, 김치통 4개 보관칸, 싱크대 2단"
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Zone Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              공간 구역 유형
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'main_shelf', label: '🌟 메인 선반', desc: '냉장실/오픈선반' },
                { id: 'crisper', label: '🥬 신선 야채실', desc: '서랍형 공간' },
                { id: 'door_pocket', label: '🚪 도어 포켓', desc: '문쪽 바스켓' },
                { id: 'freezer', label: '🧊 냉동실', desc: '냉동 서랍/선반' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setZone(item.id as CompartmentZone)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    zone === item.id
                      ? 'bg-amber-50 text-amber-900 border-amber-400 font-bold shadow-2xs ring-1 ring-amber-400'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs">{item.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* W x D x H Stepper Dimensions */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
              <Sliders size={12} className="text-slate-400" />
              <span>실측 치수 정밀 입력 (cm):</span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              {/* Width */}
              <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">가로 (폭)</span>
                <div className="flex items-center justify-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setWidth(prev => Math.max(10, Math.round((prev - 0.5) * 10) / 10))}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step={0.5}
                    value={width}
                    onChange={e => setWidth(Number(e.target.value))}
                    className="w-14 text-center text-xs font-mono font-black text-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setWidth(prev => Math.min(200, Math.round((prev + 0.5) * 10) / 10))}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">cm</span>
              </div>

              {/* Depth */}
              <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">세로 (깊이)</span>
                <div className="flex items-center justify-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setDepth(prev => Math.max(10, Math.round((prev - 0.5) * 10) / 10))}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step={0.5}
                    value={depth}
                    onChange={e => setDepth(Number(e.target.value))}
                    className="w-14 text-center text-xs font-mono font-black text-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setDepth(prev => Math.min(200, Math.round((prev + 0.5) * 10) / 10))}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">cm</span>
              </div>

              {/* Height */}
              <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">높이</span>
                <div className="flex items-center justify-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setHeight(prev => Math.max(3, Math.round((prev - 0.5) * 10) / 10))}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step={0.5}
                    value={height}
                    onChange={e => setHeight(Number(e.target.value))}
                    className="w-14 text-center text-xs font-mono font-black text-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHeight(prev => Math.min(100, Math.round((prev + 0.5) * 10) / 10))}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">cm</span>
              </div>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              메모 및 추천 정리 팁 (선택)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="예: 반찬통 2단 적재, 대형 김치통 2개 수납 공간"
              className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <BookmarkPlus size={14} />
              <span>프리셋 저장 및 3D 적용</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
