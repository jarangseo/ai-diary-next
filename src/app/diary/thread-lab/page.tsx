import { auth } from '@/auth'
import { listMessages, getThread } from '@/lib/threads'
import { ThreadPanel } from '@/components/Thread/ThreadPanel'
import { redirect } from 'next/navigation'

// Temporary measurement surface, not a product route — the thread lands beside the
// entry on /diary/[id] once the date-keyed routing debt is paid (see CLAUDE.md).
//
// It is a server component on purpose. The 60 seeded messages are read straight from
// lib/ and arrive as HTML, so there is no GET endpoint, no client fetch, and no spinner
// on first paint. Only the live conversation is client work — that split is the
// server/client boundary this project keeps arguing for.
const LAB_THREAD_ID = 'e1016e9c-6668-4fe1-b973-f4bfa4cebc94'

export default async function ThreadLabPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const thread = await getThread(session.user.id, LAB_THREAD_ID)
  if (!thread) {
    return (
      <p style={{ padding: 24 }}>스레드를 찾을 수 없어요. `pnpm seed` 를 먼저 실행해 주세요.</p>
    )
  }

  const initialMessages = await listMessages(thread.id)

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex' }}>
      <div style={{ flex: 1, padding: 24 }}>
        <h1 style={{ fontSize: 18 }}>{thread.title}</h1>
        <p style={{ fontSize: 13, opacity: 0.7 }}>메시지 {initialMessages.length}개</p>
      </div>
      <div style={{ width: 460 }}>
        <ThreadPanel threadId={thread.id} initialMessages={initialMessages} />
      </div>
    </div>
  )
}
