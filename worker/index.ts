/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;
export {};

// Custom Service Worker - Xử lý thông báo đẩy cho PWA

// Khi người dùng bấm vào thông báo trên thanh trạng thái -> mở lại app
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  // Nếu bấm "Bỏ qua" thì không làm gì
  if (event.action === 'dismiss') return;

  // Mở app hoặc focus vào tab hiện tại
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu đã có tab mở -> focus vào đó
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }
      // Nếu chưa có tab nào -> mở tab mới
      if (self.clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return self.clients.openWindow(url);
      }
    })
  );
});

// Khi nhận được push từ server (app đang đóng/chạy nền)
self.addEventListener('push', (event: PushEvent) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'Thông báo mới';
    const options = data.options || {
      body: 'Bạn có yêu cầu mới',
      icon: '/logo.jpg',
      badge: '/logo.jpg',
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});
