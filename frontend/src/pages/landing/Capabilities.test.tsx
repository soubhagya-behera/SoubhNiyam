// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Capabilities } from './Capabilities'
import { stubLandingBrowser } from './landing-test-utils'

afterEach(() => {
  cleanup()
})

function renderCapabilities(): void {
  render(
    <MemoryRouter>
      <Capabilities />
    </MemoryRouter>,
  )
}

describe('Capabilities choreography', () => {
  beforeEach(() => {
    stubLandingBrowser()
  })

  it('opens on the first capability with its preview', () => {
    renderCapabilities()

    expect(
      screen.getByRole('button', {
        name: /Policy tracking and version history/,
      }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.getByTestId('capability-preview-title').textContent,
    ).toContain('Policy tracking and version history')
  })

  it('swaps the preview when another capability is selected by click', async () => {
    renderCapabilities()

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tamper-evident audit history/,
      }),
    )
    // The pressed state follows React state synchronously …
    expect(
      screen
        .getByRole('button', { name: /Tamper-evident audit history/ })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // … while the preview panel swaps after the exit transition.
    await waitFor(
      () => {
        expect(
          screen.getByTestId('capability-preview-title').textContent,
        ).toContain('Tamper-evident audit history')
      },
      { timeout: 3000 },
    )
  })

  it('swaps the preview on keyboard focus, not hover alone', async () => {
    renderCapabilities()

    fireEvent.focus(
      screen.getByRole('button', {
        name: /Privacy sensitivity controls/,
      }),
    )
    await waitFor(
      () => {
        expect(
          screen.getByTestId('capability-preview-title').textContent,
        ).toContain('Privacy sensitivity controls')
      },
      { timeout: 3000 },
    )
  })
})
