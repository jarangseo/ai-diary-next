// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type OpenAI from 'openai'
import type { StreamPart } from '@/types/stream'
import type { MemorySource } from '../memory'
import {
  MAX_SOURCES,
  candidateList,
  citedSources,
  fakeCited,
  parseCited,
  withSources,
} from '../memorySources'

const candidates: MemorySource[] = [
  { id: 'a', date: '2026-10-20', title: '회의가 길었던 날', text: '회의가 세 시간이나 이어졌다.' },
  { id: 'b', date: '2026-10-17', text: '친구 민지와 저녁을 먹었다.' },
  { id: 'c', date: '2026-10-12', text: '발표 준비' },
  { id: 'd', date: '2026-09-30', text: '엄마와 통화' },
]

describe('candidateList', () => {
  it('numbers each entry with its date, title and a short snippet', () => {
    const list = candidateList(candidates)
    expect(list.split('\n')[0]).toBe(
      'E1: 2026-10-20 "회의가 길었던 날" — 회의가 세 시간이나 이어졌다.'
    )
    expect(list.split('\n')[1]).toBe('E2: 2026-10-17 — 친구 민지와 저녁을 먹었다.')
  })
})

describe('parseCited', () => {
  it('maps the keys back to entries, in the model’s order', () => {
    expect(parseCited('{"cited":["E2","E1"]}', candidates)).toEqual([
      { id: 'b', date: '2026-10-17' },
      { id: 'a', date: '2026-10-20' },
    ])
  })

  it('drops unknown keys and repeats, and keeps at most three', () => {
    expect(parseCited('{"cited":["E9","E1","E1","x"]}', candidates)).toEqual([
      { id: 'a', date: '2026-10-20' },
    ])
    expect(parseCited('{"cited":["E1","E2","E3","E4"]}', candidates)).toHaveLength(MAX_SOURCES)
  })

  it('is no sources for anything malformed', () => {
    for (const raw of ['', 'not json', '{"cited":"E1"}', '{"other":[]}', '[]']) {
      expect(parseCited(raw, candidates)).toEqual([])
    }
  })
})

function fakeClient(content: string) {
  const create = vi.fn(async () => ({ choices: [{ message: { content } }] }))
  return { client: { chat: { completions: { create } } } as unknown as OpenAI, create }
}

describe('citedSources', () => {
  it('asks once and returns the cited entries', async () => {
    const { client, create } = fakeClient('{"cited":["E2"]}')
    expect(await citedSources('민지랑 저녁 먹었다고 했었죠', candidates, { client })).toEqual([
      { id: 'b', date: '2026-10-17' },
    ])
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('makes no call without a reply or without memory', async () => {
    const { client, create } = fakeClient('{"cited":["E1"]}')
    expect(await citedSources('  ', candidates, { client })).toEqual([])
    expect(await citedSources('그랬군요', [], { client })).toEqual([])
    expect(create).not.toHaveBeenCalled()
  })

  it('is no sources when the call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = {
      chat: { completions: { create: vi.fn(async () => Promise.reject(new Error('timeout'))) } },
    } as unknown as OpenAI
    expect(await citedSources('그랬군요', candidates, { client })).toEqual([])
  })
})

describe('fakeCited', () => {
  it('cites the newest entry, or nothing', () => {
    expect(fakeCited(candidates)).toEqual([{ id: 'a', date: '2026-10-20' }])
    expect(fakeCited([])).toEqual([])
  })
})

async function collect(parts: AsyncIterable<StreamPart>) {
  const out: StreamPart[] = []
  for await (const part of parts) out.push(part)
  return out
}
async function* from(...parts: StreamPart[]) {
  yield* parts
}

describe('withSources', () => {
  const entries = [{ id: 'a', date: '2026-10-20' }]

  it('adds the chips after the reply, from the whole reply text', async () => {
    const cite = vi.fn(async () => entries)
    const out = await collect(
      withSources(
        from(
          { type: 'text-delta', delta: '화요일에도 ' },
          { type: 'text-delta', delta: '지쳤죠' },
          { type: 'done' }
        ),
        cite
      )
    )
    expect(cite).toHaveBeenCalledWith('화요일에도 지쳤죠')
    expect(out.slice(-2)).toEqual([
      { type: 'tool-result', tool: 'sources', data: { entries } },
      { type: 'done' },
    ])
  })

  it('adds nothing when the reply drew on nothing', async () => {
    const out = await collect(
      withSources(from({ type: 'text-delta', delta: '그랬군요' }, { type: 'done' }), async () => [])
    )
    expect(out.map((p) => p.type)).toEqual(['text-delta', 'done'])
  })

  it('asks nothing for a failed or stopped reply', async () => {
    const cite = vi.fn(async () => entries)
    const failed = await collect(
      withSources(from({ type: 'text-delta', delta: '그' }, { type: 'error', message: 'x' }), cite)
    )
    expect(failed.map((p) => p.type)).toEqual(['text-delta', 'error'])

    const controller = new AbortController()
    controller.abort()
    await collect(
      withSources(
        from({ type: 'text-delta', delta: '그' }, { type: 'done' }),
        cite,
        controller.signal
      )
    )
    expect(cite).not.toHaveBeenCalled()
  })
})
