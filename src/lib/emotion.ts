// Emotion taxonomy — the single source of truth for the fixed 7-emotion set.
// `EmotionPrimary` (the union type) is derived from EMOTIONS so the type and the
// runtime list can never drift. AI analysis must return one of these keys; UI reads
// label/emoji/color from EMOTION_META. Keys are stable English ids (DB-safe);
// user-facing labels stay Korean (the product's language).

export const EMOTIONS = [
  'joy',
  'excitement',
  'calm',
  'tired',
  'sad',
  'anxious',
  'angry',
] as const

export type EmotionPrimary = (typeof EMOTIONS)[number]

export interface EmotionMeta {
  key: EmotionPrimary
  label: string // Korean, user-facing
  emoji: string
  color: string // hex; Stage 4 wires this to the calendar dot / badge
}

export const EMOTION_META: Record<EmotionPrimary, EmotionMeta> = {
  joy: { key: 'joy', label: '기쁨', emoji: '😊', color: '#e8a33d' },
  excitement: { key: 'excitement', label: '설렘', emoji: '✨', color: '#e0739c' },
  calm: { key: 'calm', label: '평온', emoji: '🌿', color: '#8a9a7b' },
  tired: { key: 'tired', label: '지침', emoji: '😮‍💨', color: '#a59c90' },
  sad: { key: 'sad', label: '슬픔', emoji: '😢', color: '#6b8cae' },
  anxious: { key: 'anxious', label: '불안', emoji: '😰', color: '#b58bc2' },
  angry: { key: 'angry', label: '분노', emoji: '😡', color: '#c0503f' },
}

export function isEmotionPrimary(value: unknown): value is EmotionPrimary {
  return typeof value === 'string' && (EMOTIONS as readonly string[]).includes(value)
}

// Safe lookup — returns undefined for unknown keys (e.g. legacy/garbage DB values)
// so callers can fall back gracefully instead of rendering a broken badge.
export function getEmotionMeta(value: unknown): EmotionMeta | undefined {
  return isEmotionPrimary(value) ? EMOTION_META[value] : undefined
}
