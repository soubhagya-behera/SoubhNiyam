import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GitCompareArrows,
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
import { RegisterArtwork } from './RegisterArtwork'
import './register.css'

/** Mirrors the backend's `RegisterRequest` size constraint. */
const MIN_PASSWORD_LENGTH = 8

const TITLE_LEAD = 'See what changed.'
const TITLE_ACCENT = 'Know what matters.'
const FEATURES = [
  { label: 'Change tracking', Icon: GitCompareArrows },
  { label: 'Impact insights', Icon: TrendingUp },
  { label: 'Version history', Icon: History },
]

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const storyItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE },
  },
}

const storyStagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

/** One headline line revealed word by word through a clipped mask. */
function TitleLine({
  text,
  accent = false,
  baseDelay,
}: {
  text: string
  accent?: boolean
  baseDelay: number
}) {
  const words = text.split(' ')
  return (
    <span className={cn('reg-title-line', accent && 'reg-title-accent')} aria-hidden="true">
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="reg-word">
          <motion.span
            className="reg-word-inner"
            initial={{ y: '112%' }}
            animate={{ y: '0%' }}
            transition={{
              duration: 0.75,
              ease: EASE,
              delay: baseDelay + index * 0.06,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export function RegisterPage() {
  const { signUp, signIn, status } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const emailId = useId()
  const passwordId = useId()
  const emailErrorId = `${emailId}-error`
  const passwordHintId = `${passwordId}-hint`
  const passwordErrorId = `${passwordId}-error`

  if (status === 'authenticated') {
    return <Navigate to={ROUTES.app} replace />
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    // Client-side guard mirrors the server constraint so the user gets an
    // immediate answer instead of a round trip.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({
        password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const created = await signUp(email.trim(), password)
      // Registration issues no tokens, so sign in immediately and land on the
      // overview the user came for.
      await signIn(created.email, password)
      navigate(ROUTES.app, { replace: true })
    } catch (error) {
      if (isApiError(error)) {
        setFieldErrors(error.fieldErrors)
        if (error.status === 409) {
          setFormError('An account with that email already exists.')
        }
      }
      if (!isApiError(error) || error.status !== 409) {
        setFormError(toErrorMessage(error))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="reg">
        <div className="reg-glows" aria-hidden="true">
          <div className="reg-glow reg-glow-violet" />
          <div className="reg-glow reg-glow-blue" />
        </div>

        <header className="reg-header">
          <Link
            to={ROUTES.home}
            className="flex min-h-11 items-center"
            aria-label="SoubhNiyam — home"
          >
            <BrandMark />
          </Link>
          <Link to={ROUTES.home} className="reg-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to overview
          </Link>
        </header>

        <main className="reg-main">
          <div className="reg-left">
            <motion.section
              className="reg-story"
              aria-labelledby="reg-title"
              initial="hidden"
              animate="shown"
              variants={storyStagger}
            >
              <motion.p className="reg-eyebrow" variants={storyItem}>
                Policy change intelligence
              </motion.p>

              <h1 id="reg-title" className="reg-title" aria-label={`${TITLE_LEAD} ${TITLE_ACCENT}`}>
                <TitleLine text={TITLE_LEAD} baseDelay={0.12} />
                <TitleLine text={TITLE_ACCENT} accent baseDelay={0.28} />
              </h1>

              <motion.p className="reg-lede" variants={storyItem}>
                Track policy changes and understand their impact.
              </motion.p>

              <motion.ul className="reg-features" variants={storyItem} aria-label="Highlights">
                {FEATURES.map(({ label, Icon }) => (
                  <li key={label}>
                    <Icon size={15} aria-hidden="true" className="reg-feature-icon" />
                    {label}
                  </li>
                ))}
              </motion.ul>
            </motion.section>

            <RegisterArtwork />
          </div>

          <motion.section
            className="reg-panel"
            aria-labelledby="reg-panel-title"
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.3 }}
          >
            <div className="reg-panel-brand">
              <BrandMark className="font-display text-base leading-none tracking-[-0.02em] text-ink whitespace-nowrap" />
            </div>
            <p className="reg-panel-label">Create your account</p>
            <h2 id="reg-panel-title" className="reg-panel-title">
              Start with clarity.
            </h2>
            <p className="reg-panel-lede">Create your workspace.</p>

            <form className="reg-form" onSubmit={(event) => void onSubmit(event)} noValidate>
              <div>
                {formError ? (
                  <div role="alert" className="reg-alert">
                    {formError}
                  </div>
                ) : null}

                <div className="reg-field">
                  <label htmlFor={emailId} className="reg-field-label">
                    Email
                  </label>
                  <div className="reg-input-wrap">
                    <Mail size={16} aria-hidden="true" className="reg-input-icon" />
                    <input
                      id={emailId}
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className={cn('reg-input', fieldErrors['email'] && 'is-invalid')}
                      aria-invalid={fieldErrors['email'] ? true : undefined}
                      aria-describedby={fieldErrors['email'] ? emailErrorId : undefined}
                    />
                  </div>
                  {fieldErrors['email'] ? (
                    <p id={emailErrorId} className="reg-error">
                      {fieldErrors['email']}
                    </p>
                  ) : null}
                </div>

                <div className="reg-field">
                  <label htmlFor={passwordId} className="reg-field-label">
                    Password
                  </label>
                  <div className="reg-input-wrap">
                    <Lock size={16} aria-hidden="true" className="reg-input-icon" />
                    <input
                      id={passwordId}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className={cn('reg-input', fieldErrors['password'] && 'is-invalid')}
                      aria-invalid={fieldErrors['password'] ? true : undefined}
                      aria-describedby={
                        fieldErrors['password']
                          ? `${passwordHintId} ${passwordErrorId}`
                          : passwordHintId
                      }
                    />
                    <button
                      type="button"
                      className="reg-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      aria-controls={passwordId}
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <p id={passwordHintId} className="reg-hint">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                  {fieldErrors['password'] ? (
                    <p id={passwordErrorId} className="reg-error">
                      {fieldErrors['password']}
                    </p>
                  ) : null}
                </div>

                <div className="reg-submit-row">
                  <button
                    type="submit"
                    className="reg-submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting || undefined}
                  >
                    <span>{isSubmitting ? 'Creating account…' : 'Register'}</span>
                    {isSubmitting ? null : (
                      <ArrowRight size={18} aria-hidden="true" className="reg-submit-arrow" />
                    )}
                  </button>
                </div>

                <div className="reg-divider" role="separator" aria-orientation="horizontal">
                  <span className="reg-divider-line" aria-hidden="true" />
                  <span className="reg-divider-text">OR</span>
                  <span className="reg-divider-line" aria-hidden="true" />
                </div>

                <p className="reg-signin">
                  Already have an account?{' '}
                  <Link to={ROUTES.login}>Sign in</Link>
                </p>
              </div>
            </form>
          </motion.section>
        </main>
      </div>
    </MotionConfig>
  )
}
