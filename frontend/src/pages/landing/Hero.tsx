import { ROUTES } from '../../app/routes'
import { LinkButton } from '../../components/ui/Button'
import {
  HERO_BODY,
  HERO_TITLE,
  HERO_EYEBROW,
  HERO_VALUES,
  LANDING_IDS,
} from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'
import { HeroStage } from './HeroStage'

/**
 * Cinematic hero: kinetic editorial typography left, animated 3D document
 * stage right, compact capability statements below the copy.
 */
export function Hero() {
  return (
    <section aria-labelledby="pie-hero-title" className="pie-hero">
      <div className="shell-frame pie-hero-grid">
        <div>
          <FadeUp y={16}>
            <p className="pie-eyebrow">{HERO_EYEBROW}</p>
          </FadeUp>
          <KineticTitle
            id="pie-hero-title"
            level={1}
            text={HERO_TITLE}
            className="type-display pie-hero-title"
          />
          <FadeUp delay={0.35}>
            <p className="pie-hero-lede">{HERO_BODY}</p>
          </FadeUp>
          <FadeUp delay={0.45}>
            <div className="pie-cta-row">
              <LinkButton to={ROUTES.register}>Get started</LinkButton>
              <a
                href={`#${LANDING_IDS.workflow}`}
                className="pie-cta-secondary"
              >
                Explore the engine
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.55}>
            <ul aria-label="Key capabilities" className="pie-values">
              {HERO_VALUES.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </FadeUp>
        </div>
        <HeroStage />
      </div>
    </section>
  )
}
