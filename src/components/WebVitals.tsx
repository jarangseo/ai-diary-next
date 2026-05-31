'use client'
import { useReportWebVitals } from 'next/web-vitals'

// Core Web Vitals 임계값 (Google 기준). 학습용 콘솔 출력에 등급 표시.
//  - LCP(로딩): 2.5s 이하 good
//  - INP(반응성): 200ms 이하 good
//  - CLS(레이아웃 이동): 0.1 이하 good
//  - FCP/TTFB: 보조 지표
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
    // 실무에선 여기서 분석 엔드포인트로 전송(RUM). 지금은 학습용 콘솔.
    // eslint-disable-next-line no-console
    console.log(`[web-vitals] ${name} = ${shown}${UNIT[name] ?? ''}  (${rating})`)
  })

  return null
}
