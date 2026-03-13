import { supabase } from './supabase'

export async function createRoom(ownerId: string, date: string) {
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({
      owner_id: ownerId,
      date,
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
  const { data } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('invite_code', code)
    .single()
  return data ?? null
}

export async function joinRoom(userId: string, roomId: string) {
  const { error } = await supabase
    .from('room_members')
    .upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id,user_id' })
  return !error
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

export async function getMessages(roomId: string) {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  return data ?? []
}
