import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  History,
  Lock,
  Mail,
  TrendingUp,
} from 'lucide-react'
import { isApiError, toErrorMessage } from '../../api/errors'
import { useAuth } from '../../auth/AuthContext'
import { BrandMark } from '../../components/navigation/BrandMark'
import { ROUTES } from '../../app/routes'
import { cn } from '../../lib/cn'
import './login.css'

/** Where to return after a successful sign-in, defaulting to the overview. */
function resolveRedirect(state: unknown): string {
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    typeof (state as { from: unknown }).from === 'string'
  ) {
    const from = (state as { from: string }).from
    return from.startsWith('/app') ? from : ROUTES.app
  }
  return ROUTES.app
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const storyItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
}

const storyStagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

const panelStagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
}

const panelItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
}

export function LoginPage() {
  const { signIn, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const emailId = useId()
  const passwordId = useId()
  const emailErrorId = `${emailId}-error`
  const passwordErrorId = `${passwordId}-error`

  if (status === 'authenticated') {
    return <Navigate to={resolveRedirect(location.state)} replace />
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(resolveRedirect(location.state), { replace: true })
    } catch (error) {
      if (isApiError(error)) {
        setFieldErrors(error.fieldErrors)
      }
      setFormError(
        isApiError(error) && error.status === 401
          ? 'That email and password combination is not recognised.'
          : toErrorMessage(error),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="pie log">
        <header className="log-header">
          <div className="shell-frame log-header-inner">
            <Link
              to={ROUTES.home}
              className="flex min-h-11 items-center"
              aria-label="SoubhNiyam home"
            >
              <BrandMark />
            </Link>
            <Link to={ROUTES.home} className="log-back">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to overview
            </Link>
          </div>
        </header>

        <main className="log-main">
          <div className="shell-frame">
            <div className="log-grid">
              <motion.section
                className="log-left"
                aria-labelledby="log-title"
                initial="hidden"
                animate="shown"
                variants={storyStagger}
              >
                <motion.p className="log-eyebrow" variants={storyItem}>
                  POLICY CHANGE INTELLIGENCE
                </motion.p>

                <h1 id="log-title" className="log-title">
                  <span className="log-title-line">Welcome back.</span>
                  <span className="log-title-line">Pick up where</span>
                  <span className="log-title-line log-title-accent">
                    the policy changed.
                  </span>
                </h1>

                <motion.p className="log-lede" variants={storyItem}>
                  Your tracked policies, version history, and impact assessments
                  are ready.
                </motion.p>
                <motion.div
                  className="log-timeline"
                  variants={storyItem}
                  aria-label="Version timeline"
                >
                  <div className="log-timeline-track">
                    <span className="log-timeline-rule" aria-hidden="true" />
                    <motion.span
                      className="log-timeline-marker"
                      aria-hidden="true"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 0.3 }}
                    />
                    <span className="log-timeline-rule" aria-hidden="true" />
                    <motion.span
                      className="log-timeline-marker"
                      aria-hidden="true"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 0.38 }}
                    />
                    <span className="log-timeline-rule" aria-hidden="true" />
                    <motion.span
                      className="log-timeline-marker log-timeline-marker--current"
                      aria-hidden="true"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.46 }}
                    />
                  </div>
                  <div className="log-timeline-labels">
                    <span>v2.3</span>
                    <span>v2.4</span>
                    <span className="log-timeline-current">
                      v2.5 <em>CURRENT</em>
                    </span>
                  </div>
                </motion.div>

                <motion.div className="log-change" variants={storyItem}>
                  <p className="log-change-eyebrow">DATA RETENTION</p>
                  <p className="log-change-value">
                    <span>12 months</span>
                    <ArrowRight size={14} aria-hidden="true" />
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.52 }}
                    >
                      24 months
                    </motion.span>
                  </p>
                  <div className="log-change-status">
                    <span>LATEST CHANGE</span>
                    <span className="log-status-dot" aria-hidden="true" />
                  </div>
                  <p className="log-change-note">
                    Retention period updated from 12 months to 24 months.
                  </p>
                </motion.div>

                <motion.div
                  className="log-features"
                  variants={storyItem}
                  aria-label="Highlights"
                >
                  <div className="log-feature">
                    <History size={14} aria-hidden="true" />
                    <span>Policy history</span>
                  </div>
                  <span className="log-feature-divider" aria-hidden="true" />
                  <div className="log-feature">
                    <TrendingUp size={14} aria-hidden="true" />
                    <span>Impact assessment</span>
                  </div>
                  <span className="log-feature-divider" aria-hidden="true" />
                  <div className="log-feature">
                    <FileText size={14} aria-hidden="true" />
                    <span>Audit history</span>
                  </div>
                </motion.div>
              </motion.section>

              <span className="log-column-divider" aria-hidden="true" />

              <motion.section
                className="log-right"
                aria-labelledby="log-panel-title"
                initial="hidden"
                animate="shown"
                variants={panelStagger}
              >
                <div className="log-form-wrap">
                  <motion.p className="log-panel-eyebrow" variants={panelItem}>
                    YOUR WORKSPACE
                  </motion.p>
                  <motion.h2
                    id="log-panel-title"
                    className="log-panel-title"
                    variants={panelItem}
                  >
                    Sign in
                  </motion.h2>
                  <motion.p className="log-panel-desc" variants={panelItem}>
                    Continue to your policy workspace.
                  </motion.p>

                  <motion.form
                    className="log-form"
                    onSubmit={(event) => void onSubmit(event)}
                    noValidate
                    variants={panelItem}
                  >
                    <div className="log-field">
                      {formError ? (
                        <div role="alert" className="log-alert">
                          {formError}
                        </div>
                      ) : null}

                      <label htmlFor={emailId} className="log-field-label">
                        Email address
                      </label>
                      <div className="log-input-wrap">
                        <Mail size={15} aria-hidden="true" className="log-input-icon" />
                        <input
                          id={emailId}
                          type="email"
                          name="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          className={cn('log-input', fieldErrors['email'] && 'is-invalid')}
                          aria-invalid={fieldErrors['email'] ? true : undefined}
                          aria-describedby={fieldErrors['email'] ? emailErrorId : undefined}
                        />
                      </div>
                      {fieldErrors['email'] ? (
                        <p id={emailErrorId} className="log-error">
                          {fieldErrors['email']}
                        </p>
                      ) : null}
                    </div>

                    <div className="log-field">
                      <label htmlFor={passwordId} className="log-field-label">
                        Password
                      </label>
                      <div className="log-input-wrap">
                        <Lock size={15} aria-hidden="true" className="log-input-icon" />
                        <input
                          id={passwordId}
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Enter your password"
                          className={cn('log-input', fieldErrors['password'] && 'is-invalid')}
                          aria-invalid={fieldErrors['password'] ? true : undefined}
                          aria-describedby={
                            fieldErrors['password'] ? passwordErrorId : undefined
                          }
                        />
                        <button
                          type="button"
                          className="log-toggle"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          aria-pressed={showPassword}
                          aria-controls={passwordId}
                          onClick={() => setShowPassword((visible) => !visible)}
                        >
                          {showPassword ? (
                            <EyeOff size={15} aria-hidden="true" />
                          ) : (
                            <Eye size={15} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      {fieldErrors['password'] ? (
                        <p id={passwordErrorId} className="log-error">
                          {fieldErrors['password']}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      className="log-submit"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting || undefined}
                    >
                      <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
                      {isSubmitting ? null : (
                        <ArrowRight size={16} aria-hidden="true" className="log-submit-arrow" />
                      )}
                    </button>

                    <p className="log-account">
                      New to SoubhNiyam?{' '}
                      <Link to={ROUTES.register}>Create an account</Link>
                    </p>
                  </motion.form>
                </div>
              </motion.section>
            </div>
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
