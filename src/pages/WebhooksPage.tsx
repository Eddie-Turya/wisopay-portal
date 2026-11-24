import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, X, ShieldCheck, ChevronDown, ChevronUp, CheckCircle2, XCircle, RefreshCw, RotateCcw } from 'lucide-react'

const ALL_EVENTS = [
  'payment.completed',
  'payment.failed',
  'payment.pending',
  'refund.created',
  'refund.completed',
]

export function WebhooksPage() {
  const [hooks, setHooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['payment.completed', 'payment.failed'])
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, any[]>>({})
  const [logsLoading, setLogsLoading] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [rotating, setRotating] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.webhooks().then(res => setHooks(res.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggle = (event: string) => {
    setSelectedEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event])
  }

  const create = async () => {
    if (!url || selectedEvents.length === 0) return
    setCreating(true)
    try {
      const res = await api.createWebhook(url, selectedEvents)
      setNewSecret(res.secret)
      setShowForm(false)
      setUrl('')
      setSelectedEvents(['payment.completed', 'payment.failed'])
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await api.updateWebhook(id, { enabled: !enabled })
    setHooks(prev => prev.map(h => h.id === id ? { ...h, enabled: !enabled } : h))
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    await api.deleteWebhook(id)
    setHooks(prev => prev.filter(h => h.id !== id))
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rotateSecret = async (id: string) => {
    if (!confirm('Rotate the signing secret for this webhook? Your existing secret will stop working immediately.')) return
    setRotating(id)
    try {
      const res = await api.rotateWebhookSecret(id)
      setNewSecret(res.secret)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRotating(null)
    }
  }

  const retryDelivery = async (webhookId: string, deliveryId: string) => {
    setRetrying(deliveryId)
    try {
      await api.retryWebhookDelivery(deliveryId)
      // Refresh logs for this webhook
      const res = await api.webhookDeliveries(webhookId)
      setLogs(prev => ({ ...prev, [webhookId]: res.data }))
    } catch { /* ignore */ } finally { setRetrying(null) }
  }

  const toggleLogs = async (id: string) => {
    if (expandedLogs === id) { setExpandedLogs(null); return }
    setExpandedLogs(id)
    if (logs[id]) return
    setLogsLoading(id)
    try {
      const res = await api.webhookDeliveries(id)
      setLogs(prev => ({ ...prev, [id]: res.data }))
    } catch { setLogs(prev => ({ ...prev, [id]: [] })) }
    finally { setLogsLoading(null) }
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Webhooks</h1>
          <p className="text-xs text-p-faint hidden sm:block">Receive event notifications at your endpoint</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-p-accent hover:brightness-95 text-p-accent-ink px-4 py-2 rounded-lg text-sm font-semibold transition flex-shrink-0 min-h-[38px]"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add Webhook'}
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* New secret reveal */}
        {newSecret && (
          <div className="bg-p-warn/10 border border-p-warn/25 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-p-warn flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-p-warn mb-1">Webhook secret — copy it now</p>
                <p className="text-xs text-p-warn mb-3">Use this to verify webhook signatures. It won't be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-p-panel border border-p-warn/25 rounded-lg px-3 py-2 text-xs font-mono text-p-fg break-all">{newSecret}</code>
                  <button onClick={() => copy(newSecret)} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex-shrink-0">
                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-4 sm:p-6">
            <h3 className="text-sm font-bold text-p-fg mb-4">New Webhook Endpoint</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-p-ink2 uppercase tracking-wide mb-1.5">Endpoint URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourdomain.com/webhooks/deliviopay"
                  className="w-full px-4 py-2.5 border border-p-line rounded-lg text-sm focus:outline-none focus:border-p-fg/40 bg-p-panel"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-p-ink2 uppercase tracking-wide mb-2">Events to listen for</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_EVENTS.map(event => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggle(event)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                        selectedEvents.includes(event)
                          ? 'bg-p-accent text-p-accent-ink border-p-accent'
                          : 'bg-p-panel text-p-ink2 border-p-line hover:bg-p-panel2'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={create}
                disabled={creating || !url || selectedEvents.length === 0}
                className="bg-p-accent hover:brightness-95 disabled:opacity-50 text-p-accent-ink px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                {creating ? 'Creating…' : 'Create Webhook'}
              </button>
            </div>
          </div>
        )}

        {/* Webhook list */}
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-p-panel rounded-xl border border-p-line p-6 animate-pulse">
              <div className="h-4 bg-p-panel2 rounded w-64 mb-3" />
              <div className="h-3 bg-p-panel2 rounded w-48" />
            </div>
          ))
        ) : hooks.length === 0 ? (
          <div className="bg-p-panel rounded-xl border border-p-line p-14 text-center">
            <Webhook size={32} className="text-p-faint mx-auto mb-3" />
            <p className="text-sm text-p-muted font-medium">No webhooks yet</p>
            <p className="text-xs text-p-faint mt-1">Add an endpoint to receive payment event notifications</p>
          </div>
        ) : (
          hooks.map(hook => (
            <div key={hook.id} className={`bg-p-panel rounded-xl border shadow-sm overflow-hidden ${hook.enabled ? 'border-p-line' : 'border-p-line opacity-70'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hook.enabled ? 'bg-p-accent' : 'bg-gray-300'}`} />
                      <code className="text-sm font-mono text-p-fg break-all line-clamp-2">{hook.url}</code>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hook.events.map((e: string) => (
                        <span key={e} className="px-2 py-0.5 bg-p-panel2 rounded text-[10px] font-mono text-p-ink2">{e}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <ShieldCheck size={11} className="text-p-faint flex-shrink-0" />
                      <span className="text-[11px] font-mono text-p-faint">Signing secret: {hook.secret_prefix}</span>
                      <button
                        onClick={() => rotateSecret(hook.id)}
                        disabled={rotating === hook.id}
                        className="ml-1 flex items-center gap-1 text-[10px] text-p-faint hover:text-p-warn transition font-medium disabled:opacity-50"
                        title="Rotate signing secret"
                      >
                        <RefreshCw size={10} className={rotating === hook.id ? 'animate-spin' : ''} />
                        Rotate
                      </button>
                    </div>
                    <p className="text-xs text-p-faint mt-1">Added {new Date(hook.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleEnabled(hook.id, hook.enabled)}
                      className="text-p-faint hover:text-p-fg transition"
                      title={hook.enabled ? 'Disable' : 'Enable'}
                    >
                      {hook.enabled ? <ToggleRight size={22} className="text-p-good" /> : <ToggleLeft size={22} />}
                    </button>
                    <button
                      onClick={() => remove(hook.id)}
                      className="text-p-faint hover:text-p-bad transition p-1"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => toggleLogs(hook.id)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-p-faint hover:text-p-fg transition font-medium"
                >
                  {expandedLogs === hook.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  Delivery logs
                </button>
              </div>

              {expandedLogs === hook.id && (
                <div className="border-t border-p-line bg-p-panel2">
                  {logsLoading === hook.id ? (
                    <div className="p-4 space-y-2">
                      {[1,2,3].map(i => <div key={i} className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />)}
                    </div>
                  ) : !logs[hook.id]?.length ? (
                    <p className="text-xs text-p-faint text-center py-6">No delivery attempts yet</p>
                  ) : (
                    <div className="divide-y divide-p-line">
                      {logs[hook.id].map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                          {log.success
                            ? <CheckCircle2 size={14} className="text-p-good flex-shrink-0" />
                            : <XCircle size={14} className="text-red-400 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold text-p-ink2">{log.event_type}</span>
                              {log.status_code && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.success ? 'bg-p-good/10 text-p-good' : 'bg-p-bad/10 text-p-bad'}`}>
                                  {log.status_code}
                                </span>
                              )}
                              {log.duration_ms && <span className="text-[10px] text-p-faint">{log.duration_ms}ms</span>}
                            </div>
                            {log.error && <p className="text-[10px] text-red-400 truncate mt-0.5">{log.error}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!log.success && (
                              <button
                                onClick={() => retryDelivery(hook.id, log.id)}
                                disabled={retrying === log.id}
                                className="flex items-center gap-1 text-[10px] font-semibold text-p-faint hover:text-p-good transition disabled:opacity-50"
                                title="Retry this delivery"
                              >
                                <RotateCcw size={11} className={retrying === log.id ? 'animate-spin' : ''} />
                                Retry
                              </button>
                            )}
                            <p className="text-[10px] text-p-faint">
                              {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}
