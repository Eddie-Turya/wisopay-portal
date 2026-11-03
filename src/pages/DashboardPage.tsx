import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Link2, PartyPopper, FlaskConical, ArrowRight, ArrowUp, ArrowDown, Info, X } from 'lucide-react'
import { Layout } from '../components/Layout'
import { OnboardingChecklist } from '../components/OnboardingChecklist'
import { api } from '../api'
import { useEnv } from '../context/EnvContext'
import mpesaLogo from '../assets/networks/mpesa.png'
import airtelLogo from '../assets/networks/airtel.png'
import yasLogo from '../assets/networks/yas.png'
import halopesaLogo from '../assets/networks/halopesa.png'

type Range = 7 | 30 | 90
type Day = { key: string; volume: number; completed: number; total: number }

const TZ = 'Africa/Dar_es_Salaam'
const tzs = (n: number) => `TZS ${Math.round(n).toLocaleString('en-US')}`
const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${+(n / 1_000).toFixed(1)}K` : `${Math.round(n)}`
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ })
const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function buildDays(rows: any[], count: number): Day[] {
  const byKey = new Map<string, any>(rows.map(r => [String(r.day).slice(0, 10), r]))
  const out: Day[] = []
  for (let i = count - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000))
    const r = byKey.get(key)
    out.push({ key, volume: r?.volume ?? 0, completed: r?.completed ?? 0, total: r?.total ?? 0 })
  }
  return out
}

function niceMax(v: number) {
  if (v <= 0) return 1000
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const STATUS: Record<string, { label: string; cls: string; bar: string }> = {
  COMPLETED: { label: 'Completed', cls: 'bg-p-green-soft text-p-green-ink', bar: 'bg-p-green' },
  PROCESSING: { label: 'Processing', cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-300', bar: 'bg-sky-400' },
  PENDING: { label: 'Pending', cls: 'bg-amber-400/15 text-amber-600 dark:text-amber-300', bar: 'bg-amber-400' },
  FAILED: { label: 'Failed', cls: 'bg-red-500/10 text-red-600 dark:text-red-300', bar: 'bg-red-400' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-p-soft text-p-mute', bar: 'bg-p-mute' },
  REFUNDED: { label: 'Refunded', cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-300', bar: 'bg-violet-400' },
}
const statusOf = (s: string) => STATUS[s] ?? { label: s.charAt(0) + s.slice(1).toLowerCase(), cls: 'bg-p-soft text-p-mute', bar: 'bg-p-mute' }

const NETWORKS: Record<string, { name: string; logo?: string; color: string }> = {
  mpesa: { name: 'M-Pesa', logo: mpesaLogo, color: '#e60000' },
  airtel: { name: 'Airtel Money', logo: airtelLogo, color: '#f472b6' },
  mixx: { name: 'Mixx by Yas', logo: yasLogo, color: '#2563eb' },
  halopesa: { name: 'HaloPesa', logo: halopesaLogo, color: '#f59e0b' },
  tpesa: { name: 'T-Pesa', color: '#3b82f6' },
  other: { name: 'Other numbers', color: '#8d929a' },
  unknown: { name: 'No phone on record', color: '#c4c7cc' },
}

function NetworkBadge({ id }: { id: string }) {
  const n = NETWORKS[id] ?? NETWORKS.other
  return n.logo
    ? <img src={n.logo} alt="" className="h-9 w-9 flex-shrink-0 rounded-full border border-p-line bg-white object-contain p-1" />
    : <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-p-line bg-p-soft text-xs font-semibold text-p-mute">{id === 'tpesa' ? 'T' : '?'}</span>
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-p-soft ${className}`} />
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-[22px] border border-p-line bg-p-surface ${className}`}>{children}</section>
}

function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; t: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-xl border border-p-line bg-p-soft p-1">
      {options.map(o => (
        <button key={String(o.v)} role="tab" aria-selected={value === o.v} onClick={() => onChange(o.v)}
          className={`rounded-lg px-3 py-1.5 text-sm transition-all ${value === o.v ? 'bg-p-surface font-medium text-p-ink shadow-sm' : 'text-p-mute hover:text-p-ink'}`}>
          {o.t}
        </button>
      ))}
    </div>
  )
}

function VolumeChart({ days }: { days: Day[] }) {
  const W = 1000, H = 260
  const max = niceMax(Math.max(...days.map(d => d.volume), 0))
  const step = days.length > 1 ? W / (days.length - 1) : W
  const pts = days.map((d, i) => [i * step, H - (d.volume / max) * H] as const)
  const line = pts.map(([x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [px, py] = pts[i - 1]
    const cx = (px + x) / 2
    return `C${cx},${py} ${cx},${y} ${x},${y}`
  }).join(' ')
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  const labelEvery = Math.ceil(days.length / 7)

  const onMove = (e: React.MouseEvent) => {
    const r = box.current!.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left) / r.width) * (days.length - 1))
    setHover(Math.max(0, Math.min(days.length - 1, i)))
  }
  const h = hover !== null ? days[hover] : null
  const hx = hover !== null ? (hover / (days.length - 1)) * 100 : 0
  const hy = hover !== null ? (pts[hover][1] / H) * 100 : 0

  return (
    <div className="flex gap-3">
      <div className="relative flex h-[260px] w-12 flex-shrink-0 flex-col justify-between text-right text-xs tabular-nums text-p-mute">
        {ticks.map(t => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{compact(max * t)}</span>)}
      </div>
      <div className="min-w-0 flex-1">
        <div ref={box} className="relative h-[260px] cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="dashFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#0eb981" stopOpacity=".28" />
                <stop offset="1" stopColor="#0eb981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map(t => <line key={t} x1="0" x2={W} y1={H - t * H} y2={H - t * H} stroke="var(--p-line)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />)}
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#dashFill)" className="p-fade" />
            <path d={line} fill="none" stroke="#0eb981" strokeWidth="2.5" vectorEffect="non-scaling-stroke" pathLength={1} className="dash-draw" />
          </svg>
          {h && (
            <>
              <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-p-line" style={{ left: `${hx}%` }} />
              <div className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-p-surface bg-p-green shadow" style={{ left: `${hx}%`, top: `${hy}%` }} />
              <div className={`pointer-events-none absolute top-2 z-10 rounded-xl border border-p-line bg-p-surface px-3 py-2 text-xs shadow-lg ${hx > 70 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3'}`} style={{ left: `${hx}%` }}>
                <p className="text-p-mute">{dayLabel(h.key)}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-p-ink">{tzs(h.volume)}</p>
                <p className="text-p-mute">{h.completed} successful · {h.total} total</p>
              </div>
            </>
          )}
        </div>
        <div className="mt-3 flex justify-between text-xs text-p-mute">
          {days.map((d, i) => (i % labelEvery === 0 || i === days.length - 1)
            ? <span key={d.key} className={i === days.length - 1 ? '' : 'hidden sm:inline'}>{dayLabel(d.key)}</span>
            : null)}
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const merchant = JSON.parse(localStorage.getItem('portalMerchant') || '{}')
  const { mode, isSandbox, liveEnabled } = useEnv()
  const [range, setRange] = useState<Range>(30)
  const [analytics, setAnalytics] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [balance, setBalance] = useState<any>(null)
  const [fee, setFee] = useState<any>(null)
  const [recent, setRecent] = useState<any[] | null>(null)
  const bannerKey = `live_banner_dismissed_${merchant.id}`
  const [bannerHidden, setBannerHidden] = useState(() => localStorage.getItem(bannerKey) === '1')

  useEffect(() => {
    setAnalytics(null)
    api.analytics({ days: range * 2, networkDays: range, envType: mode }).then(setAnalytics).catch(() => setAnalytics({ daily: [], statusBreakdown: [] }))
  }, [range, mode])

  useEffect(() => {
    setStats(null); setRecent(null)
    api.stats(mode).then(setStats).catch(() => setStats({}))
    api.payments({ limit: 6, envType: mode }).then(r => setRecent(r.data || [])).catch(() => setRecent([]))
  }, [mode])

  useEffect(() => {
    api.settlements().then(setBalance).catch(() => setBalance({}))
    api.getFeeSettings().then(setFee).catch(() => setFee(null))
  }, [])

  const { cur, prev } = useMemo(() => {
    const all = buildDays(analytics?.daily ?? [], range * 2)
    return { cur: all.slice(range), prev: all.slice(0, range) }
  }, [analytics, range])

  const sum = (d: Day[], k: keyof Omit<Day, 'key'>) => d.reduce((a, x) => a + x[k], 0)
  const vol = sum(cur, 'volume'), prevVol = sum(prev, 'volume')
  const done = sum(cur, 'completed'), total = sum(cur, 'total')
  const change = prevVol > 0 ? Math.round(((vol - prevVol) / prevVol) * 100) : vol > 0 ? null : 0
  const rate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0
  const avg = done > 0 ? vol / done : 0
  const loading = analytics === null
  const breakdown: { status: string; count: number }[] = analytics?.statusBreakdown ?? []
  const breakdownTotal = breakdown.reduce((a, b) => a + b.count, 0)
  const networks: { network: string; total: number; completed: number; volume: number }[] = analytics?.byNetwork ?? []
  const networkVolume = networks.reduce((a, n) => a + n.volume, 0)

  const dismissBanner = () => { localStorage.setItem(bannerKey, '1'); setBannerHidden(true) }

  return (
    <Layout>
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-8">
        {isSandbox && liveEnabled && !bannerHidden && (
          <div className="p-fade flex items-center gap-4 rounded-[20px] border border-p-green/30 bg-p-green-soft px-5 py-4">
            <PartyPopper size={22} className="flex-shrink-0 text-p-green-ink" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-p-ink">You're live!</p>
              <p className="text-sm text-p-ink2">Your account is verified. Switch off test mode in the sidebar to start accepting real payments.</p>
            </div>
            <button onClick={dismissBanner} className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-p-ink2 hover:bg-p-surface sm:block">Dismiss</button>
            <button onClick={dismissBanner} aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-lg text-p-ink2 sm:hidden"><X size={16} /></button>
          </div>
        )}
        {isSandbox && !liveEnabled && (
          <div className="p-fade flex items-center gap-4 rounded-[20px] border border-amber-400/30 bg-amber-400/10 px-5 py-4">
            <FlaskConical size={20} className="flex-shrink-0 text-amber-600 dark:text-amber-300" />
            <p className="text-sm text-p-ink2"><span className="font-semibold text-p-ink">You're in test mode.</span> Payments are simulated. Live payments unlock once we've verified your business documents.</p>
          </div>
        )}

        <OnboardingChecklist />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-p-ink">Overview</h1>
            <p className="mt-1 text-p-mute">Welcome back, {merchant.name || 'there'}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/collect" className="inline-flex h-11 items-center gap-2 rounded-xl border border-p-line bg-p-surface px-4 text-sm font-medium text-p-ink transition hover:bg-p-soft">
              <Smartphone size={16} /> Collect payment
            </Link>
            <Link to="/payment-links" className="inline-flex h-11 items-center gap-2 rounded-xl bg-p-green px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(14,185,129,.28)] transition hover:bg-p-green-hover">
              <Link2 size={16} /> Create payment link
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-p-ink">Payments overview</h2>
              <Segmented<Range> label="Period" value={range} onChange={setRange} options={[{ v: 7, t: '7d' }, { v: 30, t: '30d' }, { v: 90, t: '90d' }]} />
            </div>

            <div className="mt-6 grid overflow-hidden rounded-2xl border border-p-line bg-p-soft sm:grid-cols-3">
              {[
                {
                  k: 'Volume', v: tzs(vol),
                  sub: change === null ? <span className="text-p-green-ink">New this period</span>
                    : <span className={`inline-flex items-center gap-1 ${change >= 0 ? 'text-p-green-ink' : 'text-red-500'}`}>{change >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(change)}% vs previous {range}d</span>,
                },
                { k: 'Transactions', v: done.toLocaleString('en-US'), sub: <span className="text-p-mute">Successful only</span> },
                { k: 'Success rate', v: `${rate}%`, sub: <span className="text-p-mute">{total.toLocaleString('en-US')} attempts</span> },
              ].map((m, i) => (
                <div key={m.k} className={`p-5 ${i ? 'border-t border-p-line sm:border-l sm:border-t-0' : ''}`}>
                  <p className="text-sm text-p-mute">{m.k}</p>
                  {loading ? <Sk className="mt-2 h-8 w-32" /> : <p className="mt-1.5 whitespace-nowrap text-[22px] font-semibold tabular-nums tracking-[-0.01em] text-p-ink 2xl:text-[26px]">{m.v}</p>}
                  <p className="mt-1 text-sm">{loading ? <Sk className="h-4 w-24" /> : m.sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-7">{loading ? <Sk className="h-[284px] w-full" /> : <VolumeChart key={`${range}-${mode}`} days={cur} />}</div>

            <p className="mt-5 flex items-center gap-2 text-sm text-p-mute">
              <Info size={15} className="flex-shrink-0" /> Completed payments in TZS, grouped by day in East Africa Time.{isSandbox && ' Test-mode data.'}
            </p>
          </Card>

          <Card className="flex flex-col p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-p-ink">Balance</h2>
            <div className="mt-5 rounded-2xl bg-p-soft p-5">
              <p className="text-sm text-p-mute">Available balance</p>
              {balance === null ? <Sk className="mt-2 h-9 w-40" /> : (
                <p className="mt-1 text-[30px] font-semibold tabular-nums tracking-[-0.015em] text-p-ink">{tzs(balance.payableBalance ?? 0)}</p>
              )}
              <p className="mt-1 text-sm text-p-mute">Live payments, after fees and refunds</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div><dt className="text-p-mute">Collected</dt><dd className="mt-0.5 font-medium tabular-nums text-p-ink">{balance ? tzs(balance.grossVolume ?? 0) : '—'}</dd></div>
                <div><dt className="text-p-mute">Fees{fee?.platform_rate_percent ? ` (${fee.platform_rate_percent}%)` : ''}</dt><dd className="mt-0.5 font-medium tabular-nums text-p-ink">{balance ? tzs(balance.feeEstimate ?? 0) : '—'}</dd></div>
                <div><dt className="text-p-mute">Refunded</dt><dd className="mt-0.5 font-medium tabular-nums text-p-ink">{balance ? tzs(balance.refundedAmount ?? 0) : '—'}</dd></div>
                <div><dt className="text-p-mute">Fee paid by</dt><dd className="mt-0.5 font-medium text-p-ink">{fee ? (fee.fee_bearer === 'customer' ? 'Customer' : 'You') : '—'}</dd></div>
              </dl>
            </div>
            <div className="mt-auto pt-6">
              <Link to="/collect" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-p-green text-sm font-semibold text-white transition hover:bg-p-green-hover">
                <Smartphone size={16} /> Collect a payment
              </Link>
              <Link to="/account" className="mt-3 flex items-center justify-center gap-1.5 text-sm text-p-ink2 transition-colors hover:text-p-ink">
                Change who pays the fee <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {[
            { k: 'Success rate', v: stats ? `${stats.successRate ?? 0}%` : null, s: 'all time' },
            { k: 'Avg. payment', v: loading ? null : tzs(avg), s: `last ${range}d` },
            { k: 'Failed', v: loading ? null : (total - done).toLocaleString('en-US'), s: `last ${range}d` },
            { k: 'Refunds', v: stats ? (stats.refundCount ?? 0).toLocaleString('en-US') : null, s: 'all time' },
          ].map(c => (
            <Card key={c.k} className="p-5 sm:p-6">
              <p className="text-sm text-p-mute">{c.k}</p>
              {c.v === null ? <Sk className="mt-2 h-8 w-24" /> : <p className="mt-1.5 truncate text-[24px] font-semibold tabular-nums text-p-ink sm:text-[28px]">{c.v}</p>}
              <p className="mt-1 text-sm text-p-mute">{c.s}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 sm:px-7 sm:pt-6">
              <h2 className="text-lg font-semibold text-p-ink">Recent payments</h2>
              <Link to="/payments" className="inline-flex items-center gap-1.5 text-sm text-p-ink2 hover:text-p-ink">View all <ArrowRight size={14} /></Link>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.06em] text-p-mute">
                    <th className="px-5 py-3 font-medium sm:px-7">Payment</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 text-right font-medium sm:px-7">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent === null && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-p-line"><td colSpan={4} className="px-5 py-4 sm:px-7"><Sk className="h-5 w-full" /></td></tr>
                  ))}
                  {recent?.length === 0 && (
                    <tr className="border-t border-p-line"><td colSpan={4} className="px-5 py-10 text-center text-p-mute sm:px-7">
                      No payments yet. <Link to="/collect" className="font-medium text-p-green-ink hover:underline">Send your first USSD push</Link>
                    </td></tr>
                  )}
                  {recent?.map(p => {
                    const st = statusOf(p.status)
                    return (
                      <tr key={p.id} className="border-t border-p-line transition-colors hover:bg-p-soft">
                        <td className="px-5 py-3.5 sm:px-7">
                          <Link to={`/payments/${p.id}`} className="block">
                            <span className="font-mono text-[13px] text-p-ink">{p.id}</span>
                            {p.reference && <span className="block truncate text-xs text-p-mute">{p.reference}</span>}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                        <td className="px-3 py-3.5 text-right font-medium tabular-nums text-p-ink">{tzs(Number(p.amount) || 0)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-p-mute sm:px-7">{timeAgo(p.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
          <Card className="p-5 sm:p-7">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-p-ink">Volume by network</h2>
              <span className="text-sm text-p-mute">last {range}d</span>
            </div>
            {loading ? <div className="mt-6 space-y-4">{[0, 1, 2].map(i => <Sk key={i} className="h-11 w-full" />)}</div>
              : networks.length === 0 ? <p className="mt-8 text-center text-sm text-p-mute">No payments in this period.</p>
              : (
                <>
                  <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-p-soft">
                    {networks.filter(n => n.volume > 0).map(n => (
                      <div key={n.network} className="dash-bar h-full first:rounded-l-full last:rounded-r-full" title={NETWORKS[n.network]?.name}
                        style={{ width: `${(n.volume / (networkVolume || 1)) * 100}%`, background: (NETWORKS[n.network] ?? NETWORKS.other).color }} />
                    ))}
                  </div>
                  <ul className="mt-5 space-y-3.5">
                    {networks.map(n => {
                      const meta = NETWORKS[n.network] ?? NETWORKS.other
                      const share = networkVolume ? Math.round((n.volume / networkVolume) * 100) : 0
                      return (
                        <li key={n.network} className="flex items-center gap-3">
                          <NetworkBadge id={n.network} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-p-ink">{meta.name}</p>
                            <p className="text-xs text-p-mute">{n.completed.toLocaleString('en-US')} of {n.total.toLocaleString('en-US')} successful</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium tabular-nums text-p-ink">{tzs(n.volume)}</p>
                            <p className="text-xs tabular-nums text-p-mute">{share}%</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {networks.some(n => n.network === 'unknown') && (
                    <p className="mt-5 flex gap-2 text-xs text-p-mute"><Info size={13} className="mt-0.5 flex-shrink-0" />Network is worked out from the payer's phone number. Older payments may not have one on record.</p>
                  )}
                </>
              )}
          </Card>

          <Card className="p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-p-ink">Payments by status</h2>
            <p className="mt-1 text-sm text-p-mute">All time · {breakdownTotal.toLocaleString('en-US')} payments</p>
            {loading ? <div className="mt-6 space-y-4">{[0, 1, 2].map(i => <Sk key={i} className="h-9 w-full" />)}</div> : breakdown.length === 0 ? (
              <p className="mt-8 text-center text-sm text-p-mute">Nothing to show yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {[...breakdown].sort((a, b) => b.count - a.count).map(b => {
                  const st = statusOf(b.status)
                  const pct = breakdownTotal ? (b.count / breakdownTotal) * 100 : 0
                  return (
                    <div key={b.status}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-p-ink">{st.label}</span>
                        <span className="tabular-nums text-p-mute">{b.count.toLocaleString('en-US')} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-p-soft">
                        <div className={`dash-bar h-full rounded-full ${st.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
