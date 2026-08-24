import { describe, it, expect, vi, beforeEach } from 'vitest'
import type OpenAI from 'openai'
import type { StreamPart } from '@/types/stream'
import type { Message } from '@/types/thread'

// Mocked so the suite never reaches OpenAI: these tests are about the transformation
// from model chunks to StreamParts, not about the model.
vi.mock('../emotionAnalysis', () => ({
  analyzeEmotion: vi.fn(),
}))

import { modelParts } from '../modelStream'
import { analyzeEmotion } from '../emotionAnalysis'

const message = (role: Message['role'], content: string): Message => ({
  id: `${role}-${content}`,
  threadId: 't',
  role,
  content,
  createdAt: 0,
})

/** A client whose completion stream yields the given text pieces. */
function fakeClient(deltas: string[], capture?: { messages?: unknown }) {
  return {
    chat: {
      completions: {
        create: async (body: { messages: unknown }) => {
          if (capture) capture.messages = body.messages
          return (async function* () {
            for (const delta of deltas) yield { choices: [{ delta: { content: delta } }] }
          })()
        },
      },
    },
  } as unknown as OpenAI
}

async function collect(source: AsyncGenerator<StreamPart>): Promise<StreamPart[]> {
  const out: StreamPart[] = []
  for await (const part of source) out.push(part)
  return out
}

beforeEach(() => vi.mocked(analyzeEmotion).mockReset())

describe('modelParts', () => {
  it('turns model chunks into text deltas and terminates', async () => {
    const parts = await collect(
      modelParts({
        history: [],
        text: '오늘 힘들었어',
        withEmotion: false,
        client: fakeClient(['오늘', ' 하루는', ' 어땠어?']),
      })
    )

    expect(parts).toEqual([
      { type: 'text-delta', delta: '오늘' },
      { type: 'text-delta', delta: ' 하루는' },
      { type: 'text-delta', delta: ' 어땠어?' },
      { type: 'done' },
    ])
  })

  it('sends the conversation so far, most recent last, after the system prompt', async () => {
    const capture: { messages?: unknown } = {}
    await collect(
      modelParts({
        history: [message('user', '첫 메시지'), message('assistant', '답변')],
        text: '두 번째',
        withEmotion: false,
        client: fakeClient(['ok'], capture),
      })
    )

    expect(capture.messages).toMatchObject([
      { role: 'system' },
      { role: 'user', content: '첫 메시지' },
      { role: 'assistant', content: '답변' },
      { role: 'user', content: '두 번째' },
    ])
  })

  it('caps how much history is sent, so a long thread cannot grow the prompt without limit', async () => {
    const capture: { messages?: unknown } = {}
    const history = Array.from({ length: 50 }, (_, i) => message('user', `m${i}`))

    await collect(
      modelParts({
        history,
        text: 'latest',
        withEmotion: false,
        client: fakeClient(['ok'], capture),
      })
    )

    const sent = capture.messages as { content: string }[]
    // system + 20 history + the new message
    expect(sent).toHaveLength(22)
    expect(sent[1].content).toBe('m30')
  })

  it('emits the emotion card once the text is complete, when asked', async () => {
    vi.mocked(analyzeEmotion).mockResolvedValue({
      primary: 'tired',
      score: 60,
      summary: '지친 하루',
    })

    const parts = await collect(
      modelParts({
        history: [],
        text: '오늘 힘들었어',
        withEmotion: true,
        client: fakeClient(['그랬구나']),
      })
    )

    // After the text, before the terminator — the card belongs to the finished reply.
    expect(parts.map((p) => p.type)).toEqual(['text-delta', 'tool-result', 'done'])
  })

  it('does not ask for an emotion card on later exchanges', async () => {
    await collect(
      modelParts({
        history: [message('user', '이전')],
        text: '다음',
        withEmotion: false,
        client: fakeClient(['ok']),
      })
    )

    expect(analyzeEmotion).not.toHaveBeenCalled()
  })

  it('still terminates when the analysis comes back empty', async () => {
    vi.mocked(analyzeEmotion).mockResolvedValue(null)

    const parts = await collect(
      modelParts({ history: [], text: 'x', withEmotion: true, client: fakeClient(['ok']) })
    )

    expect(parts.map((p) => p.type)).toEqual(['text-delta', 'done'])
  })

  it('reports a failed request as an error part rather than throwing', async () => {
    const failing = {
      chat: {
        completions: {
          create: async () => {
            throw new Error('rate limited')
          },
        },
      },
    } as unknown as OpenAI

    const parts = await collect(
      modelParts({ history: [], text: 'x', withEmotion: false, client: failing })
    )

    expect(parts).toEqual([{ type: 'error', message: 'rate limited' }])
  })

  it('treats an abort as a normal ending, not a failure', async () => {
    const aborted = {
      chat: {
        completions: {
          create: async () => {
            const e = new Error('aborted')
            e.name = 'AbortError'
            throw e
          },
        },
      },
    } as unknown as OpenAI

    const parts = await collect(
      modelParts({ history: [], text: 'x', withEmotion: false, client: aborted })
    )

    // No error part, and no `done` — the assistant message stays partial, which is what
    // the user saw when they pressed stop.
    expect(parts).toEqual([])
  })
})
