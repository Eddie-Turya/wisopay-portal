import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { Shield, RefreshCw } from 'lucide-react'

const ACTION_META: Record<string, { cls: string; label: string }> = {
  REFUND:               { cls: 'bg-violet-50 text-violet-700',  label: 'Refund' },
  KEY_ROTATE:           { cls: 'bg-p-warn/10 text-p-warn',    label: 'Key Rotated' },
  WEBHOOK_CREATE:       { cls: 'bg-p-good/10 text-p-good',label: 'Webhook Added' },
  WEBHOOK_UPDATE:       { cls: 'bg-p-info/10 text-p-info',      label: 'Webhook Updated' },
  WEBHOOK_DELETE:       { cls: 'bg-p-bad/10 text-p-bad',        label: 'Webhook Deleted' },
  WEBHOOK_SECRET_ROTATE:{ cls: 'bg-p-warn/10 text-p-warn',    label: 'Webhook Secret' },
  TEAM_INVITE:          { cls: 'bg-teal-50 text-teal-700',      label: 'Member Invited' },
  TEAM_REMOVE:          { cls: 'bg-p-bad/10 text-p-bad',        label: 'Member Removed' },
  PROFILE_UPDATE:       { cls: 'bg-p-panel2 text-p-ink2',     label: 'Profile Updated' },
  'invoice.created':    { cls: 'bg-p-info/10 text-p-info',      label: 'Invoice Created' },
  'invoice.sent':       { cls: 'bg-p-info/10 text-p-info',        label: 'Invoice Sent' },
  'invoice.marked_paid':{ cls: 'bg-p-good/10 text-p-good',label: 'Invoice Paid' },
}

function ActionBadge({ action }: { action: string }) {
  const m = ACTION_META[action] || { cls: 'bg-p-panel2 text-p-ink2', label: action }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${m.cls}`}>{m.label}</span>
}

function formatDetails(action: string, details: any): string {
  if (!details || typeof details !== 'object') return '—'
  const d = details
  switch (action) {
    case 'REFUND':        return `Payment · ${d.reason || 'no reason'}`
    case 'KEY_ROTATE':    return `Env: ${d.envName || d.envId}`
    case 'WEBHOOK_CREATE':return d.url ? `${d.url}` : '—'
    case 'WEBHOOK_UPDATE':return `ID: ${String(d.webhookId || '').slice(0,8)}…`
    case 'WEBHOOK_DELETE':return `ID: ${String(d.webhookId || '').slice(0,8)}…`
    case 'WEBHOOK_SECRET_ROTATE': return `ID: ${String(d.webhookId || '').slice(0,8)}…`
    case 'TEAM_INVITE':   return `${d.invitedEmail} · ${d.role}`
    case 'TEAM_REMOVE':   return `User removed`
    case 'PROFILE_UPDATE':return Array.isArray(d.fields) ? d.fields.join(', ') : '—'
    case 'invoice.created': return `#${d.invoice_number}`
    case 'invoice.sent':    return `#${d.invoice_number}`
    case 'invoice.marked_paid': return `#${d.invoice_number}`
    default: return JSON.stringify(d).slice(0, 60)
  }
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.auditLogs(100)
      .then((r: any) => setLogs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-p-fg flex items-center gap-2">
            <Shield size={16} className="text-p-good" /> Audit Log
          </h1>
          <p className="text-xs text-p-faint">Security and administrative actions</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-p-muted hover:text-p-fg px-3 py-2 rounded-lg border border-p-line hover:bg-p-panel2 transition min-h-[38px]">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-p-panel rounded-xl border border-p-line p-4 animate-pulse h-16" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-p-panel rounded-xl border border-p-line p-14 text-center">
            <Shield size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-p-muted font-medium">No audit events yet</p>
            <p className="text-xs text-p-faint mt-1">Administrative actions will appear here</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-p-panel rounded-xl border border-p-line shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-p-panel2 border-b border-p-line">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Details</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">IP</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-p-muted uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-p-line">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-p-panel2 transition-colors">
                      <td className="px-5 py-3.5"><ActionBadge action={log.action} /></td>
                      <td className="px-5 py-3.5 text-xs text-p-ink2">{log.user_email}</td>
                      <td className="px-5 py-3.5 text-xs text-p-muted max-w-xs truncate">
                        {formatDetails(log.action, log.details)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-p-faint">{log.ip || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-p-faint">
                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="bg-p-panel rounded-xl border border-p-line shadow-sm p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <ActionBadge action={log.action} />
                    <span className="text-[10px] text-p-faint">
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-p-ink2">{log.user_email}</p>
                  {log.ip && <p className="text-[10px] font-mono text-p-faint mt-0.5">IP: {log.ip}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
