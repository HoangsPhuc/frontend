'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ShoppingCart,
  Truck,
  Fuel,
  Coffee,
  Wrench,
  HelpCircle,
  CalendarDays,
  FileText,
  MessageSquare,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wallet,
  AlertCircle
} from 'lucide-react';

export interface TransactionData {
  id?: string;
  type: 'THU' | 'CHI';
  category: string;
  amount: string;
  transferContent: string;
  accountInfo: string;
  bankName: string;
  accountNumber: string;
  accountOwner: string;
  bankAccountId?: string;
  qrCodeUrl: string;
  note: string;
  date: string;
  isEditRequest?: boolean;
  originalTransactionId?: string;
}

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionData) => Promise<void>;
  editData?: TransactionData | null;
}

const categories = {
  THU: [
    { value: 'ban_hang', label: 'Bán Hàng', icon: ShoppingCart, color: 'text-emerald-600', activeColor: 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-1 ring-emerald-500' },
    { value: 'thu_no', label: 'Thu Nợ', icon: ArrowDownCircle, color: 'text-blue-600', activeColor: 'bg-blue-50 text-blue-700 border-blue-500 ring-1 ring-blue-500' },
    { value: 'thu_khac', label: 'Thu Khác', icon: Banknote, color: 'text-teal-600', activeColor: 'bg-teal-50 text-teal-700 border-teal-500 ring-1 ring-teal-500' },
  ],
  CHI: [
    { value: 'tien_xang', label: 'Tiền Xăng', icon: Fuel, color: 'text-orange-600', activeColor: 'bg-orange-50 text-orange-700 border-orange-500 ring-1 ring-orange-500' },
    { value: 'vat_tu', label: 'Vật Tư', icon: Wrench, color: 'text-gray-600', activeColor: 'bg-gray-100 text-gray-800 border-gray-600 ring-1 ring-gray-600' },
    { value: 'chi_khac', label: 'Khác', icon: HelpCircle, color: 'text-purple-600', activeColor: 'bg-purple-50 text-purple-700 border-purple-500 ring-1 ring-purple-500' },
  ],
};

const categoryLabels: Record<string, string> = {
  ban_hang: 'Bán Hàng', thu_no: 'Thu Nợ', thu_khac: 'Thu Khác',
  tien_xang: 'Tiền Xăng', vat_tu: 'Vật Tư', chi_khac: 'Khác',
};

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatCurrency(val: string) {
  const num = parseInt(val.replace(/\D/g, ''));
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('vi-VN');
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -100 : 100, opacity: 0 }),
};

export default function TransactionForm({
  isOpen,
  onClose,
  onSave,
  editData,
}: TransactionFormProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [type, setType] = useState<'THU' | 'CHI'>('CHI');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [transferContent, setTransferContent] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bankError, setBankError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editData?.id;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const totalSteps = 4; // 0: Type+Category, 1: Amount, 2: Account+TransferInfo+Date+Note, 3: Review

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setType(editData.type);
        const predefinedValues = categories[editData.type].map(c => c.value);
        if (predefinedValues.includes(editData.category)) {
          setCategory(editData.category);
          setCustomCategory('');
        } else {
          setCategory(editData.type === 'THU' ? 'thu_khac' : 'chi_khac');
          setCustomCategory(editData.category);
        }
        const parsedAmount = parseInt(String(editData.amount).replace(/\D/g, ''), 10);
        setAmount(!isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount.toLocaleString('vi-VN') : '');
        setTransferContent(editData.transferContent || '');
        setAccountInfo(editData.accountInfo || '');
        setBankName(editData.bankName || '');
        setAccountNumber(editData.accountNumber || '');
        setAccountOwner(editData.accountOwner || '');
        setBankAccountId(editData.bankAccountId || '');
        setQrCodeUrl(editData.qrCodeUrl || '');
        setNote(editData.note || '');
        setDate(editData.date || getTodayString());
        setStep(0);
      } else {
        setType('CHI');
        setCategory('');
        setCustomCategory('');
        setAmount('');
        setTransferContent('');
        setAccountInfo('');
        setBankName('');
        setAccountNumber('');
        setAccountOwner('');
        setBankAccountId('');
        setQrCodeUrl('');
        setNote('');
        setDate(getTodayString());
        setStep(0);
      }
      setDirection(1);
      setShowSuccess(false);

      if (isAdmin) {
        fetch('/api/bank-accounts')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setBankAccounts(data);
          })
          .catch(console.error);
      }
    }
  }, [editData, isOpen, isAdmin]);

  // Auto-focus amount input when entering step 1
  useEffect(() => {
    if (step === 1 && amountRef.current) {
      setTimeout(() => amountRef.current?.focus(), 10);
    }
    if (step === 2 && descRef.current) {
      setTimeout(() => descRef.current?.focus(), 10);
    }
  }, [step]);

  // Scroll focused input into view when virtual keyboard opens
  const scrollToFocused = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const goNext = () => {
    if (step === 2) {
      const bName = bankName.trim();
      const aNum = accountNumber.trim();
      const aOwner = accountOwner.trim();

      const hasAnyBankField = !!(bName || aNum || aOwner);
      const hasAllBankFields = !!(bName && aNum && aOwner);
      const hasQR = !!qrCodeUrl;

      if (hasAnyBankField && !hasAllBankFields) {
        setBankError('Vui lòng nhập đầy đủ Tên ngân hàng, Số tài khoản và Chủ tài khoản.');
        return;
      }
      setBankError('');

      if (!isAdmin && type === 'CHI' && !hasAllBankFields && !hasQR) {
        setErrorMsg('Vui lòng nhập đủ thông tin Ngân hàng HOẶC tải ảnh Mã QR để Quản trị viên thanh toán!');
        return;
      }
    }
    setErrorMsg('');
    setBankError('');
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!category && (category === 'thu_khac' || category === 'chi_khac' ? !!customCategory.trim() : true);
      case 1: return !!amount && parseInt(amount.replace(/\D/g, ''), 10) > 0;
      case 2: return !!date && !uploadingQr; // Require date and wait for QR upload
      case 3: return true;
      default: return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.success) {
        setQrCodeUrl(data.url);
      } else {
        alert('Lỗi tải ảnh: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tải ảnh lên');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSubmit = async () => {
    const rawAmount = amount.replace(/\D/g, '');
    if (!category || !rawAmount || parseInt(rawAmount, 10) <= 0 || !date) return;
    const finalCategory = (category === 'thu_khac' || category === 'chi_khac') && customCategory.trim()
      ? customCategory.trim()
      : category;
    setSaving(true);
    try {
      await onSave({
        id: editData?.id,
        type,
        category: finalCategory,
        amount: rawAmount,
        transferContent,
        accountInfo,
        bankName,
        accountNumber,
        accountOwner,
        bankAccountId,
        qrCodeUrl,
        note,
        date,
        isEditRequest: editData?.isEditRequest,
        originalTransactionId: editData?.originalTransactionId
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (!raw) setAmount('');
    else setAmount(parseInt(raw, 10).toLocaleString('vi-VN'));
  };

  const currentCategories = categories[type];

  const stepTitles = [
    'Chọn loại giao dịch',
    'Nhập số tiền',
    'Thông tin chi tiết',
    'Xác nhận',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />

          {/* Full-screen Bottom Sheet / Centered Modal on Desktop */}
          <motion.div
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="no-swipe fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl flex flex-col h-[92vh] md:h-auto md:max-h-[90vh] md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-3xl shadow-2xl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div className="flex items-center gap-3">
                {step > 0 ? (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={goBack}
                    className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
                  >
                    <ChevronLeft size={18} className="text-gray-600" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
                  >
                    <X size={18} className="text-gray-500" />
                  </motion.button>
                )}
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {isEditing ? 'Sửa Giao Dịch' : stepTitles[step]}
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Bước {step + 1} / {totalSteps}
                  </p>
                </div>
              </div>
              {step > 0 && step < totalSteps - 1 && (
                <button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="text-sm font-semibold text-[var(--primary)] disabled:text-gray-300"
                >
                  Tiếp →
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="px-5 shrink-0">
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] rounded-full"
                  animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
            </div>

            {/* Content — slides */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence custom={direction}>
                {/* ═══ STEP 0: Type + Category ═══ */}
                {step === 0 && (
                  <motion.div
                    key="step-0"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 px-5 pt-6 overflow-y-auto pb-44 md:pb-6 md:relative md:inset-auto"
                  >
                    {/* Type Toggle */}
                    {/* Type Toggle */}
                    {isAdmin ? (
                      <div className="relative bg-gray-100 rounded-2xl p-1.5 flex mb-8">
                        <motion.div
                          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl shadow-md ${type === 'THU' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          animate={{ x: type === 'THU' ? 0 : '100%' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          style={{ left: '3px' }}
                        />
                        <button
                          onClick={() => { setType('THU'); setCategory(''); }}
                          className={`relative z-10 flex-1 py-3.5 rounded-xl text-sm font-bold transition-colors ${type === 'THU' ? 'text-white' : 'text-gray-600'
                            }`}
                        >
                          <span className="flex items-center justify-center gap-2">
                            <ArrowDownCircle size={18} />
                            Thu Tiền
                          </span>
                        </button>
                        <button
                          onClick={() => { setType('CHI'); setCategory(''); }}
                          className={`relative z-10 flex-1 py-3.5 rounded-xl text-sm font-bold transition-colors ${type === 'CHI' ? 'text-white' : 'text-gray-600'
                            }`}
                        >
                          <span className="flex items-center justify-center gap-2">
                            <ArrowUpCircle size={18} />
                            Chi Tiền
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 flex items-center justify-center gap-2 border border-red-100 shadow-sm">
                        <ArrowUpCircle size={20} />
                        <span className="font-bold">Tạo Phiếu Chi Tiền</span>
                      </div>
                    )}

                    {/* Categories */}
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Danh mục
                    </p>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={type}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="grid grid-cols-2 gap-3"
                      >
                        {currentCategories.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = category === cat.value;
                        return (
                          <motion.button
                            key={cat.value}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCategory(cat.value)}
                            className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 after:absolute after:inset-0 after:bg-black/5 after:opacity-0 active:after:opacity-100 after:transition-opacity after:duration-200 ${
                              isSelected 
                                ? cat.activeColor + ' shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-white shadow-sm ' + cat.color : 'bg-gray-100 text-gray-400'
                              }`}>
                              <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} />
                            </div>
                            <span className={`text-sm font-bold ${isSelected ? cat.color : 'text-gray-700'}`}>{cat.label}</span>

                            {/* Dấu check nhỏ góc trên nếu được chọn */}
                            {isSelected && (
                              <div className="absolute top-3 right-3 text-emerald-500">
                                <Check size={18} strokeWidth={3} />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                      </motion.div>
                    </AnimatePresence>

                    {/* Input cho Danh mục Khác */}
                    <AnimatePresence>
                      {(category === 'thu_khac' || category === 'chi_khac') && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Nhập tên danh mục <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Nhập tên chi tiêu..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            autoFocus
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ═══ STEP 1: Amount ═══ */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 px-5 pt-6 flex flex-col pb-44 md:pb-6 md:relative md:inset-auto md:min-h-[400px]"
                  >
                    {/* Big amount display */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${type === 'THU' ? 'bg-emerald-50' : 'bg-red-50'
                        }`}>
                        <Banknote size={28} className={type === 'THU' ? 'text-emerald-500' : 'text-red-500'} />
                      </div>
                      <p className="text-sm text-gray-400 mb-4 font-medium">
                        {type === 'THU' ? 'Nhập số tiền thu' : 'Nhập số tiền chi'}
                      </p>
                      <div className="relative w-full max-w-xs">
                        <input
                          ref={amountRef}
                          type="text"
                          inputMode="numeric"
                          value={amount ? formatCurrency(amount) : ''}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          onFocus={scrollToFocused}
                          placeholder="0"
                          className={`text-center text-4xl font-bold bg-transparent outline-none w-full placeholder:text-gray-200 ${type === 'THU' ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          style={{ caretColor: type === 'THU' ? '#059669' : '#ef4444' }}
                        />
                        <div className="text-center mt-2">
                          <span className="text-base text-gray-300 font-medium">VNĐ</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ═══ STEP 2: Account + Content + Date + Note ═══ */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 px-5 pt-6 overflow-y-auto pb-44 md:pb-6 md:relative md:inset-auto md:max-h-[70vh]"
                  >
                    <div className="space-y-5">
                      {/* 1. Nguồn tiền hệ thống (Ví của mình) */}
                      {isAdmin && bankAccounts.length > 0 && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                          <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <Wallet size={14} />
                            Nguồn Tiền Hệ Thống
                          </label>
                          <select
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border-2 border-blue-200/50 bg-white text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                          >
                            <option value="">-- Tự động / Chọn sau --</option>
                            {bankAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name} (Dư: {acc.balance?.toLocaleString('vi-VN')}đ)</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 2. Thông tin ngân hàng đối tác */}
                      <div className={`bg-gray-50 border rounded-2xl p-4 transition-colors ${bankError ? 'border-red-300' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Banknote size={14} />
                            Ngân Hàng Đối Tác <span className="text-gray-400 font-normal normal-case">(tuỳ chọn)</span>
                          </label>
                        </div>
                        {bankError && (
                          <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-[13px] font-medium rounded-xl flex items-start gap-2 border border-red-100">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{bankError}</span>
                          </div>
                        )}
                        <div className="space-y-3">
                          <input
                            ref={descRef}
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            onFocus={scrollToFocused}
                            placeholder="Tên Ngân Hàng (VD: Vietcombank)"
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
                          />
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            onFocus={scrollToFocused}
                            placeholder="Số Tài Khoản (VD: 0123456789)"
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
                          />
                          <input
                            type="text"
                            value={accountOwner}
                            onChange={(e) => setAccountOwner(e.target.value)}
                            onFocus={scrollToFocused}
                            placeholder="Tên Chủ Tài Khoản (VD: NGUYEN VAN A)"
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* 3. QR Code */}
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            Mã QR Thanh Toán
                          </label>
                          <label className="text-[11px] font-semibold text-blue-600 bg-blue-100/50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1">
                            {uploadingQr ? <Loader2 size={12} className="animate-spin" /> : null}
                            {uploadingQr ? 'Đang tải...' : 'Tải ảnh lên'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingQr} />
                          </label>
                        </div>

                        {qrCodeUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white p-2 mt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrCodeUrl} alt="QR Code" className="w-full h-40 object-contain rounded-lg" />
                            <button
                              onClick={() => setQrCodeUrl('')}
                              className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-md transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-white/50">
                            <span className="text-xs">Chưa có ảnh QR</span>
                          </div>
                        )}
                      </div>

                      {/* Transfer Content */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText size={12} />
                          Nội Dung Chuyển Khoản <span className="text-gray-300 font-normal normal-case">(tuỳ chọn)</span>
                        </label>
                        <input
                          type="text"
                          value={transferContent}
                          onChange={(e) => setTransferContent(e.target.value)}
                          onFocus={scrollToFocused}
                          placeholder="VD: Tra tien nhap hang"
                          className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-300"
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CalendarDays size={12} />
                          Ngày Giao Dịch
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        />
                      </div>

                      {/* Note */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <MessageSquare size={12} />
                          Ghi Chú <span className="text-gray-300 font-normal normal-case">(tuỳ chọn)</span>
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          onFocus={scrollToFocused}
                          placeholder="Ghi chú thêm nếu cần..."
                          rows={3}
                          className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50/50 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ═══ STEP 3: Review ═══ */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 px-5 pt-6 pb-44 md:pb-6 md:relative md:inset-auto md:max-h-[70vh] overflow-y-auto"
                  >
                    <div className="flex flex-col items-center">
                      {/* Big icon */}
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${type === 'THU' ? 'bg-emerald-50' : 'bg-red-50'
                          }`}
                      >
                        {type === 'THU' ? (
                          <ArrowDownCircle size={36} className="text-emerald-500" />
                        ) : (
                          <ArrowUpCircle size={36} className="text-red-500" />
                        )}
                      </motion.div>

                      <p className="text-sm text-gray-400 mb-1">
                        {type === 'THU' ? 'Thu tiền' : 'Chi tiền'}
                      </p>
                      <p className={`text-3xl font-bold mb-6 ${type === 'THU' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                        {type === 'THU' ? '+' : '-'}{formatCurrency(amount)} đ
                      </p>

                      {/* Info card */}
                      <div className="w-full bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                          <span className="text-sm text-gray-400">Danh mục</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {(category === 'thu_khac' || category === 'chi_khac') && customCategory.trim()
                              ? customCategory.trim()
                              : (categoryLabels[category] || category)}
                          </span>
                        </div>
                        {isAdmin && bankAccountId && (
                          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                            <span className="text-sm text-gray-400">Nguồn tiền</span>
                            <span className="text-sm font-semibold text-blue-700 text-right max-w-[60%] truncate">
                              {bankAccounts.find(a => a.id === bankAccountId)?.name || 'Hệ thống'}
                            </span>
                          </div>
                        )}
                        {(bankName || accountNumber || accountOwner) && (
                          <div className="flex items-start justify-between px-4 py-3.5 border-b border-gray-100">
                            <span className="text-sm text-gray-400 mt-0.5">Tài khoản</span>
                            <div className="text-sm font-semibold text-gray-800 text-right flex flex-col">
                              {bankName && <span>{bankName}</span>}
                              {accountNumber && <span>{accountNumber}</span>}
                              {accountOwner && <span>{accountOwner}</span>}
                            </div>
                          </div>
                        )}
                        {!bankName && !accountNumber && !accountOwner && accountInfo && (
                          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                            <span className="text-sm text-gray-400">Tài khoản</span>
                            <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{accountInfo}</span>
                          </div>
                        )}
                        {qrCodeUrl && (
                          <div className="flex flex-col px-4 py-3.5 border-b border-gray-100">
                            <span className="text-sm text-gray-400 mb-2">Ảnh QR</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrCodeUrl} alt="QR Code" className="w-full max-h-32 object-contain bg-white rounded-lg border border-gray-200" />
                          </div>
                        )}
                        {transferContent && (
                          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                            <span className="text-sm text-gray-400">Nội dung CK</span>
                            <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{transferContent}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                          <span className="text-sm text-gray-400">Ngày</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {date ? new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa chọn'}
                          </span>
                        </div>
                        {note && (
                          <div className="flex items-center justify-between px-4 py-3.5">
                            <span className="text-sm text-gray-400">Ghi chú</span>
                            <span className="text-sm text-gray-600 text-right max-w-[60%]">{note}</span>
                          </div>
                        )}
                      </div>

                      {/* Pending approval notice for STAFF */}
                      {!isAdmin && !isEditing && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="w-full mt-5 bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3"
                        >
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                            <Clock size={20} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-800">Chờ xác nhận thanh toán</p>
                            <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                              Giao dịch sẽ được gửi đến Quản lý để duyệt trước khi được tính vào sổ sách. Bạn sẽ nhận được thông báo khi được xác nhận.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom action bar — always visible */}
            <div className="shrink-0 px-5 py-4 pb-safe border-t border-gray-100 bg-white md:rounded-b-3xl">
              {step < totalSteps - 1 ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={goNext}
                  disabled={!canProceed()}
                  className={`w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 ${canProceed()
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg shadow-blue-200/50'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Tiếp tục
                  <ChevronRight size={18} />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : showSuccess ? (
                    <>
                      <Check size={20} />
                      {isAdmin ? 'Đã Lưu!' : 'Đã gửi yêu cầu!'}
                    </>
                  ) : (
                    <>
                      {!isAdmin && !isEditing ? (
                        <>
                          <Clock size={18} />
                          Gửi yêu cầu duyệt
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          {isEditing ? 'Cập Nhật' : 'Xác Nhận Lưu'}
                        </>
                      )}
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Central Error Modal */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-red-100 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Thiếu thông tin</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">
                    {errorMsg}
                  </p>
                  <button
                    onClick={() => setErrorMsg('')}
                    className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors"
                  >
                    Đã hiểu
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
