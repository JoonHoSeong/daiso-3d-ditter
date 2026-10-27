import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, User as UserIcon, AlertCircle, Loader2, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';
import { User } from '../types/auth';
import { BACKEND_URL } from '../config';

declare global {
  interface Window {
    google?: any;
    Kakao?: any;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const KakaoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
    <path d="M12 3C6.477 3 2 6.478 2 10.768c0 2.756 1.83 5.176 4.609 6.551-.197.743-.715 2.689-.818 3.102-.128.513.187.507.394.37.163-.109 2.585-1.758 3.633-2.47.708.103 1.438.158 2.182.158 5.523 0 10-3.478 10-7.768C22 6.478 17.523 3 12 3z" />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialPrompt, setSocialPrompt] = useState<'kakao' | 'google' | null>(null);
  const [socialEmail, setSocialEmail] = useState('');
  const [socialUsername, setSocialUsername] = useState('');

  // Check if official client keys are configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const kakaoJsKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || '';

  useEffect(() => {
    if (!isOpen) return;
    // Pre-initialize Kakao SDK if key is provided
    if (kakaoJsKey && window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(kakaoJsKey);
      } catch (e) {
        console.warn('Kakao SDK init error:', e);
      }
    }
  }, [isOpen, kakaoJsKey]);

  if (!isOpen) return null;

  // Handle Standard Email/Password Login or Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? `${BACKEND_URL}/api/auth/login` : `${BACKEND_URL}/api/auth/register`;
      const body = mode === 'login' ? { email, password } : { email, username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '인증 처리에 실패했습니다.');
      }

      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Social Auth: If official key exists, use Official OAuth; otherwise open developer sandbox flow
  const handleSocialClick = (provider: 'kakao' | 'google') => {
    setError(null);

    // Official Google OAuth Flow via GIS
    if (provider === 'google' && googleClientId && window.google) {
      setLoading(true);
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response && response.credential) {
              await executeSocialLogin('google', '', '', response.credential);
            }
          }
        });
        window.google.accounts.id.prompt();
        setLoading(false);
        return;
      } catch (e: any) {
        setLoading(false);
        setError('구글 로그인 창 호출 중 오류가 발생했습니다: ' + e.message);
      }
    }

    // Official Kakao OAuth Flow via Kakao SDK
    if (provider === 'kakao' && kakaoJsKey && window.Kakao) {
      setLoading(true);
      try {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoJsKey);
        }
        window.Kakao.Auth.login({
          scope: 'profile_nickname,profile_image,account_email',
          success: async (authObj: any) => {
            if (authObj && authObj.access_token) {
              await executeSocialLogin('kakao', '', '', authObj.access_token);
            }
          },
          fail: (err: any) => {
            setLoading(false);
            setError(`카카오 로그인이 취소되었거나 인증에 실패했습니다: ${err?.error_description || ''}`);
          }
        });
        return;
      } catch (e: any) {
        setLoading(false);
        setError('카카오 SDK 호출 중 오류가 발생했습니다: ' + e.message);
      }
    }

    // Key not set: open the transparent developer sandbox dialog
    if (provider === 'kakao') {
      setSocialEmail('kakao_user@kakao.com');
      setSocialUsername('카카오라이언');
    } else {
      setSocialEmail('google_user@gmail.com');
      setSocialUsername('구글유저');
    }
    setSocialPrompt(provider);
  };

  // Helper to call backend social-login endpoint
  const executeSocialLogin = async (
    provider: 'kakao' | 'google',
    emailVal: string,
    usernameVal: string,
    credentialVal?: string
  ) => {
    setLoading(true);
    try {
      const emailToUse = emailVal.trim() || (provider === 'kakao' ? 'kakao_user@kakao.com' : 'google_user@gmail.com');
      const usernameToUse = usernameVal.trim() || (provider === 'kakao' ? '카카오사용자' : '구글사용자');
      const avatarUrl = provider === 'kakao'
        ? 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2F1GPEug%2FbtqGItEzIH7%2FkkqA9mqdaAVglBmKiKez00%2Fimg.png'
        : 'https://lh3.googleusercontent.com/a/default-user=s96-c';

      const res = await fetch(`${BACKEND_URL}/api/auth/social-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: emailToUse,
          username: usernameToUse,
          provider_id: `${provider}_${Date.now()}`,
          avatar_url: avatarUrl,
          credential: credentialVal || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `${provider === 'kakao' ? '카카오' : '구글'} 연동 처리에 실패했습니다.`);
      }

      onSuccess(data.user, data.token);
      setSocialPrompt(null);
      onClose();
    } catch (err: any) {
      setError(err.message || '소셜 로그인 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Close */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-daiso-red flex items-center justify-center text-white font-black text-sm shadow-xs">
              D
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                다이소 3D 피터 계정 연동
              </h3>
              <p className="text-xs text-slate-400">내 서랍 크기와 수납 배치를 안전하게 보관하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start space-x-2 text-xs text-rose-700 animate-in fade-in">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Social Customizer Sub-View (Transparent sandbox / key guide) */}
        {socialPrompt ? (
          <div className="p-6 space-y-4 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                {socialPrompt === 'kakao' ? <KakaoIcon /> : <GoogleIcon />}
                <span className="text-xs font-bold text-slate-800">
                  {socialPrompt === 'kakao' ? '카카오 간편 계정 연동' : 'Google 계정 간편 연동'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSocialPrompt(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
              >
                이전으로
              </button>
            </div>

            {/* API Key Status Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-left space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-[11px]">
                <KeyRound size={13} className="text-amber-600" />
                <span>실제 OAuth 키 미설정 안내 (현재 개발/연동 모드)</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                공식 {socialPrompt === 'kakao' ? '카카오' : 'Google'} 외부 팝업 창을 띄우려면 <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono text-[10px]">.env</code>에 키를 등록하시면 됩니다.
                <br />
                아래 버튼을 누르면 <strong>실제 백엔드 DB에 사용자가 등록되고 인증 토큰이 발급되어 서랍 보관 기능이 100% 정상 작동</strong>합니다.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">표시 닉네임</label>
                <input
                  type="text"
                  value={socialUsername}
                  onChange={(e) => setSocialUsername(e.target.value)}
                  placeholder="닉네임 입력"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">연동 이메일</label>
                <input
                  type="email"
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSocialPrompt(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => executeSocialLogin(socialPrompt, socialEmail, socialUsername)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all ${
                  socialPrompt === 'kakao'
                    ? 'bg-[#FEE500] hover:bg-[#FDD800] text-[#191919]'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>실제 계정으로 로그인 완료</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 pt-4 space-y-4">
            {/* 1. Official 1-Click Social Logins */}
            <div className="space-y-2">
              {/* Kakao Button */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialClick('kakao')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-bold text-xs shadow-2xs transition-all flex items-center justify-center space-x-2 active:scale-[0.99] border border-amber-300/40 relative group"
              >
                <KakaoIcon />
                <span>카카오로 3초 만에 시작하기</span>
                {kakaoJsKey ? (
                  <span className="absolute right-3 text-[9px] bg-black/10 px-1.5 py-0.5 rounded text-black font-semibold">공식 연동 ON</span>
                ) : (
                  <span className="absolute right-3 text-[9px] bg-black/5 px-1.5 py-0.5 rounded text-black/60 font-medium">간편 연동</span>
                )}
              </button>

              {/* Google Button */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSocialClick('google')}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center justify-center space-x-2 active:scale-[0.99] border border-slate-300 relative group"
              >
                <GoogleIcon />
                <span>Google 계정으로 계속하기</span>
                {googleClientId ? (
                  <span className="absolute right-3 text-[9px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-semibold border border-blue-200">공식 연동 ON</span>
                ) : (
                  <span className="absolute right-3 text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">간편 연동</span>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400">
                또는 이메일 직접 입력
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn size={13} />
                <span>이메일 로그인</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus size={13} />
                <span>일반 회원가입</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">사용자 닉네임</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="예: 정리의달인, 미니멀리스트"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">이메일 주소</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="example@daiso.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">비밀번호</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="비밀번호 4자리 이상 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-daiso-red focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-daiso-red hover:bg-daiso-redHover text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>{mode === 'login' ? '이메일로 로그인하기' : '무료 회원가입 완료'}</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <Sparkles size={12} className="text-amber-500" />
          <span>카카오 / Google 연동 시 즉시 클라우드에 서랍 배치가 동기화됩니다.</span>
        </div>
      </div>
    </div>
  );
};
