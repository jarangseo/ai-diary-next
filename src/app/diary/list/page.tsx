import { redirect } from 'next/navigation'

// 목록은 캘린더 홈(/diary)의 '목록' 토글로 통합됨
export default function DiaryListRedirect() {
  redirect('/diary')
}
