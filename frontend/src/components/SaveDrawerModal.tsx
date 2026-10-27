import React, { useState } from 'react';
import { X, BookmarkCheck, Sparkles, Loader2, Info } from 'lucide-react';
import { DrawerDimension, FittedItem } from '../data/daisoProducts';
import { User, SavedDrawer } from '../types/auth';

interface SaveDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawer: DrawerDimension;
  items: FittedItem[];
  user: User | null;
  token: string | null;
  onSaved: (drawer: SavedDrawer) => void;
  onOpenAuth: () => void;
}

import { BACKEND_URL } from '../config';

export const SaveDrawerModal: React.FC<SaveDrawerModalProps> = ({
  isOpen,
  onClose,
  drawer,
  items,
  user,
  token,
  onSaved,
  onOpenAuth
}) => {
  const [name, setName] = useState('');
  const [includeItems, setIncludeItems] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim() || `내 서랍 (${drawer.width}×${drawer.depth}×${drawer.height}cm)`;
    setError(null);
    setLoading(true);

    try {
      const itemsToSave = includeItems ? items : [];

      if (user && token) {
        // Save to backend database
        const res = await fetch(`${BACKEND_URL}/api/drawers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: trimmedName,
            width: drawer.width,
            depth: drawer.depth,
            height: drawer.height,
            category: '내 저장된 서랍',
            items: itemsToSave
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || '서랍 저장에 실패했습니다.');
        }

        onSaved(data.drawer);
      } else {
        // Save to LocalStorage (Guest Mode)
        const localSavedStr = localStorage.getItem('daiso_saved_drawers') || '[]';
        const localDrawers: SavedDrawer[] = JSON.parse(localSavedStr);
        const newDrawer: SavedDrawer = {
          id: `local-${Date.now()}`,
          name: trimmedName,
          category: '내 저장된 서랍 (로컬)',
          width: drawer.width,
          depth: drawer.depth,
          height: drawer.height,
          items: itemsToSave,
          updatedAt: new Date().toISOString()
        };
        localDrawers.unshift(newDrawer);
        localStorage.setItem('daiso_saved_drawers', JSON.stringify(localDrawers));
        onSaved(newDrawer);
      }

      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || '저장 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <BookmarkCheck size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">내 서랍 크기 저장</h3>
              <p className="text-xs text-slate-400">자주 쓰는 가구 규격을 저장해 두고 바로 불러오세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Dimension Badge */}
        <div className="mx-6 mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">현재 설정된 규격</span>
            <span className="text-sm font-bold text-slate-800 font-mono">
              가로 {drawer.width} × 세로 {drawer.depth} × 높이 {drawer.height} cm
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">바닥 면적</span>
            <span className="text-xs font-mono font-bold text-slate-600">
              {(drawer.width * drawer.depth).toFixed(0)} cm²
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              서랍 이름 <span className="text-daiso-red">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="예: 내 방 컴퓨터 책상 서랍, 주방 하부장 1번"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all shadow-2xs font-medium"
            />
          </div>

          {/* Include Items Checkbox */}
          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={includeItems}
              onChange={(e) => setIncludeItems(e.target.checked)}
              className="mt-0.5 rounded text-daiso-red focus:ring-daiso-red"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 block">
                현재 배치된 수납 물품 ({items.length}개) 레이아웃도 함께 저장
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                나중에 이 프리셋을 선택하면 지금 올려둔 배치와 견적까지 그대로 복원됩니다.
              </span>
            </div>
          </label>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          {/* Guest Mode notice */}
          {!user && (
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start space-x-2 text-[11px] text-amber-800">
              <Info size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span>현재 비회원(게스트) 모드로 브라우저에 임시 저장됩니다.</span>{' '}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenAuth(); }}
                  className="font-bold underline text-amber-900 hover:text-daiso-red"
                >
                  로그인하기
                </button>
                <span>를 누르시면 계정에 영구 동기화됩니다.</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-amber-300" />
                  <span>내 서랍으로 저장하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
