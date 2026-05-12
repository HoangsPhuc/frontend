import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/pushHelper';

// GET: Kiểm tra trạng thái push subscription của user hiện tại
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy tất cả subscription của user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        endpoint: true,
        createdAt: true,
        // Không trả keys vì lý do bảo mật
      }
    });

    // Lấy tất cả subscription (để xem toàn bộ hệ thống)
    const allSubsCount = await prisma.pushSubscription.count();
    const allSubsByUser = await prisma.pushSubscription.groupBy({
      by: ['userId'],
      _count: true,
    });

    // Kiểm tra VAPID keys
    const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      },
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 80) + '...',
        createdAt: s.createdAt,
      })),
      subscriptionCount: subscriptions.length,
      system: {
        totalSubscriptions: allSubsCount,
        subscriptionsByUser: allSubsByUser,
        vapidPublicKeySet: hasVapidPublic,
        vapidPrivateKeySet: hasVapidPrivate,
        vapidPublicKeyPreview: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 20) + '...',
      },
    });
  } catch (error: any) {
    console.error('[Push Test] GET error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// POST: Gửi test push notification đến chính mình
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Kiểm tra có subscription không
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'KHÔNG CÓ SUBSCRIPTION trong DB!',
        diagnosis: 'Client chưa đăng ký push hoặc subscription bị lỗi khi lưu vào DB',
        steps: [
          '1. Kiểm tra Notification.permission trên trình duyệt',
          '2. Vào Cài đặt > bật thông báo đẩy',
          '3. Kiểm tra console log cho lỗi auto-subscribe',
        ]
      }, { status: 404 });
    }

    console.log(`[Push Test] Sending test to user ${userId}, ${subscriptions.length} subs`);
    
    // Gửi test push
    const result = await sendPushToUser(userId, {
      title: '🧪 Test Push Notification',
      options: {
        body: `Nếu bạn thấy thông báo này, push đang hoạt động! (${new Date().toLocaleTimeString('vi-VN')})`,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        tag: 'test-push',
        vibrate: [200, 100, 200],
        data: { url: '/' },
      },
    });

    return NextResponse.json({
      success: result.sent > 0,
      result,
      subscriptionCount: subscriptions.length,
      diagnosis: result.sent > 0
        ? '✅ Push đã gửi thành công! Nếu không thấy thông báo → kiểm tra Service Worker'
        : result.failed > 0
          ? `❌ Push thất bại! ${result.cleaned} subscription đã bị xóa do hết hạn`
          : '❌ Không có subscription nào hợp lệ',
    });
  } catch (error: any) {
    console.error('[Push Test] POST error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
