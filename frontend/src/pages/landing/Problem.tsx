import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import {
  PROBLEM_EYEBROW,
  PROBLEM_INTRO,
  PROBLEM_POINTS,
  PROBLEM_TITLE,
} from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'

/**
 * The problem: heading, supporting list, and document artwork live in one
 * deliberate grid so the story reads as a single composition.
 *
 * The scene is the same illustrative sample used across the page — one
 * fictional service ("Sample Notes App") whose retention clause changed
 * between v2.4 and v2.5 — so the artwork and the bullet points describe
 * one coherent situation. Scroll-linked drift settles early (well before
 * the section leaves the viewport), so no gap opens between the entering
 * title and its artwork.
 */
export function Problem() {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'start 0.5'],
  })

  const sweep = isDesktop ? 42 : 20
  const leftX = useTransform(scrollYProgress, [0, 0.75], [-sweep, 0])
  const rightX = useTransform(scrollYProgress, [0, 0.75], [sweep, 0])
  const foreY = useTransform(scrollYProgress, [0.15, 0.85], [56, 0])
  const rotate = isDesktop ? 6 : 0

  return (
    <section
      ref={sectionRef}
      aria-labelledby="pie-problem-title"
      className="pie-section"
    >
      <div className="shell-frame">
        <div className="pie-problem-layout">
          <div className="pie-problem-story">
            <FadeUp y={16}>
              <p className="pie-eyebrow">{PROBLEM_EYEBROW}</p>
            </FadeUp>
            <KineticTitle
              id="pie-problem-title"
              text={PROBLEM_TITLE}
              className="type-section pie-section-title"
            />
            <FadeUp delay={0.15}>
              <p className="pie-section-lede">{PROBLEM_INTRO}</p>
            </FadeUp>

            <ul className="pie-problem-list">
              {PROBLEM_POINTS.map((point, index) => (
                <li key={point.tag}>
                  <FadeUp delay={0.2 + index * 0.08} className="pie-problem-item">
                    <span className="pie-problem-tag">{point.tag}</span>
                    <div>
                      <h3>{point.title}</h3>
                      <p>{point.text}</p>
                    </div>
                  </FadeUp>
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            aria-hidden="true"
            className="pie-problem-scene"
          >
            <motion.div
              className="pie-problem-doc is-left"
              style={{ x: leftX, rotateY: rotate, transformPerspective: 1200 }}
            >
              <span className="pie-tag">Scattered sources</span>
              <p className="pie-doc-kicker">One fictional service, three homes</p>
              <div className="pie-mini">
                <div className="pie-mini-row">
                  <span className="pie-mini-label">Privacy Policy</span>
                  <span className="pie-mini-meta">Help-centre page</span>
                </div>
                <div className="pie-mini-row">
                  <span className="pie-mini-label">Terms of Service</span>
                  <span className="pie-mini-meta">PDF attachment</span>
                </div>
                <div className="pie-mini-row">
                  <span className="pie-mini-label">Data Notice</span>
                  <span className="pie-mini-meta">Regional page</span>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="pie-problem-doc is-right"
              style={{ x: rightX, rotateY: -rotate, transformPerspective: 1200 }}
            >
              <span className="pie-tag">Silent revisions</span>
              <p className="pie-doc-kicker">Sample Notes App · Privacy Policy</p>
              <div className="pie-mini">
                <div className="pie-mini-row">
                  <span className="pie-mini-label">v2.4 · recorded 2026-10-14</span>
                  <span className="pie-mini-meta">Superseded</span>
                </div>
                <div className="pie-mini-row">
                  <span className="pie-mini-label">v2.5 · recorded 2026-10-15</span>
                  <span className="pie-chip is-modified">Modified</span>
                </div>
              </div>
              <p className="pie-impact-note">
                Nothing announced the change; no summary says what moved.
              </p>
            </motion.div>
            <motion.div
              className="pie-problem-doc is-fore"
              style={{ y: foreY }}
            >
              <span className="pie-tag">Dense clauses</span>
              <div className="pie-doc-lines">
                <p className="pie-doc-clause">
                  “…unless you opt out within thirty days of the update,
                  <mark className="pie-buried"> activity logs may be retained
                  for 24 months</mark>.
                </p>
              </div>
              <p className="pie-impact-note">
                One sentence among 48 sample clauses quietly extends
                retention from 90 days to 24 months.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
