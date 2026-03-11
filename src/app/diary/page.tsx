import styles from './page.module.scss'

export default async function DiaryListPage() {
  return (
    <article className={styles.diaryList}>
      <header></header>
      <div className={styles.scroll}>
        <video
          src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          autoPlay={false}
          loop
          playsInline
          controls
          className={styles.video}
        ></video>
        <p className={styles.text}>
          Record the feelings you couldn&apos;t put into words. AI helps you
          understand what you feel.
        </p>
        <button className={styles.button}>Start Writing</button>
      </div>
    </article>
  )
}
