import { Layout } from '../components/Layout'
import { Rows3, Clock } from 'lucide-react'

export function BulkPage() {
  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Bulk Payments</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-p-warn/10 text-p-warn border border-p-warn/25">COMING SOON</span>
          </div>
          <p className="text-xs text-p-faint hidden sm:block">Collect from hundreds of customers in one go</p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-lg mx-auto mt-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Rows3 size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-p-fg mb-2">Bulk collections are coming</h2>
          <p className="text-sm text-p-muted mb-6">Upload a CSV of phone numbers and amounts, and we'll send USSD push requests to all of them — with a live progress tracker and per-row status.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
            {[
              { title: 'CSV Upload', desc: 'Phone, amount, description per row' },
              { title: 'Live Progress', desc: 'See which payments completed' },
              { title: 'Retry Failed', desc: 'One click to retry failed rows' },
              { title: 'Export Results', desc: 'Download full results as CSV' },
            ].map(f => (
              <div key={f.title} className="bg-p-panel rounded-xl border border-p-line p-4">
                <p className="text-sm font-semibold text-p-fg mb-0.5">{f.title}</p>
                <p className="text-xs text-p-faint">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-p-faint">
            <Clock size={13} />
            <span>Expected Q4 2026 — we'll notify you when it's ready</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}
