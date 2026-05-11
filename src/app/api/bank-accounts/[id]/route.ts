import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, bankName, accountNumber, accountOwner, icon, color, initBalance } = body;

    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 404 });
    }

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(name && { name }),
        bankName: bankName !== undefined ? bankName : existing.bankName,
        accountNumber: accountNumber !== undefined ? accountNumber : existing.accountNumber,
        accountOwner: accountOwner !== undefined ? accountOwner : existing.accountOwner,
        ...(icon && { icon }),
        ...(color && { color }),
        ...(initBalance !== undefined && { initBalance: parseFloat(initBalance) || 0 }),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Lỗi cập nhật tài khoản:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 404 });
    }

    await prisma.bankAccount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi xoá tài khoản:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
