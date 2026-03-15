'use client'
import { chatApi } from '@/services/chatServices'
import type { ChatRoomData } from '@/types/chat'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import toast from 'react-hot-toast'

function JoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (inviteCode: string) => chatApi.joinRoom(inviteCode),
    onSuccess: (data: ChatRoomData) => {
      router.push(`/diary/chat/${data.room_id}`)
    },
    onError: () => {
      toast.error('Failed to join room')
    },
  })

  useEffect(() => {
    if (code) {
      mutate(code)
    }
  }, [code, mutate])

  return (
    <div>
      {isPending && <div>Loading...</div>}
      {isError && <div>Error</div>}
    </div>
  )
}

export default function JoinChatPage() {
  return (
    // useSearchParams requires Suspense boundary during static build
    // since URL query params are not available at build time
    <Suspense fallback={<div>Loading...</div>}>
      <JoinContent />
    </Suspense>
  )
}
