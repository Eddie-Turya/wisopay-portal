import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { ArrowLeft, Copy, ExternalLink, Send, CheckCircle2, Edit2, Trash2, Clock, AlertCircle, Plus, CreditCard, Phone, X, Download } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:    { label: 'Draft',    bg: 'bg-p-panel2',    text: 'text-p-ink2' },
  SENT:     { label: 'Sent',     bg: 'bg-p-info/10',    text: 'text-p-info' },
  PAID:     { label: 'Paid',     bg: 'bg-p-good/10', text: 'text-p-good' },
  OVERDUE:  { label: 'Overdue',  bg: 'bg-p-bad/10',     text: 'text-p-bad' },
  CANCELLED:{ label: 'Cancelled',bg: 'bg-p-panel2',    text: 'text-p-faint' },
}

function fmt(n: number, currency = 'TZS') { return `${currency} ${Number(n).toLocaleString()}` }

function PrintableInvoice({ inv, merchant, payments }: { inv: any; merchant: any; payments: any[] }) {
  const pd = inv.payment_details || {}
  const hasPD = pd.account_number || pd.mobile_number
  const paidAmount = Number(inv.paid_amount || 0)
  const balance = Number(inv.total_amount) - paidAmount
  const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#111', maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        <div>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>D</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{merchant.name || 'Wisopay'}</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{merchant.slug}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#111' }}>{inv.invoice_number}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Issued {new Date(inv.created_at).toLocaleDateString()}</div>
          {dueDate && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Due {dueDate}</div>}
          <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: inv.status === 'PAID' ? '#d1fae5' : inv.status === 'OVERDUE' ? '#fee2e2' : '#dbeafe', color: inv.status === 'PAID' ? '#065f46' : inv.status === 'OVERDUE' ? '#991b1b' : '#1e40af', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>{inv.status}</div>
        </div>
      </div>

      {/* Bill to */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Bill To</div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.customer_name}</div>
        {inv.customer_email && <div style={{ fontSize: 12, color: '#6b7280' }}>{inv.customer_email}</div>}
        {inv.customer_phone && <div style={{ fontSize: 12, color: '#6b7280' }}>{inv.customer_phone}</div>}
      </div>

      {/* Line items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            {['Description','Qty','Unit Price','Amount'].map((h, i) => (
              <th key={h} style={{ padding: '6px 0', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(inv.line_items || []).map((item: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 0', fontWeight: 500 }}>{item.description}</td>
              <td style={{ padding: '8px 0', textAlign: 'right', color: '#6b7280' }}>{item.quantity}</td>
              <td style={{ padding: '8px 0', textAlign: 'right', color: '#6b7280' }}>{inv.currency} {Number(item.unit_price).toLocaleString()}</td>
              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{inv.currency} {Math.round(Number(item.unit_price) * Number(item.quantity)).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', padding: '4px 0' }}>
            <span>Subtotal</span><span>{inv.currency} {Number(inv.subtotal).toLocaleString()}</span>
          </div>
          {Number(inv.tax_rate) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', padding: '4px 0' }}>
              <span>Tax ({inv.tax_rate}%)</span><span>{inv.currency} {Number(inv.tax_amount).toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, padding: '8px 0', borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
            <span>Total Due</span><span>{inv.currency} {Number(inv.total_amount).toLocaleString()}</span>
          </div>
          {paidAmount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#10b981', padding: '4px 0' }}>
                <span>Paid</span><span>- {inv.currency} {paidAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, padding: '8px 0', borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
                <span>Balance Due</span><span>{inv.currency} {balance.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment details */}
      {hasPD && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Payment Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {pd.account_number && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Bank Transfer</div>
                {pd.bank_name && <div style={{ fontSize: 12, color: '#374151' }}>{pd.bank_name}</div>}
                {pd.account_name && <div style={{ fontSize: 12, color: '#374151' }}>{pd.account_name}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{pd.account_number}</div>
              </div>
            )}
            {pd.mobile_number && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Mobile Money {pd.mobile_provider && `(${pd.mobile_provider})`}</div>
                {pd.mobile_name && <div style={{ fontSize: 12, color: '#374151' }}>{pd.mobile_name}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{pd.mobile_number}</div>
              </div>
            )}
          </div>
          {pd.instructions && <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 8 }}>{pd.instructions}</div>}
        </div>
      )}

      {/* Notes */}
      {inv.notes && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{inv.notes}</div>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Payment History</div>
          {payments.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span>{inv.currency} {Number(p.amount).toLocaleString()}{p.note ? ` — ${p.note}` : ''}</span>
              <span style={{ color: '#9ca3af' }}>{new Date(p.recorded_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
        Generated by Wisopay · wisopay.io
      </div>
    </div>
  )
}

function PartialPaymentModal({ inv, onClose, onRecorded }: { inv: any; onClose: () => void; onRecorded: (updated: any) => void }) {
  const balance = Number(inv.total_amount) - Number(inv.paid_amount || 0)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return }
    if (amt > balance) { setErr(`Amount exceeds balance of ${fmt(balance, inv.currency)}`); return }
    setSaving(true)
    setErr('')
    try {
      const updated = await api.recordInvoicePayment(inv.id, { amount: amt, note: note || undefined })
      onRecorded(updated)
    } catch (e: any) {
      setErr(e.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-p-panel rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-p-line">
          <p className="text-sm font-bold text-p-fg">Record Payment</p>
          <button onClick={onClose} className="text-p-faint hover:text-p-fg p-1 rounded-lg hover:bg-p-panel2 transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-p-info/10 rounded-lg px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs font-semibold text-p-info">Balance Due</span>
            <span className="text-sm font-black text-p-info">{fmt(balance, inv.currency)}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Amount Received ({inv.currency})</label>
            <input type="number" min="1" max={balance} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`e.g. ${Math.round(balance / 2).toLocaleString()}`}
              className="w-full px-3 py-2.5 border border-p-line rounded-lg text-sm focus:outline-none focus:border-p-fg/40 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Note (Optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. M-Pesa ref: ABCD1234"
              className="w-full px-3 py-2.5 border border-p-line rounded-lg text-sm focus:outline-none focus:border-p-fg/40" />
          </div>
          {err && (
            <div className="flex items-center gap-2 text-xs text-p-bad bg-p-bad/10 border border-p-bad/25 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {err}
            </div>
          )}
          <button onClick={submit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-p-accent hover:brightness-95 disabled:opacity-40 text-p-accent-ink py-2.5 rounded-lg text-sm font-semibold transition">
            <CheckCircle2 size={15} /> {saving ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function InvoiceDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [inv, setInv] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  const loadPayments = useCallback(() => {
    api.invoicePayments(id!).then((d: any) => setPayments(d.data || [])).catch(() => {})
  }, [id])

  useEffect(() => {
    api.getInvoice(id!)
      .then(d => { setInv(d); loadPayments() })
      .catch(() => navigate('/invoices'))
      .finally(() => setLoading(false))
  }, [id, navigate, loadPayments])

  const copyLink = () => {
    navigator.clipboard.writeText(inv.payment_link_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadPdf = () => {
    const title = document.title
    document.title = inv.invoice_number
    window.print()
    document.title = title
  }

  const send = async () => {
    setActing(true)
    try { setInv(await api.sendInvoice(id!)) }
    catch (e: any) { alert(e.message) }
    finally { setActing(false) }
  }

  const markPaid = async () => {
    setActing(true)
    try { setInv(await api.markInvoicePaid(id!)) }
    catch (e: any) { alert(e.message) }
    finally { setActing(false) }
  }

  const deleteInv = async () => {
    if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return
    setActing(true)
    try { await api.deleteInvoice(id!); navigate('/invoices') }
    catch (e: any) { alert(e.message); setActing(false) }
  }

  if (loading) return <Layout><div className="p-6"><div className="h-96 bg-p-panel2 rounded-xl animate-pulse" /></div></Layout>
  if (!inv) return null

  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT
  const merchant = JSON.parse(localStorage.getItem('portalMerchant') || '{}')
  const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const paidAmount = Number(inv.paid_amount || 0)
  const balance = Number(inv.total_amount) - paidAmount
  const pd = inv.payment_details || {}
  const hasPD = pd.account_number || pd.mobile_number
  const hasPartialPayments = paidAmount > 0 && inv.status !== 'PAID'

  return (
    <Layout>
      {showPayModal && (
        <PartialPaymentModal
          inv={inv}
          onClose={() => setShowPayModal(false)}
          onRecorded={(updated) => { setInv(updated); loadPayments(); setShowPayModal(false) }}
        />
      )}

      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="text-p-faint hover:text-p-fg transition">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-p-fg">{inv.invoice_number}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
            </div>
            <p className="text-xs text-p-faint">{inv.customer_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inv.status === 'DRAFT' && (
            <>
              <button onClick={() => navigate(`/invoices/${id}/edit`)} className="flex items-center gap-1.5 px-3 py-2 border border-p-line rounded-lg text-sm font-semibold text-p-ink2 hover:bg-p-panel2 transition">
                <Edit2 size={13} /> Edit
              </button>
              <button onClick={send} disabled={acting} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">
                <Send size={13} /> Send
              </button>
              <button onClick={deleteInv} disabled={acting} className="p-2 rounded-lg text-p-faint hover:text-p-bad hover:bg-p-bad/10 transition disabled:opacity-40">
                <Trash2 size={15} />
              </button>
            </>
          )}
          {['SENT','OVERDUE'].includes(inv.status) && (
            <>
              {inv.payment_link_url && (
                <>
                  <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 border border-p-line rounded-lg text-sm font-semibold text-p-ink2 hover:bg-p-panel2 transition">
                    {copied ? <><CheckCircle2 size={13} className="text-p-good" /> Copied!</> : <><Copy size={13} /> Copy Link</>}
                  </button>
                  <a href={inv.payment_link_url} target="_blank" rel="noreferrer"
                    className="p-2 rounded-lg border border-p-line text-p-muted hover:bg-p-panel2 transition">
                    <ExternalLink size={15} />
                  </a>
                </>
              )}
              <button onClick={() => setShowPayModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-p-line rounded-lg text-sm font-semibold text-p-ink2 hover:bg-p-panel2 transition">
                <Plus size={13} /> Record Payment
              </button>
              <button onClick={markPaid} disabled={acting}
                className="flex items-center gap-1.5 bg-p-accent hover:brightness-95 disabled:opacity-40 text-p-accent-ink px-3 py-2 rounded-lg text-sm font-semibold transition">
                <CheckCircle2 size={13} /> Mark Paid
              </button>
            </>
          )}
          <button onClick={downloadPdf} title="Download PDF"
            className="p-2 rounded-lg border border-p-line text-p-muted hover:bg-p-panel2 transition">
            <Download size={15} />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Payment link banner */}
          {inv.payment_link_url && inv.status !== 'PAID' && (
            <div className="bg-p-info/10 border border-p-info/25 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-p-info mb-0.5">Payment Link</p>
                <p className="text-xs text-p-info truncate">{inv.payment_link_url}</p>
              </div>
              <button onClick={copyLink} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          )}

          {/* Partial payment progress */}
          {hasPartialPayments && (
            <div className="bg-p-warn/10 border border-p-warn/25 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-p-warn">Partial Payment Received</p>
                <p className="text-xs text-p-warn">{fmt(paidAmount, inv.currency)} of {fmt(Number(inv.total_amount), inv.currency)}</p>
              </div>
              <div className="h-2 bg-p-warn/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, (paidAmount / Number(inv.total_amount)) * 100)}%` }} />
              </div>
              <p className="text-xs text-p-warn mt-1.5">Balance remaining: <strong>{fmt(balance, inv.currency)}</strong></p>
            </div>
          )}

          {inv.status === 'PAID' && (
            <div className="bg-p-good/10 border border-p-good/25 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-p-good flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-p-good">Invoice Paid</p>
                {inv.paid_at && <p className="text-xs text-p-good">{new Date(inv.paid_at).toLocaleString()}</p>}
              </div>
            </div>
          )}

          {inv.status === 'OVERDUE' && (
            <div className="bg-p-bad/10 border border-p-bad/25 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-p-bad flex-shrink-0" />
              <p className="text-sm font-semibold text-p-bad">This invoice is overdue — follow up with {inv.customer_name}</p>
            </div>
          )}

          {/* Invoice document */}
          <div className="bg-p-panel rounded-xl border border-p-line shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-p-line flex justify-between items-start">
              <div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
                <p className="text-sm font-bold text-p-fg">{merchant.name || 'Wisopay'}</p>
                <p className="text-xs text-p-faint">{merchant.slug}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-p-fg">{inv.invoice_number}</p>
                <p className="text-xs text-p-faint mt-1">Issued {new Date(inv.created_at).toLocaleDateString()}</p>
                {dueDate && (
                  <div className="flex items-center gap-1 justify-end mt-1">
                    <Clock size={11} className="text-p-faint" />
                    <p className="text-xs text-p-muted">Due {dueDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bill to */}
            <div className="px-6 py-4 border-b border-p-line bg-p-panel2">
              <p className="text-[10px] font-bold text-p-faint uppercase tracking-widest mb-2">Bill To</p>
              <p className="text-sm font-bold text-p-fg">{inv.customer_name}</p>
              {inv.customer_email && <p className="text-xs text-p-muted">{inv.customer_email}</p>}
              {inv.customer_phone && <p className="text-xs text-p-muted">{inv.customer_phone}</p>}
            </div>

            {/* Line items */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-p-faint uppercase tracking-wide border-b border-p-line">
                    <th className="pb-2 text-left">Description</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-p-line">
                  {(inv.line_items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 text-p-fg font-medium">{item.description}</td>
                      <td className="py-2.5 text-right text-p-muted">{item.quantity}</td>
                      <td className="py-2.5 text-right text-p-muted">{inv.currency} {Number(item.unit_price).toLocaleString()}</td>
                      <td className="py-2.5 text-right font-semibold text-p-fg">{inv.currency} {Math.round(Number(item.unit_price) * Number(item.quantity)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 pb-6">
              <div className="border-t border-p-line pt-4 space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between text-sm text-p-muted">
                  <span>Subtotal</span>
                  <span>{fmt(inv.subtotal, inv.currency)}</span>
                </div>
                {Number(inv.tax_rate) > 0 && (
                  <div className="flex justify-between text-sm text-p-muted">
                    <span>Tax ({inv.tax_rate}%)</span>
                    <span>{fmt(inv.tax_amount, inv.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-p-fg border-t border-p-line pt-2 mt-2">
                  <span>Total Due</span>
                  <span>{fmt(inv.total_amount, inv.currency)}</span>
                </div>
                {paidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-p-good">
                      <span>Paid</span>
                      <span>- {fmt(paidAmount, inv.currency)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-p-fg border-t border-p-line pt-2">
                      <span>Balance Due</span>
                      <span>{fmt(balance, inv.currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment details on invoice */}
            {hasPD && (
              <div className="px-6 pb-6">
                <div className="bg-p-good/10 border border-p-good/25 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-p-good uppercase tracking-wide mb-3">Payment Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pd.account_number && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CreditCard size={12} className="text-p-faint" />
                          <p className="text-[10px] font-bold text-p-muted uppercase tracking-wide">Bank Transfer</p>
                        </div>
                        {pd.bank_name && <p className="text-xs text-p-ink2">{pd.bank_name}</p>}
                        {pd.account_name && <p className="text-xs text-p-ink2">{pd.account_name}</p>}
                        <p className="text-xs font-mono font-bold text-p-fg">{pd.account_number}</p>
                      </div>
                    )}
                    {pd.mobile_number && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Phone size={12} className="text-p-faint" />
                          <p className="text-[10px] font-bold text-p-muted uppercase tracking-wide">Mobile Money {pd.mobile_provider && `(${pd.mobile_provider})`}</p>
                        </div>
                        {pd.mobile_name && <p className="text-xs text-p-ink2">{pd.mobile_name}</p>}
                        <p className="text-xs font-mono font-bold text-p-fg">{pd.mobile_number}</p>
                      </div>
                    )}
                  </div>
                  {pd.instructions && <p className="text-xs text-p-muted italic mt-2">{pd.instructions}</p>}
                </div>
              </div>
            )}

            {inv.notes && (
              <div className="px-6 pb-6">
                <div className="bg-p-panel2 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-p-faint uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-xs text-p-ink2 whitespace-pre-wrap">{inv.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
              <h2 className="text-sm font-bold text-p-fg mb-4">Payment History</h2>
              <div className="space-y-2">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-p-line last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-p-fg">{fmt(Number(p.amount), inv.currency)}</p>
                      {p.note && <p className="text-xs text-p-faint mt-0.5">{p.note}</p>}
                    </div>
                    <p className="text-xs text-p-faint">{new Date(p.recorded_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {['SENT','OVERDUE'].includes(inv.status) && (
                <button onClick={() => setShowPayModal(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-p-good hover:text-p-good transition">
                  <Plus size={13} /> Record Another Payment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Portalled to document.body so @media print body > * can reveal it */}
      {createPortal(
        <div id="invoice-print-root" style={{ display: 'none' }}>
          <PrintableInvoice inv={inv} merchant={merchant} payments={payments} />
        </div>,
        document.body
      )}
    </Layout>
  )
}
