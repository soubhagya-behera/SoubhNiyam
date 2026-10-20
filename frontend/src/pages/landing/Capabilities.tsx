import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  FileDiff,
  Gauge,
  History,
  Lock,
  SlidersHorizontal,
} from 'lucide-react'
import { CAPABILITIES, LANDING_IDS } from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'

const CAP_ICONS = {
  tracking: History,
  diffs: FileDiff,
  assessment: Gauge,
  recommendations: Bell,
  sensitivity: SlidersHorizontal,
  audit: Lock,
} as const

/**
 * Asymmetric capability choreography: an editorial index of six features
 * beside a sticky preview panel. Selecting a feature — by click, tap, or
 * keyboard focus — swaps the preview with a spring transition, so the
 * visual state always follows the visitor's choice.
 */
export function Capabilities() {
  const [activeKey, setActiveKey] = useState<string>(
    CAPABILITIES[0]?.key ?? 'tracking',
  )
  const active =
    CAPABILITIES.find((capability) => capability.key === activeKey) ??
    CAPABILITIES[0]
  const ActiveIcon = active ? CAP_ICONS[active.key as keyof typeof CAP_ICONS] : History

  return (
    <section
      id={LANDING_IDS.capabilities}
      aria-labelledby="pie-capabilities-title"
      className="pie-section"
    >
      <div className="shell-frame">
        <FadeUp>
          <p className="pie-eyebrow">Capabilities</p>
        </FadeUp>
        <KineticTitle
          id="pie-capabilities-title"
          text="Everything a revision leaves behind, kept."
          className="type-section pie-section-title"
        />

        <div className="pie-cap-layout">
          <ul className="pie-cap-list" aria-label="Capabilities">
            {CAPABILITIES.map((capability, index) => (
              <li key={capability.key} className="pie-cap-item">
                <button
                  type="button"
                  className="pie-cap-button"
                  aria-pressed={capability.key === activeKey}
                  onClick={() => setActiveKey(capability.key)}
                  onFocus={() => setActiveKey(capability.key)}
                >
                  <span aria-hidden="true" className="pie-cap-key">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{capability.title}</h3>
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="pie-cap-arrow"
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="pie-cap-preview" aria-live="off">
            <span className="pie-preview-note">Illustrative sample data</span>
            <AnimatePresence mode="wait" initial={false}>
              {active ? (
                <motion.div
                  key={active.key}
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                >
                  <span aria-hidden="true" className="pie-stage-icon">
                    <ActiveIcon size={18} strokeWidth={1.5} />
                  </span>
                  <h3 data-testid="capability-preview-title">{active.title}</h3>
                  <p>{active.text}</p>
                  <CapabilityPreview capabilityKey={active.key} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Sample mini-interface per capability. Clearly illustrative, never live data. */
function CapabilityPreview({ capabilityKey }: { capabilityKey: string }) {
  switch (capabilityKey) {
    case 'tracking':
      return (
        <div className="pie-mini" aria-label="Sample version history">
          <MiniRow label="Sample Policy · v2.5" meta="Current" />
          <MiniRow label="Sample Policy · v2.4" meta="Archived" />
          <MiniRow label="Sample Policy · v2.3" meta="Archived" />
        </div>
      )
    case 'diffs':
      return (
        <div className="pie-mini" aria-label="Sample persisted diff">
          <MiniRow
            label="Telemetry sharing clause"
            meta="Added"
            chipClass="is-added"
          />
          <MiniRow
            label="Retention period 90 days → 24 months"
            meta="Modified"
            chipClass="is-modified"
          />
          <MiniRow
            label="Opt-out via privacy signal"
            meta="Removed"
            chipClass="is-removed"
          />
        </div>
      )
    case 'assessment':
      return (
        <div className="pie-mini" aria-label="Sample impact score">
          <MiniRow label="Personalized score" meta="High · 84" chipClass="is-score" />
          <div className="pie-score-track" aria-hidden="true">
            <div className="pie-score-fill" style={{ width: '84%' }} />
          </div>
          <p className="pie-impact-note">
            Scored against your sensitivity profile — deterministic, auditable.
          </p>
        </div>
      )
    case 'recommendations':
      return (
        <div className="pie-mini" aria-label="Sample recommendation">
          <MiniRow label="Opt out of data sharing" meta="Rule v3" />
          <MiniRow label="Review your settings" meta="Rule v3" />
          <p className="pie-impact-note">
            Each action ships with the clauses and score behind it.
          </p>
        </div>
      )
    case 'sensitivity':
      return (
        <div className="pie-mini" aria-label="Sample sensitivity profile">
          <MiniRow label="Data retention" meta="4 — Medium" />
          <div className="pie-scale" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <i key={level} className={level <= 4 ? 'is-on' : undefined} />
            ))}
          </div>
          <p className="pie-impact-note">0 — not sensitive · 5 — highly sensitive.</p>
        </div>
      )
    default:
      return (
        <div className="pie-mini" aria-label="Sample audit chain">
          <MiniRow label="Assessment recorded" meta="a3f9…c21e" />
          <MiniRow label="Diff persisted" meta="b71d…04aa" />
          <MiniRow label="Preference updated" meta="e5c2…9f07" />
        </div>
      )
  }
}

function MiniRow({
  label,
  meta,
  chipClass,
}: {
  label: string
  meta: string
  chipClass?: string
}) {
  return (
    <div className="pie-mini-row">
      <span className="pie-mini-label">{label}</span>
      {chipClass ? (
        <span className={`pie-chip ${chipClass}`}>{meta}</span>
      ) : (
        <span className="pie-mini-meta">{meta}</span>
      )}
    </div>
  )
}
