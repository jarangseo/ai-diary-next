import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ThemeSetting } from '@/components/Settings/ThemeSetting'
import { WithdrawAccount } from '@/components/Settings/WithdrawAccount'
import styles from './page.module.scss'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const t = await getTranslations('Settings')

  return (
    <div className={styles.settings}>
      <h1 className={styles.title}>{t('title')}</h1>

      <section className={styles.section} aria-labelledby="display-heading">
        <h2 className={styles.sectionTitle} id="display-heading">
          {t('display.heading')}
        </h2>
        <p className={styles.body}>{t('display.body')}</p>
        <ThemeSetting />
      </section>

      <section className={styles.section} aria-labelledby="account-heading">
        <h2 className={styles.sectionTitle} id="account-heading">
          {t('account.heading')}
        </h2>
        <p className={styles.body}>{t('account.body')}</p>
        <WithdrawAccount />
      </section>

      <section className={styles.section} aria-labelledby="data-heading">
        <h2 className={styles.sectionTitle} id="data-heading">
          {t('data.heading')}
        </h2>
        <p className={styles.body}>{t('data.body')}</p>
      </section>
    </div>
  )
}
