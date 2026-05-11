import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, CreditCard, Landmark, Coins, Receipt, Check, X, Pencil, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface BankAccount {
  id: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  accountOwner?: string;
  icon: string;
  color: string;
  initBalance: number;
  balance: number;
}

const icons = {
  Wallet,
  CreditCard,
  Landmark,
  Coins,
  Receipt
};

const colors = [
  { name: 'blue', class: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  { name: 'green', class: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-600' },
  { name: 'purple', class: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
  { name: 'amber', class: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  { name: 'red', class: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
];

function formatCurrency(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫';
}

export default function AccountsView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newAcc, setNewAcc] = useState({ name: '', bankName: '', accountNumber: '', accountOwner: '', icon: 'Wallet', color: 'blue', initBalance: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/bank-accounts?_t=${Date.now()}`);
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newAcc.name) return;
    setSaving(true);
    try {
      const url = editId ? `/api/bank-accounts/${editId}` : '/api/bank-accounts';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAcc,
          initBalance: newAcc.initBalance.replace(/\./g, '')
        }),
      });
      if (res.ok) {
        await fetchAccounts();
        closeModal();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá tài khoản này? Sẽ không thể khôi phục!')) return;
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAccounts();
      } else {
        alert('Có lỗi xảy ra khi xoá. Tài khoản này có thể đã được sử dụng trong các giao dịch.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (acc: BankAccount) => {
    setEditId(acc.id);
    setNewAcc({
      name: acc.name,
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      accountOwner: acc.accountOwner || '',
      icon: acc.icon,
      color: acc.color,
      initBalance: acc.initBalance ? acc.initBalance.toLocaleString('vi-VN') : '',
    });
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditId(null);
    setNewAcc({ name: '', bankName: '', accountNumber: '', accountOwner: '', icon: 'Wallet', color: 'blue', initBalance: '' });
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="space-y-4"
    >
      <div className="bg-gradient-to-br from-[#4f6ef7] via-[#5b7af9] to-[#7c93fb] rounded-2xl p-5 text-white shadow-lg shadow-blue-200/40 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} strokeWidth={2} className="text-white/70" />
            <span className="text-white/70 text-xs font-medium">Tổng tài sản (Tất cả tài khoản)</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-gray-800">Danh sách tài khoản</h3>
        {isAdmin && (
          <button 
            onClick={() => {
              setEditId(null);
              setNewAcc({ name: '', bankName: '', accountNumber: '', accountOwner: '', icon: 'Wallet', color: 'blue', initBalance: '' });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold"
          >
            <Plus size={14} /> Thêm Mới
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <Landmark size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 font-medium">Chưa có tài khoản nào</p>
          </div>
        ) : (
          accounts.map((acc, i) => {
            const IconComp = icons[acc.icon as keyof typeof icons] || Wallet;
            const colorTheme = colors.find(c => c.name === acc.color) || colors[0];
            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/60 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorTheme.bg} ${colorTheme.text}`}>
                      <IconComp size={20} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-gray-800 leading-tight mb-0.5 truncate">{acc.name}</h4>
                      {acc.bankName && <p className="text-xs text-gray-500 truncate">{acc.bankName}</p>}
                      {acc.accountNumber && <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{acc.accountNumber} {acc.accountOwner ? `- ${acc.accountOwner}` : ''}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Số dư</p>
                    <p className="font-bold text-[15px] text-gray-900">{formatCurrency(acc.balance)}</p>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                    <button onClick={() => openEdit(acc)} className="flex flex-1 justify-center items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                      <Pencil size={14} /> Sửa
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="flex flex-1 justify-center items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-gray-800">{editId ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1.5 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Tên hiển thị nội bộ</label>
                  <input
                    type="text"
                    value={newAcc.name}
                    onChange={e => setNewAcc({ ...newAcc, name: e.target.value })}
                    placeholder="VD: Quỹ Tiền Mặt, TK Mua Phân Bón..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Tên Ngân Hàng <span className="text-gray-400 font-normal normal-case">(tuỳ chọn)</span></label>
                    <input
                      type="text"
                      value={newAcc.bankName}
                      onChange={e => setNewAcc({ ...newAcc, bankName: e.target.value })}
                      placeholder="VD: Vietcombank"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Số Tài Khoản</label>
                    <input
                      type="text"
                      value={newAcc.accountNumber}
                      onChange={e => setNewAcc({ ...newAcc, accountNumber: e.target.value })}
                      placeholder="VD: 0123456789"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Chủ Tài Khoản</label>
                    <input
                      type="text"
                      value={newAcc.accountOwner}
                      onChange={e => setNewAcc({ ...newAcc, accountOwner: e.target.value })}
                      placeholder="VD: NGUYEN VAN A"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Số dư ban đầu</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newAcc.initBalance}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setNewAcc({ ...newAcc, initBalance: raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '' });
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Màu sắc</label>
                  <div className="flex gap-3">
                    {colors.map(c => (
                      <button
                        key={c.name}
                        onClick={() => setNewAcc({ ...newAcc, color: c.name })}
                        className={`w-8 h-8 rounded-full ${c.class} flex items-center justify-center transition-transform ${newAcc.color === c.name ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      >
                        {newAcc.color === c.name && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !newAcc.name}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : (editId ? 'Cập Nhật' : 'Thêm Tài Khoản')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
