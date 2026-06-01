#!/usr/bin/env node
// Compare the gzip size of shipped JS (.next/static) against a budget; fail (exit 1) if over.
// Runs on every PR in CI → the "budget gate" that blocks bundle regressions before merge.
//
// Method: concatenate all .js then gzip (same basis as package.json's measure:bundle,
// comparable to the 218KB baseline). Usage: node scripts/check-bundle-budget.mjs
// Adjust the budget via the BUNDLE_BUDGET_KB env var (default 250).

import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STATIC_DIR = '.next/static'
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 250)

function collectJs(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...collectJs(full))
    else if (entry.endsWith('.js')) out.push(full)
  }
  return out
}

let files
try {
  files = collectJs(STATIC_DIR)
} catch {
  console.error(`✗ ${STATIC_DIR} not found — run \`pnpm build\` first.`)
  process.exit(1)
}

const buffers = files.map((f) => readFileSync(f))
const gzipKB = gzipSync(Buffer.concat(buffers)).length / 1024

const over = gzipKB > BUDGET_KB
const mark = over ? '✗' : '✓'
console.log(
  `${mark} shipped JS (gzip): ${gzipKB.toFixed(1)} KB / budget ${BUDGET_KB} KB  ` +
    `(${files.length} files)`
)

if (over) {
  console.error(
    `\nBundle exceeds the budget by ${(gzipKB - BUDGET_KB).toFixed(1)} KB.\n` +
      `If the increase is intended, raise BUNDLE_BUDGET_KB; otherwise find what grew.`
  )
  process.exit(1)
}
