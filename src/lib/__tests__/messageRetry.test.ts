import { describe, it, expect } from 'vitest'
import { planRetry } from '../messageRetry'
import type { Message } from '@/types/thread'

let n = 0
const msg = (role: Message['role'], content: string): Message => ({
  id: `m${n++}`,
  threadId: 't',
  role,
  content,
  createdAt: n,
})

describe('planRetry', () => {
  it('reuses the stored message and replaces a reply that broke off', () => {
    const hello = msg('user', '안녕')
    const answer = msg('assistant', '반가워요')
    const said = msg('user', '노을이 예뻤어')
    const partial = msg('assistant', '그랬')
    const plan = planRetry([hello, answer, said, partial], '노을이 예뻤어')
    expect(plan?.message.id).toBe(said.id)
    expect(plan?.orphanIds).toEqual([partial.id])
  })

  it('reuses it with nothing to replace when no reply was stored', () => {
    const said = msg('user', ' 노을이 예뻤어 ')
    expect(planRetry([said], '노을이 예뻤어')).toEqual({ message: said, orphanIds: [] })
  })

  it('has nothing to reuse when the first attempt never reached the server', () => {
    expect(
      planRetry([msg('user', '안녕'), msg('assistant', '반가워요')], '노을이 예뻤어')
    ).toBeNull()
    expect(planRetry([], '노을이 예뻤어')).toBeNull()
  })
})
