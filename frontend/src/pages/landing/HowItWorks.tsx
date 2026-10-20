import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import {
  HOW_EYEBROW,
  HOW_STEPS,
  HOW_TITLE,
  LANDING_IDS,
} from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'

/**
 * Concrete usage sequence in four numbered steps. Each step pairs its
 * text with a small working-looking sample interface — a URL capture, a
 * sensitivity profile, an assessment readout, an audit row — instead of
 * an empty bordered box. Reuses the same sample values as the hero and
 * product preview (Sample Notes App, v2.4 → v2.5, High · 84).
 *
 * A violet line advances down the rail with section scroll while each
 * step gains full contrast as it enters the viewport.
 */
export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.8', 'end 0.55'],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })

  return (
    <section
      ref={sectionRef}
      id={LANDING_IDS.howItWorks}
      aria-labelledby="pie-how-title"
      className="pie-section pie-band"
    >
      <div className="shell-frame">
        <FadeUp>
          <p className="pie-eyebrow">{HOW_EYEBROW}</p>
        </FadeUp>
        <KineticTitle
          id="pie-how-title"
          text={HOW_TITLE}
          className="type-section pie-section-title"
        />

        <div className="pie-steps-wrap">
          <div aria-hidden="true" className="pie-steps-rail">
            <motion.span
              className="pie-steps-progress"
              style={{ scaleY: progress }}
            />
          </div>
          <ol className="pie-steps">
            {HOW_STEPS.map((step, index) => (
              <motion.li
                key={step.index}
                className="pie-step"
                initial={{ opacity: 0.35, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-72px' }}
                transition={{ type: 'spring', stiffness: 85, damping: 21 }}
              >
                <span aria-hidden="true" className="pie-step-marker">
                  {step.index}
                </span>
                <div>
                  <h3>
                    <span className="pie-step-index">Step {step.index}</span>
                    {step.title}
                  </h3>
                  <p>{step.text}</p>
                </div>
                <div className="pie-step-visual">
                  <span className="pie-doc-kicker">Illustrative sample</span>
                  <StepVisual index={index} />
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/** Sample mini-interface per step. Same sample story as the rest of the page. */
function StepVisual({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <div className="pie-mini">
          <p className="pie-mono-line">
            https://sample-notes.example/privacy-policy
          </p>
          <div className="pie-mini-row">
            <span className="pie-mini-label">First snapshot</span>
            <span className="pie-mini-meta">v2.0 · 2026-10-08</span>
          </div>
        </div>
      )
    case 1:
      return (
        <div className="pie-mini">
          <div className="pie-mini-row">
            <span className="pie-mini-label">Location</span>
            <span className="pie-mini-meta">5 — highly sensitive</span>
          </div>
          <div className="pie-mini-row">
            <span className="pie-mini-label">Retention</span>
            <span className="pie-mini-meta">4 — high</span>
          </div>
          <div className="pie-mini-row">
            <span className="pie-mini-label">Tracking</span>
            <span className="pie-mini-meta">3 — medium</span>
          </div>
          <div className="pie-scale" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <i key={level} className={level <= 4 ? 'is-on' : undefined} />
            ))}
          </div>
        </div>
      )
    case 2:
      return (
        <div className="pie-mini">
          <div className="pie-mini-row">
            <span className="pie-mini-label">Aggregate impact</span>
            <span className="pie-chip is-score">High · 84</span>
          </div>
          <div className="pie-score-track" aria-hidden="true">
            <div className="pie-score-fill" style={{ width: '84%' }} />
          </div>
          <div className="pie-mini-row">
            <span className="pie-mini-label">Retention clause</span>
            <span className="pie-chip is-modified">Modified</span>
          </div>
          <div className="pie-mini-row">
            <span className="pie-mini-label">Telemetry clause</span>
            <span className="pie-chip is-added">Added</span>
          </div>
        </div>
      )
    default:
      return (
        <div className="pie-mini">
          <div className="pie-mini-row">
            <span className="pie-mini-label">Opt out of data sharing</span>
            <span className="pie-mini-meta">Rule v3</span>
          </div>
          <div className="pie-mini-row">
            <span className="pie-mini-label">Audit record</span>
            <span className="pie-mini-meta">a3f9…c21e</span>
          </div>
          <p className="pie-impact-note">
            Dismiss the action — the audit trail keeps the evidence either way.
          </p>
        </div>
      )
  }
}
