import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Standard page frame.
 *
 * Mobile and desktop deliberately get different vertical rhythm: mobile uses
 * tighter section spacing with a 24px gutter, while desktop opens up to a 48px
 * gutter and larger section rhythm on the wide editorial grid. Laptop and
 * desktop viewports (>= 1024px) compact the block padding again so more of
 * the page fits the viewport without changing the mobile rhythm.
 */
export function PageContainer({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode
  className?: string
  /** `wide` is used by the dashboard's editorial grid. */
  size?: 'default' | 'wide'
}) {
  return (
    <div
      className={cn(
        'shell-frame py-12 md:py-16 lg:py-12',
        size === 'wide' && 'lg:py-14',
        className,
      )}
    >
      {children}
    </div>
  )
}
