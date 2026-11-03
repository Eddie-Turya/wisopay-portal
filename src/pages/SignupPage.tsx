import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Upload, FileCheck, X } from 'lucide-react'
import { api } from '../api'
import { AuthLayout, AuthError, authInput, authLabel, authPrimary } from '../components/AuthLayout'

export function SignupPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [businessName, setBusinessName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nida, setNida] = useState('')
  const [tinFile, setTinFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pwStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const pwLabels = ['', 'Too short', 'Good', 'Strong']
  const pwColors = ['', 'bg-red-500', 'bg-amber-400', 'bg-[#0eb981]']
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setTinFile(f)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!tinFile) { setError('Please upload your TIN document'); return }
    setLoading(true)
    try {
      await api.register({
        business_name: businessName.trim(),
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        phone_number: phone.trim(),
        nida_number: nida.trim(),
        tin_document: tinFile,
      })
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const section = 'text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a8f96]'
  const hint = 'mt-1.5 text-[12.5px] text-[#8a8f96]'

  return (
    <AuthLayout variant="signup">
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.02em]">Create your account</h1>
      <p className="mb-8 mt-2 text-[15px] text-[#5c6166]">
        Get sandbox keys straight away. Your documents are only used to verify your business before going live.
      </p>

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-4">
          <legend className={`${section} mb-4`}>Business</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz" className={authLabel}>Business name</label>
              <input id="biz" type="text" autoComplete="organization" value={businessName} onChange={e => setBusinessName(e.target.value)}
                required placeholder="Duka la Mama Ltd" className={authInput} />
            </div>
            <div>
              <label htmlFor="name" className={authLabel}>Your full name</label>
              <input id="name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)}
                required placeholder="Asha Mwakyusa" className={authInput} />
            </div>
            <div>
              <label htmlFor="email" className={authLabel}>Work email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@business.com" className={authInput} />
            </div>
            <div>
              <label htmlFor="phone" className={authLabel}>Phone number</label>
              <input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)}
                required placeholder="255712345678" className={authInput} />
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className={`${section} mb-4`}>Verification</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nida" className={authLabel}>NIDA number</label>
              <input id="nida" type="text" inputMode="numeric" value={nida} onChange={e => setNida(e.target.value)}
                required placeholder="19XXXXXXXXXXXXXXXXX" className={authInput} />
              <p className={hint}>National Identification Authority number</p>
            </div>
            <div>
              <span className={authLabel}>TIN certificate</span>
              <input ref={fileRef} id="tin" type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
              {tinFile ? (
                <div className="flex h-12 items-center gap-2.5 rounded-xl border border-[#0eb981] bg-[#f1fbf6] px-3.5">
                  <FileCheck size={17} className="flex-shrink-0 text-[#067a55]" />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#1a1a1c]">{tinFile.name}</span>
                  <button type="button" aria-label="Remove file" onClick={() => { setTinFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[#5c6166] transition-colors hover:bg-white hover:text-[#1a1a1c]">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <label htmlFor="tin"
                  className="flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[#cfd3da] bg-[#f9fafb] px-3.5 text-sm text-[#5c6166] transition-colors hover:border-[#0eb981] hover:bg-[#f1fbf6] hover:text-[#1a1a1c]">
                  <Upload size={16} className="flex-shrink-0" />
                  Upload JPG, PNG or PDF
                </label>
              )}
              <p className={hint}>Max 10 MB</p>
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className={`${section} mb-4`}>Security</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pw" className={authLabel}>Password</label>
              <div className="relative">
                <input id="pw" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="At least 8 characters" className={`${authInput} pr-12`} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#8a8f96] transition-colors hover:text-[#1a1a1c]">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= pwStrength ? pwColors[pwStrength] : 'bg-[#e7e9ee]'}`} />
                    ))}
                  </div>
                  <span className="text-[12px] text-[#8a8f96]">{pwLabels[pwStrength]}</span>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="pw2" className={authLabel}>Confirm password</label>
              <input id="pw2" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat your password"
                aria-invalid={mismatch}
                className={`${authInput} ${mismatch ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`} />
              {mismatch && <p className="mt-1.5 text-[12.5px] text-red-600">Passwords do not match</p>}
            </div>
          </div>
        </fieldset>

        <div className="flex flex-col gap-4">
          <button type="submit" disabled={loading} className={authPrimary}>
            {loading ? 'Creating your account…' : 'Create account'}
          </button>
          <p className="text-center text-[13px] text-[#8a8f96]">
            By creating an account you agree to WisoPay's terms and privacy policy.
          </p>
        </div>
      </form>

      <p className="mt-8 text-center text-[15px] text-[#5c6166]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#1a1a1c] underline decoration-[#0eb981] decoration-2 underline-offset-4 transition-colors hover:text-[#067a55]">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
