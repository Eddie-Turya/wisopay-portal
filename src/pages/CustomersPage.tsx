import { useState, useEffect, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { useEnv } from '../context/EnvContext'
import { Users, Search, Phone } from 'lucide-react'

function formatTZS(n: number) {
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}K`
  return `TZS ${n.toLocaleString()}`
}

export function CustomersPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const { mode } = useEnv()

  const load = useCallback(() => {
    setLoading(true)
    api.customers({ search: search || undefined, envType: mode })
      .then((r: any) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, mode])

  useEffect(load, [load])

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-p-fg flex items-center gap-2">
            <Users size={16} className="text-p-good" /> Customers
          </h1>
          <p className="text-xs text-p-faint">{data.length} customers · grouped by phone</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-p-faint" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
            placeholder="Search by phone number…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-p-line rounded-lg focus:outline-none focus:border-p-fg/40 bg-p-panel"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-p-panel rounded-xl border border-p-line p-4 animate-pulse h-16" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="bg-p-panel rounded-xl border border-p-line p-14 text-center">
            <Phone size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-p-muted font-medium">No customers yet</p>
            <p className="text-xs text-p-faint mt-1">Customers appear here once payments include a phone number</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-p-panel rounded-xl border border-p-line shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-p-panel2 border-b border-p-line">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Phone</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Payments</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Completed</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Total Spent</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Last Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-p-line">
                  {data.map((c: any) => (
                    <tr key={c.phone} className="hover:bg-p-panel2 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-sm text-p-fg font-medium">{c.phone}</td>
                      <td className="px-5 py-3.5 text-right text-p-ink2 tabular-nums">{c.paymentCount}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <span className="text-p-good font-semibold">{c.completedCount}</span>
                        <span className="text-p-faint mx-1">/</span>
                        <span className="text-p-muted">{c.paymentCount}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-p-fg tabular-nums">{formatTZS(c.totalVolume)}</td>
                      <td className="px-5 py-3.5 text-right text-xs text-p-faint">
                        {new Date(c.lastPaymentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {data.map((c: any) => (
                <div key={c.phone} className="bg-p-panel rounded-xl border border-p-line shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-sm font-semibold text-p-fg">{c.phone}</p>
                    <p className="text-sm font-bold text-p-good">{formatTZS(c.totalVolume)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-p-faint">
                    <span>{c.completedCount}/{c.paymentCount} completed</span>
                    <span>·</span>
                    <span>Last {new Date(c.lastPaymentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
