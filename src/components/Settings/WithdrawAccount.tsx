'use client'
import { signOut } from 'next-auth/react'
import { ConfirmAction } from '@/components/ConfirmAction/ConfirmAction'

export function WithdrawAccount() {
  return (
    <ConfirmAction
      tone="danger"
      label="탈퇴하기"
      question="일기와 대화를 모두 지우고 탈퇴할까요?"
      confirmLabel="탈퇴"
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
