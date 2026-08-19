import { type Thread } from '@/types/thread'
import { useState, useEffect } from 'react'

export function useThreadStream(threadId: string | null) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let ignore = false
    const fetchThread = async () => {
      if (!threadId) {
        return
      }
      setIsLoading(true)
      try {
        const response = await fetch(`/api/threads/${threadId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch thread: ${response.statusText}`)
        }
        const data = await response.json()
        // fetch는 404·500에서 reject하지 않아. 네트워크 자체가 실패해야만 throw해. 그래서 지금 코드는 서버가 {"error":"Thread not found"}를 줘도 그걸 Thread라고 믿고 상태에 넣어. as Thread가 타입 검사까지 꺼버려서 컴파일러도 안 막아줘.
        if (!ignore) {
          setThread(data as Thread)
        }
      } catch (error) {
        if (!ignore) {
          setError(error as Error)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }
    fetchThread()
    return () => {
      ignore = true
    }
  }, [threadId])

  return {
    thread,
    isLoading,
    error,
  }
}
