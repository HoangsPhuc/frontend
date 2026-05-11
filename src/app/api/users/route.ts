import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách nhân viên:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await request.json();
    const { username, password, name, role } = data;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Check if username exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role || 'STAFF',
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });

    // Tự động kết bạn với tất cả Admin
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', id: { not: newUser.id } },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.friendship.createMany({
        data: admins.map(admin => ({
          senderId: admin.id,
          receiverId: newUser.id,
          status: 'ACCEPTED',
        })),
      });
    }

    // Nếu user mới là Admin, tự động kết bạn với tất cả user hiện có
    if (newUser.role === 'ADMIN') {
      const allUsers = await prisma.user.findMany({
        where: { id: { not: newUser.id } },
        select: { id: true },
      });
      if (allUsers.length > 0) {
        await prisma.friendship.createMany({
          data: allUsers.map(u => ({
            senderId: newUser.id,
            receiverId: u.id,
            status: 'ACCEPTED',
          })),
        });
      }
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Lỗi khi tạo nhân viên:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
