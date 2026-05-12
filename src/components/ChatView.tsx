'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import ProfileModal from './ProfileModal';
import {
  MessageCircle, Users, UserPlus, Search, Send, ArrowLeft, Check, X,
  Clock, CheckCheck, Circle, Shield, ChevronRight, UserCheck, Loader2,
  Paperclip, Image as ImageIcon, FileText, ArrowUpCircle, ArrowDownCircle,
  Eye, Smile, UserMinus, ArrowDown
} from 'lucide-react';

interface UserItem {
  id: string; name: string; username: string; role: string; lastSeen: string;
  friendStatus?: string; friendshipId?: string; avatarUrl?: string | null;
}
interface Msg {
  id: string; senderId: string; receiverId: string; content: string;
  imageUrl?: string | null; transactionId?: string | null;
  transaction?: {
    id: string; type: string; category: string; amount: number; status: string; transferContent?: string; date: string;
    accountInfo?: string | null; bankName?: string | null; accountNumber?: string | null; accountOwner?: string | null; qrCodeUrl?: string | null; note?: string | null;
  } | null;
  isRead: boolean; createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Đang truy cập';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

function isOnline(dateStr: string) { return Date.now() - new Date(dateStr).getTime() < 120000; }

const STICKERS = [
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Heart-Eyes.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20with%20Tears%20of%20Joy.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Loudly%20Crying%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Pleading%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20Holding%20Back%20Tears.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Thinking%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Sleeping%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20with%20Rolling%20Eyes.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20Exhaling.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Sunglasses.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Partying%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Shushing%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Zipper-Mouth%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Nerd%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Melon.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Watermelon.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Strawberry.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cherry%20Blossom.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Hamburger.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Pizza.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/French%20Fries.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Beer%20Mug.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Red%20Heart.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Broken%20Heart.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Sparkling%20Heart.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Firecracker.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Party%20Popper.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Thumbs%20Up.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Thumbs%20Down.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Clapping%20Hands.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Victory%20Hand.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Folded%20Hands.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Waving%20Hand.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/OK%20Hand.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Monkey%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Rabbit%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Frog.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Turtle.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20Bag.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Check%20Mark%20Button.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Cross%20Mark%20Button.png'
];

export default function ChatView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;
  const [tab, setTab] = useState<'chats' | 'friends' | 'find'>('chats');
  const [friends, setFriends] = useState<UserItem[]>([]);
  const [pendingReceived, setPendingReceived] = useState<UserItem[]>([]);
  const [pendingSent, setPendingSent] = useState<UserItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatFriend, setChatFriend] = useState<UserItem | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [pendingTxList, setPendingTxList] = useState<any[]>([]);
  const [showTxPicker, setShowTxPicker] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<Msg['transaction'] | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const sendingRef = useRef(false);

  // Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends || []);
      setPendingReceived(data.pendingReceived || []);
      setPendingSent(data.pendingSent || []);
      setAllUsers(data.allUsers || []);
      setUnreadMap(data.unreadMap || {});
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Poll friends list every 5s to update unread counts
  useEffect(() => {
    const interval = setInterval(fetchFriends, 5000);
    return () => clearInterval(interval);
  }, [fetchFriends]);

  // Auto-friend with admins on mount
  useEffect(() => {
    fetch('/api/friends/auto', { method: 'POST' }).catch(() => { });
  }, []);

  // Scroll down button states
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unreadBelow, setUnreadBelow] = useState(0);

  const openChat = async (friend: UserItem) => {
    setChatFriend(friend);
    setChatLoading(true);
    // Reset scroll tracking so first load always scrolls to bottom
    prevMsgCountRef.current = 0;
    isNearBottomRef.current = true;
    setShowScrollDown(false);
    setUnreadBelow(0);
    try {
      const res = await fetch(`/api/messages?friendId=${friend.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.friend) setChatFriend(prev => prev ? { ...prev, lastSeen: data.friend.lastSeen } : prev);
        setIsTyping(data.friendTyping || false);
      }
      setUnreadMap(prev => ({ ...prev, [friend.id]: 0 }));
    } catch { } finally {
      setChatLoading(false);
      // Force scroll to bottom after loading completes
      setTimeout(() => {
        msgEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 50);
    }
    // Start polling
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?friendId=${friend.id}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Lọc bỏ tin nhắn tạm thời (id bắt đầu bằng 'temp-') khi nhận dữ liệu thật từ server
          setMessages(prev => {
            const tempMsgs = prev.filter(m => m.id.startsWith('temp-'));
            const realMsgs = data.messages || [];
            return [...realMsgs, ...tempMsgs];
          });
          if (data.friend) setChatFriend(prev => prev ? { ...prev, lastSeen: data.friend.lastSeen } : prev);
          setIsTyping(data.friendTyping || false);
        }
      } catch { }
    }, 3000);
  };

  const closeChat = () => {
    if (chatFriend && lastTypingTime.current > 0) {
      lastTypingTime.current = 0;
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: chatFriend.id, isTyping: false }),
      }).catch(() => { });
    }
    setChatFriend(null);
    setMessages([]);
    setIsTyping(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    fetchFriends();
  };

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const isNearBottomRef = useRef(true);

  // Track scroll position
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 150;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = isNearBottom;
    setShowScrollDown(!isNearBottom);
    if (isNearBottom) setUnreadBelow(0);
  };

  const scrollToBottom = () => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadBelow(0);
    setShowScrollDown(false);
  };

  // Smart scroll: only auto-scroll if near bottom or new message count increased
  useEffect(() => {
    const newCount = messages.length;
    const oldCount = prevMsgCountRef.current;

    if (newCount > oldCount) {
      if (isNearBottomRef.current || oldCount === 0) {
        msgEndRef.current?.scrollIntoView({ behavior: oldCount === 0 ? 'instant' : 'smooth' });
      } else {
        // Scrolled up, increment unread count for messages NOT from me
        const newMsgs = messages.slice(oldCount);
        const newFromOthers = newMsgs.filter(m => m.senderId !== userId).length;
        if (newFromOthers > 0) {
          setUnreadBelow(prev => prev + newFromOthers);
        }
      }
    }
    prevMsgCountRef.current = newCount;
  }, [messages, userId]);

  useEffect(() => {
    if (isTyping && isNearBottomRef.current) {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isTyping]);

  const lastTypingTime = useRef(0);
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMsg(val);
    if (!chatFriend) return;

    const now = Date.now();
    const isCurrentlyTyping = val.trim().length > 0;

    if (isCurrentlyTyping) {
      if (now - lastTypingTime.current > 2000) {
        lastTypingTime.current = now;
        fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId: chatFriend.id, isTyping: true }),
        }).catch(() => { });
      }
    } else {
      if (lastTypingTime.current > 0) {
        lastTypingTime.current = 0;
        fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId: chatFriend.id, isTyping: false }),
        }).catch(() => { });
      }
    }
  };

  const sendMessage = async (extra?: { imageUrl?: string; transactionId?: string }) => {
    if (!chatFriend || sending || sendingRef.current) return;
    if (!newMsg.trim() && !extra?.imageUrl && !extra?.transactionId) return;
    const content = newMsg.trim();
    setNewMsg('');
    setSending(true);
    sendingRef.current = true;
    if (lastTypingTime.current > 0) {
      lastTypingTime.current = 0;
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: chatFriend.id, isTyping: false }),
      }).catch(() => { });
    }
    // Optimistic UI Update
    const optimisticMsg: Msg = {
      id: 'temp-' + Date.now(),
      senderId: session?.user?.id || '',
      receiverId: chatFriend.id,
      content,
      imageUrl: extra?.imageUrl || null,
      transactionId: extra?.transactionId || null,
      createdAt: new Date().toISOString(),
      isRead: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: chatFriend.id, content, ...extra }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? msg : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        const err = await res.json();
        alert(err.error || 'Lỗi gửi tin nhắn');
        setNewMsg(content);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('Lỗi kết nối khi gửi tin nhắn');
      setNewMsg(content);
    } finally { setSending(false); sendingRef.current = false; setShowAttach(false); inputRef.current?.focus(); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatFriend) return;
    setUploadingImg(true);
    setShowAttach(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.url) await sendMessage({ imageUrl: data.url });
      }
    } catch { } finally { setUploadingImg(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const openTxPicker = async () => {
    setShowAttach(false);
    setShowTxPicker(true);
    inputRef.current?.blur(); // Dismiss keyboard
    try {
      const res = await fetch('/api/transactions?limit=500&_t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const txs = (data.transactions || data || []).filter((t: any) => t.status === 'PENDING');
        setPendingTxList(txs);
      }
    } catch { }
  };

  const attachTransaction = async (tx: any) => {
    setShowTxPicker(false);
    await sendMessage({ transactionId: tx.id });
  };

  const categoryLabels: Record<string, string> = {
    tien_xang: 'Tiền Xăng', ban_hang: 'Bán Hàng', thu_no: 'Thu Nợ', tra_no_vuon: 'Trả Nợ Vườn',
    nhap_hang: 'Nhập Hàng', khac: 'Khác', thu_khac: 'Thu Khác', tien_nong: 'Tiền Nông',
    sua_chua: 'Sửa Chữa', an_uong: 'Ăn Uống', vat_tu: 'Vật Tư', chi_khac: 'Chi Khác',
    tien_com: 'Tiền Cơm'
  };

  const [processingTx, setProcessingTx] = useState<string | null>(null);
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleTxAction = async (txId: string, action: 'APPROVED' | 'REJECTED') => {
    if (action === 'REJECTED' && !rejectReason.trim()) return;
    setProcessingTx(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, rejectReason: action === 'REJECTED' ? rejectReason.trim() : undefined }),
      });
      if (res.ok) {
        // Update transaction status in messages locally
        setMessages(prev => prev.map(m =>
          m.transaction?.id === txId
            ? { ...m, transaction: { ...m.transaction!, status: action } }
            : m
        ));
      }
    } catch { } finally {
      setProcessingTx(null);
      setRejectingTxId(null);
      setRejectReason('');
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId }),
      });
      fetchFriends();
    } catch { }
  };

  const respondFriendRequest = async (friendshipId: string, action: string) => {
    try {
      await fetch('/api/friends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });
      fetchFriends();
    } catch { }
  };

  const cancelOrUnfriend = async (friendshipId: string, name: string, isUnfriend: boolean) => {
    const title = isUnfriend ? 'Xóa bạn bè' : 'Hủy lời mời';
    const message = isUnfriend
      ? `Bạn có chắc chắn muốn xóa bạn với ${name}?\nHành động này không thể hoàn tác, bạn sẽ không thể tiếp tục nhắn tin với người này.`
      : `Bạn có chắc chắn muốn hủy lời mời kết bạn đã gửi đến ${name}?`;
    setConfirmModal({
      title,
      message,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await fetch(`/api/friends?friendshipId=${friendshipId}`, { method: 'DELETE' });
          fetchFriends();
          if (chatFriend && chatFriend.friendshipId === friendshipId) {
            closeChat();
          }
        } catch { }
      }
    });
  };

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  // Memoize rendered messages to prevent re-rendering the entire list on every keystroke
  const renderedMessages = useMemo(() => {
    return messages.map((m, i) => {
      const isMine = m.senderId === userId;
      const isSticker = m.imageUrl && (m.imageUrl.includes('fluentui-emoji') || m.imageUrl.includes('Animated-Fluent-Emojis'));
      const showTime = i === 0 || new Date(m.createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime() > 300000;
      return (
        <div key={m.id}>
          {showTime && (
            <p className="text-center text-[10px] text-gray-400 my-1.5 font-medium">
              {new Date(m.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
            </p>
          )}
          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl text-sm leading-relaxed overflow-hidden ${isSticker ? 'bg-transparent shadow-none' :
              isMine
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md'
              }`}>
              {/* Ảnh đính kèm */}
              {m.imageUrl && (
                <div className={isSticker ? `flex flex-col items-${isMine ? 'end' : 'start'}` : "p-1"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.imageUrl}
                    alt={isSticker ? "Sticker" : "Ảnh"}
                    className={isSticker ? "w-28 h-28 object-contain filter drop-shadow-md" : "rounded-xl max-h-52 w-full object-cover cursor-pointer"}
                    onClick={() => { if (!isSticker) setLightboxImg(m.imageUrl!) }}
                    onLoad={() => {
                      if (isNearBottomRef.current) {
                        msgEndRef.current?.scrollIntoView({ behavior: 'instant' });
                      }
                    }}
                  />
                </div>
              )}
              {/* Giao dịch đính kèm */}
              {m.transaction && (
                <div className={`mx-2 mt-2 p-3.5 rounded-2xl border w-64 max-w-[85vw] shadow-md relative overflow-hidden ${isMine
                  ? 'border-blue-400 text-white'
                  : 'border-orange-200 text-gray-900'
                  }`}>
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center mix-blend-multiply"
                    style={{ backgroundImage: "url('/melon_tx_bg.png')", opacity: isMine ? 0.35 : 0.15 }}
                  />
                  <div className={`absolute inset-0 z-0 ${isMine ? 'bg-gradient-to-br from-blue-500/85 to-indigo-600/90' : 'bg-gradient-to-br from-amber-50/90 to-orange-100/80'
                    }`} />
                  <div className={`absolute -right-4 -top-4 opacity-10 pointer-events-none z-0 ${isMine ? 'text-white' : 'text-orange-600'}`}>
                    <FileText size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        {m.transaction.type === 'CHI'
                          ? <div className={`p-1 rounded-md ${isMine ? 'bg-white/20 text-white' : 'bg-red-100 text-red-500'}`}><ArrowUpCircle size={14} /></div>
                          : <div className={`p-1 rounded-md ${isMine ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-500'}`}><ArrowDownCircle size={14} /></div>
                        }
                        <span className={`text-xs font-bold ${isMine ? 'text-white' : 'text-gray-900'}`}>
                          {categoryLabels[m.transaction.category] || m.transaction.category}
                        </span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm whitespace-nowrap ${m.transaction.status === 'PENDING' ? 'bg-amber-500'
                        : m.transaction.status === 'APPROVED' ? 'bg-emerald-500'
                          : 'bg-red-500'
                        }`}>
                        {m.transaction.status === 'PENDING' ? 'Chờ duyệt' : m.transaction.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                    </div>
                    <p className={`text-base font-extrabold ${isMine ? 'text-white' : 'text-orange-600'}`}>
                      {Number(m.transaction.amount).toLocaleString('vi-VN')}đ
                    </p>
                    {m.transaction.transferContent && (
                      <p className={`text-[11px] mt-1 line-clamp-2 ${isMine ? 'text-blue-100' : 'text-gray-600'}`}>
                        {m.transaction.transferContent}
                      </p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailTx(m.transaction); }}
                      className={`flex items-center gap-1 text-[10px] mt-1.5 font-medium transition-colors ${isMine ? 'text-blue-100 hover:text-white' : 'text-blue-500 hover:text-blue-700'}`}
                    >
                      <Eye size={12} /> Xem chi tiết giao dịch
                    </button>
                    {/* Nút Duyệt / Từ chối cho Admin */}
                    {userRole === 'ADMIN' && m.transaction.status === 'PENDING' && (
                      <div className="flex gap-2 mt-2.5 pt-2 border-t border-dashed" style={{ borderColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}>
                        {processingTx === m.transaction.id ? (
                          <div className="flex items-center gap-1.5 text-xs"><Loader2 size={12} className="animate-spin" /> Đang xử lý...</div>
                        ) : rejectingTxId === m.transaction.id ? (
                          <div className="flex-1 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="Nhập lý do từ chối..."
                              className="w-full text-xs px-2 py-1.5 rounded bg-white border border-red-200 text-gray-900 focus:outline-none focus:border-red-400"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleTxAction(m.transaction!.id, 'REJECTED')}
                                disabled={!rejectReason.trim()}
                                className="flex-1 py-1 rounded bg-red-500 text-white text-[10px] font-bold disabled:opacity-50 transition-colors"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => { setRejectingTxId(null); setRejectReason(''); }}
                                className="flex-1 py-1 rounded bg-gray-200 text-gray-700 text-[10px] font-bold hover:bg-gray-300 transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTxAction(m.transaction!.id, 'APPROVED'); }}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${isMine ? 'bg-emerald-500/80 text-white hover:bg-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                                }`}
                            >
                              <Check size={12} /> Duyệt
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRejectingTxId(m.transaction!.id); setRejectReason(''); }}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${isMine ? 'bg-red-500/80 text-white hover:bg-red-500' : 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                }`}
                            >
                              <X size={12} /> Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Nội dung text */}
              {m.content && <div className="px-3.5 pt-2 pb-0.5 leading-relaxed whitespace-pre-wrap break-words">{m.content}</div>}
              {!m.content && (m.imageUrl || m.transaction) && <div className="h-1" />}
              <div className={`flex items-center gap-1 px-3.5 pb-1.5 pt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-[10px] font-medium ${isSticker ? 'text-gray-400' : isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMine && !isSticker && (m.isRead ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} className="text-blue-300" />)}
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [messages, userId, processingTx, rejectingTxId, rejectReason, userRole, categoryLabels]);

  // ═══ CHAT VIEW ═══
  if (chatFriend) {
    const online = isOnline(chatFriend.lastSeen);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 flex flex-col bg-gray-50 pb-[calc(58px+env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
          <button onClick={closeChat} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-600"><ArrowLeft size={20} /></button>
          <div className="relative cursor-pointer active:scale-95 transition-transform" onClick={() => setViewProfileId(chatFriend.id)}>
            {chatFriend.avatarUrl ? (
              <img src={chatFriend.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {chatFriend.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white z-10 ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity" onClick={() => setViewProfileId(chatFriend.id)}>
            <h3 className="font-bold text-gray-900 text-sm truncate flex items-center gap-1.5">
              {chatFriend.name}
              {chatFriend.role === 'ADMIN' && <Shield size={12} className="text-purple-500" />}
            </h3>
            <p className={`text-[11px] font-bold ${isTyping ? 'text-blue-500' : online ? 'text-emerald-600' : 'text-gray-500'}`}>
              {isTyping ? 'Đang soạn tin...' : online ? 'Đang truy cập' : `Đã truy cập ${timeAgo(chatFriend.lastSeen)}`}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {chatLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Chưa có tin nhắn nào</p>
              <p className="text-xs mt-1">Hãy gửi lời chào đầu tiên! 👋</p>
            </div>
          ) : renderedMessages}
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 max-w-[80%]">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Scroll down button */}
        <AnimatePresence>
          {showScrollDown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-20 right-4 z-20"
            >
              <button
                onClick={scrollToBottom}
                className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors active:scale-95"
              >
                <ArrowDown size={20} />
                {unreadBelow > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm">
                    {unreadBelow > 9 ? '9+' : unreadBelow}
                  </div>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Picker Modal */}
        {mounted && createPortal(
          <AnimatePresence>
            {showTxPicker && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowTxPicker(false)}
                  className="fixed inset-0 bg-black/50 z-[400]"
                />
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 350, mass: 0.8 }}
                  className="fixed bottom-0 left-0 right-0 z-[401] bg-white rounded-t-3xl shadow-2xl flex flex-col"
                  style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-base">Chọn giao dịch đính kèm</h3>
                    <button onClick={() => setShowTxPicker(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="overflow-y-auto p-5 space-y-3 pb-12" style={{ maxHeight: 'calc(85vh - 70px)' }}>
                    {pendingTxList.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <FileText size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">Không có giao dịch chờ duyệt</p>
                      </div>
                    ) : pendingTxList.map((tx: any) => (
                      <div key={tx.id} className="w-full flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all text-left">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'CHI' ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                          {tx.type === 'CHI' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-900 block truncate">{categoryLabels[tx.category] || tx.category}</span>
                          <p className="text-xs font-bold mt-0.5 text-gray-600">{Number(tx.amount).toLocaleString('vi-VN')}đ</p>
                        </div>
                        <button
                          onClick={() => attachTransaction(tx)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-sm shrink-0"
                        >
                          <Send size={14} /> Gửi
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>, document.body)}

        {/* Input */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 relative">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          {/* Overlay to close popups */}
          {(showAttach || showStickers) && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => { setShowAttach(false); setShowStickers(false); }}
            />
          )}

          {/* Attach menu */}
          <AnimatePresence>
            {showAttach && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.8 }}
                className="absolute bottom-full left-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20"
                style={{ transformOrigin: 'bottom left' }}
              >
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full text-left transition-colors relative z-30">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><ImageIcon size={16} /></div>
                  <span className="text-sm font-medium text-gray-700">Gửi ảnh</span>
                </button>
                <button onClick={openTxPicker} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full text-left transition-colors border-t border-gray-50 relative z-30">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><FileText size={16} /></div>
                  <span className="text-sm font-medium text-gray-700">Đính kèm giao dịch</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticker menu */}
          <AnimatePresence>
            {showStickers && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.8 }}
                className="absolute bottom-full left-4 right-4 mb-2 p-2.5 bg-white rounded-3xl shadow-xl border border-gray-100 z-20"
                style={{ transformOrigin: 'bottom left' }}
              >
                <div className="grid grid-cols-6 gap-1 overflow-y-auto max-h-[220px] overscroll-contain">
                  {STICKERS.map((stickerUrl, idx) => (
                    <button
                      key={idx}
                      onPointerUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (sendingRef.current) return;
                        setShowStickers(false);
                        sendMessage({ imageUrl: stickerUrl });
                      }}
                      className="w-full aspect-square p-1.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stickerUrl}
                        alt="sticker"
                        loading="eager"
                        decoding="async"
                        className="w-10 h-10 object-contain pointer-events-none"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {uploadingImg && (
            <div className="flex items-center gap-2 mb-2 text-blue-500 text-xs font-medium">
              <Loader2 size={14} className="animate-spin" /> Đang tải ảnh lên...
            </div>
          )}

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setShowAttach(!showAttach); setShowStickers(false); }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${showAttach ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              <Paperclip size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setShowStickers(!showStickers); setShowAttach(false); }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${showStickers ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              <Smile size={18} />
            </motion.button>
            <input
              ref={inputRef}
              value={newMsg}
              onChange={handleTyping}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              onFocus={() => {
                setShowAttach(false);
                setShowStickers(false);
                // Scroll chat to bottom when keyboard opens
                setTimeout(() => {
                  msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 300);
              }}
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage()}
              disabled={!newMsg.trim() || sending}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center disabled:opacity-40 shadow-md shadow-blue-200/50"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>

        {/* Lightbox Modal */}
        {mounted && createPortal(
          <>
            <AnimatePresence>
              {lightboxImg && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/95 z-[300] flex flex-col backdrop-blur-md"
                >
                  <button
                    onClick={() => setLightboxImg(null)}
                    className="absolute p-3 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors z-[400] shadow-lg backdrop-blur-sm"
                    style={{ top: 'calc(1.5rem + env(safe-area-inset-top, 0px))', right: 'calc(1.5rem + env(safe-area-inset-right, 0px))' }}
                  >
                    <X size={24} />
                  </button>

                  <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                    <TransformWrapper
                      initialScale={1}
                      minScale={0.5}
                      maxScale={5}
                      centerOnInit
                      doubleClick={{ disabled: false, mode: "zoomIn" }}
                      panning={{ velocityDisabled: false }}
                    >
                      <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <motion.img
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          src={lightboxImg}
                          alt="Phóng to"
                          className="max-w-[95vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>



            {/* Transaction Detail Modal */}
            <AnimatePresence>
              {detailTx && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4"
                  onClick={() => setDetailTx(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl max-h-[85vh]"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 text-base">Chi tiết giao dịch</h3>
                      <button onClick={() => setDetailTx(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-5 overflow-y-auto space-y-4">
                      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                        <span className="text-sm text-gray-500">Số tiền:</span>
                        <span className={`text-lg font-bold ${detailTx.type === 'CHI' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {Number(detailTx.amount).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Loại:</span>
                          <span className="font-medium text-gray-900">{detailTx.type === 'THU' ? 'Phiếu Thu' : 'Phiếu Chi'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Danh mục:</span>
                          <span className="font-medium text-gray-900">{categoryLabels[detailTx.category] || detailTx.category}</span>
                        </div>
                        {detailTx.transferContent && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nội dung CK:</span>
                            <span className="font-medium text-gray-900 text-right">{detailTx.transferContent}</span>
                          </div>
                        )}
                        {detailTx.note && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Ghi chú:</span>
                            <span className="font-medium text-gray-900 text-right max-w-[60%]">{detailTx.note}</span>
                          </div>
                        )}
                      </div>

                      {(detailTx.bankName || detailTx.accountInfo) && (
                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Thông tin thanh toán</h4>
                          <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-sm">
                            {detailTx.bankName && <p className="flex justify-between"><span className="text-gray-500">Ngân hàng:</span> <span className="font-bold">{detailTx.bankName}</span></p>}
                            {detailTx.accountNumber && <p className="flex justify-between"><span className="text-gray-500">Số TK:</span> <span className="font-bold font-mono">{detailTx.accountNumber}</span></p>}
                            {detailTx.accountOwner && <p className="flex justify-between"><span className="text-gray-500">Chủ TK:</span> <span className="font-bold">{detailTx.accountOwner}</span></p>}
                            {detailTx.accountInfo && <p className="text-gray-700 whitespace-pre-wrap mt-2 pt-2 border-t border-gray-200">{detailTx.accountInfo}</p>}
                          </div>
                        </div>
                      )}

                      {detailTx.qrCodeUrl && (
                        <div className="pt-4 border-t border-gray-100 flex flex-col items-center">
                          <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Mã QR Thanh Toán</h4>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detailTx.qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain rounded-2xl border border-gray-100 shadow-sm" />
                        </div>
                      )}
                    </div>

                    {/* Hành động dưới cùng (Chỉ cho Admin nếu đang PENDING) */}
                    {userRole === 'ADMIN' && detailTx.status === 'PENDING' && (
                      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                        {rejectingTxId === detailTx.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              autoFocus
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="Nhập lý do từ chối..."
                              className="w-full text-sm px-3 py-2 rounded-xl bg-white border border-red-200 text-gray-900 focus:outline-none focus:border-red-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { handleTxAction(detailTx.id, 'REJECTED'); setDetailTx({ ...detailTx, status: 'REJECTED' }); }}
                                disabled={!rejectReason.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                              >
                                Xác nhận từ chối
                              </button>
                              <button
                                onClick={() => { setRejectingTxId(null); setRejectReason(''); }}
                                className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-300 transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => { handleTxAction(detailTx.id, 'APPROVED'); setDetailTx({ ...detailTx, status: 'APPROVED' }); }}
                              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                            >
                              <Check size={18} /> Duyệt giao dịch
                            </button>
                            <button
                              onClick={() => { setRejectingTxId(detailTx.id); setRejectReason(''); }}
                              className="px-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold text-sm hover:bg-red-100 hover:text-red-600 active:scale-95 transition-all"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>, document.body)}

        {viewProfileId && (
          <ProfileModal isOpen={true} onClose={() => setViewProfileId(null)} userId={viewProfileId} />
        )}
      </motion.div>
    );
  }

  // ═══ FRIEND LIST / FIND USERS ═══
  const filteredFriends = friends.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.friendStatus === 'NONE' && u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 -mx-4 -mt-4">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 bg-white">
        {[
          { id: 'chats' as const, label: 'Tin nhắn', icon: MessageCircle, badge: totalUnread },
          { id: 'friends' as const, label: 'Bạn bè', icon: Users, badge: pendingReceived.length },
          { id: 'find' as const, label: 'Tìm bạn', icon: UserPlus, badge: 0 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            <t.icon size={14} />
            {t.label}
            {t.badge > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
              >
                {t.badge > 99 ? '99+' : t.badge}
              </motion.span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {/* ═══ TAB: CHATS ═══ */}
          {tab === 'chats' && (
            friends.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">Chưa có cuộc trò chuyện nào</p>
                <p className="text-xs mt-1">Kết bạn để bắt đầu nhắn tin!</p>
              </div>
            ) : filteredFriends.map(f => (
              <motion.div
                key={f.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => openChat(f)}
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
              >
                <div className="relative shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); setViewProfileId(f.id); }}>
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline(f.lastSeen) ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-gray-900 truncate">{f.name}</span>
                    {f.role === 'ADMIN' && <Shield size={12} className="text-purple-500 shrink-0" />}
                  </div>
                  <p className={`text-[11px] font-medium mt-0.5 ${isOnline(f.lastSeen) ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {isOnline(f.lastSeen) ? 'Đang truy cập' : `Truy cập ${timeAgo(f.lastSeen)}`}
                  </p>
                </div>
                {unreadMap[f.id] > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{unreadMap[f.id]}</span>
                )}
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.div>
            ))
          )}

          {/* ═══ TAB: FRIENDS ═══ */}
          {tab === 'friends' && (
            <>
              {pendingReceived.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                    <Clock size={12} /> Lời mời kết bạn ({pendingReceived.length})
                  </h3>
                  {pendingReceived.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3.5 bg-orange-50 rounded-2xl border border-orange-100 mb-2">
                      <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => setViewProfileId(u.id)}>
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-orange-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-gray-900">{u.name}</span>
                        <p className="text-[11px] text-gray-500">@{u.username}</p>
                      </div>
                      <button onClick={() => respondFriendRequest(u.friendshipId!, 'ACCEPTED')} className="p-2 bg-emerald-500 text-white rounded-xl"><Check size={16} /></button>
                      <button onClick={() => respondFriendRequest(u.friendshipId!, 'REJECTED')} className="p-2 bg-gray-200 text-gray-600 rounded-xl"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
              {pendingSent.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 px-1">Đã gửi ({pendingSent.length})</h3>
                  {pendingSent.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                      <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => setViewProfileId(u.id)}>
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-blue-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">{u.name.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-gray-900 truncate block">{u.name}</span>
                        <span className="text-[10px] font-medium text-blue-500 mt-0.5 block">Chờ chấp nhận</span>
                      </div>
                      <button onClick={() => cancelOrUnfriend(u.friendshipId!, u.name, false)} className="px-3 py-1.5 bg-white text-red-500 text-xs font-bold rounded-lg border border-red-100 hover:bg-red-50 transition-colors">Hủy</button>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Bạn bè ({friends.length})</h3>
              {friends.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><Users size={36} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">Chưa có bạn bè</p></div>
              ) : filteredFriends.map(f => (
                <div key={f.id} onClick={() => { setTab('chats'); openChat(f); }} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 mb-2 cursor-pointer hover:bg-gray-50 shadow-sm">
                  <div className="relative shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); setViewProfileId(f.id); }}>
                    {f.avatarUrl ? (
                      <img src={f.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{f.name.charAt(0).toUpperCase()}</div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline(f.lastSeen) ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-gray-900 flex items-center gap-1 truncate">{f.name} {f.role === 'ADMIN' && <Shield size={12} className="text-purple-500 shrink-0" />}</span>
                    <p className={`text-[11px] truncate mt-0.5 ${isOnline(f.lastSeen) ? 'text-emerald-500' : 'text-gray-400'}`}>{isOnline(f.lastSeen) ? 'Đang truy cập' : timeAgo(f.lastSeen)}</p>
                  </div>
                  {(userRole === 'ADMIN' || f.role !== 'ADMIN') && (
                    <button onClick={(e) => { e.stopPropagation(); cancelOrUnfriend(f.friendshipId!, f.name, true); }} className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-colors" title="Xóa bạn">
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ═══ TAB: FIND ═══ */}
          {tab === 'find' && (
            filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><UserPlus size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm">Không tìm thấy người dùng mới</p></div>
            ) : filteredUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 mb-2 shadow-sm">
                <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => setViewProfileId(u.id)}>
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm">{u.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-sm text-gray-900 flex items-center gap-1">{u.name} {u.role === 'ADMIN' && <Shield size={12} className="text-purple-500" />}</span>
                  <p className="text-[11px] text-gray-500">@{u.username}</p>
                </div>
                <button onClick={() => sendFriendRequest(u.id)} className="px-3 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-blue-600 transition-colors">
                  <UserPlus size={14} /> Kết bạn
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <ProfileModal 
        isOpen={!!viewProfileId} 
        onClose={() => setViewProfileId(null)} 
        userId={viewProfileId || undefined} 
      />

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-[320px] shadow-2xl overflow-hidden"
            >
              <div className="p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-3">
                  <UserMinus size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{confirmModal.message}</p>
              </div>
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
