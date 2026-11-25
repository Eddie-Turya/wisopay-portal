import { useState, useRef, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api'
import { useEnv } from '../context/EnvContext'
import {
  Smartphone, Link2, CheckCircle2, XCircle, Loader2,
  Copy, Check, Clock, BookUser, Wallet, ArrowRight, Zap, CreditCard, ExternalLink,
} from 'lucide-react'

type Contact = { id: string; name: string; phone: string }
type PushState = 'idle' | 'loading' | 'pending' | 'success' | 'failed'

function formatTZS(minor: number) {
  return `TZS ${minor.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`
}

// ── Shared push logic ─────────────────────────────────────────────────────────

function usePushCard(apiFn: (body: any) => Promise<any>, mode: 'live' | 'sandbox') {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [state, setState] = useState<PushState>('idle')
  const [error, setError] = useState('')
  const [successAmount, setSuccessAmount] = useState(0)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.getContacts().then((r: any) => setContacts(r.contacts || [])).catch(() => {})
  }, [])

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function send() {
    if (!phone.trim() || !amount) { setError('Phone and amount are required'); return }
    const amountMinor = Math.round(parseFloat(amount))
    if (amountMinor < 200) { setError('Minimum amount is TZS 200'); return }
    setError(''); setState('loading'); stopPoll()
    try {
      const res = await apiFn({ phone: phone.trim(), amount_minor: amountMinor, description: desc || undefined, envType: mode })
      setState('pending')
      const paymentId = res.payment_id
      let attempts = 0
      pollRef.current = setInterval(async () => {
        attempts++
        if (attempts > 60) { stopPoll(); setState('failed'); setError('Timed out — please check Transactions.'); return }
        try {
          const s = await api.collectStatus(paymentId)
          const status = (s.status || '').toUpperCase()
          if (status === 'COMPLETED') {
            stopPoll(); setSuccessAmount(amountMinor); setState('success')
          } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
            stopPoll(); setError('Payment declined or cancelled.'); setState('failed')
          }
        } catch (_) {}
      }, 3000)
    } catch (e: any) {
      setState('failed'); setError(e.message || 'Failed to send request')
    }
  }

  async function saveContact() {
    if (!saveName.trim() || !phone.trim()) return
    setSaving(true)
    try {
      const contact = await api.saveContact(saveName.trim(), phone.trim())
      setContacts(prev => [...prev.filter(c => c.phone !== contact.phone), contact].sort((a, b) => a.name.localeCompare(b.name)))
      setSaved(true)
    } catch (_) {}
    setSaving(false)
  }

  function reset() {
    stopPoll(); setState('idle'); setError(''); setSaveName(''); setSaved(false)
  }

  const matchedContact = contacts.find(c => c.phone === phone.trim())
  const alreadySaved = !!matchedContact

  return { phone, setPhone, amount, setAmount, desc, setDesc, state, error, successAmount, contacts, saveName, setSaveName, saving, saved, alreadySaved, matchedContact, send, saveContact, reset }
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold text-p-ink2">{label}</label>
        {hint && <span className="text-xs text-p-faint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function inputCls(accent: string) {
  return `w-full px-4 py-3 text-sm border border-p-line rounded-xl bg-p-panel placeholder:text-p-faint focus:outline-none focus:ring-2 ${accent} transition-all`
}

// ── Accent types ──────────────────────────────────────────────────────────────

type AccentSet = { ring: string; btn: string; pulseBg: string; spinnerText: string; gradient: string }

// ── Push form ─────────────────────────────────────────────────────────────────

function PushForm({ hook, accent, listId, buttonLabel, pushType }: {
  hook: ReturnType<typeof usePushCard>
  accent: AccentSet
  listId: string
  buttonLabel: string
  pushType: 'ussd' | 'pesa'
}) {
  const { phone, setPhone, amount, setAmount, desc, setDesc, state, error, successAmount, contacts, saveName, setSaveName, saving, saved, alreadySaved, matchedContact, send, saveContact, reset } = hook

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-6">
        <div className="w-20 h-20 rounded-full bg-p-good/10 flex items-center justify-center">
          <CheckCircle2 size={38} className="text-p-good" />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold text-p-fg tabular-nums tracking-tight">{formatTZS(successAmount)}</p>
          <p className="text-sm text-p-faint">Received from <span className="font-semibold text-p-ink2">{phone}</span></p>
        </div>

        {!alreadySaved && !saved ? (
          <div className="w-full max-w-sm bg-p-panel2 rounded-2xl p-5 text-left border border-p-line">
            <p className="text-xs font-semibold text-p-faint uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookUser size={11} /> Save customer
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Customer name"
                onKeyDown={e => e.key === 'Enter' && saveContact()}
                className="flex-1 px-3.5 py-2.5 text-sm border border-p-line rounded-xl bg-p-panel focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-p-faint transition-all"
              />
              <button
                onClick={saveContact}
                disabled={saving || !saveName.trim()}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gray-800 rounded-xl hover:bg-gray-900 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        ) : saved ? (
          <p className="text-sm font-medium text-p-good flex items-center gap-1.5">
            <Check size={15} /> Saved to contacts
          </p>
        ) : (
          <p className="text-sm text-p-faint flex items-center gap-1.5">
            <BookUser size={13} /> {matchedContact?.name}
          </p>
        )}

        <button onClick={reset} className="flex items-center gap-2 text-sm font-semibold text-p-muted hover:text-p-fg transition-colors group">
          New collection <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    )
  }

  if (state === 'pending') {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-5">
        <div className={`w-20 h-20 rounded-full ${accent.pulseBg} flex items-center justify-center`}>
          <Loader2 size={32} className={`${accent.spinnerText} animate-spin`} />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-p-fg">Waiting for payment</p>
          <p className="text-sm text-p-faint">
            {pushType === 'pesa' ? 'Push notification sent to' : 'USSD prompt sent to'}{' '}
            <span className="font-semibold text-p-ink2">{phone}</span>
          </p>
        </div>
        <p className="text-xs text-p-faint max-w-xs leading-relaxed">
          Ask the customer to approve the {pushType === 'pesa' ? 'in-app notification' : 'USSD prompt'} on their phone
        </p>
        <button onClick={reset} className="text-xs text-p-faint hover:text-p-fg underline underline-offset-2 transition-colors">Cancel</button>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-5">
        <div className="w-20 h-20 rounded-full bg-p-bad/10 flex items-center justify-center">
          <XCircle size={34} className="text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-p-fg">Payment failed</p>
          {error && <p className="text-sm text-p-bad max-w-xs">{error}</p>}
        </div>
        <button onClick={reset} className={`px-7 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-sm ${accent.btn}`}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="text-sm text-p-bad bg-p-bad/10 border border-p-bad/25 rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Field label="Customer phone">
            <div>
              <input
                type="tel"
                list={listId}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className={inputCls(accent.ring)}
              />
              {contacts.length > 0 && (
                <datalist id={listId}>
                  {contacts.map(c => <option key={c.id} value={c.phone} label={c.name} />)}
                </datalist>
              )}
              {matchedContact && (
                <p className="text-xs text-p-faint mt-1.5 flex items-center gap-1">
                  <BookUser size={10} /> {matchedContact.name}
                </p>
              )}
            </div>
          </Field>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Field label="Amount" hint="TZS">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="10,000"
              min="200"
              className={inputCls(accent.ring)}
            />
          </Field>
        </div>
      </div>

      <Field label="Description" hint="optional">
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Invoice #001, School fees, Rent…"
          className={inputCls(accent.ring)}
        />
      </Field>

      <button
        onClick={send}
        disabled={state === 'loading'}
        className={`w-full flex items-center justify-center gap-2.5 py-3.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.99] bg-gradient-to-r ${accent.gradient}`}
      >
        {state === 'loading'
          ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
          : <><Zap size={15} /> {buttonLabel}</>}
      </button>
    </div>
  )
}

// ── Link form ─────────────────────────────────────────────────────────────────

function LinkForm({ mode }: { mode: 'live' | 'sandbox' }) {
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [expires, setExpires] = useState('24')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; amount_minor: number; description?: string; expires_at?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!amount) { setError('Amount is required'); return }
    const amountMinor = Math.round(parseFloat(amount))
    if (amountMinor < 200) { setError('Minimum amount is TZS 200'); return }
    setError(''); setLoading(true)
    try {
      setResult(await api.createPaymentLink({ amount_minor: amountMinor, description: desc || undefined, expires_in_hours: parseInt(expires), envType: mode }))
    } catch (e: any) { setError(e.message || 'Failed to generate link') }
    finally { setLoading(false) }
  }

  function copy() {
    if (!result?.url) return
    navigator.clipboard.writeText(result.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
  }

  const blueRing = 'focus:ring-blue-500/20 focus:border-blue-400'

  if (result) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 bg-p-good/10 border border-p-good/25 rounded-2xl px-5 py-4">
          <CheckCircle2 size={18} className="text-p-good mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-p-good">
              {formatTZS(result.amount_minor)}{result.description ? ` · ${result.description}` : ''}
            </p>
            {result.expires_at && (
              <p className="text-xs text-p-good flex items-center gap-1 mt-0.5">
                <Clock size={10} /> Expires {new Date(result.expires_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>

        <Field label="Share this link">
          <div className="flex gap-2">
            <input
              readOnly
              value={result.url}
              onClick={e => (e.target as HTMLInputElement).select()}
              className="flex-1 min-w-0 px-4 py-3 text-xs font-mono border border-p-line rounded-xl bg-p-panel2 text-p-ink2 select-all"
            />
            <button
              onClick={copy}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-bold rounded-xl border transition-all flex-shrink-0 ${
                copied
                  ? 'bg-p-good/10 border-p-good/25 text-p-good'
                  : 'bg-p-panel border-p-line text-p-ink2 hover:bg-p-panel2 hover:border-p-line'
              }`}
            >
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        </Field>

        <button
          onClick={() => { setResult(null); setAmount(''); setDesc(''); setExpires('24') }}
          className="w-full py-3.5 text-sm font-bold text-p-info bg-p-info/10 rounded-xl hover:bg-p-info/10 transition-colors flex items-center justify-center gap-2 group"
        >
          Generate another <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div className="text-sm text-p-bad bg-p-bad/10 border border-p-bad/25 rounded-xl px-4 py-3">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Field label="Amount" hint="TZS">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10,000" min="200"
              className={inputCls(blueRing)} />
          </Field>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Expires after">
            <select value={expires} onChange={e => setExpires(e.target.value)}
              className={`${inputCls(blueRing)} text-p-ink2 bg-p-panel`}>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
            </select>
          </Field>
        </div>
      </div>

      <Field label="Description" hint="optional">
        <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="School fees · Term 2, Invoice #12…"
          className={inputCls(blueRing)} />
      </Field>

      <button onClick={generate} disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.99] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Link2 size={15} /> Generate Payment Link</>}
      </button>
    </div>
  )
}

// ── Card form ────────────────────────────────────────────────────────────────

type CardState = 'idle' | 'loading' | 'ready' | 'success' | 'failed'

function CardForm({ mode }: { mode: 'live' | 'sandbox' }) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [sendSms, setSendSms] = useState(true)
  const [state, setState] = useState<CardState>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ payment_id: string; checkout_url: string; sms_sent: boolean; amount_minor: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)
  const accent = ACCENTS.card

  useEffect(() => {
    api.collectOptions().then(o => setAvailable(o.card)).catch(() => setAvailable(false))
    return () => { if (poll.current) clearInterval(poll.current) }
  }, [])

  const stop = () => { if (poll.current) { clearInterval(poll.current); poll.current = null } }
  const reset = () => { stop(); setState('idle'); setError(''); setResult(null); setCopied(false) }

  const start = async () => {
    const amountMinor = parseInt(amount)
    if (!amountMinor || amountMinor < 200) { setError('Minimum amount is TZS 200'); return }
    if (name.trim().length < 2) { setError("Enter the customer's name"); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Enter the customer's email (the bank sends the receipt there)"); return }
    if (phone.replace(/\D/g, '').length < 9) { setError("Enter the customer's phone number"); return }
    setError(''); setState('loading')
    try {
      const r = await api.collectCard({ amount_minor: amountMinor, name: name.trim(), email: email.trim(), phone: phone.trim(), description: desc.trim() || undefined, send_sms: sendSms, envType: mode })
      setResult(r)
      setState('ready')
      stop()
      poll.current = setInterval(async () => {
        try {
          const s = await api.collectStatus(r.payment_id)
          if (s.status === 'COMPLETED') { stop(); setState('success') }
          else if (['FAILED', 'CANCELLED', 'TIMEOUT'].includes(s.status)) { stop(); setState('failed'); setError('The card payment did not go through.') }
        } catch { /* keep polling */ }
      }, 4000)
    } catch (e: any) {
      setState('idle')
      setError(e?.message || 'Could not start the card payment')
    }
  }

  if (available === null) {
    return <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-p-faint" /></div>
  }
  if (!available) {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-3">
        <div className="w-14 h-14 rounded-full bg-p-panel2 flex items-center justify-center"><CreditCard size={24} className="text-p-faint" /></div>
        <p className="text-base font-bold text-p-fg">Card payments are coming soon</p>
        <p className="text-sm text-p-faint max-w-sm">WisoPay is switching card payments on. Until then, collect with USSD Push or a payment link.</p>
      </div>
    )
  }

  if (state === 'success' && result) {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-5">
        <div className="w-20 h-20 rounded-full bg-p-good/10 flex items-center justify-center"><CheckCircle2 size={38} className="text-p-good" /></div>
        <div className="space-y-1">
          <p className="text-3xl font-bold text-p-fg tabular-nums tracking-tight">{formatTZS(result.amount_minor)}</p>
          <p className="text-sm text-p-faint">Paid by card · <span className="font-semibold text-p-ink2">{name}</span></p>
        </div>
        <button onClick={() => { reset(); setName(''); setEmail(''); setPhone(''); setAmount(''); setDesc('') }} className="flex items-center gap-2 text-sm font-semibold text-p-muted hover:text-p-fg transition-colors group">
          New collection <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-5">
        <div className="w-20 h-20 rounded-full bg-p-bad/10 flex items-center justify-center"><XCircle size={34} className="text-red-400" /></div>
        <div className="space-y-1">
          <p className="text-base font-bold text-p-fg">Payment not completed</p>
          {error && <p className="text-sm text-p-bad max-w-xs">{error}</p>}
        </div>
        <button onClick={reset} className={`px-7 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-sm bg-gradient-to-r ${accent.btn}`}>Try again</button>
      </div>
    )
  }

  if (state === 'ready' && result) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-p-faint flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-p-fg">Waiting for {name} to pay {formatTZS(result.amount_minor)}</p>
            <p className="text-xs text-p-faint">{result.sms_sent ? `We texted the card link to ${phone}. ` : ''}This page updates when the payment is done.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-p-panel2 rounded-xl px-3.5 py-3 border border-p-line">
          <span className="flex-1 truncate font-mono text-xs text-p-ink2">{result.checkout_url}</span>
          <button
            onClick={() => { void navigator.clipboard.writeText(result.checkout_url); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="flex items-center gap-1.5 text-xs font-semibold text-p-muted hover:text-p-fg px-2 py-1 rounded-lg"
          >
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href={result.checkout_url} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${accent.gradient}`}>
            <ExternalLink size={15} /> Open card page
          </a>
          <button onClick={reset} className="py-3 text-sm font-semibold text-p-muted rounded-xl border border-p-line hover:bg-p-panel2">Cancel</button>
        </div>
        <p className="text-xs text-p-faint">Customer with you? Open the card page on this device and hand it to them. Card details go only to Selcom.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div className="text-sm text-p-bad bg-p-bad/10 border border-p-bad/25 rounded-xl px-4 py-3">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Field label="Customer name"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Asha Mushi" autoComplete="off" className={inputCls(accent.ring)} /></Field>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Amount" hint="TZS"><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10,000" min="200" className={inputCls(accent.ring)} /></Field>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Customer email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="asha@example.com" autoComplete="off" className={inputCls(accent.ring)} /></Field>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Customer phone"><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" className={inputCls(accent.ring)} /></Field>
        </div>
      </div>
      <Field label="Description" hint="optional">
        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Invoice #001, Order 1043…" className={inputCls(accent.ring)} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-p-ink2 cursor-pointer select-none">
        <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
        Text the card link to the customer
      </label>
      <button
        onClick={start}
        disabled={state === 'loading'}
        className={`w-full flex items-center justify-center gap-2.5 py-3.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-[0.99] bg-gradient-to-r ${accent.gradient}`}
      >
        {state === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <><CreditCard size={15} /> Create card payment</>}
      </button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Method = 'ussd' | 'pesa' | 'card' | 'link'

const METHODS: { id: Method; label: string; sublabel: string; icon: React.ReactNode; gradient: string; desc: string }[] = [
  {
    id: 'ussd',
    label: 'USSD Push',
    sublabel: 'Any mobile wallet',
    icon: <Smartphone size={18} />,
    gradient: 'from-emerald-500 to-teal-600',
    desc: 'Send a USSD prompt directly to a customer\'s phone — works with M-Pesa, Tigo Pesa, Airtel Money and more.',
  },
  {
    id: 'pesa',
    label: 'Selcom Pesa',
    sublabel: 'In-app push',
    icon: <Wallet size={18} />,
    gradient: 'from-violet-600 to-purple-700',
    desc: 'Trigger a push notification inside the Selcom Pesa app — no USSD, faster approval experience.',
  },
  {
    id: 'card',
    label: 'Card',
    sublabel: 'Visa, Mastercard',
    icon: <CreditCard size={18} />,
    gradient: 'from-slate-700 to-slate-900',
    desc: 'Get a secure Selcom card page for the customer: open it here if they\'re with you, or text them the link.',
  },
  {
    id: 'link',
    label: 'Payment Link',
    sublabel: 'Share & collect',
    icon: <Link2 size={18} />,
    gradient: 'from-blue-500 to-indigo-600',
    desc: 'Generate a link you can share via WhatsApp, SMS or email — customer enters their own number.',
  },
]

const ACCENTS: Record<Method, AccentSet> = {
  ussd: {
    ring: 'focus:ring-emerald-500/20 focus:border-p-fg/40',
    btn: 'from-emerald-500 to-teal-600',
    pulseBg: 'bg-p-good/10',
    spinnerText: 'text-p-good',
    gradient: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
  },
  pesa: {
    ring: 'focus:ring-violet-500/20 focus:border-violet-400',
    btn: 'from-violet-600 to-purple-700',
    pulseBg: 'bg-violet-50',
    spinnerText: 'text-violet-600',
    gradient: 'from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800',
  },
  card: {
    ring: 'focus:ring-slate-500/20 focus:border-slate-400',
    btn: 'from-slate-700 to-slate-900',
    pulseBg: 'bg-p-panel2',
    spinnerText: 'text-p-ink2',
    gradient: 'from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black',
  },
  link: {
    ring: 'focus:ring-blue-500/20 focus:border-blue-400',
    btn: 'from-blue-500 to-indigo-600',
    pulseBg: 'bg-p-info/10',
    spinnerText: 'text-p-info',
    gradient: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
  },
}

export function CollectPage() {
  const { mode } = useEnv()
  const [method, setMethod] = useState<Method>('ussd')

  const ussdHook = usePushCard(api.collectUssd,       mode)
  const pesaHook = usePushCard(api.collectSelcomPesa, mode)

  const active = METHODS.find(m => m.id === method)!

  return (
    <Layout>
      <div className="px-4 sm:px-8 py-8 max-w-3xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-p-fg tracking-tight">Collect Payment</h1>
          <p className="text-sm text-p-faint mt-1">Choose how you want to request money from a customer</p>
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {METHODS.map(m => {
            const isActive = method === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                  isActive
                    ? 'border-transparent bg-p-panel shadow-lg ring-1 ring-black/5'
                    : 'border-p-line bg-p-panel hover:border-p-line hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-[14px] bg-gradient-to-r ${m.gradient}`} />
                )}

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${m.gradient} text-white shadow-sm`
                    : 'bg-p-panel2 text-p-muted'
                }`}>
                  {m.icon}
                </div>

                <div className="min-w-0 w-full">
                  <p className={`text-xs font-bold leading-tight ${isActive ? 'text-p-fg' : 'text-p-ink2'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-p-faint mt-0.5 leading-tight hidden sm:block">{m.sublabel}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Main card */}
        <div className="bg-p-panel rounded-2xl border border-p-line shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-7 pt-7 pb-6 border-b border-p-line">
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm bg-gradient-to-br ${active.gradient}`}>
                {active.icon}
              </div>
              <div>
                <h2 className="text-base font-bold text-p-fg">{active.label}</h2>
                <p className="text-sm text-p-faint mt-0.5 leading-relaxed">{active.desc}</p>
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="px-7 py-7">
            {method === 'ussd' && (
              <PushForm hook={ussdHook} accent={ACCENTS.ussd} listId="contacts-ussd" buttonLabel="Send USSD Request" pushType="ussd" />
            )}
            {method === 'pesa' && (
              <PushForm hook={pesaHook} accent={ACCENTS.pesa} listId="contacts-pesa" buttonLabel="Send Pesa Push" pushType="pesa" />
            )}
            {method === 'card' && (
              <CardForm mode={mode} />
            )}
            {method === 'link' && (
              <LinkForm mode={mode} />
            )}
          </div>
        </div>

        {/* Footer tip */}
        <p className="text-xs text-p-faint mt-4 text-center">
          {method === 'ussd' && 'Works with M-Pesa, Tigo Pesa, Airtel Money, Halopesa and more'}
          {method === 'pesa' && 'Customer must have the Selcom Pesa app installed and logged in'}
          {method === 'card' && 'Card details are entered on Selcom\'s secure page, never in WisoPay'}
          {method === 'link' && 'Links expire after the selected duration — generate a new one if needed'}
        </p>
      </div>
    </Layout>
  )
}
