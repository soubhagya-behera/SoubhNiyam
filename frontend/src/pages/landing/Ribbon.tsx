import { RIBBON_PRIMARY, RIBBON_SECONDARY } from './content'

/**
 * Kinetic statement ribbon: two full-bleed rows travelling in opposite
 * directions, bridging the hero and the story below. Each track holds two
 * identical chunks translating exactly -50% for a seamless loop.
 */
export function Ribbon() {
  return (
    <div className="pie-ribbon" aria-label="Product principles">
      <div className="pie-ribbon-row">
        <div className="pie-marquee-track">
          <MarqueeChunk text={RIBBON_PRIMARY} hidden={false} />
          <MarqueeChunk text={RIBBON_PRIMARY} hidden />
        </div>
      </div>
      <div className="pie-ribbon-row">
        <div className="pie-marquee-track is-reverse">
          <MarqueeChunk text={RIBBON_SECONDARY} hidden={false} />
          <MarqueeChunk text={RIBBON_SECONDARY} hidden />
        </div>
      </div>
    </div>
  )
}

function MarqueeChunk({ text, hidden }: { text: string; hidden: boolean }) {
  const words = text.split('·').map((part) => part.trim()).filter(Boolean)
  return (
    <div className="pie-marquee-chunk" aria-hidden={hidden || undefined}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          {index === 1 ? <strong>{word}</strong> : word}
          {' · '}
        </span>
      ))}
      {words.map((word, index) => (
        <span key={`repeat-${word}-${index}`}>
          {index === 1 ? <strong>{word}</strong> : word}
          {' · '}
        </span>
      ))}
    </div>
  )
}
