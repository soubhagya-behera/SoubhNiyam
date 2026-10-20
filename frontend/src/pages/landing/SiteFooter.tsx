import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { BrandMark } from '../../components/navigation/BrandMark'
import { LinkButton } from '../../components/ui/Button'
import { LANDING_IDS, LANDING_NAV_LINKS } from './content'

/**
 * Complete restrained footer: brand with a truthful product description,
 * in-page navigation, account actions, copyright. No GitHub link — no
 * public repository URL is verified in the project documentation — and
 * no invented social profiles, forms, or contact addresses.
 */
export function SiteFooter() {
  return (
    <footer id={LANDING_IDS.about} className="pie-footer">
      <div className="shell-frame">
        <div className="pie-footer-grid">
          <div>
            <Link
              to={ROUTES.home}
              className="inline-flex min-h-11 items-center"
              aria-label="Policy Impact Engine — back to top"
            >
              <BrandMark />
            </Link>
            <p className="pie-footer-note">
              Track public policy documents, compare versions, and assess
              privacy impact deterministically against your preferences —
              with an evidence-backed audit trail for every step.
            </p>
          </div>
          <div>
            <nav aria-label="Sections" className="pie-footer-nav">
              {LANDING_NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="pie-footer-auth">
              <LinkButton to={ROUTES.login} variant="secondary">
                Sign in
              </LinkButton>
              <LinkButton to={ROUTES.register}>Get started</LinkButton>
            </div>
          </div>
        </div>
        <div className="pie-footer-base">
          <span>© 2026 Policy Impact Engine</span>
          <span>Deterministic assessment · optional AI explanations</span>
        </div>
      </div>
    </footer>
  )
}
