'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Already installed, don't show prompt

    // Check if iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isiOS);

    // Check if user dismissed before (respect for 3 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) return;
    }

    if (isiOS) {
      // On iOS, show custom guide after 5 seconds
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  // Don't render if already standalone
  if (isStandalone) return null;

  return (
    <>
      {/* ═══ Install Banner ═══ */}
      <AnimatePresence>
        {showBanner && !showIOSGuide && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-16 left-3 right-3 z-[55] bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 p-4"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100"
            >
              <X size={14} className="text-gray-400" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Smartphone size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 leading-tight">
                  Cài đặt ứng dụng
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Thêm vào màn hình chính để truy cập nhanh, không cần mở trình duyệt
                </p>

                <div className="flex gap-2 mt-3">
                  {isIOS ? (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setShowBanner(false); setShowIOSGuide(true); }}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Share size={14} />
                      Hướng dẫn cài đặt
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleInstall}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-200/50"
                    >
                      <Download size={14} />
                      Cài đặt ngay
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDismiss}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-xs font-semibold text-gray-600"
                  >
                    Để sau
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ iOS Installation Guide (Bottom Sheet) ═══ */}
      <AnimatePresence>
        {showIOSGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
              className="fixed inset-0 bg-black/40 z-[55]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[55] bg-white rounded-t-3xl p-6"
            >
              <div className="flex justify-center mb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                Cài đặt trên iPhone/iPad
              </h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                Làm theo 3 bước đơn giản sau:
              </p>

              <div className="space-y-4 mb-6">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--primary)]">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Bấm nút <Share size={14} className="inline text-[var(--primary)]" /> Chia sẻ
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Ở thanh công cụ dưới của Safari</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--primary)]">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Chọn <Plus size={14} className="inline text-[var(--primary)]" /> Thêm vào MH chính
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Cuộn xuống trong menu chia sẻ</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--primary)]">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Bấm &quot;Thêm&quot; ở góc trên phải</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ứng dụng sẽ xuất hiện trên màn hình chính</p>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDismiss}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-bold"
              >
                Đã hiểu!
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
