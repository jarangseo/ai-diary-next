import type { Message } from '@/types/thread'

export interface RetryPlan {
  /** The user's message, already stored on the failed attempt: reused, not stored again. */
  message: Message
  /** What the failed attempt left after it — a reply that broke off — to be replaced. */
  orphanIds: string[]
}

/**
 * How to handle `다시 시도` (#115). Only called when the client says the send is a retry,
 * because the same text twice is otherwise a legitimate thing to send ("응", "응").
 *
 * When a reply broke off mid-stream, the server had already stored the user's message —
 * and often part of the reply, since an aborted stream stores what arrived. Storing the
 * message again put the user's words in the conversation twice. So: if the conversation's
 * last user message has this text and only assistant messages follow it, reuse it and
 * replace those. Otherwise (the first attempt never reached the server) there is nothing
 * to reuse, and the send is stored as usual. Pure, so the rule is tested on its own.
 */
export function planRetry(conversation: Message[], text: string): RetryPlan | null {
  let lastUser = -1
  for (let i = conversation.length - 1; i >= 0; i--) {
    if (conversation[i].role === 'user') {
      lastUser = i
      break
    }
  }
  if (lastUser === -1) return null
  const message = conversation[lastUser]
  if (message.content.trim() !== text.trim()) return null

  return {
    message,
    orphanIds: conversation.slice(lastUser + 1).map((m) => m.id),
  }
}
