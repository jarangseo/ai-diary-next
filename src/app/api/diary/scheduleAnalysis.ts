import { after } from 'next/server'
import { analyzeAndStoreEmotion } from '@/lib/diary'
import { countUserMessagesToday } from '@/lib/threads'
import { isOverDailyLimit } from '@/lib/usage'

/**
 * Analysis runs after the response, not before it. It is a model call — several seconds —
 * and every save was waiting on it, which reads as a broken save button long before it
 * reads as thoughtful. The entry is already stored by this point; the analysis only adds
 * to it.
 *
 * The trade is that the entry lands without emotion and gains it a moment later, which the
 * detail page handles by re-checking (see EmotionPending). Runs on create and on every
 * edit, so the emotion always reflects the latest content.
 */
export function scheduleEmotionAnalysis(userId: string, id: string, content: string) {
  after(async () => {
    // The same daily cap as the conversation: guarding only one path would move the
    // spending rather than bound it.
    const used = await countUserMessagesToday(userId)
    if (used !== null && !isOverDailyLimit(used)) {
      await analyzeAndStoreEmotion(userId, id, content)
    }
  })
}
