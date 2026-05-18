'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  Truck,
  Fuel,
  Coffee,
  Wrench,
  HelpCircle,
  Banknote,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  PenLine,
  Check,
  Bell,
  XCircle,
} from 'lucide-react';
import TransactionForm, { TransactionData } from './TransactionForm';
import { addToSyncQueue, getSyncQueue, processSyncQueue } from '@/lib/offlineSync';
import { CloudOff, RefreshCw, ArrowLeft, QrCode, X, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
};

const categoryIcons: Record<string, React.ElementType> = {
  ban_hang: ShoppingCart,
  thu_no: ArrowDownCircle,
  thu_khac: Banknote,
  tien_xang: Fuel,
  nhap_hang: Truck,
  tra_no_vuon: ArrowUpCircle,
  tien_com: Coffee,
  vat_tu: Wrench,
  chi_khac: HelpCircle,
};

const categoryLabels: Record<string, string> = {
  ban_hang: 'Bán hàng',
  thu_no: 'Thu nợ',
  thu_khac: 'Thu khác',
  tien_xang: 'Tiền xăng',
  nhap_hang: 'Nhập hàng',
  tra_no_vuon: 'Trả nợ vườn',
  tien_com: 'Tiền cơm',
  vat_tu: 'Vật tư',
  chi_khac: 'Khác',
};

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  customerName?: string | null;
  transferContent: string | null;
  accountInfo: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountOwner?: string | null;
  qrCodeUrl?: string | null;
  note: string | null;
  date: string;
  partnerId: string | null;
  status: string;
  createdAt: string;
  user?: { id: string; name: string; username: string } | null;
  bankAccountId?: string | null;
  isEditRequest?: boolean;
  originalTransactionId?: string | null;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  return n.toLocaleString('vi-VN');
}

function formatFullCurrency(n: number): string {
  return n.toLocaleString('vi-VN') + ' đ';
}

function formatDateRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - txDay.getTime()) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `${time} · Hôm nay`;
  if (diffDays === 1) return `${time} · Hôm qua`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Simple bar chart component
function MiniBarChart({ data }: { data: { thu: number; chi: number; label: string }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.thu, d.chi]), 1);
  return (
    <div className="flex items-end justify-between gap-1.5 h-32 px-1 pt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 w-full h-24">
            <div className="flex-1 flex flex-col justify-end items-center h-full">
              {d.thu > 0 && <span className="text-[8px] font-bold text-[var(--primary)] mb-0.5 truncate max-w-full" title={d.thu.toLocaleString()}>{formatCurrency(d.thu)}</span>}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.08, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ height: `${Math.max((d.thu / maxVal) * 100, 4)}%`, transformOrigin: 'bottom' }}
                className="bg-[var(--primary)] rounded-t-sm w-full opacity-80"
              />
            </div>
            <div className="flex-1 flex flex-col justify-end items-center h-full">
              {d.chi > 0 && <span className="text-[8px] font-bold text-[var(--expense)] mb-0.5 truncate max-w-full" title={d.chi.toLocaleString()}>{formatCurrency(d.chi)}</span>}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.08 + 0.05, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ height: `${Math.max((d.chi / maxVal) * 100, 4)}%`, transformOrigin: 'bottom' }}
                className="bg-[var(--expense)] rounded-t-sm w-full opacity-60"
              />
            </div>
          </div>
          <span className="text-[9px] text-gray-400 font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historyFilterStartDate, setHistoryFilterStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [historyFilterEndDate, setHistoryFilterEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [historyFilterUser, setHistoryFilterUser] = useState<string>('all');
  const prevPendingCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const prevStatusMapRef = useRef<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rejectPromptId, setRejectPromptId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal thông báo duyệt chi cho nhân viên (hiển thị giữa màn hình)
  const [approvalModal, setApprovalModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
    description: string;
    amount: number;
  } | null>(null);

  const showApprovalModal = useCallback((message: string, type: 'success' | 'error', description = '', amount = 0) => {
    setApprovalModal({ visible: true, type, message, description, amount });

    // Phát âm thanh báo hiệu khi duyệt/từ chối
    if (soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, startTime: number, dur: number, typeStr: OscillatorType = 'sine') => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = typeStr;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.5, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
          osc.start(startTime);
          osc.stop(startTime + dur);
        };

        if (type === 'success') {
          // Âm thanh báo thành công (tăng dần: Đồ - Mi - Son)
          playTone(523.25, ctx.currentTime, 0.2, 'triangle'); // C5
          playTone(659.25, ctx.currentTime + 0.15, 0.2, 'triangle'); // E5
          playTone(783.99, ctx.currentTime + 0.3, 0.4, 'triangle'); // G5
        } else {
          // Âm thanh báo lỗi (trầm dần)
          playTone(349.23, ctx.currentTime, 0.3, 'sawtooth'); // F4
          playTone(311.13, ctx.currentTime + 0.2, 0.5, 'sawtooth'); // Eb4
        }
      } catch (err) {
        console.error('Audio play error:', err);
      }
    }

    // Tự động ẩn sau 4 giây
    setTimeout(() => {
      setApprovalModal(null);
    }, 4000);
  }, [soundEnabled]);

  // Đọc cài đặt âm thanh từ localStorage và lắng nghe thay đổi
  useEffect(() => {
    const saved = localStorage.getItem('notification_sound');
    if (saved !== null) setSoundEnabled(saved === 'true');

    const handleChange = (e: Event) => {
      setSoundEnabled((e as CustomEvent).detail);
    };
    window.addEventListener('sound_setting_changed', handleChange);
    return () => window.removeEventListener('sound_setting_changed', handleChange);
  }, []);

  // Gửi thông báo hệ thống (hoạt động kể cả khi tắt trình duyệt)
  const sendSystemNotification = useCallback((count: number) => {
    // 1. Phát âm thanh trong tab (nếu được bật)
    if (soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, startTime: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square'; // Sóng vuông tạo ra âm thanh réo rắt và to hơn rất nhiều
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(1.0, startTime); // Max volume không rè quá
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
          osc.start(startTime);
          osc.stop(startTime + dur);
        };
        // Tiếng chuông 3 nhịp to, rõ và dứt khoát để thu hút sự chú ý
        playTone(659.25, ctx.currentTime, 0.4);
        playTone(880, ctx.currentTime + 0.3, 0.5);
        playTone(1318.51, ctx.currentTime + 0.6, 0.8);
      } catch (err) {
        console.error(err);
      }
    }

    // Rung điện thoại mạnh nếu đang mở app
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([600, 200, 600, 200, 1000]);
    }

    // 2. Không cần gửi System Notification từ đây nữa, vì Server sẽ gửi Push Notification trực tiếp (hoạt động cả khi tắt app)
  }, [soundEnabled]);

  const fetchData = useCallback(async () => {
    try {
      const ts = Date.now();
      const [txRes, accRes] = await Promise.all([
        fetch(`/api/transactions?limit=500&_t=${ts}`),
        fetch(`/api/bank-accounts?_t=${ts}`)
      ]);
      const txData = await txRes.json();
      const accData = await accRes.json();
      if (txData && Array.isArray(txData.transactions)) {
        setTransactions(txData.transactions);
      } else if (Array.isArray(txData)) {
        setTransactions(txData);
      }
      if (Array.isArray(accData)) setBankAccounts(accData);
    } catch (err: any) {
      if (err.message !== 'Failed to fetch') {
        console.error('Error fetching:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Check initial queue
    setPendingSync(getSyncQueue().length);

    // Listen for queue updates
    const handleSyncUpdate = () => setPendingSync(getSyncQueue().length);
    window.addEventListener('sync_queue_updated', handleSyncUpdate);

    // Attempt sync when online
    const handleOnline = async () => {
      await handleManualSync();
    };
    window.addEventListener('online', handleOnline);

    // Custom event to open history from outside
    const handleOpenHistory = () => setShowAllHistory(true);
    window.addEventListener('openHistoryModal', handleOpenHistory);

    // Custom event to open a specific transaction detail
    const handleOpenTx = (e: Event) => {
      const customEvent = e as CustomEvent;
      const txId = customEvent.detail?.txId;
      if (txId) {
        // Try to find it in the list
        setTransactions(prev => {
          const found = prev.find(t => t.id === txId);
          if (found) {
            setDetailTx(found);
          } else {
            // Not in current list, maybe show history first and let user search?
            alert('Giao dịch này nằm ở trang trước hoặc đã bị xóa. Vui lòng mở Lịch sử để tìm kiếm.');
          }
          return prev;
        });
      }
    };
    window.addEventListener('openTransaction', handleOpenTx);

    return () => {
      window.removeEventListener('sync_queue_updated', handleSyncUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('openHistoryModal', handleOpenHistory);
      window.removeEventListener('openTransaction', handleOpenTx);
    };
  }, [fetchData]);

  // Admin: Polling mỗi 10 giây để kiểm tra đơn mới
  // Staff: Polling mỗi 10 giây để kiểm tra trạng thái duyệt
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [fetchData]);

  // Theo dõi số lượng pending để gửi thông báo khi có đơn mới
  useEffect(() => {
    if (!isAdmin) return;
    const currentPending = transactions.filter(t => t.status === 'PENDING').length;

    if (isFirstLoadRef.current) {
      prevPendingCountRef.current = currentPending;
      isFirstLoadRef.current = false;
      return;
    }

    const newCount = currentPending - prevPendingCountRef.current;
    if (newCount > 0) {
      sendSystemNotification(newCount);
    }

    prevPendingCountRef.current = currentPending;
  }, [transactions, isAdmin, sendSystemNotification]);

  // Staff: Theo dõi khi giao dịch được duyệt hoặc từ chối để hiện toast
  useEffect(() => {
    if (isAdmin) return;
    if (transactions.length === 0) return;

    const currentMap: Record<string, string> = {};
    transactions.forEach(t => { currentMap[t.id] = t.status; });

    // Lần đầu chỉ ghi nhận
    if (Object.keys(prevStatusMapRef.current).length === 0) {
      prevStatusMapRef.current = currentMap;
      return;
    }

    // So sánh trạng thái cũ vs mới
    for (const [txId, newStatus] of Object.entries(currentMap)) {
      const oldStatus = prevStatusMapRef.current[txId];
      if (oldStatus === 'PENDING' && newStatus === 'APPROVED') {
        const tx = transactions.find(t => t.id === txId);
        showApprovalModal('Đã được duyệt!', 'success', tx?.transferContent || categoryLabels[tx?.category || ''] || 'Giao dịch', tx?.amount || 0);
      } else if (oldStatus === 'PENDING' && newStatus === 'REJECTED') {
        const tx = transactions.find(t => t.id === txId);
        showApprovalModal('Đã bị từ chối', 'error', tx?.transferContent || categoryLabels[tx?.category || ''] || 'Giao dịch', tx?.amount || 0);
      }
    }

    prevStatusMapRef.current = currentMap;
  }, [transactions, isAdmin, showApprovalModal]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      alert('Không có kết nối mạng để đồng bộ!');
      return;
    }
    setIsSyncing(true);
    const { success, failed } = await processSyncQueue();
    setIsSyncing(false);
    if (success > 0) {
      await fetchData();
    }
    if (failed > 0) {
      alert(`Đồng bộ thất bại ${failed} mục. Vui lòng kiểm tra lại.`);
    }
  };

  // Thu/Chi calculation for the chart and summary cards (based on recent transactions)
  const currentMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
  const recentThu = transactions.filter(t => t.type === 'THU' && t.status === 'APPROVED' && t.date.startsWith(currentMonthPrefix)).reduce((s, t) => s + t.amount, 0);
  const recentChi = transactions.filter(t => t.type === 'CHI' && t.status === 'APPROVED' && t.date.startsWith(currentMonthPrefix)).reduce((s, t) => s + t.amount, 0);

  // Toàn bộ tài chính = Tổng số dư của tất cả các ví/tài khoản cộng lại
  const balance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Chart data
  const chartData = useMemo(() => {
    const data: { thu: number; chi: number; label: string }[] = [];
    const now = new Date();

    if (selectedPeriod === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const dayThu = transactions
          .filter(t => t.type === 'THU' && t.date.startsWith(dayStr) && t.status === 'APPROVED')
          .reduce((s, t) => s + t.amount, 0);
        const dayChi = transactions
          .filter(t => t.type === 'CHI' && t.date.startsWith(dayStr) && t.status === 'APPROVED')
          .reduce((s, t) => s + t.amount, 0);
        data.push({
          thu: dayThu,
          chi: dayChi,
          label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        });
      }
    } else if (selectedPeriod === 'week') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - (i * 7));
        dEnd.setHours(23, 59, 59, 999);

        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 6);
        dStart.setHours(0, 0, 0, 0);

        let wThu = 0; let wChi = 0;
        transactions.forEach(t => {
          if (t.status !== 'APPROVED') return;
          const tDate = new Date(t.date);
          if (tDate >= dStart && tDate <= dEnd) {
            if (t.type === 'THU') wThu += t.amount;
            else wChi += t.amount;
          }
        });

        data.push({
          thu: wThu,
          chi: wChi,
          label: i === 0 ? 'Tuần này' : `T -${i}`,
        });
      }
    } else if (selectedPeriod === 'month') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${yyyy}-${mm}`;

        let mThu = 0; let mChi = 0;
        transactions.forEach(t => {
          if (t.status !== 'APPROVED') return;
          if (t.date.startsWith(monthPrefix)) {
            if (t.type === 'THU') mThu += t.amount;
            else mChi += t.amount;
          }
        });

        data.push({
          thu: mThu,
          chi: mChi,
          label: `Th${d.getMonth() + 1}`,
        });
      }
    }

    return data;
  }, [transactions, selectedPeriod]);

  const handleSave = async (data: TransactionData) => {
    const isEditing = !!data.id;
    const url = isEditing ? `/api/transactions/${data.id}` : '/api/transactions';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditingTx(null);
      await fetchData();
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    } catch (err) {
      // If network error (offline or fetch failed), save to draft queue
      addToSyncQueue(data);
      setEditingTx(null);
      // We can optimistically add it to local list if we want, but for now just showing the banner is okay.
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConfirmDeleteId(null);
      await fetchData();
    }
  };

  const handleApprove = async (id: string, e: React.MouseEvent, bankAccountId?: string) => {
    e.stopPropagation();
    
    let finalBankAccountId = bankAccountId;
    if (!finalBankAccountId && bankAccounts.length > 0) {
      if (bankAccounts.length === 1) {
        finalBankAccountId = bankAccounts[0].id;
      } else {
        alert('Có nhiều tài khoản. Vui lòng Bấm vào giao dịch để chọn tài khoản trừ tiền!');
        const tx = transactions.find(t => t.id === id);
        if (tx) setDetailTx(tx);
        return false;
      }
    }

    try {
      const payload: any = { status: 'APPROVED' };
      if (finalBankAccountId) payload.bankAccountId = finalBankAccountId;

      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchData();
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleRejectClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRejectReason('');
    setRejectPromptId(id);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('Bạn phải nhập lý do từ chối!');
      return;
    }
    if (!rejectPromptId) return;

    try {
      const res = await fetch(`/api/transactions/${rejectPromptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectReason: rejectReason.trim() }),
      });
      if (res.ok) {
        setRejectPromptId(null);
        setRejectReason('');
        setDetailTx(null);
        await fetchData();
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx({
      id: isAdmin ? tx.id : undefined,
      type: tx.type as 'THU' | 'CHI',
      category: tx.category,
      amount: String(tx.amount),
      transferContent: tx.transferContent || '',
      accountInfo: tx.accountInfo || '',
      bankName: tx.bankName || '',
      accountNumber: tx.accountNumber || '',
      accountOwner: tx.accountOwner || '',
      qrCodeUrl: tx.qrCodeUrl || '',
      note: tx.note || '',
      date: tx.date.split('T')[0],
      isEditRequest: !isAdmin,
      originalTransactionId: !isAdmin ? (tx.originalTransactionId || tx.id) : undefined,
    });
    setFormOpen(true);
  };

  return (
    <motion.div
      key="dashboard-view"
      exit={{ opacity: 0, y: -10 }}
      className="relative h-full"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* ═══ ADMIN ONLY: FULL FINANCIAL SUMMARY ═══ */}
        {isAdmin ? (
          <>
            {/* ═══ BALANCE HERO CARD ═══ */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-[#4f6ef7] via-[#5b7af9] to-[#7c93fb] rounded-2xl p-5 text-white shadow-lg shadow-blue-200/40 relative overflow-hidden"
            >
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-white/5 rounded-full" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote size={16} strokeWidth={2} className="text-white/70" />
                  <span className="text-white/70 text-xs font-medium">Tài chính hiện tại</span>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold tracking-tight mb-4"
                >
                  {formatFullCurrency(balance)}
                </motion.p>

                {/* Income / Expense row */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/15 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-green-400/30 rounded-md flex items-center justify-center">
                        <TrendingUp size={11} className="text-green-200" />
                      </div>
                      <span className="text-[10px] text-white/60 font-medium">Thu (tháng này)</span>
                    </div>
                    <p className="text-sm font-bold text-white">{formatFullCurrency(recentThu)}</p>
                  </div>
                  <div className="flex-1 bg-white/15 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-red-400/30 rounded-md flex items-center justify-center">
                        <TrendingDown size={11} className="text-red-200" />
                      </div>
                      <span className="text-[10px] text-white/60 font-medium">Chi (tháng này)</span>
                    </div>
                    <p className="text-sm font-bold text-white">{formatFullCurrency(recentChi)}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ═══ CHART SECTION ═══ */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-[var(--card-shadow)] border border-gray-100/60">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Biểu đồ thu chi</h3>
                <div className="flex bg-gray-100 rounded-lg p-0.5 text-[10px] font-medium">
                  {(['day', 'week', 'month'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-2.5 py-1 rounded-md transition-all ${selectedPeriod === p
                        ? 'bg-white text-[var(--primary)] shadow-sm'
                        : 'text-gray-400'
                        }`}
                    >
                      {p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : 'Tháng'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart legend */}
              <div className="flex items-center gap-4 mb-2 px-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
                  <span className="text-[10px] text-gray-400">Thu</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[var(--expense)] rounded-full opacity-60" />
                  <span className="text-[10px] text-gray-400">Chi</span>
                </div>
              </div>

              <MiniBarChart data={chartData} />
            </motion.div>

            {/* ═══ QUICK CATEGORY SUMMARY ═══ */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 shadow-[var(--card-shadow)] border border-gray-100/60">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Phân tích chi tiêu</h3>
                <button
                  onClick={() => alert("Tính năng Phân tích & Báo cáo chuyên sâu đang được phát triển và sẽ ra mắt ở thẻ Báo Cáo bên dưới!")}
                  className="flex items-center gap-0.5 text-[var(--primary)] text-xs font-medium"
                >
                  Chi tiết <ChevronRight size={14} />
                </button>
              </div>
              {(() => {
                const chiByCategory: Record<string, number> = {};
                transactions.filter(t => t.type === 'CHI' && t.status === 'APPROVED').forEach(t => {
                  chiByCategory[t.category] = (chiByCategory[t.category] || 0) + t.amount;
                });
                const sorted = Object.entries(chiByCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);
                const maxCat = sorted.length > 0 ? sorted[0][1] : 1;

                return sorted.length > 0 ? (
                  <div className="space-y-3">
                    {sorted.map(([cat, amt]) => {
                      const Icon = categoryIcons[cat] || HelpCircle;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                            <Icon size={15} strokeWidth={1.6} className="text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{categoryLabels[cat] || cat}</span>
                              <span className="text-xs font-semibold text-gray-800">{formatFullCurrency(amt)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(1.5, (amt / maxCat) * 100)}%` }}
                                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                                className="bg-[var(--primary)] h-1.5 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-3">Chưa có dữ liệu chi tiêu</p>
                );
              })()}
            </motion.div>
          </>
        ) : (
          /* ═══ STAFF ONLY: SIMPLE WELCOME CARD ═══ */
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl p-5 shadow-[var(--card-shadow)] border border-gray-100/60"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[var(--primary)]">
                <PenLine size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">Xin chào, {session?.user?.name || 'Nhân viên'}!</h2>
                <p className="text-sm text-gray-500">Hãy ghi chép thu chi cẩn thận nhé.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ ADMIN: PENDING APPROVALS SECTION ═══ */}
        {isAdmin && (() => {
          const pendingTxs = transactions.filter(t => t.status === 'PENDING');
          if (pendingTxs.length === 0) return null;
          return (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-[var(--card-shadow)] border-2 border-amber-200 overflow-hidden">
              <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Bell size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">Chờ duyệt thanh toán</h3>
                    <p className="text-[10px] text-amber-600">{pendingTxs.length} yêu cầu đang chờ</p>
                  </div>
                </div>
                <span className="w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingTxs.length}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {pendingTxs.map((tx) => {
                  const Icon = categoryIcons[tx.category] || HelpCircle;
                  const isIncome = tx.type === 'THU';
                  return (
                    <div key={tx.id} className="px-4 py-3 cursor-pointer hover:bg-amber-50/50 transition-colors" onClick={() => setDetailTx(tx)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                            }`}>
                            <Icon size={16} strokeWidth={1.7} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-medium text-gray-800 leading-tight">
                                {tx.user?.name && <span className="font-bold text-blue-600 mr-1">{tx.user.name}:</span>}
                                {tx.isEditRequest && <span className="text-purple-600 font-bold mr-1">[YÊU CẦU SỬA]</span>}
                                {tx.transferContent || categoryLabels[tx.category] || tx.category}
                              </p>
                              {tx.qrCodeUrl && <QrCode size={12} className="text-blue-500" />}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {categoryLabels[tx.category] || tx.category} · {new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} {new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-500'
                          }`}>
                          {isIncome ? '+' : '-'}{formatFullCurrency(tx.amount)}
                        </span>
                      </div>

                      <div className="flex gap-2 ml-11">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); handleApprove(tx.id, e); }}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check size={14} />
                          Duyệt
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => handleRejectClick(tx.id, e)}
                          className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <XCircle size={14} />
                          Từ chối
                        </motion.button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* ═══ OFFLINE DRAFT BANNER ═══ */}
        <AnimatePresence>
          {pendingSync > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-center justify-between shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center">
                  <CloudOff size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-orange-900">Lưu tạm ngoại tuyến</h3>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Có {pendingSync} giao dịch chưa được đẩy lên máy chủ.
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ RECENT TRANSACTIONS ═══ */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-semibold text-gray-800">Giao dịch gần đây</h3>
            <button
              onClick={() => setShowAllHistory(true)}
              className="flex items-center gap-0.5 text-[var(--primary)] text-xs font-medium"
            >
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-[var(--card-shadow)] border border-gray-100/60 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-[var(--primary)] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-400 mt-2">Đang tải...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Receipt size={28} strokeWidth={1.2} className="text-blue-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">Chưa có giao dịch nào</p>
                <p className="text-xs text-gray-400 mt-1">Bấm nút + để bắt đầu ghi chép</p>
              </div>
            ) : (
              <>
                {/* Group by date (24h filter) */}
                {(() => {
                  const grouped: Record<string, Transaction[]> = {};
                  const now = Date.now();
                  // Ưu tiên PENDING lên đầu, sau đó đến các giao dịch khác
                  const pendingTxsList = transactions.filter(t => t.status === 'PENDING');
                  const otherTxsList = transactions.filter(t => t.status !== 'PENDING');
                  // Lấy tối đa 5 giao dịch
                  const recentTxs = [...pendingTxsList, ...otherTxsList].slice(0, 5);

                  recentTxs.forEach(tx => {
                    const dateKey = tx.date.split('T')[0];
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(tx);
                  });

                  return Object.entries(grouped).map(([dateKey, txs], gi) => {
                    const dateObj = new Date(dateKey);
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const txDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                    const diffDays = Math.floor((today.getTime() - txDay.getTime()) / (1000 * 60 * 60 * 24));
                    let dateLabel = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                    if (diffDays === 0) dateLabel = 'Hôm nay';
                    else if (diffDays === 1) dateLabel = 'Hôm qua';

                    return (
                      <div key={dateKey}>
                        {/* Date header */}
                        <div className={`flex items-center justify-between px-4 py-2 bg-gray-50/80 ${gi > 0 ? 'border-t border-gray-100' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            <span className="text-[11px] font-medium text-gray-500 capitalize">{dateLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const dayThu = txs.filter(t => t.type === 'THU' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
                              const dayChi = txs.filter(t => t.type === 'CHI' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
                              return (
                                <>
                                  {dayThu > 0 && <span className="text-[10px] font-medium text-green-600">+{formatCurrency(dayThu)}</span>}
                                  {dayChi > 0 && <span className="text-[10px] font-medium text-red-500">-{formatCurrency(dayChi)}</span>}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Transactions */}
                        {txs.map((tx, i) => {
                          const Icon = categoryIcons[tx.category] || HelpCircle;
                          const isIncome = tx.type === 'THU';

                          return (
                            <div key={tx.id} className="relative overflow-hidden">
                              <motion.div
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setDetailTx(tx)}
                                className={`no-swipe flex items-center justify-between px-4 py-3 cursor-pointer bg-white relative z-20 ${i < txs.length - 1 ? 'border-b border-gray-50' : ''
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                                    }`}>
                                    <Icon size={16} strokeWidth={1.7} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-[13px] font-medium leading-tight truncate max-w-[170px] ${tx.status === 'PENDING' ? 'text-gray-500 italic' : 'text-gray-800'
                                      }`}>
                                      {isAdmin && tx.user?.name && <span className="font-bold text-blue-600 mr-1">{tx.user.name}:</span>}
                                      {tx.isEditRequest && <span className="text-purple-500 font-bold mr-1">[SỬA]</span>}
                                      {tx.customerName ? `Khách hàng: ${tx.customerName}` : (tx.transferContent || categoryLabels[tx.category] || tx.category)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {tx.note ? (
                                        <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{tx.note}</p>
                                      ) : tx.transferContent ? (
                                        <p className="text-[10px] text-gray-400">
                                          {categoryLabels[tx.category] || tx.category}
                                        </p>
                                      ) : null}
                                      {tx.status === 'PENDING' && (
                                        <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                                          Chờ duyệt
                                        </span>
                                      )}
                                      {tx.qrCodeUrl && (
                                        <a href={tx.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                                          <QrCode size={14} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[13px] font-semibold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-500'
                                  }`}>
                                  {isIncome ? '+' : '-'}{formatFullCurrency(tx.amount)}
                                </span>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </>
            )}
          </div>
        </motion.div>

        <div className="h-4" />
      </motion.div>

      {/* ═══ FAB ═══ */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => { setEditingTx(null); setFormOpen(true); }}
        className="fixed bottom-20 right-4 z-40 w-13 h-13 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg shadow-blue-300/40 flex items-center justify-center"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      {/* ═══ FORM ═══ */}
      <TransactionForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingTx(null); }}
        onSave={handleSave}
        editData={editingTx}
      />

      {/* ═══ DELETE CONFIRM ═══ */}
      <AnimatePresence>
        {confirmDeleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteId(null)}
              className="fixed inset-0 bg-black/40 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl p-6"
            >
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                  <Trash2 size={24} className="text-red-500" />
                </div>
              </div>
              <h3 className="text-base font-bold text-center text-gray-900 mb-1">Xóa giao dịch này?</h3>
              <p className="text-sm text-gray-500 text-center mb-5">Hành động này không thể hoàn tác</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-sm font-semibold text-gray-700"
                >
                  Huỷ
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500 text-sm font-semibold text-white"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MODAL THÔNG BÁO DUYỆT CHI (Giữa màn hình, cho Nhân viên) ═══ */}
      <AnimatePresence>
        {approvalModal && (
          <motion.div
            key="approval-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
            onClick={() => setApprovalModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl mx-6 p-8 text-center max-w-sm w-full relative overflow-hidden"
            >
              {/* Hiệu ứng nền gradient mờ */}
              <div className={`absolute inset-0 opacity-10 ${approvalModal.type === 'success'
                ? 'bg-gradient-to-br from-emerald-400 to-green-300'
                : 'bg-gradient-to-br from-red-400 to-orange-300'
                }`} />

              {/* Icon tích xanh / X đỏ - có animation vẽ đường tròn + tích */}
              <div className="relative mx-auto mb-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' as const, stiffness: 300, damping: 15, delay: 0.1 }}
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${approvalModal.type === 'success'
                    ? 'bg-emerald-100'
                    : 'bg-red-100'
                    }`}
                >
                  {approvalModal.type === 'success' ? (
                    <svg className="w-10 h-10" viewBox="0 0 52 52">
                      <motion.circle
                        cx="26" cy="26" r="23"
                        fill="none" stroke="#10b981" strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                      <motion.path
                        fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                        d="M14 27l8 8 16-16"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                      />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10" viewBox="0 0 52 52">
                      <motion.circle
                        cx="26" cy="26" r="23"
                        fill="none" stroke="#ef4444" strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                      <motion.path
                        fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
                        d="M18 18l16 16"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                      />
                      <motion.path
                        fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
                        d="M34 18l-16 16"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, delay: 0.65 }}
                      />
                    </svg>
                  )}
                </motion.div>

                {/* Vòng tròn tỏa sáng */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={`absolute inset-0 mx-auto w-20 h-20 rounded-full ${approvalModal.type === 'success' ? 'bg-emerald-200' : 'bg-red-200'
                    }`}
                />
              </div>

              {/* Tiêu đề */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className={`text-xl font-bold relative ${approvalModal.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                  }`}
              >
                {approvalModal.message}
              </motion.h3>

              {/* Mô tả giao dịch */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="relative mt-3 space-y-1"
              >
                <p className="text-gray-500 text-sm">{approvalModal.description}</p>
                <p className={`text-2xl font-extrabold ${approvalModal.type === 'success' ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                  {formatFullCurrency(approvalModal.amount)}
                </p>
              </motion.div>

              {/* Thanh tiến trình tự đóng */}
              <motion.div className="relative mt-6 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                  className={`h-full rounded-full ${approvalModal.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                />
              </motion.div>
              <p className="text-[11px] text-gray-400 mt-2 relative">Bấm vào để đóng</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ REJECT REASON MODAL ═══ */}
      <AnimatePresence>
        {rejectPromptId && (
          <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[15vh] sm:items-center sm:pt-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectPromptId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                  <XCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Từ chối giao dịch</h3>
                <p className="text-sm text-gray-500 mb-4">Vui lòng cung cấp lý do từ chối để nhân viên biết cách khắc phục.</p>
                <textarea
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 min-h-[100px] resize-none"
                  placeholder="Nhập vào lí do từ chối..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                  }}
                />
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setRejectPromptId(null)}
                  className="flex-1 py-3 font-bold text-gray-600 bg-white rounded-xl border border-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmReject}
                  className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ HISTORY MODAL ═══ */}
      <AnimatePresence>
        {showAllHistory && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 z-[90] bg-gray-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-white shadow-sm shrink-0 border-b relative z-10">
              <div className="flex items-center gap-3 p-4 pb-2">
                <button onClick={() => setShowAllHistory(false)} className="w-9 h-9 flex items-center justify-center bg-gray-50 text-gray-600 rounded-full active:bg-gray-200 transition-colors shrink-0">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold text-gray-800 flex-1 truncate">Lịch sử giao dịch</h2>
                {isAdmin && (
                  <select
                    value={historyFilterUser}
                    onChange={(e) => setHistoryFilterUser(e.target.value)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-semibold outline-none focus:ring-2 ring-blue-200 max-w-[120px] truncate"
                  >
                    <option value="all">Tất cả NV</option>
                    {Array.from(new Map(transactions.filter(t => t.user).map(t => [t.user!.id, t.user])).values()).map(u => (
                      <option key={u!.id} value={u!.id}>{u!.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Filter Bar */}
              <div className="px-4 pb-4">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 relative">
                  <div className="absolute left-3 text-gray-400 pointer-events-none">
                    <Calendar size={14} />
                  </div>
                  <input
                    type="date"
                    value={historyFilterStartDate}
                    onChange={(e) => setHistoryFilterStartDate(e.target.value)}
                    className="flex-1 bg-transparent px-2 py-2 pl-8 text-xs font-medium text-gray-700 outline-none"
                  />
                  <div className="w-[1px] h-4 bg-gray-300 mx-1 shrink-0" />
                  <input
                    type="date"
                    value={historyFilterEndDate}
                    onChange={(e) => setHistoryFilterEndDate(e.target.value)}
                    className="flex-1 bg-transparent px-2 py-2 text-xs font-medium text-gray-700 outline-none pr-2"
                  />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
              <div className="bg-white rounded-2xl shadow-[var(--card-shadow)] border border-gray-100/60 overflow-hidden">
                {(() => {
                  let filteredTransactions = transactions;
                  if (historyFilterStartDate) {
                    filteredTransactions = filteredTransactions.filter(tx => tx.date.split('T')[0] >= historyFilterStartDate);
                  }
                  if (historyFilterEndDate) {
                    filteredTransactions = filteredTransactions.filter(tx => tx.date.split('T')[0] <= historyFilterEndDate);
                  }
                  if (historyFilterUser !== 'all') {
                    filteredTransactions = filteredTransactions.filter(tx => tx.user?.id === historyFilterUser);
                  }

                  if (filteredTransactions.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <p className="text-sm text-gray-500">Chưa có giao dịch nào trong ngày này</p>
                      </div>
                    );
                  }

                  const grouped: Record<string, Transaction[]> = {};
                  filteredTransactions.forEach(tx => {
                    const dateKey = tx.date.split('T')[0];
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(tx);
                  });

                  const sortedDateKeys = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                  return sortedDateKeys.map((dateKey, gi) => {
                    const txs = grouped[dateKey];
                    const dateObj = new Date(dateKey);
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const txDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                    const diffDays = Math.floor((today.getTime() - txDay.getTime()) / (1000 * 60 * 60 * 24));
                    let dateLabel = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                    if (diffDays === 0) dateLabel = 'Hôm nay';
                    else if (diffDays === 1) dateLabel = 'Hôm qua';

                    return (
                      <div key={dateKey}>
                        <div className={`flex items-center justify-between px-4 py-2 bg-gray-50/80 ${gi > 0 ? 'border-t border-gray-100' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            <span className="text-[11px] font-medium text-gray-500 capitalize">{dateLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const dayThu = txs.filter(t => t.type === 'THU' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
                              const dayChi = txs.filter(t => t.type === 'CHI' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);
                              return (
                                <>
                                  {dayThu > 0 && <span className="text-[10px] font-medium text-green-600">+{formatCurrency(dayThu)}</span>}
                                  {dayChi > 0 && <span className="text-[10px] font-medium text-red-500">-{formatCurrency(dayChi)}</span>}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {txs.map((tx, i) => {
                          const Icon = categoryIcons[tx.category] || HelpCircle;
                          const isIncome = tx.type === 'THU';

                          return (
                            <div key={tx.id} className="relative overflow-hidden">
                              <motion.div
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setDetailTx(tx)}
                                className={`no-swipe flex items-center justify-between px-4 py-3 cursor-pointer bg-white relative z-20 ${i < txs.length - 1 ? 'border-b border-gray-50' : ''
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                                    }`}>
                                    <Icon size={16} strokeWidth={1.7} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-[13px] font-medium leading-tight truncate max-w-[170px] ${tx.status === 'PENDING' ? 'text-gray-500 italic' : 'text-gray-800'
                                      }`}>
                                      {tx.user?.name && <span className="font-bold text-blue-600 mr-1">{tx.user.name}:</span>}
                                      {tx.isEditRequest && <span className="text-purple-500 font-bold mr-1">[SỬA]</span>}
                                      {tx.customerName ? `Khách hàng: ${tx.customerName}` : (tx.transferContent || categoryLabels[tx.category] || tx.category)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-[10px] text-gray-400">
                                        {categoryLabels[tx.category] || tx.category} · {new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                      {isAdmin && tx.user && (
                                        <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 truncate max-w-[80px]">
                                          {tx.user.name}
                                        </span>
                                      )}
                                      {tx.status === 'PENDING' && (
                                        <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                                          Chờ duyệt
                                        </span>
                                      )}
                                      {tx.qrCodeUrl && (
                                        <a href={tx.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                                          <QrCode size={14} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[13px] font-semibold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-500'
                                  }`}>
                                  {isIncome ? '+' : '-'}{formatFullCurrency(tx.amount)}
                                </span>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {detailTx && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setDetailTx(null)}
              className="fixed inset-0 bg-black/60 z-[100]"
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-gray-50 pt-6 pb-5 px-6 flex flex-col items-center border-b border-gray-100 relative shrink-0">
                  <button
                    onClick={() => setDetailTx(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm"
                  >
                    <X size={18} />
                  </button>
                  <div className={`w-12 h-12 rounded-[0.8rem] flex items-center justify-center mb-2.5 ${detailTx.type === 'THU' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                    }`}>
                    {detailTx.type === 'THU' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <h3 className="text-sm font-medium text-gray-500 mb-0.5">{categoryLabels[detailTx.category] || detailTx.category}</h3>
                  <p className={`text-[28px] font-bold ${detailTx.type === 'THU' ? 'text-green-600' : 'text-red-500'}`}>
                    {detailTx.type === 'THU' ? '+' : '-'}{formatFullCurrency(detailTx.amount)}
                  </p>
                  {detailTx.status === 'PENDING' && (
                    <span className="mt-3 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">Chờ Duyệt</span>
                  )}
                </div>

                <div className="px-5 py-4 space-y-4 overflow-y-auto min-h-[100px]">
                  {(detailTx.bankName || detailTx.accountNumber || detailTx.accountOwner || detailTx.accountInfo || detailTx.customerName) && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Tài Khoản / Khách Hàng</p>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                        {detailTx.customerName && <p className="text-sm font-semibold text-gray-800 break-words"><span className="text-gray-500 font-normal mr-1">Khách hàng:</span>{detailTx.customerName}</p>}
                        {detailTx.bankName && <p className="text-sm font-semibold text-gray-800 break-words"><span className="text-gray-500 font-normal mr-1">Ngân hàng:</span>{detailTx.bankName}</p>}
                        {detailTx.accountNumber && <p className="text-sm font-semibold text-gray-800 break-words"><span className="text-gray-500 font-normal mr-1">STK:</span>{detailTx.accountNumber}</p>}
                        {detailTx.accountOwner && <p className="text-sm font-semibold text-gray-800 break-words"><span className="text-gray-500 font-normal mr-1">Chủ TK:</span>{detailTx.accountOwner}</p>}
                        {detailTx.accountInfo && !detailTx.bankName && !detailTx.accountNumber && !detailTx.accountOwner && <p className="text-sm font-semibold text-gray-800 break-words">{detailTx.accountInfo}</p>}
                      </div>
                    </div>
                  )}
                  {detailTx.transferContent && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Nội Dung Chuyển Khoản</p>
                      <p className="text-sm font-semibold text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100 break-words">{detailTx.transferContent}</p>
                    </div>
                  )}
                  {detailTx.note && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Ghi Chú</p>
                      <p className="text-sm font-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 break-words">{detailTx.note}</p>
                    </div>
                  )}
                  {detailTx.qrCodeUrl && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-2">Mã QR</p>
                      <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={detailTx.qrCodeUrl} alt="QR" className="w-full h-auto max-h-64 object-contain mix-blend-multiply" />
                      </div>
                    </div>
                  )}

                  {detailTx.status !== 'PENDING' && detailTx.bankAccountId && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">Nguồn Tiền Giao Dịch</p>
                      <p className="text-sm font-semibold text-[var(--primary)] bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                        <Wallet size={16} />
                        {bankAccounts.find(a => a.id === detailTx.bankAccountId)?.name || 'Tài khoản không xác định'}
                      </p>
                    </div>
                  )}

                  <div className="flex items-end justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <span>Tạo lúc: <span className="font-medium text-gray-600">{new Date(detailTx.date).toLocaleDateString('vi-VN')}</span></span>
                      {detailTx.user && <span>Người tạo: <span className="font-semibold text-gray-600">{detailTx.user.name}</span></span>}
                    </div>
                    {detailTx.status === 'APPROVED' && (
                      <span className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200/50 shadow-sm leading-none">
                        Đã duyệt
                      </span>
                    )}
                    {detailTx.status === 'REJECTED' && (
                      <span className="px-2.5 py-1.5 bg-red-100 text-red-700 font-bold rounded-lg border border-red-200/50 shadow-sm leading-none">
                        Từ chối
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3 shrink-0">
                  {isAdmin && detailTx.status === 'PENDING' ? (
                    <>
                      {bankAccounts.length > 0 && (
                        <div className={`mb-3 p-3 rounded-2xl border ${detailTx.type === 'THU' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                          <label className={`text-xs font-bold uppercase block mb-2 flex items-center gap-1.5 ${detailTx.type === 'THU' ? 'text-emerald-700' : 'text-red-700'}`}>
                            <Wallet size={14} />
                            {detailTx.type === 'THU' ? 'Cộng tiền vào' : 'Trừ tiền từ'}
                          </label>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedBankAccountId('')}
                              className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between transition-colors text-sm font-medium ${
                                !selectedBankAccountId 
                                  ? (detailTx.type === 'THU' ? 'bg-emerald-100 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' : 'bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500')
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>-- Chọn tài khoản --</span>
                              {!selectedBankAccountId && <Check size={16} className={detailTx.type === 'THU' ? 'text-emerald-600' : 'text-red-600'} />}
                            </button>
                            {bankAccounts.map(acc => {
                              const isSelected = selectedBankAccountId === acc.id;
                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => setSelectedBankAccountId(acc.id)}
                                  className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between transition-colors text-sm ${
                                    isSelected 
                                      ? (detailTx.type === 'THU' ? 'bg-emerald-100 border-emerald-500 ring-1 ring-emerald-500' : 'bg-red-100 border-red-500 ring-1 ring-red-500')
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className={`font-semibold ${isSelected ? (detailTx.type === 'THU' ? 'text-emerald-900' : 'text-red-900') : 'text-gray-900'}`}>{acc.name}</span>
                                    <span className={`text-[11px] ${isSelected ? (detailTx.type === 'THU' ? 'text-emerald-700' : 'text-red-700') : 'text-gray-500'}`}>
                                      Dư: {formatFullCurrency(acc.balance)}
                                    </span>
                                  </div>
                                  {isSelected && <Check size={16} className={detailTx.type === 'THU' ? 'text-emerald-600' : 'text-red-600'} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={async (e) => {
                            if (bankAccounts.length > 0 && !selectedBankAccountId) {
                              alert('Vui lòng chọn tài khoản nguồn!');
                              return;
                            }
                            const success = await handleApprove(detailTx.id, e, selectedBankAccountId);
                            if (success) setDetailTx(null);
                          }}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-sm"
                        >
                          <Check size={18} /> Duyệt Chi
                        </button>
                        <button
                          onClick={(e) => handleRejectClick(detailTx.id, e)}
                          className="w-[4.5rem] bg-red-50 hover:bg-red-100 text-red-500 py-3.5 rounded-xl flex justify-center items-center transition-colors border border-red-100 shrink-0"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setDetailTx(null); setShowAllHistory(false); handleEdit(detailTx); }}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors border border-blue-100 shadow-sm"
                      >
                        <Pencil size={18} /> {isAdmin ? 'Sửa' : 'Đề xuất sửa'}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { setDetailTx(null); setConfirmDeleteId(detailTx.id); }}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors border border-red-100 shadow-sm"
                        >
                          <Trash2 size={18} /> Xóa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
