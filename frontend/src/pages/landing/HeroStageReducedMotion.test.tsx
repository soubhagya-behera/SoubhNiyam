// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroStage } from './HeroStage'
import { stubLandingBrowser, stubReducedMotion } from './landing-test-utils'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/**
 * Reduced-motion behaviour lives in its own file on purpose: Framer
 * Motion reads the OS preference once into a module-level singleton, so
 * the reduced-motion environment must be in place before the first
 * render of this module registry.
 */
describe('HeroStage reduced motion', () => {
  beforeEach(() => {
    stubLandingBrowser()
    stubReducedMotion()
  })

  it('holds the composed state still when reduced motion is requested', () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <HeroStage />
      </MemoryRouter>,
    )

    act(() => {
      vi.advanceTimersByTime(20000)
    })
    // Reduced motion starts on the final composed state — document
    // snapshots, the highlighted clause, and the impact summary are all
    // present statically instead of hidden behind disabled animation.
    expect(screen.getByTestId('hero-stage-state').textContent).toBe(
      'Assess — impact scored',
    )
    expect(screen.getByText('Impact summary · sample')).toBeTruthy()
    expect(
      screen.getByText('Activity logs are now kept for 24 months.'),
    ).toBeTruthy()
  })
})
