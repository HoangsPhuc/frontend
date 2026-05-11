'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { User, Lock, Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PWAInstallButton from '@/components/PWAInstallButton';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('remembered_username');
    const savedPass = localStorage.getItem('remembered_password');
    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setError('Tên đăng nhập hoặc mật khẩu không đúng');
      setLoading(false);
    } else {
      if (rememberMe) {
        localStorage.setItem('remembered_username', username);
        localStorage.setItem('remembered_password', password);
      } else {
        localStorage.removeItem('remembered_username');
        localStorage.removeItem('remembered_password');
      }
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#f0f4f8]">
      {/* Top Banner Area */}
      <div className="flex-1 bg-gradient-to-br from-[var(--primary)] via-[var(--primary-dark)] to-[#3b5de7] rounded-b-[40px] flex flex-col items-center justify-center p-6 text-white shadow-xl shadow-blue-200/50 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: 'spring', damping: 20 }}
          className="w-24 h-24 bg-white rounded-[32px] p-1 shadow-inner border-2 border-white/40 overflow-hidden mb-5"
        >
          <div className="w-full h-full rounded-[28px] overflow-hidden bg-white">
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold tracking-tight mb-2"
        >
          Dưa Lưới Tịnh Biên
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.15 }}
          className="text-sm text-blue-100/80 font-medium tracking-wide text-center"
        >
          Hệ thống quản lý dòng tiền & công nợ
        </motion.p>
      </div>

      {/* Form Area */}
      <div className="flex-[1.5] px-6 pt-10 pb-8">
        <motion.div 
          initial={{ y: 40, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Tài khoản</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[var(--primary)] transition-all placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[var(--primary)] transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:text-[var(--primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[var(--primary)] border-gray-300 rounded focus:ring-[var(--primary)]"
              />
              <label htmlFor="rememberMe" className="text-sm font-medium text-gray-600 select-none cursor-pointer">
                Ghi nhớ đăng nhập
              </label>
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!username || !password || loading}
                type="submit"
                className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  !username || !password || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg shadow-blue-200/60 active:shadow-sm'
                }`}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Vào hệ thống
                  </>
                )}
              </motion.button>
            </div>
          </form>
          
          {/* Nút Cài đặt App cho người dùng không rành công nghệ */}
          <PWAInstallButton />
        </motion.div>
        
        <p className="text-center text-xs text-gray-400 mt-8 font-medium">
          Hệ thống nội bộ Tịnh Biên Farm &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
