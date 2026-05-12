'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import DashboardView from '@/components/DashboardView';
import SettingsView from '@/components/SettingsView';
import AccountsView from '@/components/AccountsView';
import ChatView from '@/components/ChatView';
import InstallPrompt from '@/components/InstallPrompt';
import NotificationsPanel from '@/components/NotificationsPanel';
import ProfileModal from '@/components/ProfileModal';
import { Wallet, BarChart3, Ellipsis, PenLine, LogOut, User, History, X, Phone, ChevronRight, ChevronLeft, Bell, Shield } from 'lucide-react';

function TabPanel({ active, index, activeIndex, children }: { active: boolean, index: number, activeIndex: number, children: React.ReactNode }) {
  const isLeft = index < activeIndex;
  
  return (
    <motion.div 
      className="absolute inset-0 overflow-y-auto px-4 pt-4 pb-20"
      initial={false}
      animate={{ 
        opacity: active ? 1 : 0, 
        pointerEvents: active ? 'auto' : 'none',
        x: active ? 0 : (isLeft ? -40 : 40),
        scale: active ? 1 : 0.98
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function PlaceholderView({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25 }}
      className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400"
    >
      <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center">
        <Icon size={36} strokeWidth={1.4} className="text-blue-300" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">Đang phát triển...</p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !session?.user?.id) {
      alert("Tài khoản của bạn đang được đăng nhập ở một nơi khác. Bạn sẽ bị đăng xuất!");
      signOut({ callbackUrl: '/login' });
    } else if (status === 'authenticated') {
      // Auto-friend với Admin khi đăng nhập
      fetch('/api/friends/auto', { method: 'POST' }).catch(() => {});
    }
  }, [status, session, router]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userRole = session?.user?.role || 'STAFF';
  const TABS = userRole === 'ADMIN' 
    ? ['dashboard', 'accounts', 'chat', 'reports', 'more']
    : ['dashboard', 'chat', 'more'];
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const noSwipeRef = useRef(false);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchY, setTouchY] = useState(0);
  const activeIndex = TABS.indexOf(activeTab);

  // Guard: reset tab nếu tab hiện tại không có trong danh sách tab cho role này
  useEffect(() => {
    if (!TABS.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, TABS]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setIsRinging(true);
      const timer = setTimeout(() => setIsRinging(false), 2500);
      return () => clearTimeout(timer);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { 'Cache-Control': 'no-cache, no-store' },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // Check every 15s

    // Listen for manual refresh
    const handleRefresh = () => fetchUnread();
    window.addEventListener('refreshNotifications', handleRefresh);

    // Listen for push messages from Service Worker (real-time in-app refresh)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        // Ngay lập tức +1 badge để người dùng thấy liền
        setUnreadCount(prev => prev + 1);
        // Đồng thời fetch chính xác từ server
        fetchUnread();
        window.dispatchEvent(new Event('refreshMessageBadge'));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshNotifications', handleRefresh);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [status]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setTouchY(e.touches[0].clientY);
    // Ghi nhớ xem touch bắt đầu trong vùng no-swipe hay không
    noSwipeRef.current = !!(e.target as HTMLElement).closest('.no-swipe');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (noSwipeRef.current) return;
    const touchMoveX = e.touches[0].clientX;
    const touchMoveY = e.touches[0].clientY;
    const diffX = touchStartX.current - touchMoveX;
    const diffY = touchStartY.current - touchMoveY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      setSwipeOffset(-diffX); // < 0 means pulling from left edge to right. > 0 means pulling from right edge to left.
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setSwipeOffset(0);
    if (noSwipeRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && activeIndex < TABS.length - 1) {
        setActiveTab(TABS[activeIndex + 1]);
      } else if (diffX < 0 && activeIndex > 0) {
        setActiveTab(TABS[activeIndex - 1]);
      }
    }
  };
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user?.id)) {
    return null; // Prevents flashing the 'Nhân viên' UI before redirect
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shadow-blue-200 shrink-0 border border-gray-100 bg-white">
              <img 
                src="/logo.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-[15px] text-gray-900 leading-tight">Dưa Lưới Tịnh Biên</h1>
              <p className="text-[10px] text-gray-400 leading-tight">Tịnh Biên · An Giang</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <a 
              href="tel:0346526510"
              className="w-8 h-8 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100 hover:bg-green-100 transition-colors shadow-sm"
            >
              <Phone size={14} />
            </a>
            <motion.button
              whileTap={{ scale: 0.9 }}
              animate={isRinging ? { rotate: [0, -15, 15, -15, 15, 0], transition: { repeat: 4, duration: 0.5 } } : { rotate: 0 }}
              onClick={() => setIsNotifOpen(true)}
              className={`relative w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300 ${
                isRinging 
                  ? 'bg-blue-100 text-blue-600 border-blue-300 shadow-blue-200' 
                  : unreadCount > 0 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <Bell size={16} className={unreadCount > 0 && !isRinging ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsUserMenuOpen(true)}
              className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 text-xs font-bold border border-gray-200 shadow-sm overflow-hidden"
            >
              {session?.user?.avatarUrl ? (
                <img src={session.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'NV'
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main 
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <TabPanel active={activeTab === 'dashboard'} index={TABS.indexOf('dashboard')} activeIndex={activeIndex}>
          <DashboardView />
        </TabPanel>
        {userRole === 'ADMIN' && (
          <TabPanel active={activeTab === 'accounts'} index={TABS.indexOf('accounts')} activeIndex={activeIndex}>
            <AccountsView />
          </TabPanel>
        )}
        <TabPanel active={activeTab === 'chat'} index={TABS.indexOf('chat')} activeIndex={activeIndex}>
          <ChatView />
        </TabPanel>
        {userRole === 'ADMIN' && (
          <TabPanel active={activeTab === 'reports'} index={TABS.indexOf('reports')} activeIndex={activeIndex}>
            <PlaceholderView icon={BarChart3} title="Báo Cáo" />
          </TabPanel>
        )}
        <TabPanel active={activeTab === 'more'} index={TABS.indexOf('more')} activeIndex={activeIndex}>
          <SettingsView />
        </TabPanel>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <InstallPrompt />
      
      <NotificationsPanel 
        isOpen={isNotifOpen} 
        onClose={() => setIsNotifOpen(false)}
        onMarkAsRead={(count) => {
          setUnreadCount(prev => Math.max(0, prev - count));
        }}
        onOpenTransaction={(txId) => {
          setActiveTab('dashboard');
          // Dispatch event to open transaction detail in DashboardView
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openTransaction', { detail: { txId } }));
          }, 300);
        }}
      />

      {/* ═══ EDGE PULL INDICATORS ═══ */}
      <div 
        className={`fixed left-0 h-32 bg-[var(--primary)]/60 backdrop-blur-md rounded-r-[100px] pointer-events-none z-[100] origin-left flex items-center justify-end pr-2 overflow-hidden shadow-lg ${swipeOffset === 0 ? 'transition-all duration-300 ease-out' : ''}`}
        style={{ 
          top: touchY,
          transform: 'translateY(-50%)',
          width: swipeOffset > 0 ? `${Math.min(swipeOffset * 1.5, 80)}px` : '0px',
          opacity: swipeOffset > 5 ? Math.min((swipeOffset - 5) / 40, 1) : 0
        }}
      >
         <ChevronRight size={28} className="text-white transition-all duration-200" style={{ opacity: swipeOffset > 40 ? 1 : 0.5, transform: `scale(${swipeOffset > 40 ? 1.2 : 1})` }} />
      </div>

      <div 
        className={`fixed right-0 h-32 bg-[var(--primary)]/60 backdrop-blur-md rounded-l-[100px] pointer-events-none z-[100] origin-right flex items-center justify-start pl-2 overflow-hidden shadow-lg ${swipeOffset === 0 ? 'transition-all duration-300 ease-out' : ''}`}
        style={{ 
          top: touchY,
          transform: 'translateY(-50%)',
          width: swipeOffset < 0 ? `${Math.min(Math.abs(swipeOffset) * 1.5, 80)}px` : '0px',
          opacity: swipeOffset < -5 ? Math.min((Math.abs(swipeOffset) - 5) / 40, 1) : 0
        }}
      >
         <ChevronLeft size={28} className="text-white transition-all duration-200" style={{ opacity: swipeOffset < -40 ? 1 : 0.5, transform: `scale(${swipeOffset < -40 ? 1.2 : 1})` }} />
      </div>

      {/* ═══ USER MENU BOTTOM SHEET ═══ */}
      <AnimatePresence>
        {isUserMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 300) {
                  setIsUserMenuOpen(false);
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-3xl p-6"
            >
              <div className="flex justify-center mb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="flex items-center justify-between mb-6 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 text-[var(--primary)] rounded-full flex items-center justify-center text-lg font-bold border border-blue-100 overflow-hidden shadow-sm">
                    {session?.user?.avatarUrl ? (
                      <img src={session.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'NV'
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{session?.user?.name || 'Nhân viên'}</h3>
                    <p className="text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded-md mt-1">
                      {session?.user?.role === 'ADMIN' ? 'Quản lý' : 'Nhân viên'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsUserMenuOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <button 
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-600">
                    <User size={20} />
                  </div>
                  <span className="font-medium text-gray-800 flex-1 text-left">Hồ sơ cá nhân</span>
                </button>

                <button 
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setActiveTab('dashboard');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('openHistoryModal')), 100);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-600">
                    <History size={20} />
                  </div>
                  <span className="font-medium text-gray-800 flex-1 text-left">Lịch sử Thu / Chi</span>
                </button>

                {session?.user?.role === 'ADMIN' && (
                  <button 
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      router.push('/admin/users');
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-100"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600">
                      <Shield size={20} />
                    </div>
                    <span className="font-medium text-purple-800 flex-1 text-left">Quản trị hệ thống</span>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                >
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                    <LogOut size={20} />
                  </div>
                  <span className="font-medium text-red-600 flex-1 text-left">Đăng xuất</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ LOGOUT CONFIRM MODAL ═══ */}
      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] bg-white rounded-3xl p-6 w-[90%] max-w-sm shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <LogOut size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Đăng xuất</h3>
                <p className="text-sm text-gray-500 mb-8">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</p>
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setIsLogoutConfirmOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors active:scale-95"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors active:scale-95 shadow-md shadow-red-200"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
