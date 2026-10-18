// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type OpenAI from 'openai'
import { conversationForDraft, draftDiary, fakeDraft, parseDraftResponse } from '../diaryDraft'

const talk = [
  { role: 'assistant' as const, content: '오늘은 어땠어요?' },
  { role: 'user' as const, content: '회의가 또 두 시간이나 걸렸어.' },
  { role: 'assistant' as const, content: '길었네요. 퇴근하고는요?' },
  { role: 'user' as const, content: '퇴근길에 노을이 예뻤어.' },
]

const clientReturning = (content: string | null) =>
  ({
    chat: { completions: { create: vi.fn(async () => ({ choices: [{ message: { content } }] })) } },
  }) as unknown as OpenAI

describe('parseDraftResponse', () => {
  it('accepts a title and a diary, trimmed', () => {
    expect(parseDraftResponse('{"title":" 노을 ","diary":" 오늘 회의가 길었다. "}')).toEqual({
      title: '노을',
      text: '오늘 회의가 길었다.',
    })
  })

  it('rejects an empty diary, malformed JSON and non-objects', () => {
    expect(parseDraftResponse('{"title":"x","diary":"  "}')).toBeNull()
    expect(parseDraftResponse('not json')).toBeNull()
    expect(parseDraftResponse('"text"')).toBeNull()
    expect(parseDraftResponse(null)).toBeNull()
  })

  it('keeps the draft when the title is missing, and bounds a long title', () => {
    expect(parseDraftResponse('{"diary":"a"}')).toEqual({ title: '', text: 'a' })
    expect(parseDraftResponse(`{"title":"${'t'.repeat(90)}","diary":"a"}`)?.title).toHaveLength(60)
  })
})

describe('conversationForDraft', () => {
  it('labels who said what, skipping empty and system messages', () => {
    const text = conversationForDraft([
      ...talk,
      { role: 'system', content: 'x' },
      { role: 'assistant', content: '' },
    ])
    expect(text).toBe(
      'Companion: 오늘은 어땠어요?\nPerson: 회의가 또 두 시간이나 걸렸어.\nCompanion: 길었네요. 퇴근하고는요?\nPerson: 퇴근길에 노을이 예뻤어.'
    )
  })

  it('keeps the newest messages when the talk is too long', () => {
    const long = Array.from({ length: 2000 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
    }))
    const text = conversationForDraft(long)
    expect(text.length).toBeLessThanOrEqual(12_000)
    expect(text.endsWith('message 1999')).toBe(true)
  })
})

describe('draftDiary', () => {
  it('returns the parsed draft from the model', async () => {
    const client = clientReturning('{"title":"노을","diary":"회의가 길었지만 노을이 예뻤다."}')
    await expect(draftDiary(talk, { client })).resolves.toEqual({
      title: '노을',
      text: '회의가 길었지만 노을이 예뻤다.',
    })
  })

  it('never throws: a failing model gives null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = {
      chat: { completions: { create: vi.fn(async () => Promise.reject(new Error('timeout'))) } },
    } as unknown as OpenAI
    await expect(draftDiary(talk, { client })).resolves.toBeNull()
  })

  it('makes no call when the person has said nothing', async () => {
    const client = clientReturning('{}')
    await expect(
      draftDiary([{ role: 'assistant', content: '안녕' }], { client })
    ).resolves.toBeNull()
    expect(client.chat.completions.create).not.toHaveBeenCalled()
  })
})

describe('fakeDraft', () => {
  it("is the person's own words, for runs where no model may be called", () => {
    expect(fakeDraft(talk)).toEqual({
      title: '회의가 또 두 시간이나 걸렸어.',
      text: '회의가 또 두 시간이나 걸렸어. 퇴근길에 노을이 예뻤어.',
    })
  })
})
