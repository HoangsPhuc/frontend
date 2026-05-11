import { prisma } from './prisma';
import webpush from 'web-push';

export function initCron() {
  // Đảm bảo cron chỉ được khởi chạy 1 lần duy nhất (ngay cả trong môi trường dev)
  if ((globalThis as any)._cronStarted) return;
  (globalThis as any)._cronStarted = true;

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('⚠️ Thiếu VAPID keys, không thể khởi chạy Cron job Push Notification');
    return;
  }

  webpush.setVapidDetails(
    'mailto:admin@dualuoitinhbien.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  console.log('✅ Cron job started: Sẽ kiểm tra giao dịch PENDING mỗi 1 phút');

  // Chạy lặp lại mỗi 1 phút (60,000 milliseconds)
  setInterval(async () => {
    try {
      // Tìm xem có bao nhiêu đơn đang PENDING
      const pendingCount = await prisma.transaction.count({
        where: { status: 'PENDING' }
      });

      // Nếu có đơn chưa duyệt, gửi thông báo nhắc nhở
      if (pendingCount > 0) {
        const adminSubscriptions = await prisma.pushSubscription.findMany({
          where: { user: { role: 'ADMIN' } }
        });

        if (adminSubscriptions.length === 0) return;

        const payload = JSON.stringify({
          title: '⏰ Nhắc nhở duyệt chi',
          options: {
            body: `Bạn vẫn còn ${pendingCount} đơn chưa duyệt! Vui lòng vào ứng dụng để kiểm tra.`,
            icon: '/logo.jpg',
            badge: '/logo.jpg',
            tag: 'pending-payment', // Dùng chung tag để đè lên thông báo cũ (tránh đầy màn hình)
            requireInteraction: true,
            vibrate: [600, 200, 600, 200, 800],
            data: { url: '/' },
            actions: [
              { action: 'open', title: '📋 Mở duyệt ngay' },
              { action: 'dismiss', title: 'Bỏ qua' },
            ]
          }
        });

        await Promise.allSettled(
          adminSubscriptions.map(sub =>
            webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload)
          )
        );
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  }, 60 * 1000);
}
