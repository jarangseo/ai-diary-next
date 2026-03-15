import { auth } from '@/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId } = await params
  const { data } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (!data)
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  return NextResponse.json(data)
}
