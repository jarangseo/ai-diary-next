'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function JoinChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    code ? 'loading' : 'error'
  )

  useEffect(() => {
    if (!code) {
      return
    }
    fetch(`/api/chat/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: code }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to join room')
        }
        return res.json()
      })
      .then((res) => {
        setStatus('success')
        router.push(`/diary/chat/${res.id}`)
      })
      .catch(() => {
        setStatus('error')
        return
      })
  }, [code, router])
  return (
    <div>
      {status === 'loading' && <div>Loading...</div>}
      {status === 'success' && <div>Success</div>}
      {status === 'error' && <div>Error</div>}
    </div>
  )
}
