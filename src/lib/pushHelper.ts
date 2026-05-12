import webpush from 'web-push';
import { prisma } from './prisma';

// Cấu hình VAPID 1 lần duy nhất
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('⚠️ VAPID keys chưa được cấu hình');
    return;
  }
  webpush.setVapidDetails('mailto:admin@dualuoitinhbien.com', VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    vibrate?: number[];
    data?: Record<string, unknown>;
    actions?: Array<{ action: string; title: string }>;
  };
}

/**
 * Gửi push notification đến một user cụ thể.
 * Tự động:
 * - Set TTL + urgency để vượt Doze mode
 * - Xóa subscription hết hạn/lỗi (410, 404, 403, 401)
 * - Log chi tiết để debug
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number; cleaned: number }> {
  ensureVapid();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr,
        {
          TTL: 86400,       // Giữ notification 24h nếu thiết bị offline
          urgency: 'high',  // Ưu tiên cao, vượt qua Android Doze mode
        }
      )
    )
  );

  for (let idx = 0; idx < results.length; idx++) {
    const res = results[idx];
    if (res.status === 'fulfilled') {
      sent++;
    } else {
      failed++;
      const statusCode = res.reason?.statusCode;
      console.error(
        `[Push] Failed for user ${userId}, sub #${idx}, status: ${statusCode}`,
        res.reason?.body || res.reason?.message || ''
      );

      // Xóa subscription không còn hợp lệ
      // 410 Gone: subscription expired
      // 404 Not Found: endpoint không tồn tại
      // 403 Forbidden: VAPID mismatch (subscription từ VAPID key cũ)
      // 401 Unauthorized: authentication failed
      if ([410, 404, 403, 401].includes(statusCode)) {
        try {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: subscriptions[idx].endpoint },
          });
          cleaned++;
          console.log(`[Push] Cleaned invalid subscription for user ${userId} (status ${statusCode})`);
        } catch (delErr) {
          console.error('[Push] Error cleaning subscription:', delErr);
        }
      }
    }
  }

  return { sent, failed, cleaned };
}

/**
 * Gửi push notification đến tất cả admin.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<{ sent: number; failed: number; cleaned: number }> {
  ensureVapid();

  const adminSubscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: 'ADMIN' } },
    include: { user: { select: { id: true } } },
  });

  if (adminSubscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  const results = await Promise.allSettled(
    adminSubscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr,
        {
          TTL: 86400,
          urgency: 'high',
        }
      )
    )
  );

  for (let idx = 0; idx < results.length; idx++) {
    const res = results[idx];
    if (res.status === 'fulfilled') {
      sent++;
    } else {
      failed++;
      const statusCode = res.reason?.statusCode;
      console.error(
        `[Push] Failed for admin sub #${idx}, status: ${statusCode}`,
        res.reason?.body || res.reason?.message || ''
      );

      if ([410, 404, 403, 401].includes(statusCode)) {
        try {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: adminSubscriptions[idx].endpoint },
          });
          cleaned++;
          console.log(`[Push] Cleaned invalid admin subscription (status ${statusCode})`);
        } catch (delErr) {
          console.error('[Push] Error cleaning subscription:', delErr);
        }
      }
    }
  }

  return { sent, failed, cleaned };
}
