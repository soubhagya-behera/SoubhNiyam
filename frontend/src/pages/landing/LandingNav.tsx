import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ROUTES } from '../../app/routes'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useMobileMenu } from '../../hooks/useMobileMenu'
import { BrandMark } from '../../components/navigation/BrandMark'
import { MenuTrigger } from '../../components/navigation/MenuTrigger'
import { LinkButton } from '../../components/ui/Button'
import { LANDING_NAV_LINKS } from './content'

const MOBILE_PANEL_ID = 'pie-landing-mobile-navigation'

/**
 * Slim editorial navbar: brand, section anchors, account actions.
 *
 * Gains a hairline divider and a near-opaque backdrop once the visitor
 * scrolls past the hero threshold. Below `lg` everything collapses into
 * the shared accessible mobile panel.
 */
export function LandingNav() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { isOpen, toggle, close, triggerRef } = useMobileMenu(isDesktop)
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 24)
  })

  return (
    <motion.header
      className={`pie-nav${scrolled ? ' is-scrolled' : ''}`}
      initial={false}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="shell-frame pie-nav-inner">
        <Link
          to={ROUTES.home}
          className="flex min-h-11 shrink-0 items-center"
          aria-label="Policy Impact Engine — home"
        >
          <BrandMark />
        </Link>

        <nav aria-label="Sections" className="pie-nav-center">
          {LANDING_NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <nav aria-label="Account" className="pie-nav-actions">
          <LinkButton to={ROUTES.login} variant="ghost">
            Sign in
          </LinkButton>
          <LinkButton to={ROUTES.register}>Get started</LinkButton>
        </nav>

        <MenuTrigger
          isOpen={isOpen}
          onToggle={toggle}
          controlsId={MOBILE_PANEL_ID}
          buttonRef={triggerRef}
        />
      </div>

      <div
        id={MOBILE_PANEL_ID}
        hidden={!isOpen}
        className="pie-mobile-panel lg:hidden"
      >
        <div className="shell-frame">
          <nav aria-label="Sections and account (mobile)">
            {LANDING_NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={close}
                className="pie-mobile-section-link"
              >
                {link.label}
              </a>
            ))}
            <div className="pie-mobile-actions">
              <LinkButton
                to={ROUTES.login}
                variant="secondary"
                onClick={close}
                fullWidth
              >
                Sign in
              </LinkButton>
              <LinkButton
                to={ROUTES.register}
                onClick={close}
                fullWidth
              >
                Get started
              </LinkButton>
            </div>
          </nav>
        </div>
      </div>
    </motion.header>
  )
}
