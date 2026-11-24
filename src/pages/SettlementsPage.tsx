import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { Wallet, TrendingUp, RotateCcw, Receipt, ArrowDownToLine, Info } from 'lucide-react'

function fmt(n: number) { return `TZS ${Number(n).toLocaleString()}` }

function KpiCard({ icon: Icon, label, value, sub, color = 'gray' }: any) {
  const colors: Record<string, string> = {
    green: 'bg-p-good/10 text-p-good',
    red: 'bg-p-bad/10 text-p-bad',
    blue: 'bg-p-info/10 text-p-info',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-p-panel2 text-p-muted',
  }
  return (
    <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <p className="text-xs font-semibold text-p-muted uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold text-p-fg">{value}</p>
      {sub && <p className="text-xs text-p-faint mt-1">{sub}</p>}
    </div>
  )
}

export function SettlementsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.settlements().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Settlements</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-p-warn/10 text-p-warn border border-p-warn/25">COMING SOON</span>
          </div>
          <p className="text-xs text-p-faint hidden sm:block">Your revenue, fees, and payout balance</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-p-panel rounded-xl border border-p-line p-5 animate-pulse h-24" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={TrendingUp} label="Gross Volume" value={fmt(data?.grossVolume || 0)} sub="All completed payments" color="green" />
              <KpiCard icon={RotateCcw} label="Refunded" value={fmt(data?.refundedAmount || 0)} sub="Total refunds issued" color="red" />
              <KpiCard icon={Receipt} label="Platform Fees" value={fmt(data?.feeEstimate || 0)} sub="Est. 1.5% of gross" color="gray" />
              <KpiCard icon={Wallet} label="Payable Balance" value={fmt(data?.payableBalance || 0)} sub="Net after fees & refunds" color="blue" />
            </div>

            {/* Info banner */}
            <div className="bg-p-info/10 border border-p-info/25 rounded-xl p-4 flex items-start gap-3">
              <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-800">Automated payouts are coming</p>
                <p className="text-xs text-p-info mt-0.5">Currently, settlements are processed manually every 7 days. Automated weekly payouts to your registered bank account will be enabled soon.</p>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownToLine size={15} className="text-p-faint" />
                <h2 className="text-sm font-bold text-p-fg">Payout Schedule</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Frequency', value: 'Every 7 days (manual)' },
                  { label: 'Minimum payout', value: 'TZS 10,000' },
                  { label: 'Processing time', value: '1–2 business days after settlement' },
                  { label: 'Destination', value: 'Registered business bank account' },
                  { label: 'Platform fee', value: '1.5% of gross volume' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-p-line last:border-0">
                    <p className="text-xs font-semibold text-p-muted uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-p-ink2 font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent payouts placeholder */}
            <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={15} className="text-p-faint" />
                <h2 className="text-sm font-bold text-p-fg">Payout History</h2>
              </div>
              <div className="text-center py-8">
                <ArrowDownToLine size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-p-faint">No payouts recorded yet</p>
                <p className="text-xs text-p-faint mt-1">Payout records will appear here once automated settlements are enabled</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
