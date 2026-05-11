import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        transactions: {
          where: { status: 'APPROVED' },
          select: { type: true, amount: true }
        }
      }
    });

    // Tính số dư cho từng tài khoản
    const accountsWithBalance = accounts.map(acc => {
      let balance = acc.initBalance;
      acc.transactions.forEach(tx => {
        if (tx.type === 'THU') balance += tx.amount;
        if (tx.type === 'CHI') balance -= tx.amount;
      });
      
      return {
        id: acc.id,
        name: acc.name,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        accountOwner: acc.accountOwner,
        icon: acc.icon,
        color: acc.color,
        initBalance: acc.initBalance,
        balance,
        createdAt: acc.createdAt,
      };
    });

    return NextResponse.json(accountsWithBalance);
  } catch (error) {
    console.error('Lỗi lấy danh sách tài khoản:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bankName, accountNumber, accountOwner, icon, color, initBalance } = body;

    if (!name) {
      return NextResponse.json({ error: 'Thiếu tên tài khoản' }, { status: 400 });
    }

    const account = await prisma.bankAccount.create({
      data: {
        name,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountOwner: accountOwner || null,
        icon: icon || 'Wallet',
        color: color || 'blue',
        initBalance: initBalance ? parseFloat(initBalance) : 0,
      }
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo tài khoản:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
