import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { typingStatuses } from '@/lib/typingStore';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { receiverId, isTyping = true } = await request.json();
    if (!receiverId) return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });

    const key = `${session.user.id}-${receiverId}`;
    
    if (isTyping) {
      // Mark the sender as typing to the receiver. Expires in 4 seconds.
      typingStatuses.set(key, Date.now() + 4000);
    } else {
      // Immediately clear typing status
      typingStatuses.delete(key);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/messages/typing error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
