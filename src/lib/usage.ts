import type { StreamPart } from '@/types/stream'
import { fakeParts } from './fakeStream'

/**
 * How many model-backed replies one account can ask for in a day.
 *
 * The number exists because the app is about to be linked from a public post: whoever
 * opens it spends the owner's OpenAI budget, and nothing else stands between a stranger
 * and that bill. Twenty is well past what writing about one day takes, and far short of
 * what an automated loop would run up.
 */
export const DAILY_MESSAGE_LIMIT = 20

/**
 * Pure on purpose. The count comes from `lib/threads.ts` — keeping the policy free of a
 * database import is what lets it be tested at all, since importing the client
 * constructs it and that throws without credentials.
 */
export function isOverDailyLimit(used: number, limit: number = DAILY_MESSAGE_LIMIT): boolean {
  return used >= limit
}

const NOTICE =
  '오늘 AI 응답 한도를 다 썼어요. 내일 다시 이어서 대화할 수 있고, 일기 작성과 저장은 그대로 쓸 수 있어요.\n\n'

/**
 * What a user gets once they are over the limit: the notice, then the deterministic
 * stream. Degrading rather than refusing — being told the conversation is unavailable
 * today is a better answer than an error, and the writing half of the product still works.
 */
export async function* cappedParts(signal?: AbortSignal): AsyncGenerator<StreamPart> {
  yield { type: 'text-delta', delta: NOTICE }
  yield* fakeParts({ signal })
}
