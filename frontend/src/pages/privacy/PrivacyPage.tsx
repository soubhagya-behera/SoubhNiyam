import { useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import {
  Baby,
  BarChart3,
  Cookie,
  CreditCard,
  Database,
  Gavel,
  HeartPulse,
  Info,
  Mail,
  MapPin,
  Megaphone,
  Pencil,
  RefreshCw,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { listPrivacyPreferences, updatePrivacyPreferences } from '../../api/privacy'
import { toErrorMessage } from '../../api/errors'
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from '../../components/ui/AsyncState'
import { Button } from '../../components/ui/Button'
import { HelperNote } from '../../components/ui/HelperNote'
import { PageContainer } from '../../components/layout/PageContainer'
import { useAsyncData } from '../../hooks/useAsyncData'
import type { PrivacyPreference } from '../../api/types'
import { cn } from '../../lib/cn'
import { SensitivityScale } from './SensitivityScale'
import './privacy.css'

/** Backend sensitivity range is 0-5 inclusive. */
export const SENSITIVITY_LEVELS = [0, 1, 2, 3, 4, 5] as const

/**
 * Type guard for a submittable sensitivity: an integer from 0 through 5.
 * The backend rejects anything else with a 400 problem response, so values
 * failing this guard are never sent.
 */
export function isValidSensitivity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5
  )
}

/**
 * Readable option text for a sensitivity level, mirroring the descriptors
 * used by {@link SensitivityScale} so the edit control and the read-only
 * display agree on what each level means.
 */
export function sensitivityChoiceLabel(level: number): string {
  if (level === 0) return '0 — Not sensitive'
  if (level <= 2) return `${level} — Low sensitivity`
  if (level <= 4) return `${level} — Medium sensitivity`
  return '5 — High sensitivity'
}

/**
 * Collects only the user's changed preferences for the merge `PUT`: entries
 * whose draft value differs from the loaded effective sensitivity. Invalid
 * values and unknown concept codes are excluded rather than sent.
 */
export function changedPreferences(
  original: PrivacyPreference[],
  draft: Record<string, number>,
): Record<string, number> {
  const changes: Record<string, number> = {}
  for (const preference of original) {
    const value = draft[preference.conceptCode]
    if (
      value !== undefined &&
      value !== preference.effectiveSensitivity &&
      isValidSensitivity(value)
    ) {
      changes[preference.conceptCode] = value
    }
  }
  return changes
}

/**
 * Icon per concept in the seeded vocabulary. Unknown codes added to the
 * catalog later fall through to the label-based heuristics below rather than
 * rendering a made-up concept.
 */
const CONCEPT_ICONS: Record<string, LucideIcon> = {
  ADVERTISING: Megaphone,
  ARBITRATION: Scale,
  CHILDREN_DATA: UsersRound,
  COOKIES: Cookie,
  DATA_RETENTION: Database,
  DELETION_RIGHTS: Trash2,
  LEGAL_BASIS: Gavel,
  LOCATION: MapPin,
  THIRD_PARTY_SHARING: Share2,
}

/**
 * Dark inset chip behind each concept glyph: a flat desaturated green-dark
 * square on the card, without a border, matching the reference treatment.
 * Slightly smaller on mobile so the row never crowds the rating column.
 */
const CONCEPT_ICON_CLASSES =
  'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0e1717] text-accent sm:h-[60px] sm:w-[60px] sm:rounded-[14px]'

/** Icon for one concept card. Known codes win; labels handle future entries. */
function conceptIcon(conceptCode: string, label: string): LucideIcon {
  const known = CONCEPT_ICONS[conceptCode]
  if (known) return known

  const key = `${conceptCode} ${label}`.toLowerCase()
  if (/locat|gps|geo/.test(key)) return MapPin
  if (/health|medic|biometr|genet/.test(key)) return HeartPulse
  if (/child|minor|underage/.test(key)) return Baby
  if (/cookie|track/.test(key)) return Cookie
  if (/arbitr|legal|contract|terms|dispute/.test(key)) return Scale
  if (/shar|third|partner|disclos/.test(key)) return Share2
  if (/retention|retain|storage|stor/.test(key)) return Database
  if (/delet|eras|remov/.test(key)) return Trash2
  if (/financ|payment|transaction|credit|bank|billing/.test(key)) {
    return CreditCard
  }
  if (/contact|email|phone|address/.test(key)) return Mail
  if (/identit|profile|account|personal/.test(key)) return UserRound
  if (/brows|search|history|web/.test(key)) return Search
  return ShieldCheck
}

/**
 * Outlined section control used for Edit and Refresh. `accent` keeps Refresh
 * in the electric-green treatment; `quiet` gives Edit the restrained dark
 * outline from the reference. Styling only — behaviour stays on the caller.
 */
interface OutlineButtonProps extends ComponentPropsWithoutRef<'button'> {
  icon: LucideIcon
  isLoading?: boolean
  tone?: 'accent' | 'quiet'
}

function OutlineButton({
  icon: Icon,
  isLoading = false,
  tone = 'accent',
  className,
  disabled,
  children,
  ...rest
}: OutlineButtonProps) {
  const toneClasses =
    tone === 'accent'
      ? 'border-accent/40 bg-transparent text-accent hover:border-accent/70 hover:bg-accent/10'
      : 'border-[#29333f] bg-transparent text-ink hover:border-[#41505f] hover:bg-hover'

  return (
    <button
      type="button"
      aria-busy={isLoading || undefined}
      disabled={disabled ?? isLoading}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-[10px] border px-6 py-3.5',
        'font-body text-control leading-6 tracking-[0.01em]',
        'transition-colors duration-150 ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-50',
        toneClasses,
        className,
      )}
      {...rest}
    >
      <Icon
        size={16}
        strokeWidth={1.8}
        aria-hidden="true"
        className={isLoading ? 'animate-spin' : undefined}
      />
      {children}
    </button>
  )
}

/**
 * Privacy profile.
 *
 * Reads the preference surface from `GET /api/v1/me/privacy-preferences` and
 * persists edits with the merge `PUT /api/v1/me/privacy-preferences`. The read-only
 * card display stays the normal state; editing opens per-concept selects plus
 * Save/Cancel, submits only changed values, and reloads the real preferences
 * from the backend on success.
 */
export function PrivacyPage() {
  const preferences = useAsyncData<PrivacyPreference[]>(
    (signal) => listPrivacyPreferences(signal),
    (data) => data.length === 0,
  )

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loaded = preferences.data ?? []
  const changes = changedPreferences(loaded, draft)
  const changeCount = Object.keys(changes).length

  function startEditing() {
    const initial: Record<string, number> = {}
    for (const preference of loaded) {
      initial[preference.conceptCode] = preference.effectiveSensitivity
    }
    setDraft(initial)
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setDraft({})
    setSaveError(null)
  }

  async function handleSave() {
    if (isSaving || changeCount === 0) return
    const payload = changedPreferences(loaded, draft)
    if (Object.keys(payload).length === 0) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await updatePrivacyPreferences({ preferences: payload })
      setIsEditing(false)
      setDraft({})
      preferences.reload()
    } catch (error) {
      // Edits are preserved in `draft` so the user can retry unchanged.
      setSaveError(toErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="privacy-page">
      <PageContainer>
        {/* Two-column introduction: story on the left, scale card on the right. */}
        <header className="border-b border-line pb-10 lg:pb-8">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="type-label font-medium text-accent">
                Privacy Profile
              </p>
              <h1 className="type-section mt-5 text-ink">
                How sensitive
                <span className="block">your data is to you</span>
              </h1>
              <p className="type-body mt-5 max-w-prose text-ink-secondary">
                Your sensitivity settings decide which privacy concepts the
                engine weighs most when it assesses a policy change.
              </p>
            </div>

            {/* Explainer card, sized to its content and pinned to the right
                edge like the reference rather than stretching the column. */}
            <div className="rounded-[14px] border border-line bg-surface p-5 lg:max-w-[540px] lg:justify-self-end">
              <div className="flex items-center gap-5">
                <span
                  aria-hidden="true"
                  className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent sm:h-16 sm:w-16"
                >
                  <BarChart3
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    strokeWidth={2}
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="font-body text-[17px] font-semibold leading-6 text-ink">
                    How the scale works
                  </h2>
                  <p className="mt-0.5 font-body text-sm leading-6 text-ink-secondary">
                    Each concept is rated from 0 to 5.
                  </p>
                </div>
              </div>

              {/* Level rows sit under the title column, not the icon. */}
              <div className="mt-4 flex flex-col gap-2 pl-[76px] sm:pl-[84px]">
                <div className="flex items-center gap-5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#131f1e] font-body text-[13px] font-semibold tabular-nums text-accent-soft">
                    0
                  </span>
                  <span className="font-body text-sm leading-6 text-ink-secondary">
                    = Not a concern for you
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#131f1e] font-body text-[13px] font-semibold tabular-nums text-accent-soft">
                    5
                  </span>
                  <span className="font-body text-sm leading-6 text-ink-secondary">
                    = Very important to you
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 sm:pl-[84px]">
                <Info
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-accent"
                />
                <p className="font-body text-sm leading-6 text-ink-secondary">
                  Changes here only affect future assessments.
                  <br />
                  Past results and history remain unchanged.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Section header kept inline (same layout as the shared Section)
            so the description can sit at body brightness like the reference
            without touching the component other pages use. */}
        <section className="py-10 lg:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="type-subheading font-semibold text-ink">
                Sensitivity by concept
              </h2>
              <p className="type-body mt-2 max-w-prose text-ink-secondary">
                Values you have not set fall back to the default.
              </p>
            </div>
            {isEditing ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="rounded-[10px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  isLoading={isSaving}
                  disabled={isSaving || changeCount === 0}
                  className="rounded-[10px]"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <OutlineButton
                  icon={Pencil}
                  tone="quiet"
                  onClick={startEditing}
                  disabled={preferences.data === null}
                >
                  Edit
                </OutlineButton>
                <OutlineButton
                  icon={RefreshCw}
                  onClick={preferences.reload}
                  isLoading={preferences.status === 'loading'}
                >
                  Refresh
                </OutlineButton>
              </div>
            )}
          </div>
          <div className="mt-6">
          {preferences.isInitialLoading ? <SkeletonRows rows={4} /> : null}

          {preferences.status === 'error' && preferences.errorMessage ? (
            <ErrorState
              message={preferences.errorMessage}
              onRetry={preferences.reload}
            />
          ) : null}

          {preferences.isEmpty ? (
            <EmptyState
              title="No privacy concepts available"
              description="Once the privacy vocabulary is loaded for your account, each concept and its sensitivity will be listed here."
            />
          ) : null}

          {preferences.data && preferences.data.length > 0 ? (
            <>
              {isEditing ? (
                <HelperNote className="mb-4">
                  Choose a value from 0 (not sensitive) to 5 (high sensitivity)
                  for each concept. Only values you change are saved, and new
                  values apply from your next policy check onward.
                </HelperNote>
              ) : null}

              <ul className="flex flex-col gap-4">
                {preferences.data.map((preference) => {
                  const Icon = conceptIcon(
                    preference.conceptCode,
                    preference.label,
                  )
                  const inputId = `sensitivity-${preference.conceptCode}`
                  return (
                    <li
                      key={preference.conceptCode}
                      className={cn(
                        'flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-5 py-4',
                        'transition-colors duration-150 ease-standard',
                        'hover:border-line-strong hover:bg-raised',
                        'sm:flex-row sm:items-center sm:gap-7 sm:px-7 sm:py-3.5',
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center sm:gap-7">
                        <span
                          aria-hidden="true"
                          className={CONCEPT_ICON_CLASSES}
                        >
                          <Icon
                            className="h-6 w-6 sm:h-[26px] sm:w-[26px]"
                            strokeWidth={1.8}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="font-body text-[17px] font-semibold leading-6 text-ink">
                            {preference.label}
                          </p>
                          <p className="mt-0.5 font-body text-sm leading-6 text-ink-secondary">
                            {preference.explicit ? (
                              <span className="text-accent-soft">
                                Set by you
                              </span>
                            ) : (
                              <span>Default</span>
                            )}
                            {' — change it if this matters more or less to you'}
                          </p>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="w-full pl-16 sm:w-60 sm:shrink-0 sm:pl-0">
                          <label
                            htmlFor={inputId}
                            className="mb-1.5 block font-body text-xs tracking-[0.04em] text-ink-ghost"
                          >
                            Sensitivity
                          </label>
                          <select
                            id={inputId}
                            aria-label={`Sensitivity for ${preference.label}`}
                            value={
                              draft[preference.conceptCode] ??
                              preference.effectiveSensitivity
                            }
                            disabled={isSaving}
                            onChange={(event) =>
                              setDraft((previous) => ({
                                ...previous,
                                [preference.conceptCode]: Number(
                                  event.target.value,
                                ),
                              }))
                            }
                            className="w-full min-h-11 rounded-[10px] border border-line-strong bg-input px-3.5 py-2.5 font-body text-base text-ink transition-colors duration-150 ease-standard focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {SENSITIVITY_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {sensitivityChoiceLabel(level)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="pl-16 sm:pl-0">
                          <SensitivityScale
                            value={preference.effectiveSensitivity}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {isEditing ? (
                <p className="mt-6 font-body text-sm text-ink-ghost">
                  {changeCount === 0
                    ? 'No changes yet. Only changed values are saved.'
                    : `${changeCount} changed value${changeCount === 1 ? '' : 's'} to save.`}
                </p>
              ) : null}

              {isEditing && saveError ? (
                <div
                  role="alert"
                  className="mt-6 rounded-[14px] border border-negative/40 bg-surface px-5 py-6"
                >
                  <p className="type-subheading text-negative">
                    Could not save your changes
                  </p>
                  <p className="type-body mt-2 text-ink-secondary">{saveError}</p>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="mt-6 rounded-[10px]"
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
          </div>
        </section>
      </PageContainer>
    </div>
  )
}
