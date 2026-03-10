import type { NextConfig } from 'next'

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

export default nextConfig
