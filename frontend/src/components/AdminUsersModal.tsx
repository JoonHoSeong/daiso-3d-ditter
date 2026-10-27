import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  Search,
  Trash2,
  RefreshCw,
  Crown,
  Bookmark,
  Check,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { BACKEND_URL } from '../config';

interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  provider: 'local' | 'google' | 'kakao';
  avatar_url?: string;
  role: 'admin' | 'user';
  saved_drawers_count: number;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  admin_users: number;
  total_saved_drawers: number;
  providers: {
    local: number;
    google: number;
    kakao: number;
  };
}

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  currentUserId?: string;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  authToken,
  currentUserId
}) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [activeUserDrawers, setActiveUserDrawers] = useState<{ [userId: string]: any[] }>({});
  const [loadingDrawersFor, setLoadingDrawersFor] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && authToken) {
      fetchAdminData();
    }
  }, [isOpen, authToken]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Users
      let url = `${BACKEND_URL}/api/admin/users?`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;
      if (providerFilter !== 'all') url += `provider=${encodeURIComponent(providerFilter)}&`;

      const usersRes = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!usersRes.ok) {
        const errData = await usersRes.json();
        throw new Error(errData.detail || '회원 목록을 불러오지 못했습니다.');
      }
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (err: any) {
      setError(err.message || '관리자 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData();
  };

  const handleRoleChange = async (user: AdminUserItem, newRole: 'admin' | 'user') => {
    if (user.email === 'joonho1366@gmail.com') {
      alert('최고 관리자(joonho1366@gmail.com)의 역할은 변경할 수 없습니다.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '역할 변경에 실패했습니다.');
      }

      setActionSuccess(`[${user.username}] 님의 역할이 '${newRole}'(으)로 변경되었습니다.`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || '역할 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (user.email === 'joonho1366@gmail.com') {
      alert('최고 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    if (user.id === currentUserId) {
      alert('현재 로그인된 본인 계정은 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`정말로 [${user.username} (${user.email})] 계정을 삭제하시겠습니까?\n저장된 서랍 데이터(${user.saved_drawers_count}개)도 영구 삭제됩니다.`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '계정 삭제에 실패했습니다.');
      }

      setActionSuccess(`[${user.username}] 계정이 정상 삭제되었습니다.`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || '계정 삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleViewDrawers = async (userId: string) => {
    if (activeUserDrawers[userId]) {
      const updated = { ...activeUserDrawers };
      delete updated[userId];
      setActiveUserDrawers(updated);
      return;
    }

    setLoadingDrawersFor(userId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/drawers`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUserDrawers(prev => ({ ...prev, [userId]: data.drawers || [] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrawersFor(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-2 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  다이소 3D 피터 회원 관리 대시보드
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                  Admin System
                </span>
              </div>
              <p className="text-xs text-slate-500">
                등록된 회원 계정 현황, 소셜 연동 상태, 역할 권한 및 저장 서랍 관리
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:px-6 bg-slate-50/60 border-b border-slate-100 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">총 등록 회원</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black text-slate-900">{stats.total_users}</span>
                <span className="text-slate-400 text-[11px]">명</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-purple-200/80 shadow-2xs">
              <span className="text-purple-600 font-semibold block text-[11px] mb-0.5">관리자(Admin)</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black text-purple-700">{stats.admin_users}</span>
                <span className="text-slate-400 text-[11px]">명</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">소셜 연동 계정</span>
              <div className="flex items-center space-x-2 text-slate-700 font-bold mt-0.5">
                <span className="flex items-center space-x-1 text-blue-600">
                  <span>G</span>
                  <span>{stats.providers.google}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center space-x-1 text-amber-700">
                  <span>💬</span>
                  <span>{stats.providers.kakao}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-normal text-[11px]">일반 {stats.providers.local}</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">클라우드 저장 서랍</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black text-indigo-700">{stats.total_saved_drawers}</span>
                <span className="text-slate-400 text-[11px]">개 세팅</span>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-2 items-center justify-between bg-white">
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="이메일 또는 닉네임 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-2xs shrink-0"
            >
              검색
            </button>
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setTimeout(fetchAdminData, 0);
              }}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-700"
            >
              <option value="all">전체 연동 채널</option>
              <option value="local">일반 가입 계정</option>
              <option value="google">Google 연동 계정</option>
              <option value="kakao">카카오 연동 계정</option>
            </select>

            {/* Refresh */}
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all"
              title="새로고침"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="mx-6 mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {error && (
          <div className="mx-6 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle size={14} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
          {loading && users.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
              <RefreshCw size={24} className="animate-spin text-purple-600" />
              <span>회원 목록을 불러오는 중...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Users size={32} className="mb-2 text-slate-300" />
              <span>검색 조건에 일치하는 회원이 없습니다.</span>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                    <th className="py-2.5 px-3">회원 정보</th>
                    <th className="py-2.5 px-3">연동 채널</th>
                    <th className="py-2.5 px-3">권한 (Role)</th>
                    <th className="py-2.5 px-3 text-center">저장 서랍</th>
                    <th className="py-2.5 px-3">가입 일시</th>
                    <th className="py-2.5 px-3 text-right">계정 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSuperAdmin = u.email === 'joonho1366@gmail.com';
                    const isCurrentUser = u.id === currentUserId;
                    const drawersOpen = Boolean(activeUserDrawers[u.id]);

                    return (
                      <React.Fragment key={u.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. User Info */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2.5">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.username}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${
                                  u.role === 'admin' ? 'bg-purple-600' : 'bg-slate-500'
                                }`}>
                                  {u.username ? u.username.slice(0, 1) : 'U'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900 truncate">{u.username}</span>
                                  {isSuperAdmin && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold flex items-center space-x-0.5">
                                      <Crown size={10} className="text-amber-600" />
                                      <span>최고관리자</span>
                                    </span>
                                  )}
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[9px] font-bold">
                                      나
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono block truncate">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Provider Badge */}
                          <td className="py-3 px-3">
                            {u.provider === 'google' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                <span>G</span>
                                <span>Google</span>
                              </span>
                            ) : u.provider === 'kakao' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#FEE500]/60 text-stone-900 text-[10px] font-bold border border-amber-300">
                                <span>💬</span>
                                <span>카카오</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                                일반 가입
                              </span>
                            )}
                          </td>

                          {/* 3. Role Select / Display */}
                          <td className="py-3 px-3">
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center space-x-1 text-purple-700 font-black text-xs">
                                <Shield size={13} />
                                <span>슈퍼 관리자</span>
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u, e.target.value as 'admin' | 'user')}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition-all ${
                                  u.role === 'admin'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200 font-black'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                <option value="user">일반회원 (User)</option>
                                <option value="admin">관리자 (Admin)</option>
                              </select>
                            )}
                          </td>

                          {/* 4. Drawers Count & Detail Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleViewDrawers(u.id)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1 ${
                                u.saved_drawers_count > 0
                                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'text-slate-400 bg-slate-50'
                              }`}
                              title="저장된 서랍 목록 보기"
                            >
                              <Bookmark size={11} />
                              <span>{u.saved_drawers_count}개</span>
                              <ChevronDown size={11} className={drawersOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                          </td>

                          {/* 5. Created Date */}
                          <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                            {u.created_at ? u.created_at.split('T')[0] : '-'}
                          </td>

                          {/* 6. Action */}
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSuperAdmin || isCurrentUser}
                              className={`p-1.5 rounded-lg transition-all ${
                                isSuperAdmin || isCurrentUser
                                  ? 'opacity-20 text-slate-300 cursor-not-allowed'
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:scale-95'
                              }`}
                              title={
                                isSuperAdmin
                                  ? '최고 관리자는 삭제 불가'
                                  : isCurrentUser
                                  ? '본인 계정은 삭제 불가'
                                  : '계정 및 저장 데이터 영구 삭제'
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Drawers Row */}
                        {drawersOpen && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={6} className="px-6 py-3">
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-600 block">
                                  📂 {u.username} 님의 저장된 서랍 목록:
                                </span>
                                {loadingDrawersFor === u.id ? (
                                  <span className="text-[11px] text-slate-400">서랍 목록 불러오는 중...</span>
                                ) : (activeUserDrawers[u.id] || []).length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic">저장된 서랍이 없습니다.</span>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {activeUserDrawers[u.id].map((d: any) => (
                                      <div
                                        key={d.id}
                                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                                      >
                                        <div className="font-bold text-slate-800 truncate">{d.name}</div>
                                        <div className="text-[11px] text-slate-400 font-mono">
                                          {d.width} × {d.depth} × {d.height} cm
                                        </div>
                                        <div className="text-[10px] text-indigo-600 mt-1 font-semibold">
                                          수납 품목 {d.items?.length || 0}종 배치됨
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Shield size={14} className="text-purple-600" />
            <span>최고 관리자 계정: <strong>joonho1366@gmail.com</strong> (권한 보호됨)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
