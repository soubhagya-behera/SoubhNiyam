/**
 * Shared jsdom browser stubs for landing-page tests.
 *
 * Kept in a non-test module on purpose: importing helpers from a
 * `*.test.tsx` file would execute that file's suites inside every
 * importer and register its tests multiple times. jsdom provides neither
 * `window.matchMedia` (needed by `useMediaQuery` and Framer Motion) nor
 * `IntersectionObserver` (needed by Framer Motion's `whileInView`), so
 * both are stubbed here. The observer reports every observed element as
 * intersecting, mirroring a fully scrolled, settled page.
 */

class IntersectionObserverStub {
  readonly root: Element | Document | null = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  private readonly callback: IntersectionObserverCallback

  constructor(
    callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    this.callback = callback
  }

  observe(target: Element): void {
    this.callback(
      [
        {
          isIntersecting: true,
          target,
        } as unknown as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

export function stubLandingBrowser(): void {
  const matchMediaStub = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
  window.matchMedia = matchMediaStub
  window.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver
}

/** Overrides `matchMedia` to report reduced motion as requested. */
export function stubReducedMotion(): void {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
