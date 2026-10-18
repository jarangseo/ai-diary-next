import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/i18n/request.ts',
  experimental: {
    // Compiles ICU messages at build time, so the browser ships a formatter instead of
    // the ICU parser: 8.5 KB gzip of the 250 KB budget, measured when this was added.
    messages: { path: './messages', format: 'json', locales: 'infer', precompile: true },
  },
})

const nextConfig: NextConfig = {
  reactCompiler: true,
  sassOptions: {
    additionalData: `@use "@/styles/mixins.scss" as *;`,
  },
  images: {
    remotePatterns: [
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

export default withNextIntl(nextConfig)
