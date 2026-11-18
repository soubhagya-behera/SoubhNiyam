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

/** Type guard for a submittable sensitivity: an integer from 0 through 5.
 * The backend rejects anything else with a 400 problem response, so values
 * failing this guard are never sent.
 */
export function isValidSensitivity(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    && value <= 5
  )
}

/** Readable option text for a sensitivity level, mirroring the descriptors
 * used by {@link SensitivityScale} so the edit control and the read-only
 * display agree on what each level means.
 */
export function sensitivityChoiceLabel(level: number): string {
  if (level === 0) return '0 — Not sensitive'
  if (level <= 2) return `${level} — Low sensitivity`
  if (level <= 4) return `${level} — Medium sensitivity`
  return '5 — High sensitivity'
}

/** Collects only the user's changed preferences for the merge `PUT`: entries
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
      value !== undefined
      && value !== preference.effectiveSensitivity
      && isValidSensitivity(value)
    ) {
      changes[preference.conceptCode] = value
    }
  }
  return changes
}

/** Icon per concept in the seeded vocabulary. Unknown codes added to the
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

/** Dark inset chip behind each concept glyph: a flat desaturated green-dark
 * square on the card, without a border, matching the reference treatment.
 * Slightly smaller on mobile so