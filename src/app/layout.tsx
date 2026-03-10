import type { Metadata } from 'next'
import '@/styles/globals.scss'
import Providers from '@/components/Provider'

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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
