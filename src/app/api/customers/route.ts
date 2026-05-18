import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Lấy danh sách khách hàng (dùng cho autocomplete)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const customers = await prisma.customer.findMany({
      where: q
        ? { name: { contains: q } }
        : {},
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error('GET /api/customers error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách khách hàng' }, { status: 500 });
  }
}

// POST - Tạo hoặc cập nhật khách hàng (upsert by name)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, phone, note } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên khách hàng không được để trống' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Upsert: nếu đã tồn tại thì cập nhật updatedAt, nếu chưa thì tạo mới
    const customer = await prisma.customer.upsert({
      where: { name: trimmedName },
      update: {
        ...(phone !== undefined && { phone }),
        ...(note !== undefined && { note }),
        updatedAt: new Date(),
      },
      create: {
        name: trimmedName,
        phone: phone || null,
        note: note || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('POST /api/customers error:', error);
    return NextResponse.json({ error: 'Lỗi lưu khách hàng' }, { status: 500 });
  }
}
