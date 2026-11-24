import { useState, useCallback, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  LayoutDashboard, BarChart3, ArrowLeftRight, UserCheck, Smartphone, Link2, FileText, Users, Rows3, ArrowUpFromLine,
  Key, Webhook, FlaskConical, Shield, UserCog, Settings, HelpCircle, LogOut, Menu, X, Search, Sun, Moon, Clock, Lock,
  RefreshCw, CornerDownLeft, Plus,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../api'
import { useEnv } from '../context/EnvContext'
import { useTheme } from '../context/ThemeContext'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import { LiveApprovedModal } from './LiveApprovedModal'
import { ToastProvider, Toggle, cx, initials } from './ui'

type Item = { to: string; icon: LucideIcon; label: string; soon?: boolean }

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ] },
  { title: 'Money', items: [
    { to: '/payments', icon: ArrowLeftRight, label: 'Payments' },
    { to: '/customers', icon: UserCheck, label: 'Customers' },
    { to: '/disbursement', icon: ArrowUpFromLine, label: 'Payouts', soon: true },
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
    { to: '/account', icon: Settings, label: 'Settings' },
    { to: '/support', icon: HelpCircle, label: 'Support' },
  ] },
]
const ALL = GROUPS.flatMap(g => g.items)

const ACTIONS: Item[] = [
  { to: '/collect', icon: Smartphone, label: 'Collect a payment' },
  { to: '/payment-links', icon: Link2, label: 'Create a payment link' },
  { to: '/invoices/new', icon: Plus, label: 'Create an invoice' },
  { to: '/api-keys', icon: Key, label: 'View API keys' },
  { to: '/team', icon: Users, label: 'Invite a team member' },
]

function readJSON(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}

/* ---------- Command palette (⌘K) ---------- */

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const items = useMemo(() => {
    const all = [
      ...ALL.filter(i => !i.soon).map(i => ({ ...i, kind: 'Pages' })),
      ...ACTIONS.map(a => ({ ...a, kind: 'Actions' })),
    ]
    const s = q.trim().toLowerCase()
    return s ? all.filter(i => i.label.toLowerCase().includes(s)) : all
  }, [q])

  const close = () => { setQ(''); setSel(0); onClose() }
  const go = (to: string) => { navigate(to); close() }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-p-line bg-p-panel text-p-fg shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-p-line px-4">
              <Search className="h-4 w-4 text-p-faint" />
              <input
                autoFocus
                value={q}
                onChange={e => { setQ(e.target.value); setSel(0) }}
                onKeyDown={e => {
                  if (e.key === 'Escape') close()
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
                  if (e.key === 'Enter' && items[sel]) go(items[sel].to)
                }}
                placeholder="Search pages and actions…"
                aria-label="Search pages and actions"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-p-faint"
              />
              <kbd className="rounded-md border border-p-line px-1.5 py-0.5 font-mono text-[10px] text-p-faint">ESC</kbd>
            </div>
            <ul className="p-scroll max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-p-muted">No results for “{q}”</li>}
              {items.map((it, i) => (
                <li key={it.kind + it.label}>
                  {(i === 0 || items[i - 1].kind !== it.kind) && <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-p-faint">{it.kind}</p>}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(it.to)}
                    className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', sel === i ? 'bg-p-panel2 text-p-fg' : 'text-p-muted')}
                  >
                    <it.icon className="h-4 w-4" />
                    <span className="flex-1">{it.label}</span>
                    {sel === i && <CornerDownLeft className="h-3.5 w-3.5 text-p-faint" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Shell ---------- */

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const merchant = readJSON('portalMerchant')
  const user = readJSON('portalUser')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [idleWarning, setIdleWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const { setMode, isSandbox, liveEnabled, refreshStatus, statusChecking } = useEnv()
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

  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const current = ALL.find(i => pathname === i.to || pathname.startsWith(i.to + '/'))
  const merchantName = merchant.name || 'Your business'
  const userName = user.name || user.email || 'Account'

  const sidebar = (layoutId: string) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <img src="/logo.png" alt="" className="h-8 w-8 rounded-[10px]" />
        <div className="leading-tight">
          <p className="text-[15px] font-semibold text-p-fg">wisopay</p>
          <p className="text-[11px] text-p-faint">Merchant portal</p>
        </div>
      </div>

      <div className="px-3">
        <NavLink to="/account" className="flex w-full items-center gap-2.5 rounded-xl border border-p-line bg-p-panel2 px-2.5 py-2 text-left transition hover:border-p-faint/50">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#34d399] to-[#0a8f64] text-xs font-bold text-white">{initials(merchantName)[0]}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-p-fg">{merchantName}</span>
            <span className="flex items-center gap-1.5 truncate text-[11px] text-p-faint">
              <span className={cx('h-1.5 w-1.5 rounded-full', liveEnabled ? 'bg-p-good' : 'bg-p-warn')} />
              {liveEnabled ? 'Verified business' : 'Verification pending'}
            </span>
          </span>
        </NavLink>
      </div>

      <nav className="p-scroll mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map(g => (
          <div key={g.title}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-p-faint">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map(it => {
                const active = current?.to === it.to
                return (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      className={cx(
                        'relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition',
                        active ? 'text-p-accent-ink' : 'text-p-muted hover:bg-p-panel2 hover:text-p-fg',
                      )}
                    >
                      {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-xl bg-p-accent" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                      <it.icon className="relative h-4 w-4" />
                      <span className="relative flex-1 truncate">{it.label}</span>
                      {it.soon && <span className={cx('relative rounded-md px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-black/10' : 'bg-p-panel2 text-p-faint')}>Soon</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-p-line p-3">
        <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5" title={liveEnabled ? undefined : 'Live mode unlocks once your account is verified'}>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-p-fg">
            Test mode {!liveEnabled && <Lock className="h-3.5 w-3.5 text-p-faint" />}
          </span>
          {liveEnabled ? (
            <Toggle on={isSandbox} disabled={statusChecking} onChange={v => setMode(v ? 'sandbox' : 'live')} label="Test mode" />
          ) : (
            <span className="flex items-center gap-1">
              <button onClick={() => refreshStatus()} disabled={statusChecking} title="Check approval status" aria-label="Check approval status"
                className="grid h-6 w-6 place-items-center rounded-md text-p-faint hover:bg-p-panel2 hover:text-p-fg disabled:opacity-50">
                <RefreshCw className={cx('h-3 w-3', statusChecking && 'animate-spin')} />
              </button>
              <span className="rounded-full bg-p-warn/15 px-2 py-0.5 text-[11px] font-medium text-p-warn">Locked on</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-p-panel2 text-xs font-semibold text-p-fg ring-1 ring-p-line">{initials(userName)}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-p-fg">{userName}</p>
            <p className="truncate text-[11px] text-p-faint">{user.email && user.name ? user.email : merchant.slug || 'Signed in'}</p>
          </div>
          <button onClick={doLogout} aria-label="Sign out" title="Sign out" className="rounded-lg p-1.5 text-p-faint hover:bg-p-panel2 hover:text-p-fg">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-p-bg text-p-fg">
        <LiveApprovedModal />

        {isSandbox && (
          <div className="flex h-7 flex-shrink-0 items-center justify-center gap-2 bg-p-warn px-3 text-center text-xs font-semibold text-black">
            <span className="truncate">
              {liveEnabled ? 'TEST MODE · You’re viewing test data. No real money moves.' : 'SANDBOX · Live payments switch on after verification. No real money moves.'}
            </span>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 flex-shrink-0 border-r border-p-line bg-p-panel lg:block">{sidebar('nav-active')}</aside>

          {/* Mobile sidebar */}
          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-[60] lg:hidden">
                <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
                <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  className="absolute inset-y-0 left-0 w-72 border-r border-p-line bg-p-panel">
                  <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded-lg p-1.5 text-p-muted hover:bg-p-panel2">
                    <X className="h-4 w-4" />
                  </button>
                  {sidebar('nav-active-mobile')}
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top bar */}
            <header className="z-30 flex h-16 flex-shrink-0 items-center gap-3 border-b border-p-line bg-p-bg/80 px-4 backdrop-blur-xl sm:px-6">
              <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-p-muted hover:bg-p-panel2 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
                <span className="truncate text-p-faint">{merchantName}</span>
                <span className="text-p-faint">/</span>
                <span className="truncate font-medium">{current?.label ?? 'Portal'}</span>
              </nav>
              <span className="truncate text-sm font-medium sm:hidden">{current?.label ?? 'Portal'}</span>

              <button
                onClick={() => setPalette(true)}
                className="ml-auto hidden h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-p-line bg-p-panel px-3 text-sm text-p-faint transition hover:border-p-faint/50 md:flex"
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Search or jump to…</span>
                <kbd className="rounded-md border border-p-line px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
              </button>
              <button onClick={() => setPalette(true)} aria-label="Search" className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-p-muted hover:bg-p-panel2 hover:text-p-fg md:hidden">
                <Search className="h-4 w-4" />
              </button>

              <button
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
                onClick={toggle}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-p-muted transition hover:bg-p-panel2 hover:text-p-fg"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <NavLink to="/support" aria-label="Help" title="Help" className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-p-muted transition hover:bg-p-panel2 hover:text-p-fg sm:grid">
                <HelpCircle className="h-4 w-4" />
              </NavLink>
            </header>

            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="p-main p-scroll min-h-0 flex-1 overflow-y-auto"
            >
              {children}
            </motion.main>
          </div>
        </div>

        {idleWarning && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="p-fade w-full max-w-sm rounded-2xl border border-p-line bg-p-panel p-7 text-center shadow-2xl">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-p-warn/15 text-p-warn"><Clock className="h-6 w-6" /></span>
              <h3 className="text-lg font-semibold">Still there?</h3>
              <p className="mt-1 text-sm text-p-muted">You’ll be signed out automatically in</p>
              <p className="my-4 text-5xl font-semibold tabular-nums">{countdown}s</p>
              <button onClick={() => setIdleWarning(false)} className="h-11 w-full rounded-xl bg-p-accent text-sm font-semibold text-p-accent-ink transition hover:brightness-95">
                Keep me signed in
              </button>
              <button onClick={doLogout} className="mt-2 h-10 w-full text-sm text-p-muted hover:text-p-fg">Sign out now</button>
            </div>
          </div>
        )}

        <CommandPalette open={palette} onClose={() => setPalette(false)} />
      </div>
    </ToastProvider>
  )
}
