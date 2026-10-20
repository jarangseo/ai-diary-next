/**
 * The single-ink drawing (design system: empty states, first run and the completion moment
 * only). No client code of its own, so a server page renders it without shipping JS.
 */
export function Signature({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        pathLength={1}
        d="M38 40 C38 26 52 18 64 20 C78 22 86 32 84 46 C82 58 72 64 60 64 C48 64 38 56 38 40 Z"
      />
      <path pathLength={1} d="M42 30 C32 30 26 42 30 54 C33 60 40 58 42 50" />
      <path pathLength={1} d="M80 28 C90 30 96 42 92 54 C89 60 82 58 81 50" />
      <path pathLength={1} d="M54 54 C58 58 66 58 70 54" />
      <path pathLength={1} d="M46 62 C40 74 38 90 40 104 M76 62 C82 74 86 90 84 104" />
      <path pathLength={1} d="M34 106 C50 109 72 109 92 106" />
      <path pathLength={1} d="M86 92 C96 90 102 82 100 72" />
      <circle cx="54" cy="40" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="70" cy="40" r="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="62" cy="49" rx="3.4" ry="2.4" fill="currentColor" stroke="none" />
    </svg>
  )
}
