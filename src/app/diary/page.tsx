import { auth } from '@/auth'
import { getAllDiaries } from '@/lib/diary'
import { DiaryHome } from './DiaryHome'

export default async function DiaryPage() {
  const session = await auth()
  const diaries = session?.user?.id
    ? await getAllDiaries(session.user.id)
    : []

  return <DiaryHome diaries={diaries} />
}
