// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import { ROUTES } from '../app/routes'
import { stubLandingBrowser } from './landing/landing-test-utils'

afterEach(() => {
  cleanup()
})

/**
 * Phase 19-B — the full landing page renders every section, and every
 * CTA and navigation link resolves to a real destination. Browser stubs
 * come from `./landing/landing-test-utils` (kept out of any test module
 * so suites are never registered twice through imports).
 */

function renderHomePage(): void {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('Phase 19-B landing page', () => {
  beforeEach(() => {
    stubLandingBrowser()
  })

  it('renders the hero message with the exact headline and eyebrow', () => {
    renderHomePage()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Understand policy changes before they affect you.',
      }),
    ).toBeTruthy()
    expect(screen.getByText('Track · Compare · Understand')).toBeTruthy()
    expect(
      screen.getByText(/compare versions, assess privacy impact/i),
    ).toBeTruthy()
  })

  it('points Get started at registration and Sign in at login', () => {
    renderHomePage()

    const started = screen.getAllByRole('link', { name: 'Get started' })
    expect(started.length).toBeGreaterThan(0)
    for (const link of started) {
      expect(link.getAttribute('href')).toBe(ROUTES.register)
    }

    const signIn = screen.getAllByRole('link', { name: 'Sign in' })
    expect(signIn.length).toBeGreaterThan(0)
    for (const link of signIn) {
      expect(link.getAttribute('href')).toBe(ROUTES.login)
    }
  })

  it('anchors Explore the engine to the workflow section', () => {
    renderHomePage()

    const cta = screen.getByRole('link', { name: 'Explore the engine' })
    expect(cta.getAttribute('href')).toBe('#workflow')
    expect(document.getElementById('workflow')).toBeTruthy()
  })

  it('keeps every section navigation link on a real in-page anchor', () => {
    renderHomePage()

    for (const label of [
      'How it works',
      'Capabilities',
      'Product',
      'About',
    ]) {
      const links = screen.getAllByRole('link', { name: label })
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        const href = link.getAttribute('href') ?? ''
        expect(href.startsWith('#')).toBe(true)
        expect(document.getElementById(href.slice(1))).toBeTruthy()
      }
    }
  })

  it('renders every section from ribbon through footer', () => {
    renderHomePage()

    expect(
      screen.getByLabelText('Product principles'),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Policy change is hard to follow.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'One pipeline, four honest operations.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Everything a revision leaves behind, kept.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Start watching a document in four steps.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'The workspace, up close.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Guarantees we can actually keep.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Built for anyone who reads the fine print.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Know what changed.' }),
    ).toBeTruthy()
    expect(document.getElementById('about')).toBeTruthy()
  })

  it('builds each marquee track from two identical chunks', () => {
    renderHomePage()

    const tracks = document.querySelectorAll('.pie-marquee-track')
    expect(tracks.length).toBe(2)
    for (const track of tracks) {
      const chunks = track.querySelectorAll('.pie-marquee-chunk')
      expect(chunks.length).toBe(2)
      expect(chunks[0]?.textContent).toBe(chunks[1]?.textContent)
      expect((chunks[0]?.textContent ?? '').length).toBeGreaterThan(0)
    }
  })
})
