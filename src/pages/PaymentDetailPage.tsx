import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { ArrowLeft, RefreshCw, RotateCcw, CheckCircle2, XCircle, Clock, AlertCircle, Check, Copy } from 'lucide-react'

function statusBadge(s: string) {
  const map: Record<string, string> = {
    COMPLETED: 'bg-p-good/10 text-p-good border-p-good/25',
    PENDING: 'bg-p-warn/10 text-p-warn border-p-warn/25',
    PROCESSING: 'bg-p-info/10 text-p-info border-p-info/25',
    FAILED: 'bg-p-bad/10 text-p-bad border-p-bad/25',
    REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return map[s] || 'bg-p-panel2 text-p-ink2 border-p-line'
}

function StatusIcon({ s }: { s: string }) {
  if (s === 'COMPLETED') return <CheckCircle2 size={14} className="text-p-good" />
  if (s === 'FAILED') return <XCircle size={14} className="text-red-400" />
  return <Clock size={14} className="text-amber-400" />
}

function fmt(n: number) { return `TZS ${Number(n).toLocaleString()}` }

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refunding, setRefunding] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundMsg, setRefundMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () => {
    setLoading(true)
    api.paymentDetail(id!).then(setData).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const copyId = () => {
    navigator.clipboard.writeText(id!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const doRefund = async () => {
    setRefunding(true); setRefundMsg(null)
    try {
      await api.refundPayment(id!, refundReason || undefined)
      setRefundMsg({ ok: true, text: 'Refund issued — payment marked as REFUNDED' })
      setShowRefund(false)
      load()
    } catch (err: any) {
      setRefundMsg({ ok: false, text: err.message })
    } finally { setRefunding(false) }
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center gap-3">
        <button onClick={() => navigate('/payments')} className="text-p-faint hover:text-p-fg transition p-1 -ml-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Payment Detail</h1>
          <p className="text-xs text-p-faint font-mono truncate">{id}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-p-faint hover:text-p-fg px-3 py-2 rounded-lg border border-p-line hover:bg-p-panel2 transition min-h-[38px]">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline text-xs">Refresh</span>
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="bg-p-panel rounded-xl border border-p-line p-6 animate-pulse h-28" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-sm text-p-faint">Payment not found</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* LEFT */}
            <div className="space-y-5">
              {/* Summary */}
              <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-p-fg">{fmt(data.amount)}</p>
                    <p className="text-sm text-p-faint mt-0.5">{data.currency}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge(data.status)}`}>
                    <StatusIcon s={data.status} />
                    {data.status}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[
                    ['Payment ID', <span className="flex items-center gap-1.5 font-mono text-xs text-p-ink2">
                      {data.id}
                      <button onClick={copyId} className="text-p-faint hover:text-p-fg">
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </span>],
                    ['Reference', <span className="text-sm text-p-ink2">{data.reference || '—'}</span>],
                    ['Payer Phone', <span className="text-sm text-p-ink2">{data.payerPhone || '—'}</span>],
                    ['Environment', <span className={`text-xs font-semibold px-2 py-0.5 rounded ${data.environment?.name?.includes('sandbox') || data.environment?.prefix?.includes('test') ? 'bg-violet-100 text-violet-700' : 'bg-p-good/10 text-p-good'}`}>{data.environment?.name || '—'}</span>],
                    ['Created', <span className="text-sm text-p-ink2">{new Date(data.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>],
                    ['Updated', <span className="text-sm text-p-ink2">{new Date(data.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>],
                  ].map(([label, val]: any) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-p-line last:border-0">
                      <p className="text-xs font-semibold text-p-muted uppercase tracking-wide flex-shrink-0">{label}</p>
                      <div className="text-right">{val}</div>
                    </div>
                  ))}
                </div>

                {/* Fee breakdown */}
                {data.fee_minor > 0 && (
                  <div className="mt-4 pt-4 border-t border-p-line">
                    <p className="text-xs font-semibold text-p-muted uppercase tracking-wide mb-2">Fee Breakdown</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-p-muted">Transaction amount</span>
                        <span className="font-medium text-p-fg">{fmt(data.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-p-muted">Platform fee</span>
                        <span className="font-medium text-p-bad">−{fmt(data.fee_minor)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-p-muted">Fee paid by</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data.fee_bearer === 'customer' ? 'bg-p-info/10 text-p-info' : 'bg-orange-50 text-orange-700'}`}>
                          {data.fee_bearer === 'customer' ? 'Customer' : 'Merchant'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t border-p-line pt-1.5 mt-1.5">
                        <span className="font-semibold text-p-ink2">Amount received</span>
                        <span className="font-bold text-p-good">{fmt(data.net_amount_minor)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Refund */}
              {data.status === 'COMPLETED' && data.refunds?.length === 0 && (
                <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw size={15} className="text-p-faint" />
                    <h2 className="text-sm font-bold text-p-fg">Issue Refund</h2>
                  </div>
                  {refundMsg && (
                    <div className={`flex items-center gap-2 text-xs font-medium mb-3 ${refundMsg.ok ? 'text-p-good' : 'text-p-bad'}`}>
                      {refundMsg.ok ? <Check size={13} /> : <AlertCircle size={13} />} {refundMsg.text}
                    </div>
                  )}
                  {!showRefund ? (
                    <button onClick={() => setShowRefund(true)} className="flex items-center gap-2 px-4 py-2 bg-p-bad/10 hover:bg-p-bad/10 text-p-bad rounded-lg text-sm font-semibold transition border border-p-bad/25">
                      <RotateCcw size={14} /> Refund {fmt(data.amount)}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-p-warn/10 border border-p-warn/25 rounded-lg p-3 text-xs text-p-warn">
                        This will refund <strong>{fmt(data.amount)}</strong> and mark the payment as REFUNDED. This cannot be undone.
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Reason (optional)</label>
                        <input type="text" value={refundReason} onChange={e => setRefundReason(e.target.value)}
                          placeholder="Customer request, duplicate charge…"
                          className="w-full px-3 py-2 border border-p-line rounded-lg text-sm focus:outline-none focus:border-red-400" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={doRefund} disabled={refunding}
                          className="bg-p-bad hover:bg-p-bad disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                          {refunding ? 'Processing…' : 'Confirm Refund'}
                        </button>
                        <button onClick={() => setShowRefund(false)} className="px-4 py-2 text-sm text-p-muted hover:text-p-fg rounded-lg border border-p-line hover:bg-p-panel2 transition">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Existing refunds */}
              {data.refunds?.length > 0 && (
                <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw size={15} className="text-p-faint" />
                    <h2 className="text-sm font-bold text-p-fg">Refund</h2>
                  </div>
                  {data.refunds.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-purple-700">{fmt(r.amount_minor)}</p>
                        {r.reason && <p className="text-xs text-p-faint mt-0.5">{r.reason}</p>}
                        <p className="text-xs text-p-faint">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'COMPLETED' ? 'bg-p-good/10 text-p-good' : 'bg-p-warn/10 text-p-warn'}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="space-y-5">
              {/* Provider attempts */}
              <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
                <h2 className="text-sm font-bold text-p-fg mb-4">Provider Attempts</h2>
                {data.attempts?.length === 0 ? (
                  <p className="text-xs text-p-faint text-center py-4">No provider attempts recorded</p>
                ) : (
                  <div className="space-y-3">
                    {data.attempts?.map((a: any, i: number) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-p-line bg-p-panel2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-p-muted flex-shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-p-ink2">{a.provider_code || 'SELCOM'}</p>
                          {a.provider_reference && (
                            <p className="text-[11px] font-mono text-p-muted break-all mt-0.5">{a.provider_reference}</p>
                          )}
                          <p className="text-[10px] text-p-faint mt-1">{new Date(a.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
                <h2 className="text-sm font-bold text-p-fg mb-4">Timeline</h2>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-p-panel2" />
                  <div className="space-y-4">
                    {[
                      { label: 'Payment created', time: data.createdAt, done: true },
                      { label: 'USSD push sent', time: data.attempts?.[0]?.created_at, done: !!data.attempts?.length },
                      { label: data.status === 'FAILED' ? 'Payment failed' : data.status === 'REFUNDED' ? 'Payment refunded' : data.status === 'COMPLETED' ? 'Payment completed' : 'Awaiting confirmation', time: data.status !== 'PENDING' && data.status !== 'PROCESSING' ? data.updatedAt : null, done: ['COMPLETED','FAILED','REFUNDED'].includes(data.status) },
                    ].map(({ label, time, done }, i) => (
                      <div key={i} className="flex items-start gap-3 relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${done ? 'bg-p-accent' : 'bg-gray-200'}`}>
                          {done ? <Check size={11} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                        </div>
                        <div className="pt-0.5">
                          <p className={`text-xs font-semibold ${done ? 'text-p-fg' : 'text-p-faint'}`}>{label}</p>
                          {time && <p className="text-[10px] text-p-faint mt-0.5">{new Date(time).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
