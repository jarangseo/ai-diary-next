'use client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ConfirmAction } from '@/components/ConfirmAction/ConfirmAction'

/**
 * Deleting an entry also deletes the conversation about it — the caller is told so,
 * because the thread is not visible from the header where this button sits.
 */
export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter()
  const t = useTranslations('DiaryDetail')

  return (
    <ConfirmAction
      tone="danger"
      label={t('delete')}
      question={t('deleteQuestion')}
      confirmLabel={t('deleteConfirm')}
      onConfirm={async () => {
        const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' })
        if (!res.ok) return
        // replace, not push: the entry behind this URL no longer exists, so going back
        // to it would land on a 404.
        router.replace('/diary')
        router.refresh()
      }}
    />
  )
}
