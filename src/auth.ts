import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'

// End-to-end tests cannot drive a Google consent screen, so they need a way in. This
// provider is **only registered when E2E_AUTH_SECRET is present in the environment**,
// and that variable is set nowhere except the local test run — not in Vercel, not in CI
// beyond the e2e job. With it unset the provider does not exist, so there is no code
// path to authenticate through it, only through the real OAuth ones.
//
// If it ever were set in production it would be account takeover, so it also checks the
// value rather than merely its presence.
const e2eSecret = process.env.E2E_AUTH_SECRET

const e2eProvider = Credentials({
  id: 'e2e',
  name: 'E2E',
  credentials: { secret: {}, userId: {} },
  authorize(credentials) {
    if (!e2eSecret || credentials?.secret !== e2eSecret) return null
    const userId = String(credentials.userId ?? '')
    if (!userId) return null
    return { id: userId, name: 'E2E', email: `${userId}@e2e.invalid` }
  },
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: e2eSecret ? [Google, GitHub, e2eProvider] : [Google, GitHub],
  pages: {
    signIn: '/login', // custom login page
  },
  callbacks: {
    jwt({ token, account, user }) {
      // account is only available on first sign-in
      if (account) {
        // Credentials sign-ins carry the id on `user`; OAuth carries the stable provider
        // account id, which is what diaries are keyed by.
        token.sub = account.provider === 'e2e' ? (user?.id ?? token.sub) : account.providerAccountId
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
