// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { KineticTitle } from './motion/Reveal'
import { stubLandingBrowser } from './landing-test-utils'

afterEach(() => {
  cleanup()
})

/**
 * Regression: inter-word spaces used to be text nodes *inside* the
 * `display:inline-block` `.kinetic-word` wrappers, and CSS text processing
 * strips trailing collapsible whitespace from inline-blocks — fusing words
 * ("Understand policy changes…" rendered as "Understandpolicychanges…").
 *
 * The test asserts the structure itself: every word wrapper holds exactly
 * one word with no surrounding whitespace, the heading's textContent
 * preserves single spaces between words, and the accessible name keeps the
 * full sentence. With the old composition every word span carried a
 * trailing space and the first two assertions fail.
 */
describe('KineticTitle word spacing', () => {
  it('renders real spaces between words without trailing whitespace inside word wrappers', () => {
    stubLandingBrowser()

    render(
      <KineticTitle
        level={1}
        text="Understand policy changes before they affect you."
      />,
    )

    const heading = screen.getByRole('heading', { level: 1 })
    const words = heading.querySelectorAll<HTMLElement>('.kinetic-word')

    expect(words.length).toBe('Understand policy changes before they affect you.'.split(' ').length)
    for (const wrapper of Array.from(words)) {
      expect(wrapper.textContent).toBe(wrapper.textContent?.trim() ?? '')
      expect(wrapper.textContent).toMatch(/^\S+$/)
    }
    expect(heading.textContent).toBe(
      'Understand policy changes before they affect you.',
    )
    expect(heading.getAttribute('aria-label')).toBe(
      'Understand policy changes before they affect you.',
    )
  })

  it('preserves spaces and punctuation for every animated landing headline', () => {
    stubLandingBrowser()

    render(
      <>
        <KineticTitle id="a" text="Policy change is hard to follow." />
        <KineticTitle id="b" text="One pipeline, four honest operations." />
        <KineticTitle id="c" text="Everything a revision leaves behind, kept." />
        <KineticTitle id="d" text="Start watching a document in four steps." />
      </>,
    )

    expect(document.getElementById('a')?.textContent).toBe(
      'Policy change is hard to follow.',
    )
    expect(document.getElementById('b')?.textContent).toBe(
      'One pipeline, four honest operations.',
    )
    expect(document.getElementById('c')?.textContent).toBe(
      'Everything a revision leaves behind, kept.',
    )
    expect(document.getElementById('d')?.textContent).toBe(
      'Start watching a document in four steps.',
    )
  })
})
