import { auth } from '@/auth'
import { getDiary } from '@/lib/diary'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/BackButton/BackButton'
import { formatDateLabel } from '@/lib/date'
import { getEmotionMeta } from '@/lib/emotion'
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

  const emotion = diary.emotion
  const meta = emotion ? getEmotionMeta(emotion.primary) : undefined
  const questions = emotion?.questions ?? []

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <BackButton className={styles.backButton} />
        <time className={styles.date} dateTime={diary.date}>
          {formatDateLabel(diary.date)}
        </time>
        {meta && (
          <span
            className={styles.emotion}
            style={{ color: meta.color, backgroundColor: `${meta.color}22` }}
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
          </span>
        )}
      </header>

      <div className={styles.content}>{diary.content}</div>

      {emotion && (emotion.summary || questions.length > 0) && (
        <section className={styles.reflection} aria-label="감정 분석">
          {emotion.summary && <p className={styles.summary}>{emotion.summary}</p>}
          {questions.length > 0 && (
            <div className={styles.questions}>
              <h2 className={styles.questionsTitle}>돌아보기</h2>
              <ul>
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </article>
  )
}
