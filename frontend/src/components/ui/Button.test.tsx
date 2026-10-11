// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Button } from './Button'

afterEach(() => {
  cleanup()
})

/**
 * Phase 18-K.3A — the Archive (danger) button rendered a blank outlined
 * shell: its label was present in the DOM but painted near-black on the
 * dark page. Root cause was a Tailwind v4 token collision: the shared
 * base used `text-base`, which this theme resolves to `--color-base`
 * (#0d0d0d, the page background) — not a font size — and that rule wins
 * over `text-accent-soft` in the compiled cascade. The base must size
 * text via `text-control` so each variant's colour token wins.
 */
describe('Button label visibility', () => {
  it('renders the danger Archive label with the accent colour, not the base colour', () => {
    render(<Button variant="danger">Archive</Button>)

    const button = screen.getByRole('button', { name: 'Archive' })
    const classes = (button.getAttribute('class') ?? '').split(/\s+/)

    expect(classes).toContain('text-accent-soft')
    expect(classes).toContain('text-control')
    expect(classes).not.toContain('text-base')
  })

  it('keeps every variant free of the colliding text-base colour token', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const

    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>)
      const button = screen.getByRole('button', { name: variant })
      const classes = (button.getAttribute('class') ?? '').split(/\s+/)

      // `primary` intentionally keeps `text-base` as its near-black label
      // on the inverted white block; every other variant must not carry
      // the colliding token in the shared base.
      if (variant !== 'primary') {
        expect(classes).not.toContain('text-base')
      }
      expect(classes).toContain('text-control')
      unmount()
    }
  })
})
