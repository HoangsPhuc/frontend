'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Ellipsis,
  MessageCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const allTabs = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF'] },
  { id: 'accounts', label: 'Tài khoản', icon: Wallet, roles: ['ADMIN'] },
  { id: 'chat', label: 'Nhắn tin', icon: MessageCircle, roles: ['ADMIN', 'STAFF'] },
  { id: 'reports', label: 'Báo cáo', icon: BarChart3, roles: ['ADMIN'] },
  { id: 'more', label: 'Khác', icon: Ellipsis, roles: ['ADMIN', 'STAFF'] },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { data: session, status } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // Poll for unread message count
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUnreadMsgCount(data.count || 0);
        }
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);

    const handleRefresh = () => fetchUnread();
    window.addEventListener('refreshMessageBadge', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshMessageBadge', handleRefresh);
    };
  }, [status]);

  // Tự động cấu hình lại thông báo khi đổi tài khoản (nếu máy đã cho phép trước đó)
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const autoSubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const base64String = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
          if (!base64String) return;
          
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray
          });
        }
        
        if (subscription) {
          await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
          });
        }
      } catch (err) {
        console.error('Auto-subscribe error:', err);
      }
    };
    autoSubscribe();
  }, [status]);

  const visibleTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/60">
      <div className="flex items-center justify-around px-1 pt-1.5 pb-safe">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const badge = tab.id === 'chat' ? unreadMsgCount : 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px] rounded-xl transition-colors duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[var(--primary)] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <motion.div
                animate={{ y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="relative"
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-[var(--primary)]' : 'text-gray-400'
                  }`}
                />
                {badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    {badge > 9 ? '9+' : badge}
                  </motion.span>
                )}
              </motion.div>

              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-[var(--primary)]' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
