import type messages from '../../messages/ko.json'
import type { Locale } from './config'

// Korean is the source language, so its file is the shape every other locale must match.
// A key missing from ko.json is a type error at the call site.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: typeof messages
  }
}
