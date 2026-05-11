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

// PUT - Cập nhật giao dịch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { type, category, amount, transferContent, accountInfo, bankName, accountNumber, accountOwner, bankAccountId, qrCodeUrl, note, date, partnerId, status, rejectReason } = body;

    // Kiểm tra giao dịch tồn tại
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });
    }

    if (session.user.role === 'STAFF') {
      return NextResponse.json({ error: 'Bạn không có quyền sửa trực tiếp, vui lòng gửi yêu cầu sửa' }, { status: 403 });
    }

    // Xử lý khi Admin duyệt/từ chối YÊU CẦU SỬA
    if (session.user.role === 'ADMIN' && existing.isEditRequest && existing.originalTransactionId) {
      if (status === 'APPROVED') {
        try {
          // Cập nhật giao dịch gốc
          await prisma.transaction.update({
            where: { id: existing.originalTransactionId },
            data: {
              type: existing.type,
              category: existing.category,
              amount: existing.amount,
              transferContent: existing.transferContent,
              accountInfo: existing.accountInfo,
              bankName: existing.bankName,
              accountNumber: existing.accountNumber,
              accountOwner: existing.accountOwner,
              qrCodeUrl: existing.qrCodeUrl,
              note: existing.note,
              date: existing.date,
              partnerId: existing.partnerId,
              bankAccountId: bankAccountId !== undefined ? bankAccountId : existing.bankAccountId,
            }
          });
          // Thông báo cho nhân viên
          if (existing.userId) {
            await prisma.notification.create({
              data: {
                userId: existing.userId,
                title: 'Đề xuất sửa đã được duyệt',
                message: `Yêu cầu sửa giao dịch ${existing.transferContent || categoryLabels[existing.category] || existing.category} đã được duyệt.`,
                type: 'APPROVED',
                transactionId: existing.originalTransactionId,
              }
            });
          }
          // Xóa yêu cầu sửa
          await prisma.transaction.delete({ where: { id } });
          return NextResponse.json({ success: true, message: 'Đã duyệt yêu cầu sửa và cập nhật giao dịch gốc' });
        } catch (error) {
          // Xóa luôn yêu cầu sửa nếu giao dịch gốc không còn
          await prisma.transaction.delete({ where: { id } });
          return NextResponse.json({ error: 'Giao dịch gốc đã bị xóa trước đó. Đã hủy yêu cầu sửa.' }, { status: 404 });
        }
      } else if (status === 'REJECTED') {
        // Thông báo cho nhân viên
        if (existing.userId) {
          await prisma.notification.create({
            data: {
              userId: existing.userId,
              title: 'Đề xuất sửa bị từ chối',
              message: `Yêu cầu sửa giao dịch ${existing.transferContent || categoryLabels[existing.category] || existing.category} đã bị từ chối.\nLý do: ${rejectReason || 'Không có'}`,
              type: 'REJECTED',
            }
          });
        }
        // Từ chối thì xóa yêu cầu sửa
        await prisma.transaction.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'Đã từ chối yêu cầu sửa' });
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(category && { category }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(transferContent !== undefined && { transferContent }),
        ...(accountInfo !== undefined && { accountInfo }),
        ...(bankName !== undefined && { bankName }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(accountOwner !== undefined && { accountOwner }),
        ...(bankAccountId !== undefined && { bankAccountId }),
        ...(qrCodeUrl !== undefined && { qrCodeUrl }),
        note: (status === 'REJECTED' && rejectReason) ? ((note !== undefined ? note : (existing.note || '')) + `\n(Lý do từ chối: ${rejectReason})`).trim() : (note !== undefined ? note : existing.note),
        ...(date && { date: new Date(date) }),
        partnerId: partnerId !== undefined ? partnerId : existing.partnerId,
        ...(status && session.user.role === 'ADMIN' && { status }), // Chỉ Admin mới được sửa trạng thái (duyệt)
      },
      include: { partner: true },
    });

    if (status && status !== existing.status && session.user.role === 'ADMIN' && transaction.userId) {
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: status === 'APPROVED' ? 'Giao dịch đã được duyệt' : 'Giao dịch bị từ chối',
          message: `Giao dịch ${transaction.transferContent || categoryLabels[transaction.category] || transaction.category} (${transaction.amount.toLocaleString('vi-VN')}đ) đã bị ${status === 'APPROVED' ? 'duyệt' : 'từ chối'}.${status === 'REJECTED' && rejectReason ? `\nLý do: ${rejectReason}` : ''}`,
          type: status,
          transactionId: status === 'APPROVED' ? transaction.id : null,
        }
      });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('PUT /api/transactions/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật giao dịch' }, { status: 500 });
  }
}

// DELETE - Xóa giao dịch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });
    }

    if (session.user.role === 'STAFF') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa giao dịch' }, { status: 403 });
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa giao dịch' });
  } catch (error) {
    console.error('DELETE /api/transactions/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi xóa giao dịch' }, { status: 500 });
  }
}
