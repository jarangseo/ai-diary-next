import { auth } from '@/auth'
import { getRoomByInviteCode, joinRoom } from '@/lib/chat'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { inviteCode } = await request.json()

  const room = await getRoomByInviteCode(inviteCode)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  await joinRoom(session.user.id, room.id)
  return NextResponse.json(room)
}
