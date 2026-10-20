import { useCallback, type PointerEvent } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'
import { SCENE_CAPTION } from './content'
import { useAutoCycle } from './motion/Reveal'

const SPRING = { type: 'spring', stiffness: 110, damping: 20 } as const

const STAGE_LABELS = ['Track — snapshot recorded', 'Compare — change detected', 'Assess — impact scored']

/**
 * Signature 3D document stage.
 *
 * Three choreographed states tell one story, each layer owning a distinct
 * slot so nothing ever covers text:
 * 0 · Track — the superseded v2.4 snapshot settles into the scene.
 * 1 · Compare — the current v2.5 snapshot enters from the right with real
 *     depth rotation; the old sheet recedes; the changed clause expands.
 * 2 · Assess — the impact summary panel rises into its reserved slot.
 *
 * The only overlap is the current sheet resting over the old card's
 * decorative rule bars — never over text. Overlaps are guaranteed text
 * zones: cards whose overlapped regions contain only bars still read.
 * Reduced motion starts on state 2 so the composed scene is static and
 * complete; dots let every visitor move between states.
 */
export function HeroStage() {
  const reduceMotion = useReducedMotion()
  const [stage, setStage] = useAutoCycle(3, 4600, false, reduceMotion ? 2 : 0)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotateX = useSpring(rawX, { stiffness: 120, damping: 18 })
  const rotateY = useSpring(rawY, { stiffness: 120, damping: 18 })

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || event.pointerType !== 'mouse') return
      const rect = event.currentTarget.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      rawX.set(-py * 8)
      rawY.set(px * 10)
    },
    [rawX, rawY, reduceMotion],
  )

  const handlePointerLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  return (
    <figure
      aria-label="Illustrative preview of a policy document changing between versions"
      className="pie-stage"
      data-testid="hero-stage"
    >
      <p className="sr-only">
        Sample illustration, labelled as illustrative: an older v2.4 snapshot
        recedes behind the current v2.5 snapshot, whose changed retention
        clause is highlighted, beside a sample impact summary panel.
      </p>
      <motion.div
        className="pie-stage-tilt"
        style={{ rotateX, rotateY, transformPerspective: 1400 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Superseded snapshot: track state settles it, later states recede. */}
        <motion.article
          aria-label="Older sample snapshot, version 2.4, superseded"
          className="pie-doc pie-doc-old"
          initial={reduceMotion ? false : { opacity: 0, y: -26 }}
          animate={{
            opacity: stage === 0 ? 1 : 0.9,
            scale: stage === 0 ? 1.02 : 0.95,
            x: stage === 0 ? 10 : -6,
            z: stage === 0 ? -30 : -64,
            rotateY: 8,
          }}
          transition={SPRING}
        >
          <div className="pie-doc-head">
            <span className="pie-doc-kicker">Sample Notes App</span>
            <span className="pie-doc-version">v2.4 · Superseded</span>
          </div>
          <p className="pie-doc-meta">Privacy policy · recorded 2026-10-14</p>
          <div className="pie-doc-lines">
            <p className="pie-doc-clause">
              Activity logs are kept for 90 days.
            </p>
            <div aria-hidden="true" className="pie-doc-bars">
              <span className="pie-bar" />
              <span className="pie-bar is-short" />
              <span className="pie-bar" />
            </div>
          </div>
        </motion.article>

        {/* Right column: current snapshot, then its impact summary. Both live
            in one content-driven column so their heights never collide. */}
        <div className="pie-stage-col">
          <AnimatePresence initial={false}>
            {stage >= 1 ? (
              <motion.article
                key="current"
                aria-label="Current sample snapshot, version 2.5"
                className="pie-doc pie-doc-new"
                initial={{ opacity: 0, x: 120, z: 60, rotateY: 26 }}
                animate={{ opacity: 1, x: 0, z: 24, rotateY: -6, scale: 1 }}
                exit={{ opacity: 0, x: 120, z: 60, rotateY: 26 }}
                transition={SPRING}
              >
                <div className="pie-doc-head">
                  <span className="pie-doc-kicker is-new">
                    Sample Notes App
                  </span>
                  <span className="pie-doc-version">v2.5 · Current</span>
                </div>
                <p className="pie-doc-meta">
                  Privacy policy · recorded 2026-10-15
                </p>
                <div aria-hidden="true" className="pie-doc-bars pie-doc-bars-lead">
                  <span className="pie-bar" />
                </div>
                <AnimatePresence initial={false}>
                  {stage >= 1 ? (
                    <motion.div
                      key="changed"
                      className="pie-changed"
                      initial={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                      animate={{
                        opacity: 1,
                        height: 'auto',
                        paddingTop: 10,
                        paddingBottom: 10,
                        transition: {
                          duration: 0.5,
                          ease: [0.16, 1, 0.3, 1],
                          delay: 0.22,
                        },
                      }}
                      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                    >
                      <p className="pie-changed-text">
                        Activity logs are now kept for 24 months.
                      </p>
                      <span className="pie-changed-badge">Changed</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div aria-hidden="true" className="pie-doc-bars">
                  <span className="pie-bar" />
                  <span className="pie-bar is-short" />
                </div>
                <p className="pie-doc-foot">
                  Compared against v2.4 · retention clause modified
                </p>
              </motion.article>
            ) : null}
          </AnimatePresence>

          {/* Impact summary: rises into the column slot once assessed. */}
          <AnimatePresence initial={false}>
            {stage >= 2 ? (
              <motion.article
                key="impact"
                aria-label="Sample impact summary for the version change"
                className="pie-doc pie-doc-impact"
                initial={{ opacity: 0, y: 64, z: 60 }}
                animate={{ opacity: 1, y: 0, z: 40, rotateY: -4 }}
                exit={{ opacity: 0, y: 64 }}
                transition={SPRING}
              >
                <h3 className="pie-impact-title">Impact summary · sample</h3>
                <ul className="pie-impact-rows">
                  <li>
                    <span className="pie-impact-term">Clauses changed</span>
                    <span className="pie-impact-value">2 of 48</span>
                  </li>
                  <li>
                    <span className="pie-impact-term">Retention</span>
                    <span className="pie-impact-value">90 days → 24 months</span>
                  </li>
                  <li>
                    <span className="pie-impact-term">Band</span>
                    <span className="pie-impact-value">High · 84</span>
                  </li>
                </ul>
                <p className="pie-impact-note">
                  Deterministic assessment of sample data · AI explanation
                  optional
                </p>
              </motion.article>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="pie-stage-meta">
        <p className="pie-stage-state" data-testid="hero-stage-state" aria-live="off">
          {STAGE_LABELS[stage] ?? STAGE_LABELS[0]}
        </p>
        <div className="pie-stage-dots" role="group" aria-label="Preview sequence">
          {STAGE_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={`Show ${label}`}
              aria-current={index === stage}
              onClick={() => setStage(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <figcaption className="pie-stage-caption">{SCENE_CAPTION}</figcaption>
    </figure>
  )
}
