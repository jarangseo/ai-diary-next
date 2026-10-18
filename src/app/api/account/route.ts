import { auth } from '@/auth'
import { deleteAllUserData } from '@/lib/diary'
import { deleteSettings } from '@/lib/settings'
import { NextResponse } from 'next/server'

/**
 * Account withdrawal: removes every entry, thread and message belonging to the caller,
 * and their chat-room data.
 *
 * Required before this app is linked publicly. A privacy notice cannot say entries are
 * kept "until withdrawal" when there is no way to withdraw, and diaries are about as
 * personal as stored data gets.
 *
 * Besides the diaries, the only stored thing is the user's settings row (time zone, locale,
 * memory). The name, email and picture live only in the session cookie, which the client
 * clears by signing out — so these two deletes are the whole of it.
 */
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Settings after the diaries: if this fails the user retries, and both deletes are
  // idempotent, so a half-done withdrawal finishes on the second try.
  const deleted =
    (await deleteAllUserData(session.user.id)) && (await deleteSettings(session.user.id))
  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete account data' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
