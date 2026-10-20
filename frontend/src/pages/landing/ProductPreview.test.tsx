// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductPreview } from './ProductPreview'
import { stubLandingBrowser } from './landing-test-utils'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderPreview(): void {
  render(
    <MemoryRouter>
      <ProductPreview />
    </MemoryRouter>,
  )
}

describe('ProductPreview tabs', () => {
  beforeEach(() => {
    stubLandingBrowser()
  })

  it('opens on the Policies panel with all five tabs available', () => {
    renderPreview()

    for (const tab of [
      'Policies',
      'Compare',
      'Assessment',
      'Recommendations',
      'Activity',
    ]) {
      expect(screen.getByRole('tab', { name: tab })).toBeTruthy()
    }
    expect(screen.getByTestId('preview-panel').textContent).toContain(
      'Tracked policy documents',
    )
    expect(
      screen.getByRole('tab', { name: 'Policies' }).getAttribute(
        'aria-selected',
      ),
    ).toBe('true')
  })

  it('switches panels when a tab is activated', async () => {
    renderPreview()

    fireEvent.click(screen.getByRole('tab', { name: 'Assessment' }))
    expect(
      screen.getByRole('tab', { name: 'Assessment' }).getAttribute(
        'aria-selected',
      ),
    ).toBe('true')
    await waitFor(
      () => {
        expect(screen.getByTestId('preview-panel').textContent).toContain(
          'Privacy impact assessment',
        )
      },
      { timeout: 3000 },
    )
  })

  it('cycles to the next panel on its timer', async () => {
    vi.useFakeTimers()
    renderPreview()

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    vi.useRealTimers()
    await waitFor(
      () => {
        expect(screen.getByTestId('preview-panel').textContent).toContain(
          'v2.4 → v2.5',
        )
      },
      { timeout: 3000 },
    )
  })
})
