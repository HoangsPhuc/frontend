'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Save, Loader2, Phone, User, Edit3 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Profile {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export default function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = Boolean(userId && session?.user?.id !== userId);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const url = userId ? `/api/profile?userId=${userId}` : '/api/profile';
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone || '');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setProfile(prev => prev ? { ...prev, [type === 'avatar' ? 'avatarUrl' : 'coverUrl']: data.url } : null);
        }
      }
    } catch {
      alert('Lỗi tải ảnh lên');
    } finally {
      if (type === 'avatar') { setUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value = ''; }
      else { setUploadingCover(false); if (coverInputRef.current) coverInputRef.current.value = ''; }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Tên không được để trống');
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          phone: phone.trim(),
          avatarUrl: profile?.avatarUrl,
          coverUrl: profile?.coverUrl
        })
      });
      if (res.ok) {
        await update(); // Cập nhật session (nếu dùng chung name)
        alert('Cập nhật hồ sơ thành công!');
        onClose();
      } else {
        alert('Cập nhật thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.2 }}
            className="relative bg-white w-full rounded-t-3xl overflow-hidden shadow-2xl flex flex-col md:h-auto md:max-h-[85vh] md:w-[450px] md:rounded-3xl md:mx-auto md:mb-auto md:mt-auto"
            style={{ height: '85vh' }}
          >
            {/* Handle Bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/50 backdrop-blur-md rounded-full z-10 mix-blend-overlay md:hidden" />
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center z-10 transition-colors"
            >
              <X size={18} />
            </button>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : profile ? (
              <div className="flex-1 overflow-y-auto pb-safe">
                {/* Inputs for file upload */}
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'avatar')} />
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'cover')} />

                {/* Cover Photo Area */}
                <div className="relative w-full h-48 bg-gradient-to-br from-blue-300 to-indigo-400 group">
                  {profile.coverUrl && (
                    <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  )}
                  {!isReadOnly && (
                    <>
                      <div className="absolute inset-0 bg-black/20" />
                      <button 
                        onClick={() => coverInputRef.current?.click()}
                        className="absolute inset-0 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 text-white"
                      >
                        {uploadingCover ? <Loader2 size={24} className="animate-spin mb-1" /> : <Camera size={24} className="mb-1" />}
                        <span className="text-xs font-medium">Đổi ảnh bìa</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Avatar Area */}
                <div className="px-6 relative flex flex-col items-center mt-[-48px]">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-3xl font-bold text-blue-500">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        profile.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {!isReadOnly && (
                      <button 
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full border-2 border-white flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors"
                      >
                        {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      </button>
                    )}
                  </div>
                  
                  <div className="text-center mt-3 mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-sm font-medium text-gray-500 bg-gray-100 inline-block px-2.5 py-0.5 rounded-md mt-1">
                      {profile.role === 'ADMIN' ? 'Quản lý' : 'Nhân viên'}
                    </p>
                  </div>
                </div>

                {/* Form Area */}
                <div className="px-6 space-y-4">
                  {!isReadOnly && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Tên hiển thị</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <User size={18} />
                        </div>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          placeholder="Nhập tên hiển thị..."
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Số điện thoại</label>
                    {isReadOnly ? (
                      <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
                        <Phone size={18} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{phone || 'Chưa cập nhật'}</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Phone size={18} />
                        </div>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          type="tel"
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          placeholder="Nhập số điện thoại..."
                        />
                      </div>
                    )}
                  </div>

                  {!isReadOnly && (
                    <div className="pt-6">
                      <button
                        onClick={handleSave}
                        disabled={saving || uploadingAvatar || uploadingCover}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                      >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Lỗi tải hồ sơ
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
