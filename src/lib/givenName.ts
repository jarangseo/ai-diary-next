/**
 * The name the greeting uses ("자랑님, 오늘은 어땠어요?") — the given name only, decided by the
 * owner on 2026-10-18.
 *
 * Taken from the provider's own `given_name` claim (Google sends one) rather than by
 * cutting a full name apart: which part of a name is the given name differs by culture
 * (서자랑 → 자랑, but "Ada Lovelace" → "Ada", and many names fit neither rule). A provider
 * without the claim (GitHub) gives undefined, and the greeting falls back to the full name.
 *
 * Pure, so it is tested without NextAuth.
 */
export function givenNameFrom(profile: unknown): string | undefined {
  if (!profile || typeof profile !== 'object') return undefined
  const value = (profile as { given_name?: unknown }).given_name
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 50) : undefined
}
