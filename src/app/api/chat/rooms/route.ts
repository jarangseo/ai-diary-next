import { auth } from '@/auth'
import { createRoom, getMyRooms } from '@/lib/chat'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rooms = await getMyRooms(session.user.id)

  if (!rooms) {
    return NextResponse.json({ error: 'No rooms found' }, { status: 404 })
  }

  return NextResponse.json(rooms)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date } = await request.json()
  const room = await createRoom(session.user.id, date)
  return NextResponse.json(room)
}
