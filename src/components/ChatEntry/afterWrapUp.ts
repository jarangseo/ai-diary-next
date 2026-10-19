import type { Message } from '@/types/thread'

type Said = Pick<Message, 'role' | 'content'>

/**
 * Where a draft was cut from the conversation: the messages before this index are the ones
 * it was made from, and the "여기까지 일기로 정리했어요" divider goes right after them.
 * Server timestamps on both sides, so a page load compares like with like; a draft made in
 * this session records the index itself instead (the browser's clock is not the server's).
 */
export function draftCut(messages: Pick<Message, 'createdAt'>[], madeAt: number): number {
  let cut = 0
  messages.forEach((m, i) => {
    if (m.createdAt <= madeAt) cut = i + 1
  })
  return cut
}

const isSaid = (m: Said) => m.role === 'user' && m.content.trim() !== ''

/** "대화 N개를 정리했어요": the user's messages the draft was made from. */
export function countSaid(messages: Said[], cut: number): number {
  return messages.slice(0, cut).filter(isSaid).length
}

/** The user said more after the draft: it is outdated, and `다시 정리` is offered. */
export function saidSince(messages: Said[], cut: number): boolean {
  return messages.slice(cut).some(isSaid)
}
