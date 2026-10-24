import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'

/**
 * Decorative artwork for the registration scene: one primary policy
 * document card over two subtle translucent backing panels for depth,
 * plus a static soft glow behind it.
 *
 * Entirely presentational — the container is `aria-hidden` and the left
 * column copy carries the meaning. A single entrance animation runs on
 * mount; `MotionConfig reducedMotion="user"` on the page neutralises it
 * for reduced-motion visitors. Nothing floats continuously.
 */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function RegisterArtwork() {
  return (
    <div className="reg-art" aria-hidden="true">
      <motion.div
        className="reg-doc-stack"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
      >
        <div className="reg-doc-halo" />
        <div className="reg-doc-back is-far" />
        <div className="reg-doc-back is-near" />
        <figure className="reg-doc">
          <div className="reg-doc-head">
            <span className="reg-doc-title">
              <FileText size={16} className="reg-doc-icon" />
              Policy update
            </span>
            <span className="reg-doc-version">v2.5 · Current</span>
          </div>
          <div className="reg-bars">
            <span />
            <span className="is-short" />
            <span />
          </div>
          <div className="reg-changed">
            <p>Retention updated to 24 months.</p>
            <span className="reg-changed-badge">Changed</span>
          </div>
          <div className="reg-bars">
            <span />
            <span className="is-short" />
          </div>
        </figure>
      </motion.div>
    </div>
  )
}
