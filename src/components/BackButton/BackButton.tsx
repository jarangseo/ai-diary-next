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
    // If there is prior history, go back (preserving list/calendar state); otherwise go home.
    if (window.history.length > 1) router.back()
    else router.push(fallback)
  }

  return (
    <button type="button" className={className} onClick={handleBack} aria-label="뒤로">
      <ArrowLeftIcon size={20} />
    </button>
  )
}
