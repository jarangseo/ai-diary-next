import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import '@/styles/globals.scss'
import Providers from '@/components/Provider'
import { WebVitals } from '@/components/WebVitals'

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
    <html lang={locale}>
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
