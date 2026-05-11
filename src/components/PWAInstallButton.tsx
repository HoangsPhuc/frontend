'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, Plus, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    // Android/Desktop: Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    
    if (!deferredPrompt) {
      setShowAndroidGuide(true);
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // If already installed, don't show the button
  if (isStandalone) return null;

  // If not iOS and no prompt is available, it might not be installable (e.g. desktop Safari or HTTP local IP)
  // We still show the button so the UI matches, but it will alert if clicked.
  // const isInstallable = isIOS || deferredPrompt !== null;
  // if (!isInstallable && !isIOS) return null;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleInstall}
        className="w-full mt-4 py-3.5 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 text-[var(--primary)] text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-blue-100 shadow-sm"
      >
        <Download size={18} />
        Tải App về máy (Cài đặt)
      </motion.button>

      {/* ═══ iOS Installation Guide (Bottom Sheet) ═══ */}
      <AnimatePresence>
        {showIOSGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSGuide(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-3xl p-6"
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
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--primary)]">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Bấm nút <Share size={14} className="inline text-[var(--primary)] mx-1" /> Chia sẻ
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Ở thanh công cụ dưới của trình duyệt Safari</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--primary)]">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Chọn <Plus size={14} className="inline text-[var(--primary)] mx-1" /> Thêm vào MH chính
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Cuộn xuống trong menu chia sẻ để tìm</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--primary)]">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Bấm chữ &quot;Thêm&quot;</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ở góc trên cùng bên phải màn hình</p>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-bold shadow-lg shadow-blue-200"
              >
                Đã hiểu!
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Android Installation Guide (Manual via Menu) ═══ */}
      <AnimatePresence>
        {showAndroidGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAndroidGuide(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-3xl p-6"
            >
              <div className="flex justify-center mb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                Cài đặt thủ công trên Android
              </h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                (Do đang chạy thử nghiệm cục bộ)
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Bấm vào Menu 3 chấm (⋮)
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Ở góc trên cùng bên phải của trình duyệt Chrome</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Chọn &quot;Thêm vào Màn hình chính&quot;
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Hoặc &quot;Cài đặt ứng dụng&quot; (Install app)</p>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAndroidGuide(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold shadow-lg shadow-green-200"
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
