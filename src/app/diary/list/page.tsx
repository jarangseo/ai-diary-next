import { EditIcon, FilterIcon, Link, SearchIcon } from 'lucide-react'
import { Calendar } from '@/components/Calendar/Calendar'
import SplitPanel from '@/components/SplitPanel/SplitPanel'
import styles from './page.module.scss'

export default function DiaryListPage() {
  return (
    <SplitPanel
      left={
        <article className={styles.left}>
          <header>
            <h2>Diary List</h2>
            {/* Search */}
            <button>
              <SearchIcon size={24} />
            </button>
            {/* Filter */}
            <button>
              <FilterIcon size={24} />
            </button>
            {/* Edit */}
            <button>
              <EditIcon size={24} />
            </button>
          </header>
          <ul>
            <li>
              <Link href="/diary/1">2026-03-10</Link>{' '}
            </li>
          </ul>
        </article>
      }
      right={
        <aside className={styles.right}>
          <Calendar />
        </aside>
      }
    />
  )
}
