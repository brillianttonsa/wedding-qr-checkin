import { CalendarDays, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/scanner'} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await signIn(username.trim(), password)
      const state = location.state as { from?: { pathname?: string; search?: string } } | null
      const next = state?.from?.pathname
        ? `${state.from.pathname}${state.from.search ?? ''}`
        : '/admin'
      navigate(next, { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Sign in failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-mark"><CalendarDays size={21} /></span><span><strong>Gather</strong><small>WEDDING CHECK-IN</small></span></div>
        <div className="story-copy">
          <span className="story-kicker"><span /> THE DAY, BEAUTIFULLY ORGANIZED</span>
          <h1>Every guest,<br /><em>welcomed.</em></h1>
          <p>One calm, considered place to prepare for the celebration and welcome every guest at the door.</p>
          <div className="wedding-date"><CalendarDays size={17} /><span>19 December 2026</span><i /> <span>Guest admission</span></div>
        </div>
        <div className="story-bottom"><ShieldCheck size={16} /> Private access for the event team</div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="eyebrow">EVENT TEAM ACCESS</div>
          <h2>Welcome back</h2>
          <p className="login-intro">Sign in with your administrator or guard account.</p>
          <form className="form-stack" onSubmit={submit}>
            <label className="field-label">Username
              <input autoComplete="username" autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" />
            </label>
            <label className="field-label">Password
              <span className="password-input">
                <input autoComplete="current-password" required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
            <button className="button button-primary login-submit" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in securely'}</button>
          </form>
          <div className="login-footnote"><ShieldCheck size={15} /> Your event access is protected and private.</div>
        </div>
        <footer className="login-copyright">MADE FOR A DAY TO REMEMBER <span>·</span> 19.12.26</footer>
      </section>
    </main>
  )
}
