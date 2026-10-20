/**
 * Phase 19-B landing content.
 *
 * Copy constants for the full cinematic landing page. Claims stay inside
 * what the product does — deterministic assessment is authoritative and
 * AI explanations are optional — and every anchor referenced here exists
 * on the page. No metrics, testimonials, partner logos, or integrations.
 */

export const LANDING_IDS = {
  top: 'top',
  workflow: 'workflow',
  capabilities: 'capabilities',
  howItWorks: 'how-it-works',
  preview: 'preview',
  security: 'security',
  audiences: 'audiences',
  closing: 'closing',
  about: 'about',
} as const

export interface LandingNavLink {
  label: string
  href: string
}

/** Primary navigation. Every href resolves to a section id on this page. */
export const LANDING_NAV_LINKS: LandingNavLink[] = [
  { label: 'How it works', href: `#${LANDING_IDS.howItWorks}` },
  { label: 'Capabilities', href: `#${LANDING_IDS.capabilities}` },
  { label: 'Product', href: `#${LANDING_IDS.preview}` },
  { label: 'About', href: `#${LANDING_IDS.about}` },
]

export const HERO_EYEBROW = 'Track · Compare · Understand'

export const HERO_TITLE = 'Understand policy changes before they affect you.'

export const HERO_BODY =
  'Track public policy documents, compare versions, assess privacy impact against your preferences, and review recommendations from one workspace.'

/** Compact capability statements beneath the hero calls to action. */
export const HERO_VALUES: string[] = [
  'Policy version tracking',
  'Personalized impact assessment',
  'Evidence-backed audit history',
]

export const RIBBON_PRIMARY =
  'Track policy changes · Compare versions · Assess privacy impact · Trace every decision · '

export const RIBBON_SECONDARY =
  'Version history · Clause-level diffs · Deterministic scoring · Hash-chained audit · '

export const PROBLEM_EYEBROW = 'The problem'

export const PROBLEM_TITLE = 'Policy change is hard to follow.'

export const PROBLEM_INTRO =
  'The documents that govern your privacy live everywhere, change silently, and read like they were written to exhaust you.'

export interface ProblemPoint {
  tag: string
  title: string
  text: string
}

export const PROBLEM_POINTS: ProblemPoint[] = [
  {
    tag: 'Scattered sources',
    title: 'Documents live everywhere',
    text: 'Privacy policies, terms, and notices spread across sites you rarely revisit.',
  },
  {
    tag: 'Silent revisions',
    title: 'Revisions arrive unannounced',
    text: 'A clause changes overnight and nothing tells you what moved.',
  },
  {
    tag: 'Dense clauses',
    title: 'Language resists skimming',
    text: 'Long paragraphs bury the one sentence that affects you.',
  },
]

export const WORKFLOW_EYEBROW = 'From document to decision'

export const WORKFLOW_TITLE = 'One pipeline, four honest operations.'

export interface WorkflowStage {
  key: string
  index: string
  title: string
  text: string
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    key: 'track',
    index: '01',
    title: 'Track',
    text: 'Register a public policy document. The engine retrieves it on a schedule and keeps every snapshot.',
  },
  {
    key: 'compare',
    index: '02',
    title: 'Compare',
    text: 'Each new snapshot is persisted and compared against the last, clause by clause.',
  },
  {
    key: 'assess',
    index: '03',
    title: 'Assess',
    text: 'Detected changes are scored deterministically against your privacy preferences.',
  },
  {
    key: 'understand',
    index: '04',
    title: 'Understand',
    text: 'Inspect recommendations, notifications, and the evidence behind every score.',
  },
]

export interface Capability {
  key: string
  title: string
  text: string
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'tracking',
    title: 'Policy tracking and version history',
    text: 'Every watched document keeps a complete, ordered record of its versions.',
  },
  {
    key: 'diffs',
    title: 'Change detection and persisted diffs',
    text: 'Added, removed, and modified clauses are detected and stored — not recomputed on the fly.',
  },
  {
    key: 'assessment',
    title: 'Personalized privacy impact assessment',
    text: 'Scores follow your sensitivity profile, so the same change reads differently for different people.',
  },
  {
    key: 'recommendations',
    title: 'Recommendations and notifications',
    text: 'Concrete next steps — review settings, opt out, consider deletion — with the evidence attached.',
  },
  {
    key: 'sensitivity',
    title: 'Privacy sensitivity controls',
    text: 'A 0–5 scale per concept, from not sensitive to highly sensitive. Your profile, your call.',
  },
  {
    key: 'audit',
    title: 'Tamper-evident audit history',
    text: 'Hash-chained records for assessments and recommendations you can verify later.',
  },
]

export const HOW_EYEBROW = 'How it works'

export const HOW_TITLE = 'Start watching a document in four steps.'

export interface HowStep {
  index: string
  title: string
  text: string
}

export const HOW_STEPS: HowStep[] = [
  {
    index: '01',
    title: 'Add a document URL',
    text: 'Give the engine the public policy page you want watched. It registers the document and takes the first snapshot.',
  },
  {
    index: '02',
    title: 'Set your sensitivities',
    text: 'Rate each privacy concept from 0 to 5. This profile is what every future assessment is scored against.',
  },
  {
    index: '03',
    title: 'Review the assessment',
    text: 'When a tracked document changes, read the deterministic score, the band, and the exact clauses behind it.',
  },
  {
    index: '04',
    title: 'Act on the recommendation',
    text: 'Follow the recommended action — or dismiss it. Either way the audit trail keeps the evidence.',
  },
]

export const PREVIEW_EYEBROW = 'Product preview'

export const PREVIEW_TITLE = 'The workspace, up close.'

export const PREVIEW_NOTE =
  'Illustrative sample data. The preview shows the shape of the product, not a live connection.'

export const SECURITY_EYEBROW = 'Security and privacy'

export const SECURITY_TITLE = 'Guarantees we can actually keep.'

export const SECURITY_GUARANTEES: string[] = [
  'Your privacy preferences directly influence every impact assessment.',
  'Audit records are tamper-evident and hash-chained.',
  'Access is protected through authentication and authorization.',
  'Assessment records are deterministic and auditable after the fact.',
  'AI explanations are optional and never replace the deterministic record.',
]

export const AUDIENCES_EYEBROW = 'Who it is for'

export const AUDIENCES_TITLE = 'Built for anyone who reads the fine print.'

export interface Audience {
  index: string
  title: string
  text: string
  watches: string
}

export const AUDIENCES: Audience[] = [
  {
    index: '01',
    title: 'Individuals',
    text: 'People who want to know when the services they rely on quietly rewrite the rules.',
    watches: 'Privacy policies of everyday apps and services.',
  },
  {
    index: '02',
    title: 'Developers and technical teams',
    text: 'Teams that need to see exactly which revision introduced a clause — and prove it later.',
    watches: 'Document revisions with version-level precision.',
  },
  {
    index: '03',
    title: 'Researchers and analysts',
    text: 'Anyone working with policy information who needs an evidence trail, not a summary of a summary.',
    watches: 'Policy information backed by persisted diffs.',
  },
]

export const CLOSING_TITLE = 'Know what changed.'

export const CLOSING_TEXT =
  'Register a document, set your sensitivities, and let the next revision explain itself.'

export const SCENE_CAPTION =
  'Illustrative preview with sample content — not a real policy, organization, or endorsement.'
