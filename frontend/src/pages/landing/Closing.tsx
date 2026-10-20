import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ROUTES } from '../../app/routes'
import { LinkButton } from '../../components/ui/Button'
import { CLOSING_TEXT, CLOSING_TITLE, LANDING_IDS } from './content'
import { FadeUp } from './motion/Reveal'

/**
 * Closing scene: echoes the hero's document composition so the page ends
 * where its visual language began — the superseded v2.4 plate behind,
 * the current v2.5 plate crossing in front with the changed-clause
 * highlight, and the CTA resolving beside it. The same shared sample
 * story (Sample Notes App, 2 clauses changed) closes the loop. Front
 * plate overlaps only the back plate's decorative bars.
 */
export function Closing() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end end'],
  })
  const frontX = useTransform(scrollYProgress, [0.35, 0.9], [76, 0])
  const backX = useTransform(scrollYProgress, [0.35, 0.9], [-52, 0])
  const frontRotate = useTransform(scrollYProgress, [0.35, 0.9], [-14, -6])

  return (
    <section
      ref={sectionRef}
      id={LANDING_IDS.closing}
      aria-labelledby="pie-closing-title"
      className="pie-closing"
    >
      <div className="shell-frame pie-closing-grid">
        <div>
          <FadeUp>
            <p className="pie-eyebrow">Begin</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 id="pie-closing-title" className="pie-closing-title">
              {CLOSING_TITLE}
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="pie-closing-text">{CLOSING_TEXT}</p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="pie-cta-row">
              <LinkButton to={ROUTES.register}>Get started</LinkButton>
              <LinkButton to={ROUTES.login} variant="secondary">
                Sign in
              </LinkButton>
            </div>
          </FadeUp>
        </div>

        <motion.div aria-hidden="true" className="pie-echo">
          <motion.div
            className="pie-echo-plate is-back"
            style={{ x: backX, rotateY: 6, transformPerspective: 1200 }}
          >
            <div className="pie-doc-head">
              <span className="pie-doc-kicker">Sample Notes App</span>
              <span className="pie-doc-version">v2.4 · Superseded</span>
            </div>
            <p className="pie-doc-meta">Recorded 2026-10-14</p>
            <div className="pie-doc-lines">
              <p className="pie-doc-clause">
                Activity logs are kept for 90 days.
              </p>
              <div aria-hidden="true" className="pie-doc-bars">
                <span className="pie-bar" />
                <span className="pie-bar is-short" />
              </div>
            </div>
          </motion.div>
          <motion.div
            className="pie-echo-plate is-front"
            style={{ x: frontX, rotateY: frontRotate, transformPerspective: 1200 }}
          >
            <div className="pie-doc-head">
              <span className="pie-doc-kicker is-new">Sample Notes App</span>
              <span className="pie-doc-version">v2.5 · Current</span>
            </div>
            <p className="pie-doc-meta">Recorded 2026-10-15</p>
            <div className="pie-changed">
              <p className="pie-changed-text">
                Activity logs are now kept for 24 months.
              </p>
              <span className="pie-changed-badge">2 clauses changed</span>
            </div>
            <p className="pie-doc-foot">
              The next revision can explain itself — this is the whole idea.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
