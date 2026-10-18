import { auth } from '@/auth'
import { getEntries } from '@/components/Shell/entries'
import { DiaryHome } from './DiaryHome'

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const session = await auth()
  const diaries = session?.user?.id ? await getEntries(session.user.id) : []

  const { view, date } = await searchParams
  return (
    <DiaryHome diaries={diaries} view={view === 'list' ? 'list' : 'calendar'} dateFilter={date} />
  )
}
