import type { Metadata } from 'next'
import '@/styles/themes.scss'
import '@/styles/globals.scss'
import Providers from '@/components/Provider'
import { WebVitals } from '@/components/WebVitals'
import { THEME_INIT_SCRIPT } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'AI Diary',
  description: 'AI-powered diary application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: the theme script below sets data-theme before React
    // hydrates, so the server's <html> legitimately differs from the client's.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <WebVitals />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
