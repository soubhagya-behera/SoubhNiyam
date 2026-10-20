import {
  AUDIENCES,
  AUDIENCES_EYEBROW,
  AUDIENCES_TITLE,
  LANDING_IDS,
} from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'

/**
 * Intended use cases — described as such, never as verified customers.
 * Three asymmetric entries with staggered depth: the middle panel sits
 * lower and carries the raised surface.
 */
export function Audiences() {
  return (
    <section
      id={LANDING_IDS.audiences}
      aria-labelledby="pie-audiences-title"
      className="pie-section"
    >
      <div className="shell-frame">
        <FadeUp>
          <p className="pie-eyebrow">{AUDIENCES_EYEBROW}</p>
        </FadeUp>
        <KineticTitle
          id="pie-audiences-title"
          text={AUDIENCES_TITLE}
          className="type-section pie-section-title"
        />

        <div className="pie-audience-wrap">
          <ul className="pie-audience-list">
            {AUDIENCES.map((audience, index) => (
              <li
                key={audience.index}
                className={`pie-audience${index === 1 ? ' is-alt' : ''}`}
              >
                <FadeUp delay={index * 0.1} y={index === 1 ? 56 : 32}>
                  <span aria-hidden="true" className="pie-audience-index">
                    {audience.index}
                  </span>
                  <h3>{audience.title}</h3>
                  <p>{audience.text}</p>
                  <p className="pie-audience-watches">
                    <strong>What they watch</strong>
                    {audience.watches}
                  </p>
                </FadeUp>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
