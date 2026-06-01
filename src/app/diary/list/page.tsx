import { redirect } from 'next/navigation'

// The list is now part of the calendar home (/diary) via the list toggle
export default function DiaryListRedirect() {
  redirect('/diary')
}
