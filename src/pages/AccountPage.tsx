import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import {
  User, Building2, Mail, KeyRound, Check, AlertCircle,
  Clock, Bell, BellOff, Lock, ShieldCheck, BadgeCheck, Upload, FileText, Landmark, Smartphone, XCircle, Percent,
  QrCode, MonitorSmartphone, Trash2, RefreshCw,
} from 'lucide-react'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-p-panel rounded-xl border border-p-line shadow-sm p-5 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, title, badge }: { icon: any; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-p-faint" />
        <h2 className="text-sm font-bold text-p-fg">{title}</h2>
      </div>
      {badge}
    </div>
  )
}


const KYC_DOC_TYPES = [
  { type: 'IDENTITY', label: 'Identity Document', sub: 'National ID or Passport', icon: User },
  { type: 'BUSINESS_REG', label: 'Business Registration', sub: 'TIN or BRELA certificate', icon: FileText },
  { type: 'BANK_ACCOUNT', label: 'Bank Account', sub: 'Statement or letter', icon: Landmark },
  { type: 'MOBILE_MONEY', label: 'Mobile Money', sub: 'Registered business number', icon: Smartphone },
]

const NOTIF_OPTIONS = [
  { key: 'payment_completed', label: 'Payment completed', sub: 'Email when a customer pays', default: true },
  { key: 'payment_failed', label: 'Payment failed', sub: 'Email when a payment fails', default: true },
  { key: 'weekly_digest', label: 'Weekly digest', sub: 'Summary of transactions every Monday', default: false },
  { key: 'reconciliation_alerts', label: 'Reconciliation alerts', sub: 'When stuck payments are auto-resolved', default: false },
]

export function AccountPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [notifs, setNotifs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIF_OPTIONS.map(o => [o.key, o.default]))
  )

  const [kyc, setKyc] = useState<Record<string, any>>({})
  const [kycLoading, setKycLoading] = useState(true)

  const [feeSettings, setFeeSettings] = useState<{ platform_rate_percent: number; fee_bearer: 'merchant' | 'customer' } | null>(null)
  const [selectedBearer, setSelectedBearer] = useState<'merchant' | 'customer' | null>(null)
  const [feeUpdating, setFeeUpdating] = useState(false)
  const [feeMsg, setFeeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadMsg, setUploadMsg] = useState<{ type: string; ok: boolean; text: string } | null>(null)

  // 2FA
  const [twofa, setTwofa] = useState<{ enabled: boolean } | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [totpSetupSecret, setTotpSetupSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [twofaStep, setTwofaStep] = useState<'idle' | 'setup' | 'disable'>('idle')
  const [twofaMsg, setTwofaMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [twofaLoading, setTwofaLoading] = useState(false)

  // Sessions
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    api.me().then((data: any) => {
      setProfile(data)
      setName(data.user?.name || '')
    }).catch(console.error).finally(() => setLoading(false))

    fetch('/admin/portal/kyc', { headers: { Authorization: `Bearer ${localStorage.getItem('portalToken')}` } })
      .then(r => r.json()).then(d => setKyc(d.documents || {}))
      .catch(console.error).finally(() => setKycLoading(false))

    api.getFeeSettings().then(setFeeSettings).catch(console.error)

    // Load 2FA status from /me
    api.me().then((d: any) => {
      setTwofa({ enabled: !!d.user?.totp_enabled })
    }).catch(() => {})

    // Load sessions
    setSessionsLoading(true)
    api.sessions().then(r => setSessions(r.data)).catch(() => {}).finally(() => setSessionsLoading(false))
  }, [])

  const start2faSetup = async () => {
    setTwofaLoading(true); setTwofaMsg(null)
    try {
      const d = await api.setup2fa()
      setQrCode(d.qr_code)
      setTotpSetupSecret(d.secret)
      setTwofaStep('setup')
    } catch (e: any) { setTwofaMsg({ ok: false, text: e.message }) }
    finally { setTwofaLoading(false) }
  }

  const enable2fa = async () => {
    setTwofaLoading(true); setTwofaMsg(null)
    try {
      await api.enable2fa(totpCode)
      setTwofa({ enabled: true })
      setTwofaStep('idle'); setQrCode(null); setTotpCode(''); setTotpSetupSecret('')
      setTwofaMsg({ ok: true, text: '2FA is now active on your account' })
    } catch (e: any) { setTwofaMsg({ ok: false, text: e.message }) }
    finally { setTwofaLoading(false) }
  }

  const disable2fa = async () => {
    setTwofaLoading(true); setTwofaMsg(null)
    try {
      await api.disable2fa(totpCode)
      setTwofa({ enabled: false })
      setTwofaStep('idle'); setTotpCode('')
      setTwofaMsg({ ok: true, text: '2FA has been disabled' })
    } catch (e: any) { setTwofaMsg({ ok: false, text: e.message }) }
    finally { setTwofaLoading(false) }
  }

  const revokeSession = async (id: string) => {
    setRevoking(id)
    try {
      await api.revokeSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ } finally { setRevoking(null) }
  }

  const uploadKycDoc = async (type: string, file: File) => {
    setUploading(type); setUploadMsg(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`/admin/portal/kyc/upload/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('portalToken')}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message || 'Upload failed')
        throw new Error(msg)
      }
      setKyc(prev => ({ ...prev, [type]: { status: 'PENDING', uploaded_at: new Date().toISOString() } }))
      setUploadMsg({ type, ok: true, text: 'Document submitted for review' })
    } catch (err: any) {
      setUploadMsg({ type, ok: false, text: err.message })
    } finally { setUploading(null) }
  }

  const saveName = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      await (api as any).updateMe({ name })
      setSaveMsg({ ok: true, text: 'Name updated' })
    } catch (err: any) {
      setSaveMsg({ ok: false, text: err.message })
    } finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'At least 8 characters required' }); return }
    setPwSaving(true); setPwMsg(null)
    try {
      await api.changePassword(currentPw, newPw)
      setPwMsg({ ok: true, text: 'Password changed successfully' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: any) {
      setPwMsg({ ok: false, text: err.message })
    } finally { setPwSaving(false) }
  }


  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1">
        <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Account</h1>
        <p className="text-xs text-p-faint hidden sm:block">Manage your profile, verification, and security settings</p>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="bg-p-panel rounded-xl border border-p-line p-6 animate-pulse h-40" />)}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-5">

              {/* Business */}
              <Card>
                <CardHeader icon={Building2} title="Business" />
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-p-muted uppercase tracking-wide mb-1">Merchant Name</p>
                    <p className="text-sm text-p-fg font-medium">{profile?.merchant?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-p-muted uppercase tracking-wide mb-1">Slug</p>
                    <p className="text-sm font-mono text-p-ink2">{profile?.merchant?.slug || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-p-muted uppercase tracking-wide mb-1">Status</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-p-good/10 text-p-good">
                      <span className="w-1.5 h-1.5 rounded-full bg-p-accent" />
                      {profile?.merchant?.status || 'active'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Collection fee */}
              <Card>
                <CardHeader icon={Percent} title="Collection fee" />
                {feeSettings ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-p-panel2 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-p-muted uppercase tracking-wide">Platform rate</p>
                        <p className="text-2xl font-bold text-p-fg mt-0.5">{feeSettings.platform_rate_percent}%</p>
                      </div>
                      <p className="text-xs text-p-faint max-w-[180px] text-right">Set by the platform. Applied to every payment.</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-p-ink2 uppercase tracking-wide mb-2">Who pays the fee?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['merchant', 'customer'] as const).map(option => {
                          const active = (selectedBearer ?? feeSettings.fee_bearer) === option
                          return (
                            <button
                              key={option}
                              onClick={() => { setSelectedBearer(option); setFeeMsg(null) }}
                              className={`rounded-lg border px-3 py-3 text-left transition ${
                                active ? 'bg-p-good/10 border-p-accent' : 'border-p-line hover:bg-p-panel2'
                              }`}
                            >
                              <p className={`text-xs font-bold capitalize ${active ? 'text-p-good' : 'text-p-ink2'}`}>
                                {option === 'merchant' ? 'My business' : 'Customer'}
                              </p>
                              <p className="text-[11px] text-p-faint mt-0.5 leading-snug">
                                {option === 'merchant'
                                  ? 'Fee deducted from payout. Customer pays stated amount.'
                                  : 'Fee added to customer charge. You receive full amount.'}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                      {selectedBearer && selectedBearer !== feeSettings.fee_bearer && (
                        <button
                          onClick={async () => {
                            if (!selectedBearer || feeUpdating) return
                            setFeeUpdating(true); setFeeMsg(null)
                            try {
                              await api.updateFeeBearer(selectedBearer)
                              setFeeSettings(prev => prev ? { ...prev, fee_bearer: selectedBearer } : prev)
                              setSelectedBearer(null)
                              setFeeMsg({ ok: true, text: 'Preference saved' })
                            } catch {
                              setFeeMsg({ ok: false, text: 'Failed to save' })
                            } finally {
                              setFeeUpdating(false)
                            }
                          }}
                          disabled={feeUpdating}
                          className="mt-3 w-full bg-p-accent hover:brightness-95 disabled:opacity-50 text-p-accent-ink text-xs font-semibold py-2 rounded-lg transition"
                        >
                          {feeUpdating ? 'Saving…' : 'Save preference'}
                        </button>
                      )}
                    </div>
                    {feeMsg && (
                      <p className={`text-xs font-medium ${feeMsg.ok ? 'text-p-good' : 'text-p-bad'}`}>{feeMsg.text}</p>
                    )}
                    <p className="text-[11px] text-p-faint">
                      Example at {feeSettings.platform_rate_percent}%: on 10,000 TZS the fee is {Math.ceil(10000 * feeSettings.platform_rate_percent / 100).toLocaleString()} TZS
                    </p>
                  </div>
                ) : (
                  <div className="h-16 bg-p-panel2 rounded-lg animate-pulse" />
                )}
              </Card>

              {/* Profile */}
              <Card>
                <CardHeader icon={User} title="Profile" />
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-p-muted uppercase tracking-wide mb-1">Email</p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-p-panel2 rounded-lg border border-p-line">
                      <Mail size={14} className="text-p-faint" />
                      <p className="text-sm text-p-ink2">{profile?.user?.email || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-p-line rounded-lg text-sm focus:outline-none focus:border-p-fg/40"
                      placeholder="Your name"
                    />
                  </div>
                  {saveMsg && (
                    <div className={`flex items-center gap-2 text-xs font-medium ${saveMsg.ok ? 'text-p-good' : 'text-p-bad'}`}>
                      {saveMsg.ok ? <Check size={14} /> : <AlertCircle size={14} />} {saveMsg.text}
                    </div>
                  )}
                  <button onClick={saveName} disabled={saving}
                    className="bg-p-accent hover:brightness-95 disabled:opacity-50 text-p-accent-ink px-4 py-2 rounded-lg text-sm font-semibold transition">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </Card>

              {/* Change password */}
              <Card>
                <CardHeader icon={KeyRound} title="Change Password" />
                <div className="space-y-3">
                  {[['Current password', currentPw, setCurrentPw], ['New password', newPw, setNewPw], ['Confirm new password', confirmPw, setConfirmPw]] .map(([label, val, set]: any, i) => (
                    <div key={i}>
                      <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">{label}</label>
                      <input type="password" value={val} onChange={e => set(e.target.value)}
                        className="w-full px-3 py-2 border border-p-line rounded-lg text-sm focus:outline-none focus:border-p-fg/40" />
                    </div>
                  ))}
                  {pwMsg && (
                    <div className={`flex items-center gap-2 text-xs font-medium ${pwMsg.ok ? 'text-p-good' : 'text-p-bad'}`}>
                      {pwMsg.ok ? <Check size={14} /> : <AlertCircle size={14} />} {pwMsg.text}
                    </div>
                  )}
                  <button onClick={changePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                    className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </Card>

            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-5">


              {/* KYC Verification */}
              <Card>
                <CardHeader icon={ShieldCheck} title="KYC Verification"
                  badge={(() => {
                    const docs = KYC_DOC_TYPES.map(t => kyc[t.type])
                    const approved = docs.filter(d => d?.status === 'APPROVED').length
                    const total = KYC_DOC_TYPES.length
                    const allDone = approved === total
                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allDone ? 'bg-p-good/10 text-p-good' : 'bg-p-warn/10 text-p-warn'}`}>
                        {approved}/{total} Verified
                      </span>
                    )
                  })()}
                />
                {kycLoading ? (
                  <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-14 bg-p-panel2 rounded-lg animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {KYC_DOC_TYPES.map(({ type, label, sub, icon: Icon }) => {
                      const doc = kyc[type]
                      const status = doc?.status
                      return (
                        <div key={type} className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                          status === 'APPROVED' ? 'border-p-good/25 bg-emerald-50/40' :
                          status === 'REJECTED' ? 'border-p-bad/25 bg-red-50/40' :
                          status === 'PENDING' ? 'border-p-warn/25 bg-amber-50/30' :
                          'border-p-line bg-p-panel2'
                        }`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            status === 'APPROVED' ? 'bg-p-good/10' : status === 'REJECTED' ? 'bg-p-bad/10' : 'bg-p-panel2'
                          }`}>
                            <Icon size={15} className={status === 'APPROVED' ? 'text-p-good' : status === 'REJECTED' ? 'text-p-bad' : 'text-p-faint'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-p-fg">{label}</p>
                            <p className="text-[11px] text-p-faint">{doc?.status === 'REJECTED' && doc.notes ? doc.notes : sub}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {status === 'APPROVED' && <BadgeCheck size={16} className="text-p-good" />}
                            {status === 'REJECTED' && <XCircle size={15} className="text-red-400" />}
                            {status === 'PENDING' && <span className="text-[10px] font-bold text-p-warn bg-p-warn/10 border border-p-warn/25 px-1.5 py-0.5 rounded">PENDING</span>}
                            {(!status || status === 'REJECTED') && (
                              <label className={`cursor-pointer flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border transition ${uploading === type ? 'border-p-line text-p-faint' : 'border-p-good/25 text-p-good hover:bg-p-good/10'}`}>
                                {uploading === type ? '…' : <><Upload size={10} /> {status === 'REJECTED' ? 'Re-upload' : 'Upload'}</>}
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" disabled={!!uploading}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadKycDoc(type, f); e.target.value = '' }} />
                              </label>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {uploadMsg && (
                  <p className={`mt-3 text-xs font-medium ${uploadMsg.ok ? 'text-p-good' : 'text-p-bad'}`}>
                    {uploadMsg.ok ? <Check size={12} className="inline mr-1" /> : <AlertCircle size={12} className="inline mr-1" />}
                    {uploadMsg.text}
                  </p>
                )}
              </Card>

              {/* Security */}
              <Card>
                <CardHeader icon={Lock} title="Security" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-p-line bg-p-panel2">
                    <div>
                      <p className="text-xs font-semibold text-p-fg">Two-Factor Authentication</p>
                      <p className="text-[11px] text-p-faint mt-0.5">Add a second layer of security to your account</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-p-warn/10 text-p-warn">SOON</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-p-line bg-p-panel2">
                    <div>
                      <p className="text-xs font-semibold text-p-fg">Active Sessions</p>
                      <p className="text-[11px] text-p-faint mt-0.5">You're signed in on this device</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-p-good">
                      <span className="w-1.5 h-1.5 rounded-full bg-p-accent" />
                      1 active
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-p-line bg-p-panel2">
                    <div>
                      <p className="text-xs font-semibold text-p-fg">Last Login</p>
                      <p className="text-[11px] text-p-faint mt-0.5">
                        {profile?.user?.created_at
                          ? new Date(profile.user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Unknown'}
                      </p>
                    </div>
                    <Clock size={14} className="text-p-faint" />
                  </div>
                </div>
              </Card>

              {/* Notification preferences */}
              <Card>
                <CardHeader icon={Bell} title="Notifications" />
                <div className="space-y-2">
                  {NOTIF_OPTIONS.map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between gap-3 py-2.5 border-b border-p-line last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-p-fg">{label}</p>
                        <p className="text-[11px] text-p-faint">{sub}</p>
                      </div>
                      <button
                        onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`flex-shrink-0 w-8 h-4.5 rounded-full relative transition-colors duration-200 focus:outline-none ${notifs[key] ? 'bg-p-accent' : 'bg-gray-200'}`}
                        style={{ height: '18px', width: '32px' }}
                      >
                        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-p-panel shadow transition-all duration-200 ${notifs[key] ? 'left-[14px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-p-faint">
                  <BellOff size={12} />
                  Notification emails are sent to {profile?.user?.email}
                </div>
              </Card>

            </div>
          </div>

          {/* ── 2FA + SESSIONS (full width) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">

            {/* Two-factor authentication */}
            <Card>
              <CardHeader icon={QrCode} title="Two-Factor Authentication"
                badge={twofa
                  ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${twofa.enabled ? 'bg-p-good/10 text-p-good' : 'bg-p-panel2 text-p-muted'}`}>
                      {twofa.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  : null}
              />
              {twofaMsg && (
                <div className={`mb-4 flex items-center gap-2 text-xs font-medium ${twofaMsg.ok ? 'text-p-good' : 'text-p-bad'}`}>
                  {twofaMsg.ok ? <Check size={14} /> : <AlertCircle size={14} />} {twofaMsg.text}
                </div>
              )}

              {twofaStep === 'idle' && !twofa?.enabled && (
                <div className="space-y-3">
                  <p className="text-xs text-p-muted">Protect your account with Google Authenticator or any TOTP app.</p>
                  <button onClick={start2faSetup} disabled={twofaLoading}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                    {twofaLoading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Set Up Authenticator
                  </button>
                </div>
              )}

              {twofaStep === 'setup' && qrCode && (
                <div className="space-y-4">
                  <p className="text-xs text-p-muted">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
                  <img src={qrCode} alt="QR code" className="w-40 h-40 rounded-lg border border-p-line" />
                  <div>
                    <p className="text-[10px] text-p-faint mb-1">Or enter this key manually:</p>
                    <code className="text-xs font-mono bg-p-panel2 border border-p-line px-2 py-1 rounded break-all">{totpSetupSecret}</code>
                  </div>
                  <input type="text" inputMode="numeric" maxLength={6} value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000" className="w-32 px-3 py-2 border border-p-line rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-p-fg/40" />
                  <div className="flex gap-2">
                    <button onClick={enable2fa} disabled={twofaLoading || totpCode.length !== 6}
                      className="bg-p-accent hover:brightness-95 disabled:opacity-50 text-p-accent-ink px-4 py-2 rounded-lg text-sm font-semibold transition">
                      {twofaLoading ? 'Verifying…' : 'Activate'}
                    </button>
                    <button onClick={() => { setTwofaStep('idle'); setQrCode(null); setTotpCode('') }}
                      className="px-4 py-2 rounded-lg text-sm text-p-muted hover:text-p-fg border border-p-line transition">Cancel</button>
                  </div>
                </div>
              )}

              {twofaStep === 'idle' && twofa?.enabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-p-good bg-p-good/10 border border-p-good/25 rounded-lg px-3 py-2">
                    <ShieldCheck size={14} /> Your account is protected with 2FA
                  </div>
                  {twofaStep === 'idle' && (
                    <button onClick={() => setTwofaStep('disable')}
                      className="text-xs text-p-bad hover:text-p-bad transition font-medium">
                      Disable 2FA
                    </button>
                  )}
                </div>
              )}

              {twofaStep === 'disable' && (
                <div className="space-y-3">
                  <p className="text-xs text-p-muted">Enter your current authenticator code to disable 2FA.</p>
                  <input type="text" inputMode="numeric" maxLength={6} value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000" className="w-32 px-3 py-2 border border-p-line rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-red-400" />
                  <div className="flex gap-2">
                    <button onClick={disable2fa} disabled={twofaLoading || totpCode.length !== 6}
                      className="bg-p-bad hover:bg-p-bad disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                      {twofaLoading ? 'Disabling…' : 'Disable 2FA'}
                    </button>
                    <button onClick={() => { setTwofaStep('idle'); setTotpCode('') }}
                      className="px-4 py-2 rounded-lg text-sm text-p-muted hover:text-p-fg border border-p-line transition">Cancel</button>
                  </div>
                </div>
              )}
            </Card>

            {/* Active sessions */}
            <Card>
              <CardHeader icon={MonitorSmartphone} title="Active Sessions" />
              {sessionsLoading ? (
                <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-p-panel2 rounded-lg animate-pulse" />)}</div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-p-faint text-center py-4">No sessions found</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s.is_current ? 'border-p-good/25 bg-emerald-50/40' : 'border-p-line bg-p-panel2'}`}>
                      <MonitorSmartphone size={14} className={s.is_current ? 'text-p-good' : 'text-p-faint'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-p-ink2 truncate">
                          {s.user_agent ? s.user_agent.split(' ').slice(-2).join(' ') : 'Unknown device'}
                          {s.is_current && <span className="ml-2 text-[10px] font-bold text-p-good bg-p-good/10 px-1.5 py-0.5 rounded-full">Current</span>}
                        </p>
                        <p className="text-[10px] text-p-faint">
                          {s.ip || 'Unknown IP'} · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      {!s.is_current && (
                        <button onClick={() => revokeSession(s.id)} disabled={revoking === s.id}
                          className="p-1.5 text-p-faint hover:text-p-bad hover:bg-p-bad/10 rounded-lg transition disabled:opacity-50">
                          {revoking === s.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
          </>
        )}
      </div>
    </Layout>
  )
}
