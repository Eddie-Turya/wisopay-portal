import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { Plus, Search, FileText, Copy, ExternalLink, Trash2, Send, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:    { label: 'Draft',    color: 'bg-p-panel2 text-p-ink2',    icon: FileText },
  SENT:     { label: 'Sent',     color: 'bg-p-info/10 text-p-info',    icon: Send },
  PAID:     { label: 'Paid',     color: 'bg-p-good/10 text-p-good', icon: CheckCircle2 },
  OVERDUE:  { label: 'Overdue',  color: 'bg-p-bad/10 text-p-bad',      icon: AlertCircle },
  CANCELLED:{ label: 'Cancelled',color: 'bg-p-panel2 text-p-faint',    icon: XCircle },
}

function fmt(amount: number, currency = 'TZS') {
  return `${currency} ${Number(amount / 1).toLocaleString()}`
}

function daysUntil(dateStr: string) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  return `Due in ${diff}d`
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.invoices({ status: filter === 'ALL' ? undefined : filter, search: search || undefined })
      .then((d: any) => setInvoices(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, search])

  useEffect(() => { load() }, [load])

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const sendInvoice = async (id: string) => {
    setActing(id)
    try {
      const updated = await api.sendInvoice(id)
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv))
    } catch (e: any) { alert(e.message) }
    finally { setActing(null) }
  }

  const markPaid = async (id: string) => {
    setActing(id)
    try {
      const updated = await api.markInvoicePaid(id)
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv))
    } catch (e: any) { alert(e.message) }
    finally { setActing(null) }
  }

  const deleteInvoice = async (id: string, num: string) => {
    if (!confirm(`Delete invoice ${num}?`)) return
    setActing(id)
    try {
      await api.deleteInvoice(id)
      setInvoices(prev => prev.filter(inv => inv.id !== id))
    } catch (e: any) { alert(e.message) }
    finally { setActing(null) }
  }

  const totals = {
    outstanding: invoices.filter(i => ['SENT','OVERDUE'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount), 0),
    paid: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.total_amount), 0),
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Invoices</h1>
          <p className="text-xs text-p-faint hidden sm:block">Create, send, and track customer invoices</p>
        </div>
        <button
          onClick={() => navigate('/invoices/new')}
          className="flex items-center gap-1.5 bg-p-accent hover:brightness-95 text-p-accent-ink text-sm font-semibold px-3 py-2 rounded-lg transition"
        >
          <Plus size={15} /> New Invoice
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Outstanding', value: fmt(totals.outstanding), color: 'text-p-info' },
            { label: 'Collected',   value: fmt(totals.paid),        color: 'text-p-good' },
            { label: 'Overdue',     value: `${totals.overdue} invoice${totals.overdue !== 1 ? 's' : ''}`, color: totals.overdue ? 'text-p-bad' : 'text-p-faint' },
          ].map(card => (
            <div key={card.label} className="bg-p-panel rounded-xl border border-p-line shadow-sm p-4">
              <p className="text-[11px] font-semibold text-p-faint uppercase tracking-wide">{card.label}</p>
              <p className={`text-sm font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-faint" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer or invoice number…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-p-line rounded-lg focus:outline-none focus:border-p-fg/40"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['ALL','DRAFT','SENT','PAID','OVERDUE'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${filter === s ? 'bg-gray-900 text-white border-gray-900' : 'border-p-line text-p-muted hover:bg-p-panel2'}`}>
                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
            <button onClick={load} className="px-2 py-1.5 rounded-lg border border-p-line text-p-faint hover:bg-p-panel2 transition">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-p-panel rounded-xl border border-p-line shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-12 bg-p-panel2 rounded-lg animate-pulse" />)}</div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-p-panel2 rounded-2xl mb-4"><FileText size={28} className="text-p-faint" /></div>
              <p className="text-sm font-semibold text-p-ink2">No invoices yet</p>
              <p className="text-xs text-p-faint mt-1">Create your first invoice to get paid faster</p>
              <button onClick={() => navigate('/invoices/new')}
                className="mt-4 flex items-center gap-1.5 bg-p-accent hover:brightness-95 text-p-accent-ink text-sm font-semibold px-4 py-2 rounded-lg transition">
                <Plus size={14} /> Create Invoice
              </button>
            </div>
          ) : (
            <div className="divide-y divide-p-line">
              {invoices.map(inv => {
                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT
                const StatusIcon = cfg.icon
                const due = inv.due_date ? daysUntil(inv.due_date.split('T')[0]) : null
                const isActing = acting === inv.id
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-p-panel2 transition group">
                    <div className="w-8 h-8 rounded-lg bg-p-panel2 flex items-center justify-center flex-shrink-0">
                      <StatusIcon size={15} className="text-p-muted" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-p-fg">{inv.invoice_number}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        {due && inv.status === 'SENT' && (
                          <span className="text-[10px] text-p-warn font-medium">{due}</span>
                        )}
                        {inv.status === 'OVERDUE' && (
                          <span className="text-[10px] text-p-bad font-medium">{due}</span>
                        )}
                      </div>
                      <p className="text-xs text-p-muted truncate">{inv.customer_name}{inv.customer_email ? ` · ${inv.customer_email}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-p-fg">{fmt(inv.total_amount, inv.currency)}</p>
                      <p className="text-[10px] text-p-faint">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      {inv.status === 'DRAFT' && (
                        <button title="Send invoice" disabled={isActing}
                          onClick={() => sendInvoice(inv.id)}
                          className="p-1.5 rounded-lg hover:bg-p-info/10 text-blue-500 transition disabled:opacity-40">
                          <Send size={14} />
                        </button>
                      )}
                      {['SENT','OVERDUE'].includes(inv.status) && inv.payment_link_url && (
                        <>
                          <button title={copied === inv.id ? 'Copied!' : 'Copy payment link'} onClick={() => copyLink(inv.payment_link_url, inv.id)}
                            className="p-1.5 rounded-lg hover:bg-p-panel2 text-p-muted transition">
                            {copied === inv.id ? <CheckCircle2 size={14} className="text-p-good" /> : <Copy size={14} />}
                          </button>
                          <a href={inv.payment_link_url} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-p-panel2 text-p-muted transition">
                            <ExternalLink size={14} />
                          </a>
                          <button title="Mark as paid" disabled={isActing}
                            onClick={() => markPaid(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-p-good/10 text-p-good transition disabled:opacity-40">
                            <CheckCircle2 size={14} />
                          </button>
                        </>
                      )}
                      {inv.status === 'DRAFT' && (
                        <button title="Delete" disabled={isActing}
                          onClick={() => deleteInvoice(inv.id, inv.invoice_number)}
                          className="p-1.5 rounded-lg hover:bg-p-bad/10 text-red-400 transition disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
