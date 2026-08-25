import { auth } from '@/auth'
import { deleteAllUserData } from '@/lib/diary'
import { NextResponse } from 'next/server'

/**
 * Account withdrawal: removes every entry, thread and message belonging to the caller.
 *
 * Required before this app is linked publicly. A privacy notice cannot say entries are
 * kept "until withdrawal" when there is no way to withdraw, and diaries are about as
 * personal as stored data gets.
 *
 * Nothing else about the account is stored — the name, email and picture live only in the
 * session cookie, which the client clears by signing out — so this is the whole of it.
 */
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deleted = await deleteAllUserData(session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete account data' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
