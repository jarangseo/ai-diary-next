'use client'
import { useEffect } from 'react'
import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
  type CLSMetricWithAttribution,
  type INPMetricWithAttribution,
  type LCPMetricWithAttribution,
  type MetricWithAttribution,
} from 'web-vitals/attribution'

// Core Web Vitals thresholds (Google):
//  - LCP (loading) good <= 2.5s / INP (responsiveness) good <= 200ms / CLS (layout shift) good <= 0.1
//  - FCP/TTFB are supporting metrics
//
// This uses the *attribution* build rather than `next/web-vitals`. A bare INP number says the page
// was slow but not why: the fix differs completely depending on whether the time went to input
// delay (main thread busy before the handler ran), processing (the handler itself), or presentation
// (rendering the result). Same for CLS, which is only actionable once you know which node moved.
const UNIT: Record<string, string> = { CLS: '', INP: 'ms', LCP: 'ms', FCP: 'ms', TTFB: 'ms' }

function format(name: string, value: number) {
  return name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}${UNIT[name] ?? ''}`
}

// Extra fields worth printing per metric. Anything not listed falls back to the value alone.
function detail(metric: MetricWithAttribution): Record<string, unknown> | null {
  switch (metric.name) {
    case 'INP': {
      const a = (metric as INPMetricWithAttribution).attribution
      return {
        target: a.interactionTarget,
        type: a.interactionType,
        // The three phases sum to INP. Whichever dominates names the fix.
        inputDelay: Math.round(a.inputDelay),
        processing: Math.round(a.processingDuration),
        presentation: Math.round(a.presentationDelay),
      }
    }
    case 'CLS': {
      const a = (metric as CLSMetricWithAttribution).attribution
      return {
        largestShiftTarget: a.largestShiftTarget,
        largestShiftValue: a.largestShiftValue?.toFixed(4),
      }
    }
    case 'LCP': {
      const a = (metric as LCPMetricWithAttribution).attribution
      return {
        element: a.target,
        ttfb: Math.round(a.timeToFirstByte),
        resourceLoadDelay: Math.round(a.resourceLoadDelay),
        resourceLoadDuration: Math.round(a.resourceLoadDuration),
        elementRenderDelay: Math.round(a.elementRenderDelay),
      }
    }
    default:
      return null
  }
}

function report(metric: MetricWithAttribution) {
  const { name, value, rating } = metric
  const extra = detail(metric)
  // In production this would POST to a RUM endpoint; console output is the current stage.
  // See docs/PERFORMANCE.md.
  if (extra) console.log(`[web-vitals] ${name} = ${format(name, value)} (${rating})`, extra)
  else console.log(`[web-vitals] ${name} = ${format(name, value)} (${rating})`)
}

export function WebVitals() {
  useEffect(() => {
    // INP and CLS are continuous: they only settle as the user interacts, so `reportAllChanges`
    // is what makes them observable during a scripted benchmark run rather than only on unload.
    onINP(report, { reportAllChanges: true })
    onCLS(report, { reportAllChanges: true })
    onLCP(report)
    onFCP(report)
    onTTFB(report)
  }, [])

  return null
}
