import { describe, it, expect } from 'vitest'
import {
  EMOTIONS,
  EMOTION_META,
  isEmotionPrimary,
  getEmotionMeta,
} from '../emotion'

describe('emotion taxonomy', () => {
  it('has exactly the fixed 7-emotion set with no duplicates', () => {
    expect(EMOTIONS).toHaveLength(7)
    expect(new Set(EMOTIONS).size).toBe(7)
  })

  it('provides meta for every emotion, with self-consistent keys', () => {
    for (const key of EMOTIONS) {
      const meta = EMOTION_META[key]
      expect(meta).toBeDefined()
      expect(meta.key).toBe(key)
      expect(meta.label).toBeTruthy()
      expect(meta.emoji).toBeTruthy()
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('has no duplicate labels or colors across emotions', () => {
    const labels = EMOTIONS.map((k) => EMOTION_META[k].label)
    const colors = EMOTIONS.map((k) => EMOTION_META[k].color)
    expect(new Set(labels).size).toBe(EMOTIONS.length)
    expect(new Set(colors).size).toBe(EMOTIONS.length)
  })
})

describe('isEmotionPrimary', () => {
  it('accepts known keys', () => {
    expect(isEmotionPrimary('joy')).toBe(true)
    expect(isEmotionPrimary('angry')).toBe(true)
  })

  it('rejects unknown / non-string values', () => {
    expect(isEmotionPrimary('happy')).toBe(false)
    expect(isEmotionPrimary('기쁨')).toBe(false) // labels are not keys
    expect(isEmotionPrimary('')).toBe(false)
    expect(isEmotionPrimary(null)).toBe(false)
    expect(isEmotionPrimary(undefined)).toBe(false)
    expect(isEmotionPrimary(42)).toBe(false)
  })
})

describe('getEmotionMeta', () => {
  it('returns the meta for a valid key', () => {
    expect(getEmotionMeta('calm')).toBe(EMOTION_META.calm)
  })

  it('returns undefined for unknown / legacy values', () => {
    expect(getEmotionMeta('unknown')).toBeUndefined()
    expect(getEmotionMeta(null)).toBeUndefined()
  })
})
