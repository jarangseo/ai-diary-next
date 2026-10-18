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
   * once the draft is stored; throws when it could not be made.
   */
  wrapUp: async (id: string): Promise<void> => {
    const res = await fetch(`/api/diary/${id}/wrap-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`)
    }
  },
}
