import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { WithdrawAccount } from '@/components/Settings/WithdrawAccount'
import styles from './page.module.scss'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className={styles.settings}>
      <h1 className={styles.title}>설정</h1>

      <section className={styles.section} aria-labelledby="account-heading">
        <h2 className={styles.sectionTitle} id="account-heading">
          계정
        </h2>
        <p className={styles.body}>
          탈퇴하면 지금까지 쓴 일기와 대화가 모두 삭제돼요. 되돌릴 수 없어요.
        </p>
        <WithdrawAccount />
      </section>

      <section className={styles.section} aria-labelledby="data-heading">
        <h2 className={styles.sectionTitle} id="data-heading">
          내 데이터
        </h2>
        <p className={styles.body}>
          일기 내용은 감정 분석과 대화를 위해 OpenAI로 전송돼요. 일기와 대화는 이 서비스의
          데이터베이스에 저장되고, 개별 일기는 상세 화면에서 지울 수 있어요.
        </p>
      </section>
    </div>
  )
}
