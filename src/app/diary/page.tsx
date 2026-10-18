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

  return <Home userId={session?.user?.id} name={session?.user?.name ?? ''} />
}
