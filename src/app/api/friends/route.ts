import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Lấy danh sách bạn bè, lời mời đang chờ, và tất cả user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  try {
    // Cập nhật lastSeen
    await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } });

    // Lấy tất cả friendships liên quan
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, name: true, username: true, role: true, lastSeen: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, username: true, role: true, lastSeen: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Phân loại
    const friends = friendships
      .filter(f => f.status === 'ACCEPTED')
      .map(f => ({ ...(f.senderId === userId ? f.receiver : f.sender), friendshipId: f.id }));

    const pendingReceived = friendships
      .filter(f => f.status === 'PENDING' && f.receiverId === userId)
      .map(f => ({ ...f.sender, friendshipId: f.id }));

    const pendingSent = friendships
      .filter(f => f.status === 'PENDING' && f.senderId === userId)
      .map(f => ({ ...f.receiver, friendshipId: f.id }));

    // Lấy tất cả user (trừ mình)
    const allUsers = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, username: true, role: true, lastSeen: true, avatarUrl: true },
    });

    // Đánh dấu trạng thái cho mỗi user
    const friendIds = new Set(friends.map(f => f.id));
    const pendingSentIds = new Set(pendingSent.map(f => f.id));
    const pendingReceivedIds = new Set(pendingReceived.map(f => f.id));

    const usersWithStatus = allUsers.map(u => ({
      ...u,
      friendStatus: friendIds.has(u.id) ? 'FRIEND'
        : pendingSentIds.has(u.id) ? 'PENDING_SENT'
        : pendingReceivedIds.has(u.id) ? 'PENDING_RECEIVED'
        : 'NONE',
    }));

    // Đếm tin nhắn chưa đọc theo từng bạn
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: { receiverId: userId, isRead: false },
      _count: true,
    });
    const unreadMap: Record<string, number> = {};
    unreadCounts.forEach(u => { unreadMap[u.senderId] = u._count; });

    return NextResponse.json({
      friends,
      pendingReceived,
      pendingSent,
      allUsers: usersWithStatus,
      unreadMap,
    });
  } catch (error) {
    console.error('GET /api/friends error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách bạn bè' }, { status: 500 });
  }
}

// POST: Gửi lời mời kết bạn
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { receiverId } = await request.json();
    if (!receiverId) return NextResponse.json({ error: 'Thiếu receiverId' }, { status: 400 });

    // Kiểm tra đã có friendship chưa
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Đã gửi lời mời hoặc đã là bạn bè' }, { status: 400 });
    }

    const friendship = await prisma.friendship.create({
      data: { senderId: session.user.id, receiverId },
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error('POST /api/friends error:', error);
    return NextResponse.json({ error: 'Lỗi gửi lời mời' }, { status: 500 });
  }
}

// PUT: Chấp nhận / Từ chối lời mời
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { friendshipId, action } = await request.json(); // action: 'ACCEPTED' | 'REJECTED'

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Không tìm thấy lời mời' }, { status: 404 });
    }

    if (action === 'REJECTED') {
      await prisma.friendship.delete({ where: { id: friendshipId } });
      return NextResponse.json({ success: true, action: 'REJECTED' });
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/friends error:', error);
    return NextResponse.json({ error: 'Lỗi xử lý lời mời' }, { status: 500 });
  }
}

// DELETE: Hủy kết bạn hoặc hủy lời mời
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const friendshipId = searchParams.get('friendshipId');
    if (!friendshipId) return NextResponse.json({ error: 'Thiếu friendshipId' }, { status: 400 });

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    if (friendship.senderId !== session.user.id && friendship.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/friends error:', error);
    return NextResponse.json({ error: 'Lỗi hủy kết bạn' }, { status: 500 });
  }
}
