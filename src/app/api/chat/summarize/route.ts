import { auth } from '@/auth'
import { getMessages } from '@/lib/chat'
import { saveDiary } from '@/lib/diary'
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

  // get messages from the room
  const messages = await getMessages(roomId)
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages found' }, { status: 404 })
  }

  const conversation = messages
    .filter((message) => message.type !== 'system')
    .map(
      (message) =>
        `${message.type === 'user' ? 'User: ' : 'AI: '}${message.content}`
    )
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

  await saveDiary(session.user.id, date, diaryContent, false)

  return NextResponse.json({ content: diaryContent, date })
}
