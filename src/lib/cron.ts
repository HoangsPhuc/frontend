import { prisma } from './prisma';
import { sendPushToAdmins } from './pushHelper';

export function initCron() {
  // Đảm bảo cron chỉ được khởi chạy 1 lần duy nhất (ngay cả trong môi trường dev)
  if ((globalThis as any)._cronStarted) return;
  (globalThis as any)._cronStarted = true;

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('⚠️ Thiếu VAPID keys, không thể khởi chạy Cron job Push Notification');
    return;
  }

  console.log('✅ Cron job started: Sẽ kiểm tra giao dịch PENDING mỗi 15 phút');

  // Chạy lặp lại mỗi 15 phút (thay vì 1 phút để tránh bị browser throttle push)
  setInterval(async () => {
    try {
      // Tìm xem có bao nhiêu đơn đang PENDING
      const pendingCount = await prisma.transaction.count({
        where: { status: 'PENDING' }
      });

      // Nếu có đơn chưa duyệt, gửi thông báo nhắc nhở
      if (pendingCount > 0) {
        const result = await sendPushToAdmins({
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

        if (result.sent > 0) {
          console.log(`[Cron] Reminder sent: ${result.sent} ok, ${result.failed} fail, ${result.cleaned} cleaned`);
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  }, 15 * 60 * 1000); // 15 phút
}
