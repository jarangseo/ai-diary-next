import { supabase } from './supabase'

export async function createRoom(ownerId: string, date: string) {
  const inviteCode = crypto.randomUUID().slice(0, 8).toUpperCase()
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({
      owner_id: ownerId,
      date,
      invite_code: inviteCode,
    })
    .select()
    .single()

  if (error) return null

  await supabase.from('room_members').insert({
    room_id: data.id,
    user_id: ownerId,
  })
  return data
}

export async function getMyRooms(userId: string) {
  const { data } = await supabase
    .from('room_members')
    .select('room_id, chat_rooms(*)')
    .eq('user_id', userId)
  return data ?? []
}

export async function getRoomByInviteCode(code: string) {
  const { data } = await supabase.from('chat_rooms').select('*').eq('invite_code', code).single()
  return data ?? null
}

export async function joinRoom(userId: string, roomId: string) {
  const { error } = await supabase
    .from('room_members')
    .upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id,user_id' })
  return !error
}

/**
 * Whether the user belongs to the room. The service role bypasses RLS, so this check is
 * the only thing between a room id and its messages: every read of a room goes through
 * it. A failed lookup counts as "not a member" — an unreadable answer is not a reason to
 * hand out someone's conversation.
 */
export async function isRoomMember(userId: string, roomId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('isRoomMember failed:', error.message)
    return false
  }

  return data !== null
}

export async function saveMessage(
  roomId: string,
  userId: string,
  content: string,
  type: 'user' | 'ai' | 'system'
) {
  const { error } = await supabase.from('chat_messages').insert({
    room_id: roomId,
    user_id: userId,
    content,
    type,
  })
  return !error
}

/**
 * A room's messages, for a member of it. Null when the user is not a member, so callers
 * can answer 404 — a room someone else is in is indistinguishable from one that does not
 * exist.
 */
export async function getMessages(userId: string, roomId: string) {
  if (!(await isRoomMember(userId, roomId))) return null

  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  return data ?? []
}

/** A room, for a member of it; null otherwise. */
export async function getRoom(userId: string, roomId: string) {
  if (!(await isRoomMember(userId, roomId))) return null

  const { data } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single()
  return data ?? null
}

/**
 * Everything of the user's in the chat-room area, for account withdrawal: the rooms they
 * own (with every message and membership in them), and their own messages and
 * memberships in other people's rooms.
 *
 * Children go before parents, so it holds whether or not the schema cascades. Not
 * transactional, like the rest of withdrawal; each delete is idempotent, so a retry is safe.
 */
export async function deleteChatDataForUser(userId: string): Promise<boolean> {
  const { data: owned, error: ownedError } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('owner_id', userId)
  if (ownedError) {
    console.error('deleteChatDataForUser (owned rooms) failed:', ownedError.message)
    return false
  }

  const ownedIds = (owned ?? []).map((room: { id: string }) => room.id)
  const steps: [string, () => PromiseLike<{ error: { message: string } | null }>][] = []
  if (ownedIds.length > 0) {
    steps.push(
      ['room messages', () => supabase.from('chat_messages').delete().in('room_id', ownedIds)],
      ['room members', () => supabase.from('room_members').delete().in('room_id', ownedIds)],
      ['rooms', () => supabase.from('chat_rooms').delete().in('id', ownedIds)]
    )
  }
  steps.push(
    ['own messages', () => supabase.from('chat_messages').delete().eq('user_id', userId)],
    ['memberships', () => supabase.from('room_members').delete().eq('user_id', userId)]
  )

  for (const [label, run] of steps) {
    const { error } = await run()
    if (error) {
      console.error(`deleteChatDataForUser (${label}) failed:`, error.message)
      return false
    }
  }
  return true
}
