import type { Metadata } from 'next'
import '@/styles/globals.scss'
import Providers from '@/components/Provider'
import { WebVitals } from '@/components/WebVitals'

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
    <html lang="en">
      <body suppressHydrationWarning>
        <WebVitals />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
