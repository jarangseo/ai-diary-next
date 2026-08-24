import { auth } from '@/auth'
import { deleteDiary, getDiary } from '@/lib/diary'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date } = await params
  const diary = await getDiary(session.user.id, date)

  if (!diary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(diary)
}

/**
 * Removes the entry for a date, and with it the conversation about it — the foreign keys
 * cascade from the entry to its thread and messages.
 *
 * Keyed by date like the rest of this API. Migration 001 allows more than one entry on a
 * date, so this would take all of them; the writing flow still produces one, and moving
 * the whole API to ids is filed as debt in docs/TODAY_PLAN.md.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { date } = await params
  const deleted = await deleteDiary(session.user.id, date)

  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
