import { useMemo } from 'react'
import { listPrivacyPreferences } from '../api/privacy'
import type { PrivacyPreference } from '../api/types'
import { useAsyncData, type AsyncState } from './useAsyncData'

/**
 * Shared human-readable names for privacy concepts.
 *
 * The backend owns the vocabulary: `GET /me/privacy-preferences` returns
 * the complete concept catalog with a label per `conceptCode`. Surfaces
 * that were previously showing raw codes (assessments, recommendations)
 * resolve names through this one hook, so the products' vocabulary comes
 * from the system of record rather than a duplicated frontend dictionary.
 *
 * Codes that the catalog does not know fall back to the raw code in the
 * caller's preferred style — honest, still recognizable, and never
 * invented.
 */
export interface ConceptCatalog {
  state: AsyncState<PrivacyPreference[]>
  /** conceptCode -> backend label. Empty until the fetch resolves. */
  labels: Record<string, string>
  /**
   * Backend label for a concept code, or the fallback when the code is
   * unknown or undefined. Returns `null` when `code` is null/undefined so
   * callers can suppress null-concept rows cleanly.
   */
  labelFor(code: string | null | undefined, fallback?: string): string | null
}

export function useConceptCatalog(enabled = true): ConceptCatalog {
  const state = useAsyncData<PrivacyPreference[]>(
    (signal) => listPrivacyPreferences(signal),
    (data) => data.length === 0,
    { enabled },
  )

  const labels = useMemo(() => toConceptLabelMap(state.data), [state.data])

  function labelFor(
    code: string | null | undefined,
    fallback?: string,
  ): string | null {
    if (state.status !== 'success') return code ?? fallback ?? null
    return conceptLabel(code, labels, fallback)
  }

  return { state, labels, labelFor }
}

/**
 * Pure mapping. Kept exported so pages (and tests) can build the label
 * table from response data directly.
 */
export function toConceptLabelMap(
  preferences: PrivacyPreference[] | null | undefined,
): Record<string, string> {
  const map: Record<string, string> = {}
  if (!preferences) return map
  for (const preference of preferences) {
    if (preference.label) {
      map[preference.conceptCode] = preference.label
    }
  }
  return map
}

/**
 * Label resolution for one concept code: the human label when the
 * catalog knows the code, otherwise `fallback ?? code` — a raw code is an
 * honest rendering, a made-up name is not.
 */
export function conceptLabel(
  code: string | null | undefined,
  labels: Record<string, string>,
  fallback?: string,
): string | null {
  if (!code) return fallback ?? null
  return labels[code] ?? fallback ?? code
}
