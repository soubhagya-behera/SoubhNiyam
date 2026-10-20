import { MotionConfig } from 'framer-motion'
import './landing/landing.css'
import './landing/motion.css'
import './landing/stages.css'
import './landing/workflow.css'
import './landing/panels.css'
import './landing/finale.css'
import { LandingNav } from './landing/LandingNav'
import { Hero } from './landing/Hero'
import { Ribbon } from './landing/Ribbon'
import { Problem } from './landing/Problem'
import { Workflow } from './landing/Workflow'
import { Capabilities } from './landing/Capabilities'
import { HowItWorks } from './landing/HowItWorks'
import { ProductPreview } from './landing/ProductPreview'
import { Security } from './landing/Security'
import { Audiences } from './landing/Audiences'
import { Closing } from './landing/Closing'
import { SiteFooter } from './landing/SiteFooter'
import { LANDING_IDS } from './landing/content'

/**
 * Phase 19-B public landing page.
 *
 * Full cinematic editorial experience from navigation through footer:
 * kinetic hero with an animated 3D document stage, dual-direction
 * ribbon, scroll-driven problem and workflow scenes, interactive
 * capability choreography, a concrete how-it-works sequence, a product
 * preview in the application's own visual language, security guarantees,
 * audiences, closing scene, and footer.
 *
 * `MotionConfig reducedMotion="user"` collapses Framer Motion transforms
 * for visitors who request reduced motion; CSS loops are gated the same
 * way. The `/` route stays public; authenticated routes are untouched.
 */
export function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="pie">
        <a href={`#${LANDING_IDS.top}`} className="pie-skip">
          Skip to content
        </a>
        <LandingNav />
        <main id={LANDING_IDS.top}>
          <Hero />
          <Ribbon />
          <Problem />
          <Workflow />
          <Capabilities />
          <HowItWorks />
          <ProductPreview />
          <Security />
          <Audiences />
          <Closing />
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  )
}

export default HomePage
