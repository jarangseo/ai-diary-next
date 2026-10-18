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

// How far `timeZone`'s wall clock is ahead of UTC at instant `at`, in ms.
function zoneOffsetMs(timeZone: string, at: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const wallAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  return wallAsUtc - (at - (at % 1000))
}

/**
 * The instant the current calendar day began in `timeZone` — when the daily limit resets.
 *
 * The limit is shown to the user as "today", so the boundary is their own midnight, from
 * the time zone stored in their settings (never one sent per request, which would let the
 * limit be reset by switching zones). Daylight saving is handled by re-reading the offset
 * at midnight itself: on a change day it differs from the offset later that day.
 */
export function startOfDayIn(timeZone: string, now: Date = new Date()): Date {
  const at = now.getTime()
  const wall = new Date(at + zoneOffsetMs(timeZone, at))
  wall.setUTCHours(0, 0, 0, 0)
  const midnightWall = wall.getTime()
  const guess = midnightWall - zoneOffsetMs(timeZone, at)
  return new Date(midnightWall - zoneOffsetMs(timeZone, guess))
}

const NOTICE =
  '오늘은 여기까지 대화할 수 있어요. 쓴 글은 그대로 저장돼요. 내일 다시 이어서 얘기해요.\n\n'

/**
 * What a user gets once they are over the limit: the notice, then the deterministic
 * stream. Degrading rather than refusing — being told the conversation is unavailable
 * today is a better answer than an error, and the writing half of the product still works.
 *
 * The notice is the agreed copy (docs/PRODUCT_DIRECTION.md, *Screen specs*): it says what
 * still works before what stopped, and never mentions the AI's budget.
 */
export async function* cappedParts(signal?: AbortSignal): AsyncGenerator<StreamPart> {
  yield { type: 'text-delta', delta: NOTICE }
  yield* fakeParts({ signal })
}
