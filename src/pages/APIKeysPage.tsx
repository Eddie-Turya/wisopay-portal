import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { Key, Copy, Check, RefreshCw, Eye, EyeOff, ShieldCheck, Zap, FlaskConical, Plus } from 'lucide-react'

export function APIKeysPage() {
  const [envs, setEnvs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<{ envId: string; key: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    api.apiKeys()
      .then(res => setEnvs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const isSandbox = (env: any) => env.name === 'sandbox'

  const rotate = async (envId: string) => {
    if (!confirm('Rotating the key will immediately invalidate the current key. Continue?')) return
    setRotating(envId)
    try {
      const res = await api.rotateKey(envId)
      setNewKey({ envId, key: res.apiKey })
      setShowKey(false)
      setEnvs(prev => prev.map(e => e.id === envId ? { ...e, api_key_prefix: res.prefix } : e))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRotating(null)
    }
  }

  const createEnv = async (name: 'live' | 'sandbox') => {
    setCreating(name)
    try {
      const res = await api.createEnv(name)
      const newEnv = { id: res.id, name: res.name, enabled: true, api_key_prefix: res.prefix, created_at: res.createdAt, updated_at: res.createdAt }
      setEnvs(prev => [...prev, newEnv])
      setNewKey({ envId: res.id, key: res.apiKey })
      setShowKey(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCreating(null)
    }
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const liveEnvs = envs.filter(e => !isSandbox(e))
  const sandboxEnvs = envs.filter(e => isSandbox(e))

  return (
    <Layout>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-base font-bold text-gray-900">API Keys</h1>
        <p className="text-xs text-gray-400">Manage credentials for live and sandbox environments</p>
      </div>

      <div className="p-4 sm:p-6 space-y-8">
        {/* New key reveal */}
        {newKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 mb-1">New API key generated — copy it now</p>
                <p className="text-xs text-amber-700 mb-3">This key won't be shown again. Store it securely.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 overflow-x-auto">
                    {showKey ? newKey.key : newKey.key.slice(0, 12) + '•'.repeat(24)}
                  </code>
                  <button onClick={() => setShowKey(!showKey)} className="text-amber-600 hover:text-amber-800 p-1.5 transition">
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => copy(newKey.key)} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex-shrink-0">
                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
          ))
        ) : (
          <>
            {/* Live section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Live</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Production</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Use your live key for real payments. Real money is collected from customers.</p>
              {liveEnvs.length === 0 ? (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-8 text-center">
                  <p className="text-sm text-gray-400 mb-4">No live API key yet</p>
                  <button
                    onClick={() => createEnv('live')}
                    disabled={creating === 'live'}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                  >
                    <Plus size={15} />
                    {creating === 'live' ? 'Generating…' : 'Generate Live Key'}
                  </button>
                </div>
              ) : liveEnvs.map(env => (
                <EnvCard key={env.id} env={env} rotating={rotating} newKeyEnvId={newKey?.envId ?? null} onRotate={rotate} />
              ))}
            </div>

            {/* Sandbox section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={14} className="text-violet-500" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Sandbox</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">Test Mode</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Use your sandbox key to test your integration. Payments are <strong>auto-completed instantly</strong> — no real money, no USSD push.
              </p>

              {/* Sandbox info box */}
              <div className="mb-4 rounded-xl border border-violet-200/60 bg-violet-50/50 p-4 text-sm">
                <p className="font-semibold text-violet-800 mb-2">How sandbox works</p>
                <ul className="space-y-1.5 text-xs text-violet-700">
                  <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 flex-shrink-0 text-violet-500" /> Every payment immediately transitions to <code className="font-mono bg-violet-100 px-1 rounded">COMPLETED</code></li>
                  <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 flex-shrink-0 text-violet-500" /> Your webhook receives a <code className="font-mono bg-violet-100 px-1 rounded">payment.completed</code> event</li>
                  <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 flex-shrink-0 text-violet-500" /> No USSD push is sent to any phone number</li>
                  <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 flex-shrink-0 text-violet-500" /> Sandbox data is separate from your live transactions</li>
                </ul>
              </div>

              {sandboxEnvs.length === 0 ? (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-8 text-center">
                  <p className="text-sm text-gray-400 mb-4">No sandbox API key yet</p>
                  <button
                    onClick={() => createEnv('sandbox')}
                    disabled={creating === 'sandbox'}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                  >
                    <Plus size={15} />
                    {creating === 'sandbox' ? 'Generating…' : 'Generate Sandbox Key'}
                  </button>
                </div>
              ) : sandboxEnvs.map(env => (
                <EnvCard key={env.id} env={env} rotating={rotating} newKeyEnvId={newKey?.envId ?? null} onRotate={rotate} sandbox />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

function EnvCard({
  env, rotating, newKeyEnvId, onRotate, sandbox = false
}: {
  env: any
  rotating: string | null
  newKeyEnvId: string | null
  onRotate: (id: string) => void
  sandbox?: boolean
}) {
  const accent = sandbox
    ? 'border-violet-200/60 bg-violet-50/20'
    : 'border-gray-100'

  return (
    <div className={`rounded-xl border shadow-sm p-6 bg-white ${accent}`}>
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            sandbox ? 'bg-violet-100' : 'bg-emerald-100'
          }`}>
            {sandbox
              ? <FlaskConical size={15} className="text-violet-600" />
              : <Zap size={15} className="text-emerald-600" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 capitalize">{env.name}</p>
            <p className="text-[11px] text-gray-400 font-mono truncate">ID: {env.id.slice(0, 8)}…</p>
          </div>
        </div>
        <button
          onClick={() => onRotate(env.id)}
          disabled={rotating === env.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition disabled:opacity-50 flex-shrink-0 min-h-[38px] ${
            sandbox
              ? 'border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300'
              : 'border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          }`}
        >
          <RefreshCw size={14} className={rotating === env.id ? 'animate-spin' : ''} />
          Rotate Key
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Current Key Prefix</p>
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${
          sandbox ? 'bg-violet-50/50 border-violet-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <Key size={14} className={sandbox ? 'text-violet-400' : 'text-gray-400'} />
          <code className="text-sm font-mono text-gray-700 flex-1">
            {env.api_key_prefix}{'•'.repeat(28)}
          </code>
        </div>
        <p className="text-xs text-gray-400 mt-2">Full key is hidden. Click "Rotate Key" to generate and reveal a new one.</p>
      </div>

      {newKeyEnvId === env.id && (
        <div className={`mt-3 pt-3 border-t text-xs flex gap-1.5 items-center font-medium ${
          sandbox ? 'border-violet-100 text-violet-600' : 'border-gray-100 text-emerald-600'
        }`}>
          <Check size={13} />
          New key generated — copy it from the banner above
        </div>
      )}
    </div>
  )
}
