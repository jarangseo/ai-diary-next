import type { DiarySummary, EmotionPick } from '@/types/diary'

export const diaryApi = {
  /**
   * Starts a 대화로 쓰기 entry and returns its id. The server dates it today in the user's
   * stored zone. The first message is deliberately not part of the request: it is sent
   * to the entry's thread from the entry page (see `components/Home/firstMessage.ts`).
   */
  startChat: async (): Promise<string> => {
    const res = await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'chat' }),
    })
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`)
    }
    return (await res.json()).id
  },

  /**
   * `일기로 정리하기`: drafts the chat entry's 일기 from its conversation (#75). Resolves
   * with the stored draft and title, or `needsConfirm` when it would replace the user's
   * edit and `confirm` was not given; throws when it could not be made.
   */
  wrapUp: async (
    id: string,
    confirm = false
  ): Promise<{ summary: DiarySummary; title?: string; needsConfirm?: true }> => {
    const res = await fetch(`/api/diary/${id}/wrap-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirm ? { confirm } : {}),
    })
    if (res.status === 409) return res.json()
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  },

  /** `다듬기`: stores the user's edit of the drafted 일기 (#83); resolves with when. */
  editSummary: async (id: string, text: string): Promise<number> => {
    const res = await fetch(`/api/diary/${id}/summary`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`)
    }
    return (await res.json()).editedAt
  },

  /** The emotion chip's pick (#84): the user's from now on, kept through re-analysis. */
  setEmotion: async (id: string, pick: EmotionPick): Promise<void> => {
    const res = await fetch(`/api/diary/${id}/emotion`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primary: pick.primary, secondary: pick.secondary ?? null }),
    })
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`)
    }
  },
}
