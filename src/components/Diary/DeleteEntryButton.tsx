'use client'
import { useRouter } from 'next/navigation'
import { ConfirmAction } from '@/components/ConfirmAction/ConfirmAction'

/**
 * Deleting an entry also deletes the conversation about it — the caller is told so,
 * because the thread is not visible from the header where this button sits.
 */
export function DeleteEntryButton({ date }: { date: string }) {
  const router = useRouter()

  return (
    <ConfirmAction
      tone="danger"
      label="삭제"
      question="이 일기와 대화를 모두 지울까요?"
      confirmLabel="삭제"
      onConfirm={async () => {
        const res = await fetch(`/api/diary/${date}`, { method: 'DELETE' })
        if (!res.ok) return
        // replace, not push: the entry behind this URL no longer exists, so going back
        // to it would land on a 404.
        router.replace('/diary')
        router.refresh()
      }}
    />
  )
}
