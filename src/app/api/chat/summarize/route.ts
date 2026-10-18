import { auth } from '@/auth'
import { getMessages } from '@/lib/chat'
import { createDiary, analyzeAndStoreEmotion } from '@/lib/diary'
import { countUserMessagesToday } from '@/lib/threads'
import { isOverDailyLimit } from '@/lib/usage'
import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { roomId, date } = await request.json()

  // Members only: summarizing sends the conversation to OpenAI and saves it as the
  // caller's diary, so a room they are not in must look like one that does not exist.
  const messages = await getMessages(session.user.id, roomId)
  if (messages === null) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages found' }, { status: 404 })
  }

  // Two model calls follow (the summary, then its emotion), so this path sits behind the
  // same daily cap as the conversation. A failed count is treated as over the limit.
  const used = await countUserMessagesToday(session.user.id)
  if (used === null || isOverDailyLimit(used)) {
    return NextResponse.json(
      { error: '오늘 AI 응답 한도를 다 썼어요. 내일 다시 정리할 수 있어요.' },
      { status: 429 }
    )
  }

  const conversation = messages
    .filter((message) => message.type !== 'system')
    .map((message) => `${message.type === 'user' ? 'User: ' : 'AI: '}${message.content}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a diary writer. ' +
          'Given a chat conversation, write a diary entry summarizing the day. ' +
          'Write in first person. ' +
          'Keep it warm, personal, and concise (3-5 sentences). ' +
          'Focus on emotions, events, and highlights from the conversation.',
      },
      {
        role: 'user',
        content: `Write a diary entry based on this conversation:\n\n${conversation}`,
      },
    ],
    max_tokens: 300,
  })

  const diaryContent = response.choices[0]?.message?.content ?? ''

  // A new entry every time: rooms are not linked to the entries made from them, so
  // summarizing the same room twice yields two entries. Accepted while the chat area is
  // deferred — v2's chat tab replaces this flow (see issue #47).
  const id = await createDiary(session.user.id, date, diaryContent, false)
  if (!id) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Analyze the just-generated entry and store its emotion (best-effort).
  const emotion = await analyzeAndStoreEmotion(session.user.id, id, diaryContent)

  return NextResponse.json({ id, content: diaryContent, date, emotion })
}
