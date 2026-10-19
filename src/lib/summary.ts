import { supabase } from './supabase'
import { isDiaryId } from './diary'

/** The longest 일기 an edit may store: well past any draft, short of abuse. */
export const SUMMARY_MAX_LENGTH = 10_000

/**
 * `다듬기` (#83): the user's own edit of a chat entry's drafted 일기. It marks the draft
 * as edited, so `다시 정리` asks before replacing it (the wrap-up route's `needsConfirm`).
 *
 * Only an entry of this user, a chat entry, and one already drafted: there is nothing to
 * edit before the first draft, and a written entry's text is edited as its content.
 */
export async function saveEditedSummary(
  userId: string,
  id: string,
  text: string,
  editedAt: Date
): Promise<'updated' | 'not_found' | 'failed'> {
  if (!isDiaryId(id)) return 'not_found'

  const { data, error } = await supabase
    .from('diaries')
    .update({
      summary: text,
      summary_edited_at: editedAt.toISOString(),
      updated_at: editedAt.toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', id)
    .eq('mode', 'chat')
    .not('summary', 'is', null)
    .select('id')

  if (error) {
    console.error('saveEditedSummary failed:', error.message)
    return 'failed'
  }
  return data.length > 0 ? 'updated' : 'not_found'
}
