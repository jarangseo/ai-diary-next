import type { Metadata } from 'next'
import '@/styles/themes.scss'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import '@/styles/globals.scss'
import Providers from '@/components/Provider'
import { WebVitals } from '@/components/WebVitals'
import { THEME_INIT_SCRIPT } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'AI Diary',
  description: 'AI-powered diary application',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    // suppressHydrationWarning: the theme script below sets data-theme before React
    // hydrates, so the server's <html> legitimately differs from the client's.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <WebVitals />
        {/* Server components read messages directly; this hands the locale and messages
            to client components (useTranslations, useLocale). */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
