'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  transactionId: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPanel({
  isOpen,
  onClose,
  onOpenTransaction,
  onMarkAsRead,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransaction: (txId: string) => void;
  onMarkAsRead: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (id) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        onMarkAsRead(1);
      } else {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        onMarkAsRead(unreadCount);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.transactionId) {
      onOpenTransaction(notif.transactionId);
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPROVED': return <CheckCircle2 size={20} className="text-emerald-500" />;
      case 'REJECTED': return <XCircle size={20} className="text-red-500" />;
      case 'NEW_REQUEST': return <AlertCircle size={20} className="text-blue-500" />;
      default: return <Clock size={20} className="text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-[100] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Bell size={20} />
                Thông báo
              </h2>
              <div className="flex items-center gap-3">
                {notifications.some(n => !n.isRead) && (
                  <button onClick={() => markAsRead()} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    Đánh dấu đã đọc
                  </button>
                )}
                <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                  <Bell size={40} className="mb-4 text-gray-300" strokeWidth={1.5} />
                  <p>Không có thông báo nào</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-4 flex gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">
                          {new Date(n.createdAt).toLocaleString('vi-VN', { 
                            hour: '2-digit', minute: '2-digit', 
                            day: '2-digit', month: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
