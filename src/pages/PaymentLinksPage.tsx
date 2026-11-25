import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { Link2, Trash2, Copy, Check, ExternalLink, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function PaymentLinksPage() {
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.paymentLinks().then(r => setLinks(r.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const copy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this payment link?')) return
    await api.deletePaymentLink(id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  const active = links.filter(l => l.link_status === 'active')
  const expired = links.filter(l => l.link_status === 'expired')

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Payment Links</h1>
          <p className="text-xs text-p-faint hidden sm:block">{links.length} link{links.length !== 1 ? 's' : ''} created</p>
        </div>
        <button onClick={() => navigate('/collect')}
          className="flex items-center gap-2 bg-p-accent hover:brightness-95 text-p-accent-ink px-4 py-2 rounded-lg text-sm font-semibold transition min-h-[38px]">
          <Plus size={14} /> New Link
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-p-panel rounded-xl border border-p-line p-5 animate-pulse h-24" />)}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-p-panel rounded-xl border border-p-line p-14 text-center">
            <Link2 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-p-muted font-medium">No payment links yet</p>
            <p className="text-xs text-p-faint mt-1 mb-4">Create shareable links that customers use to pay you</p>
            <button onClick={() => navigate('/collect')}
              className="bg-p-accent hover:brightness-95 text-p-accent-ink px-4 py-2 rounded-lg text-sm font-semibold transition">
              Create your first link
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <p className="text-xs font-bold text-p-muted uppercase tracking-wide mb-3">Active · {active.length}</p>
                <div className="space-y-3">
                  {active.map(link => <LinkCard key={link.id} link={link} copied={copied} onCopy={copy} onDelete={remove} />)}
                </div>
              </div>
            )}
            {expired.length > 0 && (
              <div>
                <p className="text-xs font-bold text-p-muted uppercase tracking-wide mb-3">Expired · {expired.length}</p>
                <div className="space-y-3 opacity-60">
                  {expired.map(link => <LinkCard key={link.id} link={link} copied={copied} onCopy={copy} onDelete={remove} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

function LinkCard({ link, copied, onCopy, onDelete }: any) {
  return (
    <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-p-fg">{`TZS ${Number(link.amount_minor).toLocaleString()}`}</p>
            {link.test_mode && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Test link · no real money</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${link.link_status === 'active' ? 'bg-p-good/10 text-p-good' : 'bg-p-panel2 text-p-muted'}`}>
              {link.link_status.toUpperCase()}
            </span>
          </div>
          {link.description && <p className="text-xs text-p-muted mb-1.5">{link.description}</p>}
          <div className="flex items-center gap-2">
            <code className="text-[11px] text-p-faint font-mono truncate flex-1 min-w-0">{link.url}</code>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-p-faint">
            <span>Created {new Date(link.created_at).toLocaleDateString()}</span>
            {link.expires_at && <span>· Expires {new Date(link.expires_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onCopy(link.url, link.id)}
            className="p-2 text-p-faint hover:text-p-fg hover:bg-p-panel2 rounded-lg transition" title="Copy link">
            {copied === link.id ? <Check size={14} className="text-p-good" /> : <Copy size={14} />}
          </button>
          <a href={link.url} target="_blank" rel="noopener noreferrer"
            className="p-2 text-p-faint hover:text-p-fg hover:bg-p-panel2 rounded-lg transition" title="Open link">
            <ExternalLink size={14} />
          </a>
          <button onClick={() => onDelete(link.id)}
            className="p-2 text-p-faint hover:text-p-bad hover:bg-p-bad/10 rounded-lg transition" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
