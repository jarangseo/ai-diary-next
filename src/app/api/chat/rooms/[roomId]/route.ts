import { auth } from '@/auth'
import { getRoom } from '@/lib/chat'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId } = await params
  // Members only: a room the caller is not in answers exactly like one that does not exist.
  const data = await getRoom(session.user.id, roomId)

  if (!data) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  return NextResponse.json(data)
}
