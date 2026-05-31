'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'

export function BackButton({
  className,
  fallback = '/diary',
}: {
  className?: string
  fallback?: string
}) {
  const router = useRouter()

  const handleBack = () => {
    // 직전 히스토리가 있으면 그대로 복귀(목록/캘린더 상태 보존), 없으면 홈으로
    if (window.history.length > 1) router.back()
    else router.push(fallback)
  }

  return (
    <button type="button" className={className} onClick={handleBack} aria-label="뒤로">
      <ArrowLeftIcon size={20} />
    </button>
  )
}
