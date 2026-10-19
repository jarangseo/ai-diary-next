import { auth } from '@/auth'
import { getDiaryById } from '@/lib/diary'
import { countUserMessagesToday, getOrCreateThreadForDiary, listMessages } from '@/lib/threads'
import { DAILY_MESSAGE_LIMIT } from '@/lib/usage'
import { ThreadPanel } from '@/components/Thread/ThreadPanel'
import { ChatEntry } from '@/components/ChatEntry/ChatEntry'
import { DeleteEntryButton } from '@/components/Diary/DeleteEntryButton'
import { EmotionPending } from '@/components/Diary/EmotionPending'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PencilIcon } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { BackButton } from '@/components/BackButton/BackButton'
import { formatDateLabel, isDateKey } from '@/lib/date'
import { getEmotionMeta } from '@/lib/emotion'
import { DEFAULT_SETTINGS, getSettings } from '@/lib/settings'
import styles from './page.module.scss'

export default async function DiaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  const { id } = await params

  // Entries were addressed by date before migration 001. A date can hold several now, so
  // an old link opens that day's list rather than guessing which entry it meant.
  if (isDateKey(id)) redirect(`/diary?view=list&date=${id}`)

  const diary = await getDiaryById(session.user.id, id)
  if (!diary) return notFound()

  const [t, locale] = await Promise.all([getTranslations('DiaryDetail'), getLocale()])

  // Sequential on purpose, unlike the parallel queries elsewhere: each call genuinely
  // needs the previous one's id. Collapsing all three into one embedded read
  // (`diaries?select=*,threads(*,messages(*))`) is the obvious follow-up — see the note
  // in docs/TODAY_PLAN.md — but it cannot express "create if absent", so it only helps
  // the common case.
  const thread = await getOrCreateThreadForDiary(
    session.user.id,
    diary.id,
    diary.title ?? t('threadDefaultTitle')
  )
  const messages = thread ? await listMessages(thread.id) : []

  // The deterministic stream in the test environment, the model everywhere else.
  // E2E_AUTH_SECRET is already the "this is a test run" gate (it is what makes the test
  // sign-in provider exist), and reusing it keeps the suite from spending a model call
  // per run.
  const bench = Boolean(process.env.E2E_AUTH_SECRET)

  // 대화로 쓰기: the conversation is the page until wrap-up (screen 1-1). Its emotion comes
  // with the draft, so nothing here waits for an analysis.
  if (diary.mode === 'chat' && thread) {
    // Mirrors the route: no limit on the bench path, and an unreadable count counts as
    // over it.
    const used = bench ? null : await countUserMessagesToday(session.user.id)
    const remainingToday = bench ? null : Math.max(0, DAILY_MESSAGE_LIMIT - (used ?? Infinity))
    // Only for printing when the 일기 was made: UTC beats no page if settings are down.
    const timeZone = await getSettings(session.user.id).then(
      (r) => r.settings.timezone,
      () => DEFAULT_SETTINGS.timezone
    )
    return (
      <ChatEntry
        key={diary.id}
        entryId={diary.id}
        threadId={thread.id}
        title={diary.title}
        dateLabel={formatDateLabel(diary.date, locale)}
        initialMessages={messages}
        remainingToday={remainingToday}
        summary={diary.summary}
        emotion={diary.emotion}
        emotionSource={diary.emotionSource}
        timeZone={timeZone}
        crisis={Boolean(thread.crisisAt)}
        bench={bench}
      />
    )
  }

  const emotion = diary.emotion
  const meta = emotion ? getEmotionMeta(emotion.primary) : undefined
  const questions = emotion?.questions ?? []

  return (
    <article className={styles.detail}>
      <header className={styles.header}>
        <BackButton className={styles.backButton} />
        <time className={styles.date} dateTime={diary.date}>
          {formatDateLabel(diary.date, locale)}
        </time>
        <div className={styles.actions}>
          {meta && (
            <span
              className={styles.emotion}
              // The theme's emotion color (themes.scss), not EMOTION_META's single hex.
              style={{ '--emotion': `var(--emotion-${meta.key})` } as React.CSSProperties}
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
            </span>
          )}
          <Link
            href={`/diary/write?id=${diary.id}`}
            className={styles.editButton}
            aria-label={t('edit')}
          >
            <PencilIcon size={16} />
            {t('edit')}
          </Link>
          <DeleteEntryButton id={diary.id} />
        </div>
      </header>

      <div className={styles.content}>{diary.content}</div>

      {/* Analysis runs after the save responds, so a just-written entry arrives without it
          and gains it a moment later. Record-only entries never get one and must not sit
          here waiting. Refreshing is safe for the conversation below: ThreadPanel seeds
          its state once, so a re-render does not disturb a reply in progress. */}
      {!emotion && !diary.isRecordOnly && <EmotionPending />}

      {emotion && (emotion.summary || questions.length > 0) && (
        <section className={styles.reflection} aria-label={t('reflectionLabel')}>
          {emotion.summary && <p className={styles.summary}>{emotion.summary}</p>}
          {questions.length > 0 && (
            <div className={styles.questions}>
              <h2 className={styles.questionsTitle}>{t('questionsTitle')}</h2>
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
        <section className={styles.thread} aria-label={t('threadLabel')}>
          <ThreadPanel threadId={thread.id} initialMessages={messages} bench={bench} />
        </section>
      )}
    </article>
  )
}
