import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Bell, FileDiff, FileText, Gauge } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import {
  LANDING_IDS,
  WORKFLOW_EYEBROW,
  WORKFLOW_STAGES,
  WORKFLOW_TITLE,
} from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'

const STAGE_ICONS = [FileText, FileDiff, Gauge, Bell] as const

/**
 * The solution: Track → Compare → Assess → Understand as a striking
 * horizontal rail with depth offsets. A violet progress line advances
 * with section scroll; each stage rises into focus on viewport entry.
 * Mobile gets a clear vertical sequence instead.
 */
export function Workflow() {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.85', 'end 0.45'],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })
  const railX = useTransform(progress, [0, 1], isDesktop ? [36, -36] : [0, 0])

  return (
    <section
      ref={sectionRef}
      id={LANDING_IDS.workflow}
      aria-labelledby="pie-workflow-title"
      className="pie-section pie-band"
    >
      <div className="shell-frame">
        <FadeUp>
          <p className="pie-eyebrow">{WORKFLOW_EYEBROW}</p>
        </FadeUp>
        <KineticTitle
          id="pie-workflow-title"
          text={WORKFLOW_TITLE}
          className="type-section pie-section-title"
        />

        <div className="pie-rail-wrap">
          <div aria-hidden="true" className="pie-rail-line">
            <motion.span
              className="pie-rail-progress"
              style={{ scaleX: progress }}
            />
          </div>
          <motion.ol className="pie-rail" style={{ x: railX }}>
            {WORKFLOW_STAGES.map((stage, index) => {
              const Icon = STAGE_ICONS[index] ?? FileText
              return (
                <motion.li
                  key={stage.key}
                  className="pie-stage-card"
                  initial={{ opacity: 0.35, y: 44 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-64px' }}
                  transition={{
                    type: 'spring',
                    stiffness: 85,
                    damping: 20,
                    delay: index * 0.08,
                  }}
                >
                  <span aria-hidden="true" className="pie-stage-index">
                    {stage.index}
                  </span>
                  <span aria-hidden="true" className="pie-stage-icon">
                    <Icon size={18} strokeWidth={1.5} />
                  </span>
                  <h3>{stage.title}</h3>
                  <p>{stage.text}</p>
                </motion.li>
              )
            })}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}
