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

// Korea has no daylight saving time, so a fixed offset is exact.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * The instant the current Korean calendar day began — when the daily limit resets.
 *
 * Diaries are written at night, so the boundary has to be the user's midnight: counting
 * from UTC midnight (09:00 in Korea) put a message sent at 01:00 into the previous day,
 * which the over-limit notice then calls "today".
 */
export function startOfKoreanDay(now: Date = new Date()): Date {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  kst.setUTCHours(0, 0, 0, 0)
  return new Date(kst.getTime() - KST_OFFSET_MS)
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
