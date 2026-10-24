import { motion } from 'framer-motion'
import { ArrowRight, FileText, History } from 'lucide-react'

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
      <motion.figure
        className="reg-doc"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.42 }}
      >
        <div className="reg-doc-halo" />
          <div className="reg-doc-head">
            <span className="reg-doc-title">
              <FileText size={16} className="reg-doc-icon" />
              Policy update
            </span>
            <span className="reg-doc-version">V2.5 · CURRENT</span>
          </div>
        <div className="reg-doc-body">
          <p className="reg-doc-field">Data retention</p>

          <div className="reg-doc-change">
            <span className="reg-doc-old">12 months</span>
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="reg-doc-arrow"
            />
            <motion.span
              className="reg-doc-new"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.72 }}
            >
              24 months
            </motion.span>
          </div>

          <div className="reg-doc-history">
            <History size={14} aria-hidden="true" />
            <span>Version history</span>
            <span className="reg-doc-history-count">1 change</span>
          </div>

          <span className="reg-doc-badge">Change detected</span>
        </div>
      </motion.figure>
    </div>
  )
}
