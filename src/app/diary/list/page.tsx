import { Calendar } from '@/components/Calendar/Calendar'
import { DiaryList } from '@/components/DiaryList/DiaryList'
import SplitPanel from '@/components/SplitPanel/SplitPanel'
import styles from './page.module.scss'

export default function DiaryListPage() {
  return (
    <SplitPanel
      left={<DiaryList className={styles.left} />}
      right={
        <aside className={styles.right}>
          <Calendar />
        </aside>
      }
    />
  )
}
