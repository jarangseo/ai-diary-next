import { auth } from '@/auth'
import { getEntries } from '@/components/Shell/entries'
import { Home } from '@/components/Home/Home'
import { DiaryHome } from './DiaryHome'

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const session = await auth()
  const { view, date } = await searchParams

  // The v1 calendar and list stay reachable by URL — old date links redirect to
  // `?view=list&date=…` — until the calendar dialog (v2.2) replaces them.
  if (view || date) {
    const diaries = session?.user?.id ? await getEntries(session.user.id) : []
    return (
      <DiaryHome diaries={diaries} view={view === 'list' ? 'list' : 'calendar'} dateFilter={date} />
    )
  }

  // Given name only (서자랑 → 자랑). A session from before this change, or a provider without
  // a given name (GitHub), falls back to the full name.
  const name = session?.user?.givenName ?? session?.user?.name ?? ''
  // Screen 5-1 whenever there are no entries, deleting them all included. The list is the
  // one the sidebar reads in this request (`getEntries` is cached), so it costs no query.
  const userId = session?.user?.id
  const firstRun = userId ? (await getEntries(userId)).length === 0 : false
  return <Home userId={userId} name={name} firstRun={firstRun} />
}
