// Phase timing for server components.
//
// A page's TTFB is the sum of everything it awaits plus the render, and the only way to
// know which part to attack is to split it. Guessing produced a wrong answer once already
// on this project (see docs/STREAMING_PERF.md), so the rule here is the same: measure
// first, then change one thing.
//
// Note the blind spot: this can only see up to the point the component returns its JSX.
// Rendering that tree to HTML happens after, inside React, so `total` here is always less
// than the observed TTFB. The difference is the render plus framework overhead.
export function startTiming(label: string) {
  const start = performance.now()
  let previous = start
  const phases: string[] = []

  return {
    mark(name: string) {
      const now = performance.now()
      phases.push(`${name} ${Math.round(now - previous)}ms`)
      previous = now
    },
    log() {
      const total = Math.round(performance.now() - start)
      console.log(`[server-timing] ${label} — ${phases.join(' · ')} · awaited ${total}ms`)
    },
  }
}
