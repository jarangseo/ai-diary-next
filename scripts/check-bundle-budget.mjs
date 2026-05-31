#!/usr/bin/env node
// 배포 JS(.next/static)의 gzip 크기를 예산과 비교해 초과 시 실패(exit 1).
// CI에서 PR마다 실행 → 번들 회귀를 머지 전에 차단하는 "예산 게이트".
//
// 측정 방식: 모든 .js를 이어붙여 gzip (package.json의 measure:bundle과 동일 기준,
// 베이스라인 218KB와 비교 가능). 사용량: node scripts/check-bundle-budget.mjs
// 예산 조정: BUNDLE_BUDGET_KB 환경변수 (기본 250).

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
  console.error(`✗ ${STATIC_DIR} 없음 — 먼저 \`pnpm build\`를 실행하세요.`)
  process.exit(1)
}

const buffers = files.map((f) => readFileSync(f))
const gzipKB = gzipSync(Buffer.concat(buffers)).length / 1024

const over = gzipKB > BUDGET_KB
const mark = over ? '✗' : '✓'
console.log(
  `${mark} shipped JS (gzip): ${gzipKB.toFixed(1)} KB / 예산 ${BUDGET_KB} KB  ` +
    `(파일 ${files.length}개)`
)

if (over) {
  console.error(
    `\n번들이 예산을 ${(gzipKB - BUDGET_KB).toFixed(1)} KB 초과했습니다.\n` +
      `의도된 증가라면 BUNDLE_BUDGET_KB를 올리고, 아니면 무엇이 커졌는지 확인하세요.`
  )
  process.exit(1)
}
