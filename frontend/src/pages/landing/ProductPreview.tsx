import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ROUTES } from '../../app/routes'
import { LinkButton } from '../../components/ui/Button'
import {
  LANDING_IDS,
  PREVIEW_EYEBROW,
  PREVIEW_NOTE,
  PREVIEW_TITLE,
} from './content'
import { FadeUp, KineticTitle, useAutoCycle } from './motion/Reveal'

const TABS = [
  'Policies',
  'Compare',
  'Assessment',
  'Recommendations',
  'Activity',
] as const

type PreviewTab = (typeof TABS)[number]

/**
 * Substantial product-interface showcase in the application's own visual
 * language — flat surfaces, hairlines, status chips, real field names.
 * Tabs cycle automatically (pausing on hover/focus or reduced motion)
 * and switch instantly by click or keyboard. All rows are illustrative
 * sample data, labelled as such.
 */
export function ProductPreview() {
  const [paused, setPaused] = useState(false)
  const [tabIndex, setTabIndex] = useAutoCycle(TABS.length, 6000, paused)
  const tab: PreviewTab = TABS[tabIndex] ?? 'Policies'

  return (
    <section
      id={LANDING_IDS.preview}
      aria-labelledby="pie-preview-title"
      className="pie-section"
    >
      <div className="shell-frame">
        <FadeUp>
          <p className="pie-eyebrow">{PREVIEW_EYEBROW}</p>
        </FadeUp>
        <KineticTitle
          id="pie-preview-title"
          text={PREVIEW_TITLE}
          className="type-section pie-section-title"
        />

        <FadeUp delay={0.1}>
          <div
            className="pie-browser"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div className="pie-browser-bar" aria-hidden="true">
              <span className="pie-browser-squares">
                <i />
                <i />
                <i />
              </span>
              <span className="pie-browser-url">
                Policy Impact Engine · workspace preview
              </span>
            </div>
            <div
              className="pie-browser-tabs"
              role="tablist"
              aria-label="Workspace preview panels"
            >
              {TABS.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={index === tabIndex}
                  onClick={() => setTabIndex(index)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="pie-browser-body">
              <span className="pie-preview-note">{PREVIEW_NOTE}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  role="tabpanel"
                  aria-label={`${tab} sample panel`}
                  data-testid="preview-panel"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PreviewPanel tab={tab} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </FadeUp>

        <div className="pie-cta-band">
          <LinkButton to={ROUTES.register}>Get started</LinkButton>
          <LinkButton to={ROUTES.login} variant="secondary">
            Sign in
          </LinkButton>
          <p className="pie-cta-note">
            The preview above is illustrative — create an account to connect
            your own documents.
          </p>
        </div>
      </div>
    </section>
  )
}

function PreviewPanel({ tab }: { tab: PreviewTab }) {
  switch (tab) {
    case 'Compare':
      return (
        <div>
          <PanelHeading
            title="Sample Policy · v2.4 → v2.5"
            meta="2 clauses changed · persisted diff"
          />
          <div className="pie-mini">
            <div className="pie-mini-row">
              <span className="pie-mini-label">
                Telemetry may be shared with analytics partners
              </span>
              <span className="pie-chip is-added">Added</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">
                Activity logs retained 90 days → 24 months
              </span>
              <span className="pie-chip is-modified">Modified</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">
                Opt out via Global Privacy Control signals
              </span>
              <span className="pie-chip is-removed">Removed</span>
            </div>
          </div>
        </div>
      )
    case 'Assessment':
      return (
        <div>
          <PanelHeading
            title="Privacy impact assessment"
            meta="Scored against your sensitivity profile"
          />
          <div className="pie-mini">
            <div className="pie-mini-row">
              <span className="pie-mini-label">Aggregate band and score</span>
              <span className="pie-chip is-score">High · 84</span>
            </div>
            <div className="pie-score-track" aria-hidden="true">
              <div className="pie-score-fill" style={{ width: '84%' }} />
            </div>
            <p className="pie-impact-note">
              Significant privacy change worth reviewing. Deterministic and
              auditable — AI explanation optional.
            </p>
          </div>
        </div>
      )
    case 'Recommendations':
      return (
        <div>
          <PanelHeading
            title="Recommended actions"
            meta="Evidence attached to every row"
          />
          <div className="pie-mini">
            <div className="pie-mini-row">
              <span className="pie-mini-label">Opt out of data sharing</span>
              <span className="pie-mini-meta">Rule v3 · High</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">Review your settings</span>
              <span className="pie-mini-meta">Rule v3 · Medium</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">Consider deleting your data</span>
              <span className="pie-mini-meta">Rule v3 · Medium</span>
            </div>
          </div>
        </div>
      )
    case 'Activity':
      return (
        <div>
          <PanelHeading
            title="Activity and audit trail"
            meta="Tamper-evident · hash-chained"
          />
          <div className="pie-mini">
            <div className="pie-mini-row">
              <span className="pie-mini-label">Impact assessment recorded</span>
              <span className="pie-mini-meta">a3f9…c21e</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">Diff persisted</span>
              <span className="pie-mini-meta">b71d…04aa</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">Privacy preference updated</span>
              <span className="pie-mini-meta">e5c2…9f07</span>
            </div>
          </div>
        </div>
      )
    default:
      return (
        <div>
          <PanelHeading
            title="Tracked policy documents"
            meta="Checked on a schedule"
          />
          <div className="pie-mini">
            <div className="pie-mini-row">
              <span className="pie-mini-label">
                Sample Notes App · Privacy Policy
              </span>
              <span className="pie-chip is-added">Active</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">
                Sample Notes App · Terms of Service
              </span>
              <span className="pie-chip is-added">Active</span>
            </div>
            <div className="pie-mini-row">
              <span className="pie-mini-label">
                Sample Regulator · Data Notice
              </span>
              <span className="pie-mini-meta">Archived</span>
            </div>
          </div>
        </div>
      )
  }
}

function PanelHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <div>
      <h3 className="type-subheading">{title}</h3>
      <p className="pie-impact-note">{meta}</p>
    </div>
  )
}
