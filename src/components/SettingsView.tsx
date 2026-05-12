'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Info,
  Smartphone,
  Shield,
  ChevronRight,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
};

export default function SettingsView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushTestStatus, setPushTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pushTestMessage, setPushTestMessage] = useState('');

  // Đọc trạng thái hiện tại
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    const savedSound = localStorage.getItem('notification_sound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
        });
      }
      
      if (subscription) {
        // Luôn gửi lên server để đảm bảo DB có subscription mới nhất
        const res = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
        if (!res.ok) {
          console.error('[Push] Failed to save subscription:', await res.text());
        }
      }
    } catch (e: any) {
      console.error('[Push] Failed to subscribe:', e);
      alert('Lỗi đăng ký thông báo: ' + (e.message || e));
    }
  };

  const handleToggleNotification = async () => {
    if (!('Notification' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ thông báo.');
      return;
    }

    if (notifPermission === 'granted') {
      alert(
        'Để tắt thông báo, bạn cần vào:\n\n' +
        '📱 Android: Cài đặt > Ứng dụng > Trình duyệt > Thông báo\n' +
        '💻 Chrome: Bấm biểu tượng ổ khóa 🔒 trên thanh địa chỉ > Thông báo > Chặn'
      );
    } else {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        await subscribeToPush();
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
             reg.showNotification('✅ Thông báo đã được bật!', {
               body: 'Bạn sẽ nhận được thông báo khi có đơn mới cần duyệt.',
               icon: '/logo.jpg',
             });
          });
        }
      }
    }
  };

  const handleToggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('notification_sound', String(newVal));
    // Dispatch event để DashboardView lắng nghe
    window.dispatchEvent(new CustomEvent('sound_setting_changed', { detail: newVal }));
  };

  const handleTestPush = async () => {
    setPushTestStatus('testing');
    setPushTestMessage('Đang kiểm tra...');

    try {
      // Bước 1: Kiểm tra Service Worker
      if (!('serviceWorker' in navigator)) {
        setPushTestStatus('error');
        setPushTestMessage('❌ Trình duyệt không hỗ trợ Service Worker');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        setPushTestStatus('error');
        setPushTestMessage('❌ Service Worker chưa sẵn sàng');
        return;
      }

      // Bước 2: Kiểm tra permission
      if (Notification.permission !== 'granted') {
        setPushTestStatus('error');
        setPushTestMessage('❌ Chưa cấp quyền thông báo. Bấm nút bật ở trên.');
        return;
      }

      // Bước 3: Kiểm tra subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setPushTestMessage('⏳ Đang tạo subscription mới...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
        });
      }

      if (!subscription) {
        setPushTestStatus('error');
        setPushTestMessage('❌ Không thể tạo push subscription');
        return;
      }

      // Bước 4: Lưu subscription lên server
      setPushTestMessage('⏳ Đang lưu subscription...');
      const saveRes = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!saveRes.ok) {
        const err = await saveRes.text();
        setPushTestStatus('error');
        setPushTestMessage(`❌ Lỗi lưu subscription: ${err}`);
        return;
      }

      // Bước 5: Gửi test push từ server
      setPushTestMessage('⏳ Đang gửi push từ server...');
      const testRes = await fetch('/api/push/test', { method: 'POST' });
      const testData = await testRes.json();

      if (testData.success) {
        setPushTestStatus('success');
        setPushTestMessage(`✅ Gửi thành công! (${testData.result.sent} sent, ${testData.result.failed} fail)\nBạn sẽ thấy thông báo xuất hiện.`);
      } else {
        setPushTestStatus('error');
        setPushTestMessage(`❌ ${testData.diagnosis || testData.error || 'Push thất bại'}`);
      }
    } catch (err: any) {
      setPushTestStatus('error');
      setPushTestMessage(`❌ Lỗi: ${err.message || err}`);
    }
  };

  return (
    <motion.div
      key="settings-view"
      exit={{ opacity: 0, y: -10 }}
      className="relative h-full"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Cài đặt</h2>
          <p className="text-sm text-gray-400">Tuỳ chỉnh ứng dụng theo nhu cầu</p>
        </motion.div>

        {/* ═══ THÔNG BÁO ═══ */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[var(--card-shadow)] border border-gray-100/60 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Bell size={15} className="text-[var(--primary)]" />
              Thông báo
            </h3>
          </div>

          {/* Push Notification toggle */}
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                notifPermission === 'granted' ? 'bg-emerald-50' : 'bg-gray-100'
              }`}>
                {notifPermission === 'granted'
                  ? <Bell size={18} className="text-emerald-600" />
                  : <BellOff size={18} className="text-gray-400" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Thông báo đẩy</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {notifPermission === 'granted'
                    ? 'Đang bật — Bạn sẽ nhận thông báo khi có đơn mới'
                    : notifPermission === 'denied'
                    ? 'Đã bị chặn — Vào cài đặt trình duyệt để mở lại'
                    : 'Chưa bật — Bấm để bật thông báo'
                  }
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleNotification}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                notifPermission === 'granted' ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <motion.div
                animate={{ x: notifPermission === 'granted' ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm"
              />
            </motion.button>
          </div>

          {/* Test Push Button */}
          {notifPermission === 'granted' && (
            <div className="px-4 py-3.5 border-b border-gray-50">
              <button
                onClick={handleTestPush}
                disabled={pushTestStatus === 'testing'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium shadow-md shadow-blue-200 active:scale-95 transition-transform disabled:opacity-60"
              >
                {pushTestStatus === 'testing' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                Kiểm tra thông báo đẩy
              </button>
              <AnimatePresence>
                {pushTestStatus !== 'idle' && pushTestStatus !== 'testing' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2"
                  >
                    <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                      pushTestStatus === 'success' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {pushTestStatus === 'success' 
                        ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
                        : <XCircle size={14} className="mt-0.5 shrink-0" />
                      }
                      <span className="whitespace-pre-wrap">{pushTestMessage}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Sound toggle */}
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                soundEnabled ? 'bg-blue-50' : 'bg-gray-100'
              }`}>
                {soundEnabled
                  ? <Volume2 size={18} className="text-blue-600" />
                  : <VolumeX size={18} className="text-gray-400" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Âm thanh thông báo</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {soundEnabled ? 'Đang bật — Phát tiếng "ting" khi có đơn mới' : 'Đã tắt — Không phát âm thanh'}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleSound}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                soundEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <motion.div
                animate={{ x: soundEnabled ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm"
              />
            </motion.button>
          </div>
        </motion.div>

        {/* ═══ ỨNG DỤNG ═══ */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[var(--card-shadow)] border border-gray-100/60 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Smartphone size={15} className="text-[var(--primary)]" />
              Ứng dụng
            </h3>
          </div>

          {isAdmin && (
            <button
              onClick={() => window.location.href = '/admin/users'}
              className="w-full px-4 py-3.5 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Shield size={18} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">Quản lý nhân viên</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Thêm, sửa, xoá tài khoản</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          )}

          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Info size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Dưa Lưới Tịnh Biên</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Phiên bản 1.0.0 · Tịnh Biên, An Giang</p>
            </div>
          </div>
        </motion.div>

        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}
