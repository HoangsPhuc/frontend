const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("Đang tiến hành xoá dữ liệu rác để chuẩn bị lên Production...");

  try {
    // Xoá toàn bộ tin nhắn
    const msgs = await prisma.message.deleteMany({});
    console.log(`- Đã xoá ${msgs.count} tin nhắn.`);

    // Xoá thông báo
    const notifs = await prisma.notification.deleteMany({});
    console.log(`- Đã xoá ${notifs.count} thông báo.`);

    // Xoá giao dịch
    const txs = await prisma.transaction.deleteMany({});
    console.log(`- Đã xoá ${txs.count} giao dịch (Phiếu thu/chi).`);

    // Xoá đối tác (Nhà vườn, Khách hàng)
    const partners = await prisma.partner.deleteMany({});
    console.log(`- Đã xoá ${partners.count} đối tác.`);

    // Lưu ý: TÀI KHOẢN (User) và QUAN HỆ BẠN BÈ (Friendship) được GIỮ NGUYÊN
    // để bạn và các nhân viên không bị mất tài khoản đăng nhập.
    
    // Nếu bạn muốn xoá luôn CẢ TÀI KHOẢN (không khuyến khích nếu bạn chưa có seed tạo admin):
    // await prisma.friendship.deleteMany({});
    // await prisma.user.deleteMany({});

    console.log("\n✅ ĐÃ HOÀN TẤT DỌN DẸP DỮ LIỆU CŨ!");
    console.log("Hệ thống đã sẵn sàng để đi vào hoạt động thực tế.");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình xoá dữ liệu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
