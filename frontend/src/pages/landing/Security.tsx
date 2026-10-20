import { Check } from 'lucide-react'
import {
  LANDING_IDS,
  SECURITY_EYEBROW,
  SECURITY_GUARANTEES,
  SECURITY_TITLE,
} from './content'
import { FadeUp, KineticTitle } from './motion/Reveal'

const HASH_BLOCKS = [
  { title: 'Assessment recorded', hash: 'a3f9…c21e' },
  { title: 'Diff persisted', hash: 'b71d…04aa' },
  { title: 'Preference updated', hash: 'e5c2…9f07' },
]

/**
 * Security and privacy: an editorial statement plus only the guarantees
 * the implementation substantiates. A quiet hash-chain strip visualises
 * tamper-evidence without shield-icon clichés.
 */
export function Security() {
  return (
    <section
      id={LANDING_IDS.security}
      aria-labelledby="pie-security-title"
      className="pie-section pie-band"
    >
      <div className="shell-frame">
        <FadeUp>
          <p className="pie-eyebrow">{SECURITY_EYEBROW}</p>
        </FadeUp>
        <KineticTitle
          id="pie-security-title"
          text={SECURITY_TITLE}
          className="type-section pie-section-title"
        />

        <ul className="pie-guarantees">
          {SECURITY_GUARANTEES.map((guarantee, index) => (
            <li key={guarantee}>
              <FadeUp delay={index * 0.06} className="pie-guarantee">
                <span aria-hidden="true" className="pie-guarantee-mark">
                  <Check size={13} strokeWidth={2} />
                </span>
                {guarantee}
              </FadeUp>
            </li>
          ))}
        </ul>

        <FadeUp delay={0.1}>
          <div
            className="pie-hashchain"
            aria-label="Illustrative hash-chained audit records"
          >
            {HASH_BLOCKS.map((block, index) => (
              <div key={block.hash} style={{ display: 'contents' }}>
                {index > 0 ? (
                  <span aria-hidden="true" className="pie-hashlink" />
                ) : null}
                <div className="pie-hashblock">
                  <strong>{block.title}</strong>
                  sha256 <code>{block.hash}</code>
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
