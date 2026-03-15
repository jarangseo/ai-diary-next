import { auth } from '@/auth'
import { getMessages } from '@/lib/chat'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { roomId } = await params
  const messages = await getMessages(roomId)
  return NextResponse.json(messages)
}
