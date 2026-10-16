import { auth } from '@/auth'
import { createDiary, listDiariesByDate } from '@/lib/diary'
import { isDateKey } from '@/lib/date'
import { NextResponse } from 'next/server'
import { scheduleEmotionAnalysis } from './scheduleAnalysis'

/** Every entry on a date — a date is a filter since migration 001, not an identity. */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = new URL(request.url).searchParams.get('date')
  if (!date || !isDateKey(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
  }

  try {
    return NextResponse.json(await listDiariesByDate(session.user.id, date))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

/** Always creates a new entry; editing one goes through PATCH /api/diary/[id]. */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date, content, isRecordOnly } = await request.json()

  if (typeof date !== 'string' || !isDateKey(date) || !content) {
    return NextResponse.json(
      { error: 'date (YYYY-MM-DD) and content are required' },
      { status: 400 }
    )
  }

  const id = await createDiary(session.user.id, date, content, Boolean(isRecordOnly))

  if (!id) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  scheduleEmotionAnalysis(session.user.id, id, content)

  return NextResponse.json({ ok: true, id })
}
