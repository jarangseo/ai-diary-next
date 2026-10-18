import { getRequestConfig } from 'next-intl/server'
import { defaultLocale } from './config'

// Without i18n routing, next-intl asks this function for each request's locale. It is
// fixed until the per-user locale exists in settings.
export default getRequestConfig(async () => {
  const locale = defaultLocale
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
