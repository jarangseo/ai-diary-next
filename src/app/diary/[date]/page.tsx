import { auth } from '@/auth'
import { getDiary } from '@/lib/diary'
import { getOrCreateThreadForDiary, listMessages } from '@/lib/threads'
import { ThreadPanel } from '@/components/Thread/ThreadPanel'
import { DeleteEntryButton } from '@/components/Diary/DeleteEntryButton'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PencilIcon } from 'lucide-react'
import { BackButton } from '@/components/BackButton/BackButton'
import { formatDateLabel } from '@/lib/date'
import { getEmotionMeta } from '@/lib/emotion'
import styles from './page.module.scss'

export default async function DiaryDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  const { date } = await params
  const diary = await getDiary(session.user.id, date)
  if (!diary) return notFound()

  // Sequential on purpose, unlike the parallel queries elsewhere: each call genuinely
  // needs the previous one's id. Collapsing all three into one embedded read
  // (`diaries?select=*,threads(*,messages(*))`) is the obvious follow-up — see the note
  // in docs/TODAY_PLAN.md — but it cannot express "create if absent", so it only helps
  // the common case.
  const thread = await getOrCreateThreadForDiary(session.user.id, diary.id, diary.title ?? '대화')
  const messages = thread ? await listMessages(thread.id) : []

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
        <div className={styles.actions}>
          {meta && (
            <span
              className={styles.emotion}
              style={{ color: meta.color, backgroundColor: `${meta.color}22` }}
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
            </span>
          )}
          <Link
            href={`/diary/write?date=${diary.date}`}
            className={styles.editButton}
            aria-label="수정"
          >
            <PencilIcon size={16} />
            수정
          </Link>
          <DeleteEntryButton date={diary.date} />
        </div>
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

      {thread && (
        <section className={styles.thread} aria-label="이 일기에 대한 대화">
          <ThreadPanel
            threadId={thread.id}
            initialMessages={messages}
            // The deterministic stream in the test environment, the model everywhere
            // else. E2E_AUTH_SECRET is already the "this is a test run" gate (it is what
            // makes the test sign-in provider exist), and reusing it keeps the suite from
            // spending a model call per run.
            bench={Boolean(process.env.E2E_AUTH_SECRET)}
          />
        </section>
      )}
    </article>
  )
}
