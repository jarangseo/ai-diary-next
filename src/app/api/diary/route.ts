import { auth } from '@/auth'
import { saveDiary, analyzeAndStoreEmotion } from '@/lib/diary'
import { countUserMessagesToday } from '@/lib/threads'
import { isOverDailyLimit } from '@/lib/usage'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date, content, isRecordOnly } = await request.json()

  if (!date || !content) {
    return NextResponse.json({ error: 'date and content are required' }, { status: 400 })
  }

  const success = await saveDiary(session.user.id, date, content, isRecordOnly)

  if (!success) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Analysis is a model call too, so it answers to the same daily cap — otherwise the
  // guard on the conversation would just move the spending here. Saving is never blocked
  // by it: writing the diary is the half of the product that must always work, and an
  // entry without emotion is a smaller loss than an entry that would not save.
  const used = await countUserMessagesToday(session.user.id)
  const emotion =
    used !== null && !isOverDailyLimit(used)
      ? await analyzeAndStoreEmotion(session.user.id, date, content)
      : null

  return NextResponse.json({ ok: true, emotion })
}
