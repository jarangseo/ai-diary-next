import styles from './layout.module.scss'
import Gnb from '@/components/Gnb/Gnb'
import { SettingsInit } from '@/components/Settings/SettingsInit'

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <SettingsInit />
      <Gnb />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
