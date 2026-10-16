import { auth } from '@/auth'
import { getAllDiaries } from '@/lib/diary'
import { DiaryHome } from './DiaryHome'

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const session = await auth()
  const diaries = session?.user?.id ? await getAllDiaries(session.user.id) : []

  const { view, date } = await searchParams
  return (
    <DiaryHome diaries={diaries} view={view === 'list' ? 'list' : 'calendar'} dateFilter={date} />
  )
}
