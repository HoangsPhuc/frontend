'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Shield, User, Search, Edit2, Trash2, Loader2, X, Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';

type UserRole = 'ADMIN' | 'STAFF';

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ username: '', name: '', password: '', role: 'STAFF' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ username: '', name: '', password: '', role: 'STAFF' });
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setModalMode('edit');
    setSelectedUser(u);
    setFormData({ username: u.username, name: u.name, password: '', role: u.role });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const url = modalMode === 'create' ? '/api/users' : `/api/users/${selectedUser?.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const payload: any = { ...formData };
      if (modalMode === 'edit' && !payload.password) {
        delete payload.password; // Don't send empty password if editing
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Đã có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá tài khoản này không?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xoá');
      }
    } catch (error) {
      alert('Lỗi kết nối');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-dvh bg-[#f8fafc] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => router.push('/')}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 active:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg text-gray-900">Tài khoản nhân viên</h1>
          <p className="text-xs text-gray-500">Quản trị viên ({users.length})</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] shadow-sm shadow-blue-100"
        >
          <UserPlus size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col gap-4">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc tài khoản..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(u => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={u.id}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${u.role === 'ADMIN' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[var(--primary)]'}`}>
                    {u.role === 'ADMIN' ? <Shield size={20} /> : <User size={20} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{u.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        @{u.username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                  <button 
                    onClick={() => openEditModal(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 size={14} /> Sửa
                  </button>
                  {session?.user?.id !== u.id && (
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                Không tìm thấy nhân viên nào.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Cập nhật / Thêm mới */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl flex flex-col"
              style={{ maxHeight: '90dvh' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-bold text-lg text-gray-900">
                  {modalMode === 'create' ? 'Thêm nhân viên mới' : 'Chỉnh sửa nhân viên'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Họ và Tên</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Tên đăng nhập</label>
                    <input 
                      required
                      type="text" 
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      placeholder="nva_farm"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Mật khẩu {modalMode === 'edit' && '(Để trống nếu không đổi)'}
                    </label>
                    <input 
                      required={modalMode === 'create'}
                      type="password" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder={modalMode === 'edit' ? "••••••••" : "Nhập mật khẩu"}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Phân quyền</label>
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, role: 'STAFF'})}
                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${formData.role === 'STAFF' ? 'border-[var(--primary)] bg-blue-50 text-[var(--primary)]' : 'border-gray-200 text-gray-500'}`}
                      >
                        <User size={16} /> Nhân viên
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, role: 'ADMIN'})}
                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${formData.role === 'ADMIN' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500'}`}
                      >
                        <Shield size={16} /> Quản lý
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 pb-safe">
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 rounded-xl bg-[var(--primary)] text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Lưu thông tin'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
