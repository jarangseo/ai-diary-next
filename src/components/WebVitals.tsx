'use client'
import { useReportWebVitals } from 'next/web-vitals'

// Core Web Vitals thresholds (Google). Console output shows the rating for learning.
//  - LCP (loading): good <= 2.5s
//  - INP (responsiveness): good <= 200ms
//  - CLS (layout shift): good <= 0.1
//  - FCP/TTFB: supporting metrics
const UNIT: Record<string, string> = {
  CLS: '',
  INP: 'ms',
  LCP: 'ms',
  FCP: 'ms',
  TTFB: 'ms',
}

export function WebVitals() {
  useReportWebVitals((metric) => {
    const { name, value, rating } = metric
    const shown = name === 'CLS' ? value.toFixed(3) : Math.round(value)
    // In production this would POST to an analytics endpoint (RUM). For now, a learning console log.
    // eslint-disable-next-line no-console
    console.log(`[web-vitals] ${name} = ${shown}${UNIT[name] ?? ''}  (${rating})`)
  })

  return null
}
