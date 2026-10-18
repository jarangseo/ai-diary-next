import { auth } from '@/auth'
import { getSettings, initSettings, updateSettings, type SettingsWriteResult } from '@/lib/settings'
import { NextResponse } from 'next/server'

// Every handler acts on the session's user only. No handler reads a user id from the
// request, so there is no way to address someone else's settings.

function respond(result: SettingsWriteResult) {
  if (result === 'invalid') {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
  }
  if (result === 'failed') {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await getSettings(session.user.id))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

/** First visit: the browser's time zone and locale. Ignored once a row exists. */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { timezone, locale } = await request.json().catch(() => ({}))
  return respond(await initSettings(session.user.id, { timezone, locale }))
}

/** The user changing a setting. */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { memoryEnabled, timezone, locale } = await request.json().catch(() => ({}))
  return respond(await updateSettings(session.user.id, { memoryEnabled, timezone, locale }))
}
