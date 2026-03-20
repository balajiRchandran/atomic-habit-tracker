// src/components/AuthScreen.jsx
import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '../firebase'

export default function AuthScreen() {
  const [tab,      setTab]      = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [loading,  setLoading]  = useState(false)

  const clearMessages = () => { setError(''); setInfo('') }

  const friendlyError = (code) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return 'Incorrect email or password.'
      case 'auth/email-already-in-use':  return 'An account with this email already exists.'
      case 'auth/weak-password':         return 'Password must be at least 6 characters.'
      case 'auth/invalid-email':         return 'Please enter a valid email address.'
      case 'auth/too-many-requests':     return 'Too many attempts. Please try again later.'
      default: return 'Something went wrong. Please try again.'
    }
  }

  const handleLogin = async () => {
    clearMessages()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (e) {
      setError(friendlyError(e.code))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    clearMessages()
    if (!email || !password || !confirm) { setError('Please fill in all fields.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password)
    } catch (e) {
      setError(friendlyError(e.code))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    clearMessages()
    if (!email) { setError('Enter your email address above.'); return }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setInfo('Password reset email sent — check your inbox.')
    } catch (e) {
      setError(friendlyError(e.code))
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') tab === 'login' ? handleLogin() : handleRegister()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo"><em>Atomic</em> Habits</div>
        <p className="auth-tagline">
          Small steps. Real identity change.<br />
          Your data syncs across all devices.
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--paper-2)',
          borderRadius: 'var(--radius)', padding: 4, marginBottom: 24,
        }}>
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); clearMessages() }}
              style={{
                flex: 1, padding: '8px 0',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13,
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--ink)' : 'var(--ink-muted)',
                boxShadow: tab === t ? 'var(--shadow)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            placeholder={tab === 'register' ? 'At least 6 characters' : '••••••••'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKey}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {tab === 'register' && (
          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="new-password"
            />
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--bad-bg)', color: 'var(--bad)',
            border: '1px solid', borderColor: 'var(--bad)',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}
        {info && (
          <div style={{
            background: 'var(--good-bg)', color: 'var(--good)',
            border: '1px solid', borderColor: 'var(--good)',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            fontSize: 13, marginBottom: 16,
          }}>{info}</div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          onClick={tab === 'login' ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
        </button>

        {tab === 'login' && (
          <button
            className="btn-anon"
            onClick={handleReset}
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  )
}
