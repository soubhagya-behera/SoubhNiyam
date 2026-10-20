// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroStage } from './HeroStage'
import { stubLandingBrowser } from './landing-test-utils'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderStage(): void {
  render(
    <MemoryRouter>
      <HeroStage />
    </MemoryRouter>,
  )
}

describe('HeroStage sequence', () => {
  beforeEach(() => {
    stubLandingBrowser()
  })

  it('starts on the Track state with three sequence controls', () => {
    renderStage()

    expect(screen.getByTestId('hero-stage-state').textContent).toBe(
      'Track — snapshot recorded',
    )
    expect(
      screen.getByRole('group', { name: 'Preview sequence' }),
    ).toBeTruthy()
    expect(
      screen.getAllByRole('button', { name: /Show / }).length,
    ).toBe(3)
  })

  it('jumps to the selected state when a dot is activated', () => {
    renderStage()

    fireEvent.click(
      screen.getByRole('button', { name: 'Show Compare — change detected' }),
    )
    expect(screen.getByTestId('hero-stage-state').textContent).toBe(
      'Compare — change detected',
    )
  })

  it('advances through the sequence on its timer', () => {
    vi.useFakeTimers()
    renderStage()

    act(() => {
      vi.advanceTimersByTime(4600)
    })
    expect(screen.getByTestId('hero-stage-state').textContent).toBe(
      'Compare — change detected',
    )

    act(() => {
      vi.advanceTimersByTime(9200)
    })
    expect(screen.getByTestId('hero-stage-state').textContent).toBe(
      'Track — snapshot recorded',
    )
  })

  it('brings the sample copy through every state without fused words', () => {
    renderStage()

    expect(screen.getByText('Activity logs are kept for 90 days.')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Show Compare — change detected' }),
    )
    expect(
      screen.getByText('Activity logs are now kept for 24 months.'),
    ).toBeTruthy()
  })
})
