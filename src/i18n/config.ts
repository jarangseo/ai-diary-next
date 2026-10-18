/**
 * Korean is the source language and, for now, the only one. There is no locale prefix in
 * URLs: with one language it would only lengthen every link. When a second language
 * lands, the locale comes from the user's settings (`user_settings.locale`), not the URL.
 */
export const locales = ['ko'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ko'
