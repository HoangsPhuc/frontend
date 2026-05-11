import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow changing the main admin (prevent lock-out)
    if (id === session.user.id) {
      // You could allow them to edit themselves, but let's restrict it or handle carefully.
      // For now, let's allow editing self but maybe not changing role.
    }

    const data = await request.json();
    const { username, password, name, role } = data;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (role && id !== session.user.id) updateData.role = role; // don't change own role

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, name: true, role: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Lỗi khi cập nhật nhân viên:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Không thể xoá chính mình' }, { status: 400 });
    }

    // Optional: Check if user has transactions. If yes, we probably shouldn't hard-delete, or we reassign.
    // For simplicity, we just delete or let Prisma throw a constraint error if relations exist.
    // But User has no explicit relation to Transaction in schema right now. (Transactions are linked to Partner, not User).

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xoá nhân viên:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
