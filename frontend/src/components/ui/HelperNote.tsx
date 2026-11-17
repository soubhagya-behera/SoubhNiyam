import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * A one-line contextual explanation attached to a section.
 *
 * The product answers "why does this information matter?" by placing a
 * short, honest note next to the thing it explains — never in a drawer.
 * The mint rule marks it as guidance rather than data.
 */
export interface HelperNoteProps {
  children: ReactNode
  /** Visual weight: `subtle` fades into the page, `panel` reads as a callout. */
  tone?: 'subtle' | 'panel'
  className?: string
}

export function HelperNote({ children, tone = 'subtle', className }: HelperNoteProps) {
  return (
    <p
      role="note"
      className={cn(
        'max-w-prose font-body text-sm leading-6',
        tone === 'panel'
          ? 'border-l-2 border-accent-soft/60 bg-panel/50 px-4 py-3 text-ink-secondary'
          : 'border-l-2 border-line-strong pl-4 text-ink-muted',
        className,
      )}
    >
      {children}
    </p>
  )
}
