import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DEFAULT_SETTINGS, getSettings } from '@/lib/settings'
import { MemorySetting } from '@/components/Settings/MemorySetting'
import { ThemeSetting } from '@/components/Settings/ThemeSetting'
import { WithdrawAccount } from '@/components/Settings/WithdrawAccount'
import styles from './page.module.scss'

/** Screen 5-3: 기억, 화면, 내 데이터, 계정. Export stays hidden until v2.2. */
export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [t, memoryEnabled] = await Promise.all([
    getTranslations('Settings'),
    // A failed read shows the default (on), which is also what memory does then.
    getSettings(session.user.id).then(
      (r) => r.settings.memoryEnabled,
      () => DEFAULT_SETTINGS.memoryEnabled
    ),
  ])

  return (
    <div className={styles.settings}>
      <h1 className={styles.title}>{t('title')}</h1>

      <section className={styles.section} aria-labelledby="memory-heading">
        <h2 className={styles.sectionTitle} id="memory-heading">
          {t('memory.heading')}
        </h2>
        <MemorySetting initial={memoryEnabled} />
      </section>

      <section className={styles.section} aria-labelledby="display-heading">
        <h2 className={styles.sectionTitle} id="display-heading">
          {t('display.heading')}
        </h2>
        <div className={styles.card}>
          <p className={styles.body}>{t('display.body')}</p>
          <ThemeSetting />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="data-heading">
        <h2 className={styles.sectionTitle} id="data-heading">
          {t('data.heading')}
        </h2>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t('data.title')}</h3>
          <p className={styles.body}>{t('data.body')}</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="account-heading">
        <h2 className={styles.sectionTitle} id="account-heading">
          {t('account.heading')}
        </h2>
        <div className={styles.card}>
          {session.user.email && <p className={styles.body}>{session.user.email}</p>}
          <p className={styles.body}>{t('account.body')}</p>
          <WithdrawAccount />
        </div>
      </section>
    </div>
  )
}
