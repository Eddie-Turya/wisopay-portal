// The ZawaPay views call ZawaPay's dashboard API (/dashboard/*, /auth/*). This file keeps that interface and
// answers each call from WisoPay's portal API (/admin/portal/*), translating the shapes both ways.
// Paths WisoPay doesn't support yet answer with empty data, or with a clear error for actions.

const BASE = '/admin/portal'
const TOKEN = 'portalToken'

type Session = { accessToken: string; refreshToken: string }

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getSession(): Session | null {
  try {
    const t = localStorage.getItem(TOKEN)
    return t ? { accessToken: t, refreshToken: '' } : null
  } catch {
    return null
  }
}
export function setSession(s: Partial<Session> | null) {
  try {
    if (s?.accessToken) localStorage.setItem(TOKEN, s.accessToken)
    else {
      localStorage.removeItem(TOKEN)
      localStorage.removeItem('portalMerchant')
      localStorage.removeItem('portalUser')
    }
  } catch { /* storage blocked */ }
  window.dispatchEvent(new Event('zp-session'))
}

type Opts = { method?: string; body?: unknown; env?: 'sandbox' | 'live'; idempotent?: boolean; auth?: boolean; raw?: boolean }

/* ---------- WisoPay transport ---------- */

async function wiso<T = any>(method: string, path: string, body?: unknown, form?: FormData): Promise<T> {
  const headers: Record<string, string> = {}
  const s = getSession()
  if (s) headers.Authorization = `Bearer ${s.accessToken}`
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json'
  let r: Response
  try {
    r = await fetch(`${BASE}${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach WisoPay. Check your connection and try again.')
  }
  if (r.status === 204) return undefined as T
  const json = await r.json().catch(() => null)
  if (!r.ok) {
    const msg = typeof json?.error === 'string' ? json.error : json?.error?.message ?? `Request failed (${r.status})`
    if (r.status === 401 && path !== '/auth/login' && path !== '/auth/2fa/verify') setSession(null)
    throw new ApiError(r.status, 'HTTP', msg)
  }
  return json as T
}

// WisoPay withdrawal status -> the settlement statuses the ZawaPay views understand
const WD_STATUS: Record<string, string> = { PENDING: 'PENDING_APPROVAL', APPROVED: 'APPROVED', PAID: 'SENT', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' }

const soon = (what: string) => new ApiError(501, 'NOT_AVAILABLE', `${what} isn’t available on WisoPay yet.`)

/* ---------- Shape mapping ---------- */

// WisoPay payment status -> ZawaPay transaction status
const TX_STATUS: Record<string, string> = {
  COMPLETED: 'SUCCESS', FAILED: 'FAILED', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED', REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED', PENDING: 'PENDING', PROCESSING: 'PROCESSING', INITIATED: 'PENDING', CREATED: 'PENDING',
}

// Tanzanian prefixes -> network display name (same names as the coverage data)
export function networkOf(phone?: string | null): string {
  const d = String(phone ?? '').replace(/\D/g, '')
  const local = d.startsWith('255') ? d.slice(3) : d.startsWith('0') ? d.slice(1) : d
  const p = local.slice(0, 2)
  if (!local) return ''
  if (['74', '75', '76'].includes(p)) return 'M-Pesa'
  if (['68', '69', '78'].includes(p)) return 'Airtel Money'
  if (['65', '67', '71', '77'].includes(p)) return 'Mixx by Yas'
  if (['61', '62'].includes(p)) return 'HaloPesa'
  return ''
}

function toTx(p: any, env: 'sandbox' | 'live') {
  const phone = String(p.payerPhone ?? p.payer_phone ?? '').replace(/\D/g, '')
  return {
    id: p.id,
    object: 'deposit' as const,
    environment: env,
    status: TX_STATUS[String(p.status).toUpperCase()] ?? String(p.status).toUpperCase(),
    amount: String(p.amount ?? 0),
    fee: String(p.fee_minor ?? 0),
    currency: p.currency || 'TZS',
    network: networkOf(phone) || undefined,
    country: 'TZ',
    phoneNumber: phone,
    merchantReference: p.reference ?? null,
    metadata: {} as Record<string, string>,
    failure: null,
    createdAt: p.createdAt,
    completedAt: p.updatedAt ?? null,
  }
}

const KYC_TYPE: Record<string, string> = {
  CERTIFICATE_OF_INCORPORATION: 'BUSINESS_REG', TAX_CERTIFICATE: 'BUSINESS_REG', DIRECTOR_ID: 'IDENTITY', NATIONAL_ID: 'IDENTITY', PROOF_OF_ADDRESS: 'IDENTITY',
}
const KYC_BACK: Record<string, string> = { IDENTITY: 'NATIONAL_ID', BUSINESS_REG: 'TAX_CERTIFICATE', BANK_ACCOUNT: 'BANK_ACCOUNT', MOBILE_MONEY: 'MOBILE_MONEY' }

async function me() {
  const [m, team] = await Promise.all([wiso('GET', '/me'), wiso('GET', '/team').catch(() => ({ data: [] }))])
  const st = String(m.merchant?.status ?? '').toLowerCase()
  const own = (team.data ?? []).find((u: any) => u.id === m.user?.id)
  const role = String(own?.role ?? 'admin').toUpperCase()
  return {
    announcement: null,
    user: { id: m.user?.id, email: m.user?.email ?? '', name: m.user?.name || m.user?.email || '', role: role === 'ADMIN' ? 'OWNER' : role, mfaEnabled: !!m.user?.totp_enabled },
    merchant: {
      id: m.merchant?.id, legalName: m.merchant?.name ?? '', tradingName: m.merchant?.name ?? null, country: 'TZ', industry: null, website: null,
      plan: 'BUSINESS' as const,
      status: st === 'live_enabled' ? 'ACTIVE' : st === 'suspended' ? 'SUSPENDED' : st === 'rejected' ? 'REJECTED' : 'PENDING_VERIFICATION',
      liveEnabled: st === 'live_enabled',
      createdAt: m.merchant?.created_at,
      slug: m.merchant?.slug,
      shortId: m.merchant?.short_id ?? null,
    },
  }
}

async function kyc() {
  const r = await wiso('GET', '/kyc').catch(() => ({ documents: [] }))
  // WisoPay returns { documents: { IDENTITY: {...}, BUSINESS_REG: {...} } }; accept a list too
  const raw = r.documents ?? []
  const docs: any[] = Array.isArray(raw) ? raw : Object.entries(raw).map(([type, d]: [string, any]) => ({ document_type: type, ...d }))
  const any = (s: string) => docs.some(d => String(d.status).toUpperCase() === s)
  const status = !docs.length ? 'NOT_SUBMITTED' : any('REJECTED') ? 'CHANGES_REQUESTED' : docs.every(d => String(d.status).toUpperCase() === 'APPROVED') ? 'APPROVED' : 'SUBMITTED'
  const times = (k: string) => docs.map(d => d[k]).filter(Boolean).sort()
  return {
    status,
    reason: docs.find(d => String(d.status).toUpperCase() === 'REJECTED')?.notes ?? null,
    submittedAt: times('uploaded_at')[0],
    decidedAt: times('reviewed_at').slice(-1)[0] ?? null,
    documents: docs.map(d => ({ type: KYC_BACK[String(d.document_type).toUpperCase()] ?? d.document_type, filename: d.document_type, size: 0, status: d.status })),
    merchantStatus: '',
  }
}

function b64ToFile(b64: string, name: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const ext = name.split('.').pop()?.toLowerCase()
  return new File([bytes], name, { type: ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg' })
}

function storeLogin(r: any) {
  if (r.merchant) localStorage.setItem('portalMerchant', JSON.stringify(r.merchant))
  if (r.user) localStorage.setItem('portalUser', JSON.stringify(r.user))
  window.dispatchEvent(new Event('portalLogin'))
}

/* ---------- Router ---------- */

export async function api<T = unknown>(path: string, o: Opts = {}): Promise<T> {
  const method = (o.method ?? (o.body !== undefined ? 'POST' : 'GET')).toUpperCase()
  const [p, qs] = path.split('?')
  const q = new URLSearchParams(qs ?? '')
  const b = (o.body ?? {}) as any
  const env = o.env ?? 'sandbox'
  const seg = p.split('/').filter(Boolean) // e.g. ['dashboard', 'transactions', 'id', 'refund']
  const R = (x: unknown) => x as T

  /* auth */
  if (p === '/auth/login') {
    const r = await wiso('POST', '/auth/login', { email: b.email, password: b.password })
    if (r.requires_2fa) return R({ mfaRequired: true, mfaToken: r.partial_token, accessToken: '', refreshToken: '' })
    storeLogin(r)
    return R({ mfaRequired: false, accessToken: r.token, refreshToken: '' })
  }
  if (p === '/auth/mfa/verify') {
    const r = await wiso('POST', '/auth/2fa/verify', { partial_token: b.mfaToken, code: b.code })
    storeLogin(r)
    return R({ accessToken: r.token, refreshToken: '' })
  }
  if (p === '/auth/logout') return R(undefined)
  if (p === '/auth/mfa/setup') {
    const r = await wiso('POST', '/auth/2fa/setup', {})
    return R({ secret: r.secret, otpauthUri: r.otpauth_url, qrCode: r.qr_code })
  }
  if (p === '/auth/mfa/enable') return R(await wiso('POST', '/auth/2fa/enable', { code: b.code }))

  if (seg[0] !== 'dashboard') throw soon('This action')
  const [, res, id, sub] = seg

  switch (res) {
    case 'me':
      return R(await me())

    case 'networks':
      return R({ data: [] })

    case 'transactions': {
      if (!id) {
        if (q.get('type') === 'PAYOUT') return R({ data: [], total: 0 })
        const limit = Number(q.get('limit') ?? 100)
        const page = Number(q.get('page') ?? 1)
        const r = await wiso('GET', `/payments?limit=${limit}&offset=${(page - 1) * limit}&envType=${env}`)
        return R({ data: (r.data ?? []).map((x: any) => toTx(x, env)), total: r.total ?? 0 })
      }
      if (sub === 'refund') return R(await wiso('POST', `/payments/${id}/refund`, { reason: b.reason }))
      const d = await wiso('GET', `/payments/${id}`)
      const tx = toTx(d, env)
      const events = [{ to: 'CREATED', at: d.createdAt }]
      if (['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(tx.status)) events.push({ to: tx.status, at: d.updatedAt ?? d.createdAt })
      for (const r of d.refunds ?? []) events.push({ to: 'REFUNDED', at: r.created_at })
      return R({ ...tx, events, failure: null })
    }

    case 'balances': {
      if (env !== 'live') return R({ data: [{ currency: 'TZS', available: '0', reserved: '0' }] })
      // A failing balance call shouldn't take the whole portal down
      const s = await wiso('GET', '/settlements').catch(() => ({ payableBalance: 0, heldForWithdrawals: 0 }))
      return R({ data: [{ currency: 'TZS', available: String(Math.max(0, s.payableBalance ?? 0)), reserved: String(s.heldForWithdrawals ?? 0) }] })
    }

    case 'settlements': {
      const s = env === 'live' ? await wiso('GET', '/settlements').catch(() => ({ recentPayouts: [] })) : { recentPayouts: [] }
      // Withdrawals, in the shape the ZawaPay settlements view reads
      return R({
        data: (s.recentPayouts ?? []).map((x: any) => ({
          id: x.id, currency: x.currency ?? 'TZS', amount: String(x.amount ?? 0),
          destination: x.destination ? `${x.destination.label} ${x.destination.account}` : '—',
          status: WD_STATUS[x.status] ?? x.status, createdAt: x.createdAt,
          reference: x.reference ?? null, note: x.note ?? null, adminNote: x.adminNote ?? null,
          fee: Number(x.fee ?? 0), payout: Number(x.payout ?? x.amount ?? 0),
        })),
      })
    }

    case 'notifications': {
      if (id === 'read-all') return R(await wiso('POST', '/notifications/read-all', {}))
      if (id && sub === 'read') return R(await wiso('POST', `/notifications/${id}/read`, {}))
      return R(await wiso('GET', '/notifications'))
    }

    case 'kyc': {
      if (method === 'GET') return R(await kyc())
      for (const d of b.documents ?? []) {
        const form = new FormData()
        form.append('file', b64ToFile(d.contentBase64, d.filename))
        await wiso('POST', `/kyc/upload/${KYC_TYPE[d.type] ?? 'IDENTITY'}`, undefined, form)
      }
      return R({ ok: true })
    }

    case 'payout-accounts': {
      if (!id && method === 'GET') {
        const r = await wiso('GET', '/payout-accounts')
        return R({ data: (r.data ?? []).map((a: any) => ({ id: a.id, kind: a.kind, label: a.label, isDefault: a.isDefault, details: { masked: a.accountNumber, holderName: a.holderName } })) })
      }
      if (!id) return R(await wiso('POST', '/payout-accounts', { kind: b.kind, label: b.label, account_number: b.accountNumber, holder_name: b.holderName }))
      if (sub === 'default') return R(await wiso('POST', `/payout-accounts/${id}/default`, {}))
      if (method === 'DELETE') return R(await wiso('DELETE', `/payout-accounts/${id}`))
      throw soon('This payout account action')
    }

    case 'statements':
      return R(await wiso('GET', id ? `/statements/${id}` : '/statements'))

    case 'withdrawal-terms': {
      const s = await wiso('GET', '/settlements').catch(() => ({}))
      return R({ fee: Number(s.withdrawalFee ?? 1500), min: Number(s.minWithdrawal ?? 10000) })
    }

    case 'withdrawals': {
      if (!id && method === 'GET') return R(await wiso('GET', '/withdrawals'))
      if (!id) return R(await wiso('POST', '/withdrawals', { amount_minor: b.amount, payout_account_id: b.payoutAccountId, note: b.note }))
      if (sub === 'cancel') return R(await wiso('POST', `/withdrawals/${id}/cancel`, {}))
      throw soon('This withdrawal action')
    }

    case 'payouts':
      throw soon('Sending payouts')

    case 'test-payment':
      throw soon('Sending a test payment from here')

    case 'setup-fee':
      return R({ data: null })

    case 'api-keys': {
      if (!id && method === 'GET') {
        const r = await wiso('GET', '/api-keys')
        return R({
          data: (r.data ?? []).map((k: any) => {
            const live = k.name === 'production' || String(k.api_key_prefix ?? '').startsWith('dpay_live')
            return { id: k.id, name: live ? 'Live key' : 'Sandbox key', keyId: k.api_key_prefix ?? '', environment: live ? 'live' : 'sandbox', last4: '', scopes: [], revokedAt: k.enabled === false ? k.updated_at : null, lastUsedAt: null, createdAt: k.created_at }
          }),
        })
      }
      if (!id) {
        const r = await wiso('POST', '/api-keys', { name: b.environment === 'live' ? 'live' : 'sandbox' })
        return R({ secret: r.apiKey })
      }
      if (sub === 'rotate') {
        const r = await wiso('POST', `/api-keys/${id}/rotate`)
        return R({ secret: r.apiKey })
      }
      throw soon('Revoking a key')
    }

    case 'webhooks': {
      if (id === 'deliveries') {
        const hooks = (await wiso('GET', '/webhooks')).data ?? []
        const logs = await Promise.all(hooks.map((h: any) => wiso('GET', `/webhooks/${h.id}/logs`).then(r => (r.data ?? []).map((l: any) => ({ status: l.success ? 'DELIVERED' : 'FAILED', url: h.url }))).catch(() => [])))
        return R({ data: logs.flat() })
      }
      if (!id && method === 'GET') {
        const r = await wiso('GET', '/webhooks')
        return R({ data: (r.data ?? []).map((h: any) => ({ id: h.id, url: h.url, events: h.events ?? [], enabled: h.enabled !== false })) })
      }
      if (!id) {
        const r = await wiso('POST', '/webhooks', { url: b.url, events: b.events })
        return R({ secret: r.secret })
      }
      if (method === 'DELETE') return R(await wiso('DELETE', `/webhooks/${id}`))
      throw soon('This webhook action')
    }

    case 'api-logs':
      return R({ data: [] })

    case 'users': {
      if (!id && method === 'GET') {
        const r = await wiso('GET', '/team')
        return R({ data: (r.data ?? []).map((u: any) => ({ id: u.id, email: u.email, name: u.name || u.email, role: String(u.role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'VIEWER', active: true, mfaEnabled: false, lastLoginAt: null })), invitations: [] })
      }
      if (id === 'invite') {
        const r = await wiso('POST', '/team', { email: b.email, name: b.name || b.email.split('@')[0], role: b.role === 'ADMIN' ? 'admin' : 'viewer' })
        return R({ inviteToken: '', tempPassword: r.tempPassword, email: r.email })
      }
      throw soon('This team action')
    }

    case 'sessions': {
      if (method === 'DELETE' && id) return R(await wiso('DELETE', `/sessions/${id}`))
      const r = await wiso('GET', '/sessions')
      return R({ data: (r.data ?? []).filter((s: any) => !s.revoked_at).map((s: any) => ({ id: s.id, ip: s.ip, userAgent: s.user_agent, current: !!s.is_current, lastSeenAt: s.last_seen_at ?? s.created_at })) })
    }

    case 'customers': {
      const [c, contacts] = await Promise.all([wiso('GET', `/customers?limit=500&envType=${env}`), wiso('GET', '/contacts').catch(() => ({ contacts: [] }))])
      const key = (x: string) => String(x ?? '').replace(/\D/g, '').replace(/^0/, '255')
      const names = new Map<string, string>((contacts.contacts ?? []).map((k: any) => [key(k.phone), k.name]))
      return R({
        data: (c.data ?? []).map((x: any) => {
          const phone = String(x.phone ?? '').replace(/\D/g, '')
          return { phone: phone ? `+${phone}` : '—', name: names.get(key(phone)) ?? (phone ? `+${phone}` : '—'), email: '', count: x.completedCount ?? 0, attempts: x.paymentCount ?? 0, total: Number(x.totalVolume) || 0, last: Date.parse(x.lastPaymentAt), network: networkOf(phone) }
        }),
      })
    }

    case 'fee': {
      if (method === 'GET') return R(await wiso('GET', '/settings/fee'))
      return R(await wiso('PATCH', '/settings/fee', { fee_bearer: b.fee_bearer }))
    }

    case 'password':
      return R(await wiso('PATCH', '/me/password', { current_password: b.current, new_password: b.next }))

    case 'profile':
      throw soon('Editing the business profile')
  }
  throw soon('This feature')
}

/** Downloads a file from the WisoPay portal API (e.g. /statements/2026-11.pdf) and saves it. */
export async function downloadPortalFile(path: string, filename: string) {
  const s = getSession()
  const r = await fetch(`${BASE}${path}`, { headers: s ? { Authorization: `Bearer ${s.accessToken}` } : {} })
  if (!r.ok) {
    const j = await r.json().catch(() => null)
    throw new ApiError(r.status, 'HTTP', j?.error ?? `Download failed (${r.status})`)
  }
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Reads a File as base64 (no data: prefix) for KYC uploads. */
export function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(f)
  })
}
