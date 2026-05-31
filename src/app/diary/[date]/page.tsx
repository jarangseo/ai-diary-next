import { auth } from '@/auth'
import { getDiary } from '@/lib/diary'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/BackButton/BackButton'
import styles from './page.module.scss'

export default async function DiaryDetailPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  const { date } = await params
  const diary = await getDiary(session.user.id, date)
  if (!diary) return notFound()

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <BackButton className={styles.backButton} />
        <time className={styles.date}>{diary.date}</time>
        {diary.emotion && (
          <span className={styles.emotion}>{diary.emotion.primary}</span>
        )}
      </header>
      <div className={styles.content}>{diary.content}</div>
    </article>
  )
}
