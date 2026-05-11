import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { typingStatuses } from '@/lib/typingStore';

// GET: Lấy tin nhắn giữa 2 người + đánh dấu đã đọc
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get('friendId');
  if (!friendId) return NextResponse.json({ error: 'Thiếu friendId' }, { status: 400 });

  const userId = session.user.id;

  try {
    // Cập nhật lastSeen
    await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } });

    // Đánh dấu tin nhắn từ bạn bè là đã đọc
    await prisma.message.updateMany({
      where: { senderId: friendId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    // Lấy tin nhắn
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
      include: {
        transaction: {
          select: { id: true, type: true, category: true, amount: true, status: true, transferContent: true, date: true, accountInfo: true, bankName: true, accountNumber: true, accountOwner: true, qrCodeUrl: true, note: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Lấy thông tin bạn bè
    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true, name: true, username: true, role: true, lastSeen: true },
    });

    // Kiểm tra trạng thái đang gõ
    const typingKey = `${friendId}-${userId}`;
    const typingExpires = typingStatuses.get(typingKey) || 0;
    const isTyping = Date.now() < typingExpires;
    if (!isTyping && typingExpires > 0) {
      typingStatuses.delete(typingKey); // Cleanup expired keys
    }

    return NextResponse.json({ messages, friend, friendTyping: isTyping });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'Lỗi tải tin nhắn' }, { status: 500 });
  }
}

// POST: Gửi tin nhắn
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { receiverId, content, imageUrl, transactionId } = await request.json();
    if (!receiverId || (!content?.trim() && !imageUrl && !transactionId)) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    // Kiểm tra đã là bạn bè chưa
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: 'Chỉ có thể nhắn tin với bạn bè' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
        transactionId: transactionId || null,
      },
      include: {
        transaction: {
          select: { id: true, type: true, category: true, amount: true, status: true, transferContent: true, date: true, accountInfo: true, bankName: true, accountNumber: true, accountOwner: true, qrCodeUrl: true, note: true }
        }
      },
    });

    // Cập nhật lastSeen + push notification
    const senderName = session.user.name;
    const senderId = session.user.id;
    const msgContent = content?.trim() || '';

    try {
      await prisma.user.update({ where: { id: senderId }, data: { lastSeen: new Date() } });
    } catch {}

    try {
      const webpush = require('web-push');
      webpush.setVapidDetails(
        'mailto:admin@dualuoitinhbien.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        process.env.VAPID_PRIVATE_KEY || ''
      );

      const receiverSubs = await prisma.pushSubscription.findMany({
        where: { userId: receiverId },
      });

      if (receiverSubs.length > 0) {
        const payload = JSON.stringify({
          title: `💬 ${senderName}`,
          options: {
            body: msgContent.length > 60 ? msgContent.substring(0, 60) + '...' : (msgContent || '📷 Ảnh / 📄 Giao dịch'),
            icon: session.user.avatarUrl || '/logo.jpg',
            badge: '/logo.jpg',
            vibrate: [200, 100, 200],
            data: { url: '/' },
          },
        });

        const results = await Promise.allSettled(
          receiverSubs.map(sub =>
            webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            }, payload)
          )
        );

        results.forEach((res, idx) => {
          if (res.status === 'rejected') {
            console.error(`Push failed for sub ${idx}:`, res.reason);
          }
        });
      }
    } catch (err) {
      console.error('Push notification error:', err);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'Lỗi gửi tin nhắn' }, { status: 500 });
  }
}
