import React, { useState } from 'react';
import {
  X,
  FolderOpen,
  Bookmark,
  Calendar,
  Layers,
  Share2,
  Trash2,
  Edit2,
  Check,
  Search,
  Plus,
  LogIn,
  Box
} from 'lucide-react';
import { SavedDrawer, User } from '../types/auth';
import { DrawerDimension, FittedItem } from '../data/daisoProducts';

interface MyDrawersModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDrawers: SavedDrawer[];
  onSelectDrawer: (drawer: SavedDrawer) => void;
  onDeleteDrawer: (id: string) => void;
  onUpdateDrawerName?: (id: string, newName: string) => void;
  onOpenSaveModal: () => void;
  onOpenShareDrawer?: (drawer: SavedDrawer) => void;
  user: User | null;
  onOpenAuth: () => void;
  currentDrawer: DrawerDimension;
}

export const MyDrawersModal: React.FC<MyDrawersModalProps> = ({
  isOpen,
  onClose,
  savedDrawers,
  onSelectDrawer,
  onDeleteDrawer,
  onUpdateDrawerName,
  onOpenSaveModal,
  onOpenShareDrawer,
  user,
  onOpenAuth,
  currentDrawer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const filteredDrawers = savedDrawers.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.category && d.category.toLowerCase().includes(q)) ||
      `${d.width}x${d.depth}`.includes(q)
    );
  });

  const handleStartEdit = (d: SavedDrawer) => {
    setEditingId(d.id);
    setEditName(d.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim() && onUpdateDrawerName) {
      onUpdateDrawerName(id, editName.trim());
    }
    setEditingId(null);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '최근';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '최근';
    }
  };

  const calcTotalPrice = (items?: FittedItem[]) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, it) => sum + (it.product?.price || 0), 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/65 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
              <FolderOpen size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold">내 서랍 보관함 & 히스토리</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700 text-[10px] font-mono font-bold">
                  총 {savedDrawers.length}개 보관
                </span>
              </div>
              <p className="text-xs text-slate-400">
                내가 맞추고 저장해둔 서랍 크기와 수납함 배치를 언제든 3D로 다시 불러옵니다.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenSaveModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>현재 서랍 새로 저장</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Guest Mode Notice Banner */}
        {!user && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-base">💡</span>
              <div>
                <strong className="font-bold">현재 기기(브라우저)에만 저장되어 있습니다.</strong>
                <p className="text-[11px] text-amber-800">
                  로그인하시면 스마트폰과 PC 어디서든 내 서랍들이 안전하게 클라우드 동기화됩니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors"
            >
              <LogIn size={13} />
              <span>로그인 / 연동</span>
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center space-x-3 shrink-0">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="서랍 이름, 규격(예: 32x40)으로 검색..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-daiso-red/20 focus:border-daiso-red"
            />
          </div>
        </div>

        {/* Drawers Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredDrawers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Box size={36} className="text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {searchQuery ? '검색된 서랍이 없습니다.' : '아직 저장된 서랍이 없습니다.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                현재 맞춘 서랍({currentDrawer.width}×{currentDrawer.depth}×{currentDrawer.height}cm)을 저장하여 나만의 서랍 목록을 만들어보세요.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenSaveModal();
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Bookmark size={14} />
                <span>현재 서랍 저장하기</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDrawers.map((d) => {
                const isCurrent =
                  d.width === currentDrawer.width &&
                  d.depth === currentDrawer.depth &&
                  d.height === currentDrawer.height;
                const itemsCount = d.items?.length || 0;
                const totalPrice = calcTotalPrice(d.items);

                return (
                  <div
                    key={d.id}
                    className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                      isCurrent
                        ? 'border-daiso-red ring-2 ring-daiso-red/15 bg-rose-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Row: Category & Actions */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {d.category || '내 서랍'}
                        </span>
                        <div className="flex items-center space-x-1 text-slate-400">
                          {onOpenShareDrawer && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenShareDrawer(d);
                              }}
                              className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="카카오톡 & 링크 공유"
                            >
                              <Share2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(d)}
                            className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="이름 수정"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => onDeleteDrawer(d.id)}
                            className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="서랍 삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Name or Inline Editor */}
                      {editingId === d.id ? (
                        <div className="flex items-center space-x-1.5 mb-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(d.id)}
                            className="flex-1 px-2.5 py-1 text-xs border border-indigo-400 rounded-lg focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(d.id)}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-sm font-bold text-slate-900 mb-2 truncate" title={d.name}>
                          {d.name}
                        </h4>
                      )}

                      {/* Dimensions Pill Badge */}
                      <div className="flex items-center space-x-2 text-xs mb-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {d.width} × {d.depth} × {d.height} cm
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-daiso-red bg-rose-100 px-2 py-0.5 rounded-md">
                            현재 3D 적용 중
                          </span>
                        )}
                      </div>

                      {/* Mini Summary Stats */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] mb-3 border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">수납함 구성</span>
                          <span className="font-bold text-slate-800">
                            {itemsCount > 0 ? `총 ${itemsCount}개 배치` : '치수만 저장됨'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">예상 구매가</span>
                          <span className="font-mono font-bold text-slate-800">
                            {itemsCount > 0 ? `₩${totalPrice.toLocaleString()}원` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Load Action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Calendar size={11} />
                        <span>{formatDate(d.updatedAt || d.createdAt)}</span>
                      </span>

                      <button
                        onClick={() => {
                          onSelectDrawer(d);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 ${
                          isCurrent
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        <Layers size={13} />
                        <span>{isCurrent ? '다시 불러오기' : '3D로 불러오기'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
