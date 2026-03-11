import { auth } from '@/auth'
import { saveDiary } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date, content, isRecordOnly } = await request.json()

  if (!date || !content) {
    return NextResponse.json(
      { error: 'date and content are required' },
      { status: 400 }
    )
  }

  const success = await saveDiary(session.user.id, date, content, isRecordOnly)

  if (!success) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
