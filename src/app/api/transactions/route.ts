import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const categoryLabels: Record<string, string> = {
  ban_hang: 'Bán hàng',
  thu_no: 'Thu nợ',
  thu_khac: 'Thu khác',
  tien_xang: 'Tiền xăng',
  nhap_hang: 'Nhập hàng',
  tra_no_vuon: 'Trả nợ vườn',
  tien_com: 'Tiền cơm',
  vat_tu: 'Vật tư',
  chi_khac: 'Khác',
};

// ...


// GET - Lấy danh sách giao dịch
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // "THU" | "CHI" | null (all)

    const where: any = type ? { type } : {};
    
    // NẾU LÀ STAFF -> CHỈ LẤY GIAO DỊCH DO CHÍNH HỌ TẠO
    if (session.user.role === 'STAFF') {
      where.userId = session.user.id;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { partner: true, user: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total });
  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json({ error: 'Lỗi tải dữ liệu' }, { status: 500 });
  }
}

// POST - Tạo giao dịch mới
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { type, category, amount, transferContent, accountInfo, bankName, accountNumber, accountOwner, bankAccountId, qrCodeUrl, note, date, partnerId, isEditRequest, originalTransactionId } = body;

    // Validation
    if (!type || !category || !amount) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc (loại, danh mục, số tiền)' },
        { status: 400 }
      );
    }

    if (!['THU', 'CHI'].includes(type)) {
      return NextResponse.json(
        { error: 'Loại giao dịch không hợp lệ' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Số tiền phải lớn hơn 0' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        category,
        amount: parseFloat(amount),
        transferContent: transferContent || null,
        accountInfo: accountInfo || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountOwner: accountOwner || null,
        bankAccountId: bankAccountId || null,
        qrCodeUrl: qrCodeUrl || null,
        note: note || null,
        date: date ? new Date(date) : new Date(),
        partnerId: partnerId || null,
        isEditRequest: isEditRequest || false,
        originalTransactionId: originalTransactionId || null,
        userId: session.user.id,
        status: session.user.role === 'STAFF' ? 'PENDING' : 'APPROVED', // Nhân viên tạo mặc định là chờ duyệt
      },
      include: { partner: true },
    });

    // Nếu là nhân viên tạo (chờ duyệt), gửi thông báo in-app và push
    if (session.user.role === 'STAFF') {
      const numericAmount = Number(amount) || 0;
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

      // Tạo thông báo cho các Admin
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: isEditRequest ? `Yêu cầu sửa đổi từ ${session.user.name}` : `Yêu cầu thanh toán từ ${session.user.name}`,
          message: `${transferContent || categoryLabels[category] || category} (${numericAmount.toLocaleString('vi-VN')}đ)`,
          type: 'NEW_REQUEST',
          transactionId: transaction.id
        }))
      });

      try {
        const { sendPushToAdmins } = await import('@/lib/pushHelper');

        const pendingCount = await prisma.transaction.count({
          where: { status: 'PENDING' }
        });

        const result = await sendPushToAdmins({
          title: `🔔 Yêu cầu từ ${session.user.name}`,
          options: {
            body: `Có ${pendingCount} đơn mới đang chờ duyệt!\nNội dung: ${isEditRequest ? '[YÊU CẦU SỬA] ' : ''}${transferContent || categoryLabels[category] || category}`,
            icon: session.user.avatarUrl || '/logo.jpg',
            badge: '/logo.jpg',
            vibrate: [600, 200, 600, 200, 800],
            tag: 'new-transaction', // Gom notification cùng loại
            data: { url: '/' },
            actions: [
              { action: 'open', title: '📋 Mở duyệt ngay' },
              { action: 'dismiss', title: 'Bỏ qua' },
            ]
          }
        });
        console.log(`[Push] Transaction notification: ${result.sent} sent, ${result.failed} failed, ${result.cleaned} cleaned`);
      } catch (err) {
        console.error('[Push] Transaction notification error:', err);
      }
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('POST /api/transactions error:', error);
    return NextResponse.json({ error: 'Lỗi tạo giao dịch' }, { status: 500 });
  }
}
