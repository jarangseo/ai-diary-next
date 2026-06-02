import { describe, it, expect, vi } from 'vitest'
import type OpenAI from 'openai'
import { parseEmotionResponse, analyzeEmotion } from '../emotionAnalysis'

const validPayload = {
  primary: 'calm',
  score: 70,
  summary: '잔잔하고 평온한 하루였다.',
  questions: ['오늘 무엇이 마음을 편하게 했나요?', '이 평온함을 내일도 이어가려면?'],
}

describe('parseEmotionResponse', () => {
  it('parses a well-formed payload', () => {
    expect(parseEmotionResponse(JSON.stringify(validPayload))).toEqual(validPayload)
  })

  it('returns null for empty / malformed input', () => {
    expect(parseEmotionResponse(null)).toBeNull()
    expect(parseEmotionResponse(undefined)).toBeNull()
    expect(parseEmotionResponse('')).toBeNull()
    expect(parseEmotionResponse('not json')).toBeNull()
    expect(parseEmotionResponse('[1,2,3]')).toBeNull()
    expect(parseEmotionResponse('"a string"')).toBeNull()
  })

  it('returns null when primary is not a known emotion key', () => {
    expect(parseEmotionResponse(JSON.stringify({ ...validPayload, primary: 'ecstatic' }))).toBeNull()
    expect(parseEmotionResponse(JSON.stringify({ ...validPayload, primary: '기쁨' }))).toBeNull()
  })

  it('clamps and rounds the score into 0–100', () => {
    expect(parseEmotionResponse(JSON.stringify({ ...validPayload, score: 140 }))?.score).toBe(100)
    expect(parseEmotionResponse(JSON.stringify({ ...validPayload, score: -20 }))?.score).toBe(0)
    expect(parseEmotionResponse(JSON.stringify({ ...validPayload, score: 66.7 }))?.score).toBe(67)
  })

  it('defaults a non-finite / missing score to 0', () => {
    expect(parseEmotionResponse(JSON.stringify({ ...validPayload, score: 'abc' }))?.score).toBe(0)
    const { score, ...noScore } = validPayload
    void score
    expect(parseEmotionResponse(JSON.stringify(noScore))?.score).toBe(0)
  })

  it('drops empty/non-string questions and caps at 3', () => {
    const result = parseEmotionResponse(
      JSON.stringify({
        ...validPayload,
        questions: ['  a  ', '', '   ', 'b', 42, 'c', 'd'],
      })
    )
    expect(result?.questions).toEqual(['a', 'b', 'c'])
  })

  it('coerces a missing/invalid summary or questions to safe defaults', () => {
    const result = parseEmotionResponse(
      JSON.stringify({ primary: 'joy', score: 50, summary: 123, questions: 'nope' })
    )
    expect(result).toEqual({ primary: 'joy', score: 50, summary: '', questions: [] })
  })
})

// Minimal fake matching the shape analyzeEmotion uses (openai.chat.completions.create).
function fakeClient(create: (args?: unknown) => Promise<unknown>): OpenAI {
  return { chat: { completions: { create } } } as unknown as OpenAI
}

describe('analyzeEmotion', () => {
  it('returns parsed emotion on a successful response', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validPayload) } }],
    })
    const result = await analyzeEmotion('평온한 하루였다', fakeClient(create))
    expect(result).toEqual(validPayload)
    expect(create).toHaveBeenCalledOnce()
  })

  it('returns null and does not call the API for empty content', async () => {
    const create = vi.fn()
    expect(await analyzeEmotion('   ', fakeClient(create))).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })

  it('falls back to null when the API call throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('timeout'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await analyzeEmotion('오늘 하루', fakeClient(create))).toBeNull()
    errSpy.mockRestore()
  })

  it('returns null when the model returns an unusable payload', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'garbage' } }],
    })
    expect(await analyzeEmotion('오늘 하루', fakeClient(create))).toBeNull()
  })

  it('truncates very long input before sending', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validPayload) } }],
    })
    await analyzeEmotion('가'.repeat(10_000), fakeClient(create))
    const sentUserMessage = create.mock.calls[0][0].messages[1].content as string
    expect(sentUserMessage.length).toBeLessThan(4_200) // 4000 cap + short prefix
  })

  it('returns null (does not throw) when no client is given and the API key is missing', async () => {
    // `new OpenAI()` throws synchronously without a key; that must fall back to null,
    // not crash the caller (the diary still saves without emotion).
    const prev = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(analyzeEmotion('오늘 하루')).resolves.toBeNull()
    } finally {
      errSpy.mockRestore()
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev
    }
  })
})
