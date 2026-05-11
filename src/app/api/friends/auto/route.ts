import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST: Auto-friend current user with all admins (run once on login)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', id: { not: userId } },
      select: { id: true },
    });

    for (const admin of admins) {
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: admin.id },
            { senderId: admin.id, receiverId: userId },
          ],
        },
      });

      if (!existing) {
        await prisma.friendship.create({
          data: {
            senderId: admin.id,
            receiverId: userId,
            status: 'ACCEPTED',
          },
        });
      }
    }

    // Nếu mình là admin, auto-friend với tất cả user
    if (session.user.role === 'ADMIN') {
      const allUsers = await prisma.user.findMany({
        where: { id: { not: userId } },
        select: { id: true },
      });

      for (const user of allUsers) {
        const existing = await prisma.friendship.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: user.id },
              { senderId: user.id, receiverId: userId },
            ],
          },
        });

        if (!existing) {
          await prisma.friendship.create({
            data: {
              senderId: userId,
              receiverId: user.id,
              status: 'ACCEPTED',
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/friends/auto error:', error);
    return NextResponse.json({ error: 'Lỗi auto-friend' }, { status: 500 });
  }
}
