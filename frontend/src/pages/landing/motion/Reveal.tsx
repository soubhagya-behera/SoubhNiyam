import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Shared landing motion language.
 *
 * `MotionConfig reducedMotion="user"` (set in `HomePage`) already collapses
 * every transform below; these helpers add the house style — soft springs,
 * once-only viewport entry, and word-stagger kinetic type — plus an
 * auto-cycling index hook that never advances under reduced motion.
 */

const SPRING = { type: 'spring', stiffness: 90, damping: 20 } as const

export function FadeUp({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Kinetic headline: words rise out of a clipped line with stagger.
 * The full text stays available to assistive technology via `aria-label`
 * while the animated word spans are hidden from it.
 */
export function KineticTitle({
  text,
  id,
  className,
  level = 2,
}: {
  text: string
  id?: string
  className?: string
  level?: 1 | 2
}) {
  const words = text.split(' ')
  const Tag = level === 1 ? motion.h1 : motion.h2
  return (
    <Tag
      id={id}
      aria-label={text}
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-64px' }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
      }}
    >
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span aria-hidden="true" className="kinetic-word">
            <motion.span
              className="kinetic-word-inner"
              variants={{
                hidden: { y: '110%' },
                shown: {
                  y: '0%',
                  transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
                },
              }}
            >
              {word}
            </motion.span>
          </span>
          {/*
            The inter-word space must be a sibling of the inline-block word
            wrapper, never inside it — trailing whitespace inside an
            inline-block is collapsed by CSS text processing, which used to
            fuse adjacent words ("Understandpolicychanges…").
          */}
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}

/**
 * Cycles `0..count-1` on `intervalMs`. Pauses when `paused`, stops
 * entirely under reduced motion, and always cleans up its timer.
 * `initialIndex` lets a caller open on a composed state (the hero uses
 * this so reduced-motion visitors see the finished scene immediately).
 */
export function useAutoCycle(
  count: number,
  intervalMs: number,
  paused = false,
  initialIndex = 0,
): [number, (index: number) => void] {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (paused || reduceMotion || count <= 1) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [count, intervalMs, paused, reduceMotion])

  return [index, setIndex]
}
