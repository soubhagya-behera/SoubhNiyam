import { useCallback, useRef, useState } from 'react'
import {
  Archive,
  FileCheck2,
  FilePlus2,
  History,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { AUDIT_FEED_PAGE_SIZE, listAuditEvents } from '../../api/audit'
import { toErrorMessage } from '../../api/errors'
import { PageContainer } from '../../components/layout/PageContainer'
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from '../../components/ui/AsyncState'
import { Button } from '../../components/ui/Button'
import { HelperNote } from '../../components/ui/HelperNote'
import { PageHeader, Section } from '../../components/ui/Layout'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useConceptCatalog } from '../../hooks/useConceptCatalog'
import {
  auditEventLabel,
  auditPreferenceMetadata,
  auditResourceLabel,
  formatDateTime,
} from '../../lib/format'
import { cn } from '../../lib/cn'
import type { AuditEvent } from '../../api/types'
import './activity.css'

/**
 * Detail line for one audit row: the friendly resource label plus, for
 * privacy-preference events, the verified metadata facts rendered in
 * plain words ("Location data: sensitivity 2 → 4"). Concept names come
 * from the shared catalog labels when available. Unknown or unparsable
 * metadata renders nothing — a blank detail line is honest, a guessed
 * one is not.
 */
export function auditEventDetail(
  event: AuditEvent,
  conceptLabels: Record<string, string> = {},
): string {
  const parts: string[] = [auditResourceLabel(event.resourceType, event.resourceId)]
  if (event.eventType === 'PRIVACY_PREFERENCE_UPSERTED') {
    const facts = auditPreferenceMetadata(event.metadata)
    if (facts) {
      const concept =
        (facts.conceptCode !== null
          ? conceptLabels[facts.conceptCode] ?? facts.conceptCode
          : null) ?? 'this concept'
      parts.push(
        facts.from === null
          ? `${concept}: first value set to ${facts.to}`
          : `${concept}: sensitivity ${facts.from} → ${facts.to}`,
      )
    }
  }
  if (event.eventType === 'PRIVACY_PREFERENCE_DELETED') {
    const facts = auditPreferenceMetadata(event.metadata)
    if (facts) {
      const concept =
        (facts.conceptCode !== null
          ? conceptLabels[facts.conceptCode] ?? facts.conceptCode
          : null) ?? 'this concept'
      parts.push(`${concept}: back to default`)
    }
  }
  return parts.join(' · ')
}

/**
 * Icon and colour tone for one audit row's card. Sessions and account
 * milestones ride the electric-green accent, security warnings get the
 * restrained alert hue, and everything else stays neutral so green keeps
 * meaning "you were here" rather than decorating the whole feed.
 */
type ActivityTone = 'accent' | 'neutral' | 'alert'

const TONE_CLASSES: Record<ActivityTone, string> = {
  accent: 'border-accent/30 bg-accent/10 text-accent',
  neutral: 'border-line bg-base text-ink-secondary',
  alert: 'border-negative/30 bg-negative/10 text-negative',
}

function auditEventVisual(eventType: string): {
  icon: LucideIcon
  tone: ActivityTone
} {
  switch (eventType) {
    case 'AUTH_USER_REGISTERED':
      return { icon: UserPlus, tone: 'accent' }
    case 'AUTH_LOGIN_SUCCEEDED':
    case 'AUTH_GOOGLE_LOGIN_SUCCEEDED':
      return { icon: LogIn, tone: 'accent' }
    case 'AUTH_LOGOUT_SUCCEEDED':
    case 'AUTH_LOGOUT_ALL_SUCCEEDED':
      return { icon: LogOut, tone: 'neutral' }
    case 'AUTH_REFRESH_REUSE_DETECTED':
      return { icon: ShieldAlert, tone: 'alert' }
    case 'POLICY_REGISTERED':
      return { icon: FilePlus2, tone: 'neutral' }
    case 'POLICY_OWNER_ASSIGNED':
      return { icon: UserCheck, tone: 'neutral' }
    case 'POLICY_ARCHIVED':
      return { icon: Archive, tone: 'neutral' }
    case 'POLICY_REACTIVATED':
      return { icon: FileCheck2, tone: 'neutral' }
    case 'PRIVACY_PREFERENCE_UPSERTED':
      return { icon: SlidersHorizontal, tone: 'neutral' }
    case 'PRIVACY_PREFERENCE_DELETED':
      return { icon: RotateCcw, tone: 'neutral' }
    default:
      return { icon: History, tone: 'neutral' }
  }
}

/**
 * Activity foundation, backed by the real audit feed from
 * `GET /api/v1/me/audit-events` (newest first, hash-chained).
 *
 * Event metadata is parsed only through the defensive, schema-verified
 * reader in `lib/format.ts`; anything it cannot verify renders as no
 * detail line rather than a guess.
 *
 * Pagination: the backend returns a bare array with no total count, so a
 * short page (`length < AUDIT_FEED_PAGE_SIZE`) is the end-of-feed signal.
 * Page 0 loads with the initial request; "Load more" appends each following
 * page in backend order without touching already-loaded events.
 */
export function ActivityPage() {
  const events = useAsyncData<AuditEvent[]>(
    (signal) =>
      listAuditEvents({ page: 0, size: AUDIT_FEED_PAGE_SIZE }, signal),
    (data) => data.length === 0,
  )

  // Concept labels for preference-event detail lines (same source the
  // Privacy profile uses, so vocabulary cannot disagree).
  const conceptCatalog = useConceptCatalog()

  const [extraEvents, setExtraEvents] = useState<AuditEvent[]>([])
  const [nextPage, setNextPage] = useState(1)
  /** Length of the most recently appended page; null until one is loaded. */
  const [lastFetchedCount, setLastFetchedCount] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  /** Guards against a stale page response landing after a refresh. */
  const sessionRef = useRef(0)

  const firstPage = events.data ?? []
  const allEvents = [...firstPage, ...extraEvents]
  const hasMore =
    events.status === 'success' &&
    (lastFetchedCount === null
      ? firstPage.length === AUDIT_FEED_PAGE_SIZE
      : lastFetchedCount === AUDIT_FEED_PAGE_SIZE)

  const handleRefresh = useCallback(() => {
    sessionRef.current += 1
    setExtraEvents([])
    setNextPage(1)
    setLastFetchedCount(null)
    setLoadMoreError(null)
    setIsLoadingMore(false)
    events.reload()
  }, [events.reload])

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return
    const session = sessionRef.current
    const page = nextPage
    const seenIds = new Set(allEvents.map((event) => event.id))
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const pageEvents = await listAuditEvents({
        page,
        size: AUDIT_FEED_PAGE_SIZE,
      })
      if (sessionRef.current !== session) return
      setExtraEvents((previous) => [
        ...previous,
        ...pageEvents.filter((event) => !seenIds.has(event.id)),
      ])
      setNextPage(page + 1)
      setLastFetchedCount(pageEvents.length)
    } catch (error) {
      if (sessionRef.current !== session) return
      setLoadMoreError(toErrorMessage(error))
    } finally {
      if (sessionRef.current === session) setIsLoadingMore(false)
    }
  }, [isLoadingMore, nextPage, events.data, extraEvents])

  return (
    <div className="activity-page">
      <PageContainer>
        <PageHeader
          label="Activity"
          title="Account activity"
          description="A read-only record of what happened on your account — registrations, sign-ins, and profile changes — newest first. Detected policy changes live under Changes & impact; this feed is the account ledger itself."
        />

        <Section
          title="Audit feed"
          description="Every row below was written once and cannot be altered afterwards; the feed is chained so tampering would be detectable."
          actions={
            <button
              type="button"
              onClick={handleRefresh}
              disabled={events.status === 'loading'}
              aria-busy={events.status === 'loading' || undefined}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl border px-6 py-3',
                'font-body text-control leading-6 tracking-[0.01em]',
                'border-accent/40 bg-surface text-accent',
                'transition-colors duration-150 ease-standard',
                'hover:border-accent/70 hover:bg-accent/10',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <RefreshCw
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                className={events.status === 'loading' ? 'animate-spin' : undefined}
              />
              Refresh
            </button>
          }
        >
          {events.isInitialLoading ? <SkeletonRows rows={5} /> : null}

          {events.status === 'error' && events.errorMessage ? (
            <ErrorState
              message={events.errorMessage}
              onRetry={handleRefresh}
            />
          ) : null}

          {events.isEmpty ? (
            <EmptyState
              title="No activity recorded yet"
              description="Actions such as registering a policy, signing in, or changing your privacy profile will be listed here."
            />
          ) : null}

          {allEvents.length > 0 ? (
            <>
              <ol className="flex flex-col gap-3">
                {allEvents.map((event) => {
                  const { icon: Icon, tone } = auditEventVisual(event.eventType)
                  const detail = auditEventDetail(event, conceptCatalog.labels)
                  return (
                    <li
                      key={event.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4',
                        'transition-colors duration-150 ease-standard',
                        'hover:border-line-strong hover:bg-raised',
                        'sm:flex-row sm:items-center sm:gap-4 sm:p-5',
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center sm:gap-4">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                            TONE_CLASSES[tone],
                          )}
                        >
                          <Icon size={16} strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-body text-base leading-6 text-ink">
                            {auditEventLabel(event.eventType)}
                          </p>
                          {detail ? (
                            <p className="mt-1 font-body text-sm leading-6 text-ink-muted">
                              {detail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <time
                        dateTime={event.occurredAt}
                        className="shrink-0 pl-[3.375rem] font-body text-sm leading-6 tabular-nums text-ink-ghost sm:pl-0 sm:text-right"
                      >
                        {formatDateTime(event.occurredAt)}
                      </time>
                    </li>
                  )
                })}
              </ol>

              {loadMoreError ? (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-negative/40 bg-surface px-5 py-6"
                >
                  <p className="type-subheading text-negative">
                    Could not load more activity
                  </p>
                  <p className="type-body mt-2 text-ink-secondary">
                    {loadMoreError}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => void loadMore()}
                    disabled={isLoadingMore}
                    className="mt-6 rounded-xl"
                  >
                    Try again
                  </Button>
                </div>
              ) : null}

              {hasMore && !loadMoreError ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => void loadMore()}
                    isLoading={isLoadingMore}
                    disabled={isLoadingMore}
                    className="rounded-xl"
                  >
                    {isLoadingMore ? 'Loading more…' : 'Load more'}
                  </Button>
                </div>
              ) : null}

              {hasMore && !loadMoreError ? null : (
                <HelperNote className="mt-6">
                  That is the end of the recorded feed. Only meaningful account
                  events are written here — reading pages like this one is never
                  recorded.
                </HelperNote>
              )}
            </>
          ) : null}
        </Section>
      </PageContainer>
    </div>
  )
}
