import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'
import { api } from '../api'
import { AuthLayout, AuthError, authInput, authLabel, authPrimary } from '../components/AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA state
  const [requires2fa, setRequires2fa] = useState(false)
  const [partialToken, setPartialToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      if (data.requires_2fa) {
        setPartialToken(data.partial_token)
        setRequires2fa(true)
        setLoading(false)
        return
      }
      localStorage.setItem('portalMerchant', JSON.stringify(data.merchant))
      localStorage.setItem('portalUser', JSON.stringify(data.user))
      window.dispatchEvent(new CustomEvent('portalLogin'))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handle2fa = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.verify2fa(partialToken, totpCode)
      localStorage.setItem('portalMerchant', JSON.stringify(data.merchant))
      localStorage.setItem('portalUser', JSON.stringify(data.user))
      window.dispatchEvent(new CustomEvent('portalLogin'))
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.message || '2FA verification failed'
      setError(msg)
      if (msg.includes('expired')) {
        setRequires2fa(false)
        setPartialToken('')
        setTotpCode('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout variant="login">
      {requires2fa ? (
        <div key="2fa" className="auth-up">
          <span className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#e4f8ef] text-[#067a55]">
            <ShieldCheck size={22} />
          </span>
          <h1 className="text-[34px] font-medium leading-tight tracking-[-0.02em]">Two-step verification</h1>
          <p className="mb-8 mt-2 text-[15px] text-[#5c6166]">Enter the 6-digit code from your authenticator app.</p>

          <AuthError message={error} />

          <form onSubmit={handle2fa} className="flex flex-col gap-5">
            <div>
              <label htmlFor="totp" className={authLabel}>Verification code</label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                placeholder="000000"
                className={`${authInput} h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]`}
              />
            </div>
            <button type="submit" disabled={loading || totpCode.length !== 6} className={authPrimary}>
              {loading ? 'Verifying…' : 'Verify and sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setRequires2fa(false); setError(''); setTotpCode('') }}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-[#5c6166] transition-colors hover:text-[#1a1a1c]"
            >
              <ArrowLeft size={14} /> Back to sign in
            </button>
          </form>
        </div>
      ) : (
        <div key="login" className="auth-up">
          <h1 className="text-[34px] font-medium leading-tight tracking-[-0.02em]">Welcome back</h1>
          <p className="mb-8 mt-2 text-[15px] text-[#5c6166]">Sign in to your WisoPay merchant account.</p>

          <AuthError message={error} />

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="email" className={authLabel}>Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@business.com" className={authInput} />
            </div>
            <div>
              <label htmlFor="password" className={authLabel}>Password</label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="Your password" className={`${authInput} pr-12`} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#8a8f96] transition-colors hover:text-[#1a1a1c]">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className={`${authPrimary} mt-1`}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-[15px] text-[#5c6166]">
            New to WisoPay?{' '}
            <Link to="/signup" className="font-semibold text-[#1a1a1c] underline decoration-[#0eb981] decoration-2 underline-offset-4 transition-colors hover:text-[#067a55]">
              Create an account
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
