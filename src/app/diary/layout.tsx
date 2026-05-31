import styles from './layout.module.scss'
import Gnb from '@/components/Gnb/Gnb'

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.container}>
      <Gnb />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
