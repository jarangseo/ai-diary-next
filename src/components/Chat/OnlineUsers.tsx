import styles from './OnlineUsers.module.scss'
import Image from 'next/image'

interface OnlineUser {
  id: string
  name: string
  image?: string
  isOnline: boolean
}

interface OnlineUsersProps {
  users: OnlineUser[]
}

export default function OnlineUsers({ users }: OnlineUsersProps) {
  return (
    <div className={styles.onlineUsers}>
      <ul className={styles.list}>
        {users.map((user) => (
          <li key={user.id} className={styles.item}>
            <div className={styles.avatarWrap}>
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  width={28}
                  height={28}
                  className={styles.avatar}
                />
              ) : (
                <span className={styles.defaultAvatar}>
                  {user.name.charAt(0)}
                </span>
              )}
              <span className={styles.status} data-online={user.isOnline} />
            </div>
            <span className={styles.name}>{user.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
