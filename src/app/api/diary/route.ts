import { auth } from '@/auth'
import { saveDiary, analyzeAndStoreEmotion } from '@/lib/diary'
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

  // Synchronously attach emotion analysis (best-effort: the save above already
  // succeeded, so a null/failed analysis just leaves the entry without emotion).
  const emotion = await analyzeAndStoreEmotion(session.user.id, date, content)

  return NextResponse.json({ ok: true, emotion })
}
