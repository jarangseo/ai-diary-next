import { describe, it, expect } from 'vitest'
import { rowToDiary, diaryToRow } from '../diaryMapper'
import type { DiaryRow } from '../supabase'
import type { Diary } from '@/types/diary'

function baseRow(overrides: Partial<DiaryRow> = {}): DiaryRow {
  return {
    id: 'row-1',
    user_id: 'user-1',
    date: '2026-06-01',
    title: null,
    mode: 'write',
    content: 'a calm day',
    summary: null,
    summary_made_at: null,
    summary_edited_at: null,
    is_record_only: false,
    emotion_primary: null,
    emotion_secondary: null,
    emotion_source: 'ai',
    emotion_score: null,
    emotion_summary: null,
    emotion_questions: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T01:00:00.000Z',
    ...overrides,
  }
}

describe('rowToDiary', () => {
  it('maps core fields and converts timestamps to epoch ms', () => {
    const diary = rowToDiary(baseRow())
    expect(diary.date).toBe('2026-06-01')
    expect(diary.content).toBe('a calm day')
    expect(diary.isRecordOnly).toBe(false)
    expect(diary.createdAt).toBe(Date.parse('2026-06-01T00:00:00.000Z'))
    expect(diary.updatedAt).toBe(Date.parse('2026-06-01T01:00:00.000Z'))
  })

  it('leaves emotion undefined when no primary is stored', () => {
    expect(rowToDiary(baseRow()).emotion).toBeUndefined()
  })

  it('builds emotion when a valid primary is stored', () => {
    const diary = rowToDiary(
      baseRow({
        emotion_primary: 'calm',
        emotion_score: 70,
        emotion_summary: 'felt settled',
        emotion_questions: ['what helped?'],
      })
    )
    expect(diary.emotion).toEqual({
      primary: 'calm',
      score: 70,
      summary: 'felt settled',
      questions: ['what helped?'],
    })
  })

  it('falls back to undefined emotion for an unknown/legacy primary', () => {
    expect(rowToDiary(baseRow({ emotion_primary: 'ecstatic' })).emotion).toBeUndefined()
  })

  it('defaults score/summary/questions when primary is valid but others are null', () => {
    const diary = rowToDiary(baseRow({ emotion_primary: 'joy' }))
    expect(diary.emotion).toEqual({
      primary: 'joy',
      score: 0,
      summary: '',
      questions: [],
    })
  })
})

describe('rowToDiary — v2 columns (migration 002)', () => {
  it('reads an existing written entry as write / ai with no draft', () => {
    const diary = rowToDiary(baseRow())
    expect(diary.mode).toBe('write')
    expect(diary.summary).toBeUndefined()
    expect(diary.emotionSource).toBe('ai')
  })

  it('maps a chat entry with its draft and edit time', () => {
    const diary = rowToDiary(
      baseRow({
        mode: 'chat',
        content: '',
        summary: '긴 회의 끝에 본 노을',
        summary_made_at: '2026-06-01T13:24:00.000Z',
        summary_edited_at: '2026-06-01T13:30:00.000Z',
      })
    )
    expect(diary.mode).toBe('chat')
    expect(diary.summary).toEqual({
      text: '긴 회의 끝에 본 노을',
      madeAt: Date.parse('2026-06-01T13:24:00.000Z'),
      editedAt: Date.parse('2026-06-01T13:30:00.000Z'),
    })
  })

  it('does not surface a draft without its timestamp', () => {
    expect(rowToDiary(baseRow({ mode: 'chat', summary: 'x' })).summary).toBeUndefined()
  })

  it('maps the secondary emotion and who chose it, dropping an unknown secondary', () => {
    const diary = rowToDiary(
      baseRow({ emotion_primary: 'tired', emotion_secondary: 'calm', emotion_source: 'user' })
    )
    expect(diary.emotion?.secondary).toBe('calm')
    expect(diary.emotionSource).toBe('user')
    expect(
      rowToDiary(baseRow({ emotion_primary: 'tired', emotion_secondary: 'ecstatic' })).emotion
        ?.secondary
    ).toBeUndefined()
  })
})

describe('diaryToRow', () => {
  const diary: Diary = {
    id: 'diary-1',
    date: '2026-06-01',
    mode: 'write',
    content: 'a calm day',
    isRecordOnly: false,
    emotionSource: 'ai',
    createdAt: 0,
    updatedAt: 0,
  }

  it('maps a diary without emotion to null emotion columns', () => {
    expect(diaryToRow(diary, 'user-1')).toEqual({
      user_id: 'user-1',
      date: '2026-06-01',
      title: null,
      mode: 'write',
      content: 'a calm day',
      summary: null,
      summary_made_at: null,
      summary_edited_at: null,
      is_record_only: false,
      emotion_primary: null,
      emotion_secondary: null,
      emotion_source: 'ai',
      emotion_score: null,
      emotion_summary: null,
      emotion_questions: null,
    })
  })

  it('maps emotion fields into their columns', () => {
    const row = diaryToRow(
      {
        ...diary,
        emotion: { primary: 'sad', score: 40, summary: 'down', questions: ['why?'] },
      },
      'user-1'
    )
    expect(row.emotion_primary).toBe('sad')
    expect(row.emotion_score).toBe(40)
    expect(row.emotion_summary).toBe('down')
    expect(row.emotion_questions).toEqual(['why?'])
  })

  it('round-trips through rowToDiary preserving emotion', () => {
    const partial = diaryToRow(
      {
        ...diary,
        emotion: { primary: 'anxious', score: 55, summary: 's', questions: [] },
      },
      'user-1'
    )
    const restored = rowToDiary({
      ...partial,
      id: 'x',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    } as DiaryRow)
    expect(restored.emotion).toEqual({
      primary: 'anxious',
      score: 55,
      summary: 's',
      questions: [],
    })
  })
})
