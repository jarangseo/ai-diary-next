// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import tokens from '../tokens.json'

// Two guarantees for src/styles/themes.scss:
// 1. every value matches the design system's tokens.json (copied verbatim beside it);
// 2. the text and control pairs the app actually uses meet WCAG 2.1 AA in both themes.

type Theme = 'light' | 'dark'
const THEMES: Theme[] = ['light', 'dark']

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else current += char
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function readScssThemes(): Record<string, Record<Theme, string>> {
  const source = readFileSync(fileURLToPath(new URL('../themes.scss', import.meta.url)), 'utf8')
  const body = source.match(/\$theme-tokens: \(\n([\s\S]*?)\n\);/)?.[1]
  if (!body) throw new Error('$theme-tokens map not found in themes.scss')
  const result: Record<string, Record<Theme, string>> = {}
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*([a-z-]+): \((.*)\),$/)
    if (!match) throw new Error(`Unparsed line in $theme-tokens: ${line}`)
    const [light, dark] = splitTopLevel(match[2])
    result[match[1]] = { light, dark }
  }
  return result
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/0\.10\b/, '0.1')

// --- WCAG relative luminance ---
type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const match = hex.match(/^#([0-9a-f]{6})$/i)
  if (!match) throw new Error(`Not an opaque hex color: ${hex}`)
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** color-mix(in srgb, a p%, b) */
function mix(a: RGB, b: RGB, p: number): RGB {
  return a.map((v, i) => v * p + b[i] * (1 - p)) as RGB
}

function luminance([r, g, b]: RGB): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const scss = readScssThemes()
const color = (name: string, theme: Theme): RGB => hexToRgb(scss[name][theme])

describe('themes.scss matches tokens.json', () => {
  const designColors = tokens.color.tokens.map((t) => [t.name, t.value] as const)
  const designShadows = tokens.shadow.tokens.map((t) => [t.name, t.value] as const)

  it.each([...designColors, ...designShadows])('%s', (name, value) => {
    expect(scss[name], `${name} missing from themes.scss`).toBeDefined()
    for (const theme of THEMES) {
      expect(normalize(scss[name][theme])).toBe(normalize(value[theme]))
    }
  })

  it('defines nothing the design system does not', () => {
    const known = new Set([...designColors, ...designShadows].map(([name]) => name))
    expect(Object.keys(scss).filter((name) => !known.has(name))).toEqual([])
  })
})

// [foreground, background, minimum, where it is used]
type Pair = [string, (theme: Theme) => RGB, number, string]

const ground = (name: string) => (theme: Theme) => color(name, theme)
const GROUNDS = ['bg', 'bg-sidebar', 'surface', 'surface-muted']
const TEXT = ['ink', 'ink-secondary', 'ink-tertiary', 'danger']
const EMOTIONS = ['joy', 'excitement', 'calm', 'tired', 'sad', 'anxious', 'angry']

const PAIRS: Pair[] = [
  ...TEXT.flatMap((fg) => GROUNDS.map((bg): Pair => [fg, ground(bg), 4.5, `${fg} text on ${bg}`])),
  ['on-accent', ground('accent-strong'), 4.5, 'primary button label (btn-primary)'],
  // $color-accent-text is only used on bg and surface (Gnb logo hover). On bg-sidebar
  // and on the accent tint it falls under 4.5:1 in light, so it is not used there.
  ...['bg', 'surface'].map((bg): Pair => [
    'accent-strong',
    ground(bg),
    4.5,
    `accent-colored text on ${bg}`,
  ]),
  [
    'ink',
    (t) => mix(color('accent', t), color('surface', t), 0.14),
    4.5,
    "calendar 'today' number on $color-accent-light",
  ],
  ['bg', ground('ink'), 4.5, 'GitHub sign-in button label'],
  ...EMOTIONS.map((e): Pair => [
    'ink',
    (t) => mix(color(`emotion-${e}`, t), color('surface', t), 0.22),
    4.5,
    `emotion chip label on the ${e} tint`,
  ]),
  // Non-text (WCAG 1.4.11): input edges and the focus ring.
  ...['bg', 'surface'].map((bg): Pair => ['border-input', ground(bg), 3, `input outline on ${bg}`]),
  ...['bg', 'surface', 'surface-muted'].map((bg): Pair => [
    'accent',
    ground(bg),
    3,
    `focus ring on ${bg}`,
  ]),
]

describe.each(THEMES)('WCAG AA contrast — %s', (theme) => {
  it.each(PAIRS)('%s on %#', (fg, background, minimum, where) => {
    const ratio = contrast(color(fg, theme), background(theme))
    expect(ratio, `${where}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum)
  })
})

// Printed for the pull request:
// `PRINT_CONTRAST=1 pnpm vitest run src/styles --reporter=verbose --silent=false`
if (process.env.PRINT_CONTRAST) {
  for (const [fg, background, minimum, where] of PAIRS) {
    const [light, dark] = THEMES.map((t) => contrast(color(fg, t), background(t)).toFixed(2))
    console.log(`| ${where} | ${light} | ${dark} | ${minimum} |`)
  }
}
