import { useState, useEffect, type FormEvent } from 'react'
import { Zap, Lock, Search, RefreshCw, CheckCircle2, XCircle, Zap as ZapIcon, ExternalLink, AlertCircle, Clock, ShieldOff, Eye } from 'lucide-react'

const BASE = '/admin/portal/admin'

function adminFetch(path: string, opts: RequestInit = {}) {
  const token = sessionStorage.getItem('adminToken')
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }).then(async r => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    return data
  })
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_verification: { label: 'Pending Verification', color: 'text-p-warn', bg: 'bg-p-warn/10 border-p-warn/25' },
  active:               { label: 'Active (Sandbox)',     color: 'text-p-good', bg: 'bg-p-good/10 border-p-good/25' },
  live_enabled:         { label: 'Live Enabled',         color: 'text-p-info',    bg: 'bg-p-info/10 border-p-info/25' },
  rejected:             { label: 'Rejected',             color: 'text-p-bad',     bg: 'bg-p-bad/10 border-p-bad/25' },
  suspended:            { label: 'Suspended',            color: 'text-p-ink2',   bg: 'bg-p-panel2 border-slate-300' },
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || { label: status, color: 'text-p-ink2', bg: 'bg-p-panel2 border-slate-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AdminPage() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('adminToken'))
  const [pwInput, setPwInput] = useState('')
  const [loginErr, setLoginErr] = useState('')

  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await adminFetch(`/merchants${filterStatus ? `?status=${filterStatus}` : ''}`)
      setMerchants(data)
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.toLowerCase().includes('unauthorized')) {
        sessionStorage.removeItem('adminToken')
        setAuthed(false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (authed) load() }, [authed, filterStatus])

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    if (!pwInput.trim()) return
    sessionStorage.setItem('adminToken', pwInput.trim())
    setAuthed(true)
    setLoginErr('')
  }

  const updateStatus = async (merchantId: string, status: string) => {
    setActionLoading(merchantId + status)
    try {
      await adminFetch(`/merchants/${merchantId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, status } : m))
      showToast(`Merchant ${STATUS_META[status]?.label || status}`)
    } catch (e: any) {
      showToast(e.message || 'Action failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = merchants.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.phone_number?.includes(q) || m.nida_number?.includes(q)
  })

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Wisopay Admin</p>
              <p className="text-xs text-p-faint">Merchant Management</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Admin Access</h2>
            <p className="text-p-faint text-sm mb-6">Enter your admin password to continue</p>
            {loginErr && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-red-400">
                <AlertCircle size={14} /> {loginErr}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-p-muted" />
                <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} required
                  placeholder="Admin password" autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm placeholder:text-p-muted focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition" />
              </div>
              <button type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg text-sm transition">
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border transition-all ${toast.ok ? 'bg-emerald-900/90 border-emerald-700 text-emerald-200' : 'bg-red-900/90 border-red-700 text-red-200'}`}>
          {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white">Wisopay Admin</span>
            <span className="ml-2 text-xs text-p-muted">Merchant Requests</span>
          </div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('adminToken'); setAuthed(false) }}
          className="text-xs text-p-muted hover:text-white transition-colors">
          Sign out
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-p-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone, NIDA…"
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-p-muted focus:outline-none focus:border-emerald-500/50" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-p-faint hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="ml-auto text-sm text-p-muted">
            {filtered.length} merchant{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading && merchants.length === 0 ? (
            <div className="py-16 text-center text-p-muted">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-p-muted">No merchants found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">Business</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">NIDA</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">TIN Doc</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">Registered</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-p-faint uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(m => {
                  const busy = (s: string) => actionLoading === m.id + s
                  const tinUrl = m.tin_doc_id
                    ? `/admin/portal/admin/kyc/${m.tin_doc_id}/file?token=${sessionStorage.getItem('adminToken')}`
                    : null
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{m.name}</p>
                        <p className="text-xs text-p-muted mt-0.5">{m.slug}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-200">{m.contact_name || '—'}</p>
                        <p className="text-xs text-p-faint">{m.email}</p>
                        <p className="text-xs text-p-muted">{m.phone_number || '—'}</p>
                        {!m.email_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1"><Clock size={10} /> Email unverified</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-p-faint font-mono text-xs">{m.nida_number || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        {tinUrl ? (
                          <a href={tinUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                            <Eye size={13} />
                            View TIN
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-xs text-p-ink2">Not uploaded</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-5 py-4 text-xs text-p-faint">
                        {fmt(m.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {m.status === 'pending_verification' && (
                            <button onClick={() => updateStatus(m.id, 'active')}
                              disabled={!!actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-p-accent hover:bg-p-accent disabled:opacity-50 text-p-accent-ink text-xs font-semibold rounded-lg transition-colors">
                              {busy('active') ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Approve
                            </button>
                          )}
                          {m.status === 'active' && (
                            <button onClick={() => updateStatus(m.id, 'live_enabled')}
                              disabled={!!actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                              {busy('live_enabled') ? <RefreshCw size={11} className="animate-spin" /> : <ZapIcon size={11} />}
                              Enable Live
                            </button>
                          )}
                          {!['rejected', 'suspended'].includes(m.status) && (
                            <button onClick={() => updateStatus(m.id, 'rejected')}
                              disabled={!!actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-red-700 disabled:opacity-50 text-p-faint hover:text-white text-xs font-semibold rounded-lg transition-colors">
                              {busy('rejected') ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
                              Reject
                            </button>
                          )}
                          {m.status === 'rejected' && (
                            <button onClick={() => updateStatus(m.id, 'pending_verification')}
                              disabled={!!actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-p-faint text-xs font-semibold rounded-lg transition-colors">
                              <ShieldOff size={11} /> Restore
                            </button>
                          )}
                          {m.status === 'live_enabled' && (
                            <button onClick={() => updateStatus(m.id, 'suspended')}
                              disabled={!!actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-red-800 disabled:opacity-50 text-p-faint text-xs font-semibold rounded-lg transition-colors">
                              <ShieldOff size={11} /> Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
