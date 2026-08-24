import { defineConfig } from 'vitest/config'
import path from 'path'
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Unit tests live in src/. Without this, Vitest also collects e2e/*.spec.ts and
    // fails on them — Playwright's `test` is a different runner with a different API,
    // and two runners sharing one glob is a confusing way to find that out.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.mjs'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
