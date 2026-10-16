import { auth } from '@/auth'
import { deleteDiary, getDiaryById, updateDiary } from '@/lib/diary'
import { isDateKey } from '@/lib/date'
import { NextResponse } from 'next/server'
import { scheduleEmotionAnalysis } from '../scheduleAnalysis'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let diary
  try {
    diary = await getDiaryById(session.user.id, id)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }

  if (!diary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(diary)
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { date, content } = await request.json()

  if (typeof date !== 'string' || !isDateKey(date) || !content) {
    return NextResponse.json(
      { error: 'date (YYYY-MM-DD) and content are required' },
      { status: 400 }
    )
  }

  const result = await updateDiary(session.user.id, id, { date, content })

  if (result === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (result === 'failed') {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  scheduleEmotionAnalysis(session.user.id, id, content)

  return NextResponse.json({ ok: true, id })
}

/**
 * Removes one entry, and with it the conversation about it — the foreign keys cascade
 * from the entry to its thread and messages. Other entries on the same date stay.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const deleted = await deleteDiary(session.user.id, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
