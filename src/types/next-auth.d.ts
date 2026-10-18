import type { DefaultSession } from 'next-auth'

// The given name for the greeting (src/lib/givenName.ts), carried from sign-in to the session.
declare module 'next-auth' {
  interface Session {
    user: { givenName?: string } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    givenName?: string
  }
}
