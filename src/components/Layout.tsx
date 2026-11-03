import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BarChart2, ArrowLeftRight, UserCheck, Smartphone, Link2, FileText, Users, Rows3, ArrowUpRight,
  Key, Webhook, FlaskConical, Shield, UserCog, User, HelpCircle, LogOut, Menu, X, Search, Sun, Moon, Clock, Lock, RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../api'
import { useEnv } from '../context/EnvContext'
import { useTheme } from '../context/ThemeContext'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import { LiveApprovedModal } from './LiveApprovedModal'

type Item = { to: string; icon: LucideIcon; label: string; soon?: boolean }

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  ] },
  { title: 'Money', items: [
    { to: '/payments', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/customers', icon: UserCheck, label: 'Customers' },
    { to: '/disbursement', icon: ArrowUpRight, label: 'Payouts', soon: true },
  ] },
  { title: 'Get paid', items: [
    { to: '/collect', icon: Smartphone, label: 'Collect (USSD push)' },
    { to: '/payment-links', icon: Link2, label: 'Payment links' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    { to: '/bill-splits', icon: Users, label: 'Bill splits' },
    { to: '/bulk', icon: Rows3, label: 'Bulk', soon: true },
  ] },
  { title: 'Developers', items: [
    { to: '/api-keys', icon: Key, label: 'API keys' },
    { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
    { to: '/playground', icon: FlaskConical, label: 'Playground' },
    { to: '/audit', icon: Shield, label: 'Audit log' },
  ] },
  { title: 'Account', items: [
    { to: '/team', icon: UserCog, label: 'Team' },
    { to: '/account', icon: User, label: 'Settings' },
    { to: '/support', icon: HelpCircle, label: 'Support' },
  ] },
]
const ALL = GROUPS.flatMap(g => g.items)

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || 'W'
}
function readJSON(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}

function JumpTo() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? ALL.filter(i => i.label.toLowerCase().includes(s)) : ALL).filter(i => !i.soon).slice(0, 7)
  }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (to: string) => { navigate(to); setQ(''); setOpen(false); ref.current?.blur() }

  return (
    <div className="relative w-full max-w-[420px]">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-p-mute" />
      <input
        ref={ref}
        value={q}
        onChange={e => { setQ(e.target.value); setIdx(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
          if (e.key === 'Enter' && results[idx]) go(results[idx].to)
          if (e.key === 'Escape') { setQ(''); ref.current?.blur() }
        }}
        placeholder="Search or jump to…"
        aria-label="Search or jump to a page"
        className="h-10 w-full rounded-xl border border-p-line bg-p-surface pl-10 pr-14 text-sm text-p-ink outline-none transition placeholder:text-p-mute focus:border-p-green focus:ring-4 focus:ring-p-green/15"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-p-line px-1.5 py-0.5 text-[11px] text-p-mute">⌘K</kbd>
      {open && results.length > 0 && (
        <div className="p-fade absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-p-line bg-p-surface p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.14)]">
          {results.map((r, i) => (
            <button
              key={r.to}
              type="button"
              onMouseDown={() => go(r.to)}
              onMouseEnter={() => setIdx(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === idx ? 'bg-p-soft text-p-ink' : 'text-p-ink2'}`}
            >
              <r.icon size={16} className="text-p-mute" /> {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const merchant = readJSON('portalMerchant')
  const user = readJSON('portalUser')
  const [open, setOpen] = useState(false)
  const [idleWarning, setIdleWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const { mode, setMode, isSandbox, liveEnabled, refreshStatus, statusChecking } = useEnv()
  const { theme, toggle } = useTheme()

  const doLogout = useCallback(() => {
    api.logout()
    localStorage.removeItem('portalMerchant')
    localStorage.removeItem('portalUser')
    navigate('/login')
  }, [navigate])

  const onWarn = useCallback(() => { setIdleWarning(true); setCountdown(60) }, [])
  useIdleTimeout(doLogout, onWarn)

  useEffect(() => {
    if (!idleWarning || countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [idleWarning, countdown])

  useEffect(() => setOpen(false), [pathname])

  const current = ALL.find(i => pathname === i.to || pathname.startsWith(i.to + '/'))?.label ?? 'Portal'
  const merchantName = merchant.name || 'Your business'
  const userName = user.name || user.email || 'Account'

  const sidebar = (
    <aside className="flex h-full w-[264px] flex-col border-r border-p-line bg-p-surface">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <img src="/logo.png" alt="" className="h-9 w-9 rounded-[10px]" />
        <div className="leading-tight">
          <p className="text-[17px] font-semibold tracking-[-0.02em] text-p-ink">wisopay</p>
          <p className="text-xs text-p-mute">Merchant portal</p>
        </div>
        <button onClick={() => setOpen(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-p-mute hover:bg-p-soft md:hidden" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <NavLink to="/account" className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-p-line bg-p-soft p-3 transition-colors hover:bg-p-soft">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-p-green to-[#0a8f64] text-sm font-semibold text-white">
          {initials(merchantName)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-p-ink">{merchantName}</span>
          <span className="flex items-center gap-1.5 text-xs text-p-mute">
            <span className={`h-1.5 w-1.5 rounded-full ${liveEnabled ? 'bg-p-green' : 'bg-amber-400'}`} />
            {liveEnabled ? 'Verified business' : 'Verification pending'}
          </span>
        </span>
      </NavLink>

      <nav className="p-scroll flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map(g => (
          <div key={g.title} className="mt-4">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-p-mute">{g.title}</p>
            {g.items.map(({ to, icon: Icon, label, soon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors ${
                    isActive ? 'bg-p-green font-medium text-white shadow-[0_6px_16px_rgba(14,185,129,.25)]' : 'text-p-ink2 hover:bg-p-soft hover:text-p-ink'
                  }`
                }
              >
                <Icon size={17} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {soon && <span className="rounded-md bg-p-soft px-1.5 py-0.5 text-[10px] font-semibold text-p-mute group-[.active]:bg-white/20">Soon</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-p-line p-3">
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-p-ink">Test mode</p>
            <p className="text-xs text-p-mute">
              {isSandbox ? (liveEnabled ? 'Simulated payments' : 'Live unlocks after KYC') : 'Real payments'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {!liveEnabled && (
              <button onClick={() => refreshStatus()} disabled={statusChecking} title="Check approval status" aria-label="Check approval status"
                className="grid h-7 w-7 place-items-center rounded-lg text-p-mute hover:bg-p-soft disabled:opacity-50">
                <RefreshCw size={13} className={statusChecking ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              role="switch"
              aria-checked={isSandbox}
              aria-label="Test mode"
              disabled={statusChecking || (isSandbox && !liveEnabled)}
              onClick={() => setMode(mode === 'sandbox' ? 'live' : 'sandbox')}
              title={isSandbox && !liveEnabled ? 'Live mode is locked until your account is approved' : undefined}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${isSandbox ? 'bg-amber-400' : 'bg-p-line'}`}
            >
              <span className={`absolute left-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-transform duration-300 ${isSandbox ? 'translate-x-5' : ''}`}>
                {isSandbox && !liveEnabled && <Lock size={10} className="text-amber-500" />}
              </span>
            </button>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-p-line bg-p-soft text-xs font-semibold text-p-ink">{initials(userName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-p-ink">{userName}</p>
            <p className="truncate text-xs text-p-mute">{user.email && user.name ? user.email : merchant.slug || 'Signed in'}</p>
          </div>
          <button onClick={doLogout} title="Log out" aria-label="Log out" className="grid h-8 w-8 place-items-center rounded-lg text-p-mute transition-colors hover:bg-red-500/10 hover:text-red-500">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-p-bg text-p-ink">
      <LiveApprovedModal />

      <div className="hidden flex-shrink-0 md:flex">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="p-fade relative z-50 h-full shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-p-line bg-p-surface px-4 backdrop-blur-md sm:px-8">
          <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-p-ink2 hover:bg-p-soft md:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[15px] sm:flex">
            <span className="truncate text-p-mute">{merchantName}</span>
            <span className="text-p-mute">/</span>
            <span className="truncate font-medium text-p-ink">{current}</span>
          </nav>
          <span className="truncate font-medium text-p-ink sm:hidden">{current}</span>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="mr-2 hidden lg:block lg:w-[360px] xl:w-[420px]"><JumpTo /></div>
            {isSandbox && (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300 sm:inline-flex">
                <FlaskConical size={12} /> Test mode
              </span>
            )}
            <button onClick={toggle} title={theme === 'dark' ? 'Light theme' : 'Dark theme'} aria-label="Toggle theme"
              className="grid h-10 w-10 place-items-center rounded-xl text-p-ink2 transition-colors hover:bg-p-soft hover:text-p-ink">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink to="/support" title="Help" aria-label="Help" className="grid h-10 w-10 place-items-center rounded-xl text-p-ink2 transition-colors hover:bg-p-soft hover:text-p-ink">
              <HelpCircle size={18} />
            </NavLink>
          </div>
        </header>

        {idleWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="p-fade w-full max-w-sm rounded-3xl border border-p-line bg-p-surface p-7 text-center shadow-2xl">
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-500"><Clock size={26} /></span>
              <h3 className="text-xl font-semibold text-p-ink">Still there?</h3>
              <p className="mt-1 text-sm text-p-mute">You'll be logged out automatically in</p>
              <p className="my-4 text-5xl font-semibold tabular-nums text-p-ink">{countdown}s</p>
              <button onClick={() => setIdleWarning(false)} className="h-12 w-full rounded-full bg-p-green text-sm font-semibold text-white transition hover:bg-p-green-hover">
                Keep me signed in
              </button>
              <button onClick={doLogout} className="mt-2 h-10 w-full text-sm text-p-mute hover:text-p-ink">Log out now</button>
            </div>
          </div>
        )}

        <main className="p-main p-scroll flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
