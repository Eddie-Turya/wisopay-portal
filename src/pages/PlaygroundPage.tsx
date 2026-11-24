import { useState, useEffect, useRef } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import {
  Play, Copy, Check,
  FlaskConical, Clock, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react'

const BASE = 'https://wisopay.io'

const ENDPOINTS = [
  {
    group: 'Payments',
    items: [
      {
        id: 'create-payment',
        method: 'POST',
        path: '/v1/payments',
        label: 'Create Payment',
        desc: 'Initiate a new payment. In sandbox mode it completes instantly.',
        defaultBody: JSON.stringify({
          amount_minor: 5000,
          currency: 'TZS',
          merchant_reference: `test-${Date.now()}`,
          phone_number: '255712345678',
        }, null, 2),
        pathParams: [],
      },
      {
        id: 'pesa-push',
        method: 'POST',
        path: '/v1/payments/pesa-push',
        label: 'Selcom Pesa Push',
        desc: 'Send an in-app push notification to the customer\'s Selcom Pesa app — no USSD prompt.',
        defaultBody: JSON.stringify({
          amount_minor: 5000,
          currency: 'TZS',
          merchant_reference: `pesa-${Date.now()}`,
          phone_number: '255712345678',
          description: 'Test payment',
        }, null, 2),
        pathParams: [],
      },
      {
        id: 'get-payment',
        method: 'GET',
        path: '/v1/payments/:id',
        label: 'Get Payment',
        desc: 'Retrieve a payment by ID.',
        defaultBody: '',
        pathParams: ['id'],
      },
      {
        id: 'list-payments',
        method: 'GET',
        path: '/v1/payments',
        label: 'List Payments',
        desc: 'List payments with pagination.',
        defaultBody: '',
        pathParams: [],
        queryParams: [
          { key: 'limit', default: '10' },
          { key: 'offset', default: '0' },
        ],
      },
    ],
  },
]

function methodColor(method: string) {
  if (method === 'POST') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
  if (method === 'GET') return 'bg-blue-500/15 text-blue-400 border-blue-500/20'
  if (method === 'PATCH') return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  if (method === 'DELETE') return 'bg-red-500/15 text-red-400 border-red-500/20'
  return 'bg-slate-500/15 text-p-faint border-slate-500/20'
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'text-emerald-400'
  if (status >= 400 && status < 500) return 'text-amber-400'
  return 'text-red-400'
}

function StatusIcon({ status }: { status: number }) {
  if (status >= 200 && status < 300) return <CheckCircle2 size={14} className="text-emerald-400" />
  if (status >= 400 && status < 500) return <AlertCircle size={14} className="text-amber-400" />
  return <XCircle size={14} className="text-red-400" />
}

function prettyJson(obj: any) {
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}

type HistoryEntry = {
  id: string
  method: string
  path: string
  status: number
  durationMs: number
  response: any
  ts: Date
}

export function PlaygroundPage() {
  const [sandboxKey, setSandboxKey] = useState('')
  const [loadingKey, setLoadingKey] = useState(true)
  const [selectedId, setSelectedId] = useState('create-payment')
  const [body, setBody] = useState('')
  const [pathValues, setPathValues] = useState<Record<string, string>>({})
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<{ status: number; body: any; durationMs: number } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)

  const endpoint = ENDPOINTS.flatMap(g => g.items).find(e => e.id === selectedId)!

  // Load sandbox key on mount
  useEffect(() => {
    api.apiKeys()
      .then(res => {
        const sandbox = res.data.find((e: any) =>
          e.name === 'sandbox' || e.api_key_prefix?.startsWith('dpay_test_')
        )
        if (sandbox) setSandboxKey(`${sandbox.api_key_prefix}${'•'.repeat(24)}`)
      })
      .catch(() => {})
      .finally(() => setLoadingKey(false))
  }, [])

  // Reset body/params when endpoint changes
  useEffect(() => {
    setBody(endpoint.defaultBody)
    const pv: Record<string, string> = {}
    endpoint.pathParams.forEach(p => { pv[p] = '' })
    setPathValues(pv)
    const qv: Record<string, string> = {}
    ;(endpoint.queryParams || []).forEach(q => { qv[q.key] = q.default })
    setQueryValues(qv)
    setResponse(null)
  }, [selectedId])

  const buildUrl = () => {
    let path = endpoint.path
    endpoint.pathParams.forEach(p => {
      path = path.replace(`:${p}`, pathValues[p] || `:${p}`)
    })
    const qp = Object.entries(queryValues).filter(([, v]) => v)
    const qs = qp.length ? '?' + qp.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''
    return `${BASE}${path}${qs}`
  }

  const send = async () => {
    if (!sandboxKey || sandboxKey.includes('•')) {
      alert('Rotate your sandbox key first to get the full key, then paste it above.')
      return
    }
    setSending(true)
    setResponse(null)
    const url = buildUrl()
    const start = Date.now()
    try {
      const opts: RequestInit = {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${sandboxKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `playground-${Date.now()}`,
        },
      }
      if (endpoint.method === 'POST' && body.trim()) opts.body = body
      const res = await fetch(url, opts)
      const durationMs = Date.now() - start
      let data: any
      try { data = await res.json() } catch { data = await res.text() }
      const entry = { id: crypto.randomUUID(), method: endpoint.method, path: endpoint.path, status: res.status, durationMs, response: data, ts: new Date() }
      setHistory(h => [entry, ...h.slice(0, 19)])
      setResponse({ status: res.status, body: data, durationMs })
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    } catch (err: any) {
      const durationMs = Date.now() - start
      setResponse({ status: 0, body: { error: err.message }, durationMs })
    } finally {
      setSending(false)
    }
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const curlCommand = () => {
    const url = buildUrl()
    const headers = `-H "Authorization: Bearer <your_sandbox_key>" \\\n  -H "Content-Type: application/json"`
    const bodyPart = endpoint.method === 'POST' && body.trim()
      ? ` \\\n  -d '${body.replace(/\n/g, '\n       ')}'`
      : ''
    return `curl -X ${endpoint.method} "${url}" \\\n  ${headers}${bodyPart}`
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <FlaskConical size={16} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-p-fg">API Playground</h1>
            <p className="text-xs text-p-faint">Test API calls against your sandbox — real responses, no real money</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-xs text-p-faint hover:text-p-fg border border-p-line px-3 py-1.5 rounded-lg transition"
        >
          <Clock size={13} />
          History ({history.length})
        </button>
      </div>

      <div className="flex h-[calc(100vh-117px)] overflow-hidden">
        {/* Left — endpoint list */}
        <div className="w-56 flex-shrink-0 border-r border-p-line overflow-y-auto py-3">
          {ENDPOINTS.map(group => (
            <div key={group.group}>
              <p className="px-4 py-2 text-[10px] font-bold text-p-faint uppercase tracking-widest">{group.group}</p>
              {group.items.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedId(ep.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                    selectedId === ep.id
                      ? 'bg-violet-50 border-r-2 border-violet-500'
                      : 'hover:bg-p-panel2'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono ${methodColor(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className={`text-xs font-medium truncate ${selectedId === ep.id ? 'text-violet-700' : 'text-p-ink2'}`}>
                    {ep.label}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Center — request builder */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">
          {/* Sandbox key */}
          <div>
            <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">
              Sandbox API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sandboxKey}
                onChange={e => setSandboxKey(e.target.value)}
                placeholder={loadingKey ? 'Loading…' : 'Paste your dpay_test_ key'}
                className="flex-1 font-mono text-xs px-3 py-2 border border-p-line rounded-lg bg-violet-50/40 focus:outline-none focus:border-violet-400 text-p-fg"
              />
            </div>
            {sandboxKey.includes('•') && (
              <p className="text-[11px] text-p-warn mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Go to API Keys → Sandbox → Rotate Key to reveal your full key, then paste it here.
              </p>
            )}
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Endpoint</label>
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-4 py-2.5">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${methodColor(endpoint.method)}`}>
                {endpoint.method}
              </span>
              <code className="text-sm text-slate-200 font-mono">{BASE}{endpoint.path}</code>
            </div>
            <p className="text-xs text-p-faint mt-1.5">{endpoint.desc}</p>
          </div>

          {/* Path params */}
          {endpoint.pathParams.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Path Parameters</label>
              <div className="space-y-2">
                {endpoint.pathParams.map(p => (
                  <div key={p} className="flex items-center gap-3">
                    <code className="w-24 text-xs text-violet-600 font-mono flex-shrink-0">:{p}</code>
                    <input
                      type="text"
                      value={pathValues[p] || ''}
                      onChange={e => setPathValues(v => ({ ...v, [p]: e.target.value }))}
                      placeholder={`Enter ${p}`}
                      className="flex-1 text-xs px-3 py-2 border border-p-line rounded-lg focus:outline-none focus:border-violet-400 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query params */}
          {(endpoint.queryParams || []).length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Query Parameters</label>
              <div className="space-y-2">
                {(endpoint.queryParams || []).map(q => (
                  <div key={q.key} className="flex items-center gap-3">
                    <code className="w-24 text-xs text-p-info font-mono flex-shrink-0">{q.key}</code>
                    <input
                      type="text"
                      value={queryValues[q.key] || ''}
                      onChange={e => setQueryValues(v => ({ ...v, [q.key]: e.target.value }))}
                      placeholder={q.default}
                      className="flex-1 text-xs px-3 py-2 border border-p-line rounded-lg focus:outline-none focus:border-violet-400 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request body */}
          {endpoint.method === 'POST' && (
            <div>
              <label className="block text-xs font-semibold text-p-muted uppercase tracking-wide mb-1.5">Request Body</label>
              <div className="relative rounded-xl overflow-hidden border border-p-line">
                <div className="flex items-center justify-between px-3 py-1.5 bg-p-panel2 border-b border-p-line">
                  <span className="text-[11px] font-mono text-p-faint">JSON</span>
                  <button
                    onClick={() => {
                      try { setBody(JSON.stringify(JSON.parse(body), null, 2)) } catch {}
                    }}
                    className="text-[11px] text-p-faint hover:text-p-fg transition"
                  >
                    Format
                  </button>
                </div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="w-full px-4 py-3 text-xs font-mono text-p-fg bg-p-panel focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* cURL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-p-muted uppercase tracking-wide">cURL</label>
              <button
                onClick={() => copy(curlCommand(), 'curl')}
                className="flex items-center gap-1 text-[11px] text-p-faint hover:text-p-fg transition"
              >
                {copied === 'curl' ? <><Check size={11} className="text-p-good" /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
            <pre className="bg-gray-900 rounded-xl p-4 text-[11px] font-mono text-p-faint overflow-x-auto whitespace-pre">
              {curlCommand()}
            </pre>
          </div>

          {/* Send */}
          <button
            onClick={send}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition"
          >
            <Play size={15} className={sending ? 'animate-pulse' : ''} />
            {sending ? 'Sending…' : 'Send Request'}
          </button>

          {/* Response */}
          {response && (
            <div ref={responseRef}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-p-muted uppercase tracking-wide">Response</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={response.status} />
                    <span className={`text-xs font-bold font-mono ${statusColor(response.status)}`}>
                      {response.status || 'Network Error'}
                    </span>
                  </div>
                  <span className="text-xs text-p-faint">{response.durationMs}ms</span>
                  <button
                    onClick={() => copy(prettyJson(response.body), 'response')}
                    className="flex items-center gap-1 text-[11px] text-p-faint hover:text-p-fg transition"
                  >
                    {copied === 'response' ? <><Check size={11} className="text-p-good" /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-p-line">
                <pre className={`p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-80 ${
                  response.status >= 200 && response.status < 300 ? 'bg-emerald-950/30 text-emerald-200' : 'bg-red-950/20 text-red-200'
                }`}>
                  {prettyJson(response.body)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right — history panel */}
        {showHistory && (
          <div className="w-64 flex-shrink-0 border-l border-p-line overflow-y-auto py-3">
            <p className="px-4 pb-2 text-[10px] font-bold text-p-faint uppercase tracking-widest">Request History</p>
            {history.length === 0 ? (
              <p className="px-4 text-xs text-p-faint">No requests yet</p>
            ) : history.map(h => (
              <button
                key={h.id}
                onClick={() => setResponse({ status: h.status, body: h.response, durationMs: h.durationMs })}
                className="w-full text-left px-4 py-3 hover:bg-p-panel2 border-b border-p-line transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold font-mono px-1 py-0.5 rounded border ${methodColor(h.method)}`}>{h.method}</span>
                  <span className={`text-xs font-bold font-mono ${statusColor(h.status)}`}>{h.status}</span>
                  <span className="text-[10px] text-p-faint ml-auto">{h.durationMs}ms</span>
                </div>
                <p className="text-[11px] font-mono text-p-muted truncate">{h.path}</p>
                <p className="text-[10px] text-p-faint mt-0.5">{h.ts.toLocaleTimeString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
