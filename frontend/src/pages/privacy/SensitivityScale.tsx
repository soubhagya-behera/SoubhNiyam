import { cn } from '../../lib/cn'

/** Number of segments in the indicator; one per sensitivity step 1-5. */
const SEGMENT_COUNT = 5

/** Read-only visualisation of a 0-5 sensitivity value.
 * Five vertical steps fill from the left — one per sensitivity step — so the
 * level is communicated by count as well as colour: filled steps are electric
 * green, the remainder stay muted charcoal. The numeric value is written out
 * beside the bars, so the level is never conveyed by hue alone.
 */
export function SensitivityScale({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(value)))
  const descriptor =
    clamped === 0
      ? 'Not sensitive'
      : clamped <= 2
        ? 'Low sensitivity'
        : clamped <= 4
          ? 'Medium sensitivity'
          : 'High sensitivity'

  return (
    <div className="flex shrink-0 items-center justify-end gap-4 sm:gap-7">
      <span
        className="flex items-center gap-[5px]"
        role="img"
        aria-label={`Sensitivity ${clamped} of 5: ${descriptor}`}
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              'block h-[22px] w-2.5 rounded-[3px]',
              index < clamped ? 'bg-accent' : 'sensitivity-step-empty',
            )}
          />
        ))}
      </span>
      <span className="font-body text-sm tabular-nums text-ink-secondary">
        {clamped}/5
      </span>
    </div>
  )
}