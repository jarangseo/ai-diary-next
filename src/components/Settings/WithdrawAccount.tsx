'use client'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { ConfirmAction } from '@/components/ConfirmAction/ConfirmAction'

export function WithdrawAccount() {
  const t = useTranslations('Settings.account')

  return (
    <ConfirmAction
      tone="danger"
      // Names what goes, not the act: "탈퇴" alone does not say the diaries go with it.
      label={t('withdrawLabel')}
      question={t('withdrawQuestion')}
      confirmLabel={t('withdrawConfirm')}
      onConfirm={async () => {
        const res = await fetch('/api/account', { method: 'DELETE' })
        if (!res.ok) return
        // Signing out after the data is gone, not before: the request needs the session,
        // and a cleared cookie with rows still in the database is the worse failure.
        await signOut({ callbackUrl: '/' })
      }}
    />
  )
}
