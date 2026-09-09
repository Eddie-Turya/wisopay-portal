const BASE = '/admin/portal'

function getToken() { return localStorage.getItem('portalToken') }
function setToken(t: string) { localStorage.setItem('portalToken', t) }
function clearToken() { localStorage.removeItem('portalToken') }

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : (data.error?.message || `HTTP ${res.status}`)
    throw new Error(msg)
  }
  return data
}

export const api = {
  isLoggedIn: () => !!getToken(),
  logout: clearToken,

  register: (fields: { business_name: string; email: string; password: string; name?: string; phone_number: string; nida_number: string; tin_document: File }) => {
    const form = new FormData()
    form.append('business_name', fields.business_name)
    form.append('email', fields.email)
    form.append('password', fields.password)
    form.append('phone_number', fields.phone_number)
    form.append('nida_number', fields.nida_number)
    if (fields.name) form.append('name', fields.name)
    form.append('tin_document', fields.tin_document)
    const token = localStorage.getItem('portalToken')
    return fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json()
      if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${r.status}`)
      return data
    })
  },

  verifyEmail: async (email: string, otp: string) => {
    const data = await req<any>('POST', '/auth/verify-email', { email, otp })
    setToken(data.token)
    return data
  },

  resendOtp: (email: string) =>
    req<any>('POST', '/auth/resend-otp', { email }),

  login: async (email: string, password: string) => {
    const data = await req<any>('POST', '/auth/login', { email, password })
    if (data.token) setToken(data.token)
    if (data.merchant) localStorage.setItem('portalMerchant', JSON.stringify(data.merchant))
    if (data.user) localStorage.setItem('portalUser', JSON.stringify(data.user))
    return data
  },
  me: () => req<any>('GET', '/me'),
  stats: (envType?: 'live' | 'sandbox') => req<any>('GET', `/stats${envType ? `?envType=${envType}` : ''}`),
  payments: (params?: { limit?: number; offset?: number; status?: string; search?: string; envType?: 'live' | 'sandbox'; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.envType) qs.set('envType', params.envType)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const q = qs.toString()
    return req<any>('GET', `/payments${q ? `?${q}` : ''}`)
  },
  apiKeys: () => req<any>('GET', '/api-keys'),
  createEnv: (name: 'live' | 'sandbox') => req<any>('POST', '/api-keys', { name }),
  rotateKey: (envId: string) => req<any>('POST', `/api-keys/${envId}/rotate`),
  webhooks: () => req<any>('GET', '/webhooks'),
  createWebhook: (url: string, events: string[]) => req<any>('POST', '/webhooks', { url, events }),
  updateWebhook: (id: string, patch: { url?: string; events?: string[]; enabled?: boolean }) =>
    req<any>('PATCH', `/webhooks/${id}`, patch),
  deleteWebhook: (id: string) => req<any>('DELETE', `/webhooks/${id}`),
  rotateWebhookSecret: (id: string) => req<any>('POST', `/webhooks/${id}/rotate-secret`),

  updateMe: (patch: { name?: string; currentPassword?: string; newPassword?: string }) =>
    req<any>('PATCH', '/me', patch),
  webhookLogs: (webhookId: string) => req<any>('GET', `/webhooks/${webhookId}/logs`),

  paymentDetail: (id: string) => req<any>('GET', `/payments/${id}`),
  refundPayment: (id: string, reason?: string) => req<any>('POST', `/payments/${id}/refund`, { reason }),
  exportPayments: (params?: { status?: string; search?: string; envType?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.envType) qs.set('envType', params.envType)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const q = qs.toString()
    return fetch(`/admin/portal/payments/export${q ? `?${q}` : ''}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('portalToken')}` }
    }).then(r => r.blob())
  },

  paymentLinks: () => req<any>('GET', '/payment-links'),
  deletePaymentLink: (id: string) => req<any>('DELETE', `/payment-links/${id}`),

  team: () => req<any>('GET', '/team'),
  inviteTeamMember: (email: string, name: string, role: string) => req<any>('POST', '/team', { email, name, role }),
  removeTeamMember: (id: string) => req<any>('DELETE', `/team/${id}`),

  settlements: () => req<any>('GET', '/settlements'),

  analytics: (params?: { days?: number; envType?: string }) => {
    const qs = new URLSearchParams()
    if (params?.days) qs.set('days', String(params.days))
    if (params?.envType) qs.set('envType', params.envType)
    const q = qs.toString()
    return req<any>('GET', `/analytics${q ? `?${q}` : ''}`)
  },
  customers: (params?: { limit?: number; search?: string; envType?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    if (params?.envType) qs.set('envType', params.envType)
    const q = qs.toString()
    return req<any>('GET', `/customers${q ? `?${q}` : ''}`)
  },
  auditLogs: (limit?: number) => req<any>('GET', `/audit-logs${limit ? `?limit=${limit}` : ''}`),
  onboarding: () => req<any>('GET', '/onboarding'),

  // Collect
  collectUssd: (body: { phone: string; amount_minor: number; currency?: string; description?: string; envType?: 'live' | 'sandbox' }) =>
    req<any>('POST', '/collect/ussd', body),
  collectSelcomPesa: (body: { phone: string; amount_minor: number; currency?: string; description?: string; envType?: 'live' | 'sandbox' }) =>
    req<any>('POST', '/collect/selcom-pesa', body),
  collectStatus: (paymentId: string) => req<any>('GET', `/collect/status/${paymentId}`),
  createPaymentLink: (body: { amount_minor: number; currency?: string; description?: string; expires_in_hours?: number; envType?: 'live' | 'sandbox' }) =>
    req<any>('POST', '/collect/link', body),

  // Contacts
  getContacts: () => req<any>('GET', '/contacts'),
  saveContact: (name: string, phone: string) => req<any>('POST', '/contacts', { name, phone }),
  deleteContact: (id: string) => req<any>('DELETE', `/contacts/${id}`),

  // Fee settings
  getFeeSettings: () => req<any>('GET', '/settings/fee'),
  updateFeeBearer: (fee_bearer: 'merchant' | 'customer') => req<any>('PATCH', '/settings/fee', { fee_bearer }),

  // Invoices
  invoices: (params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    const q = qs.toString()
    return req<any>('GET', `/invoices${q ? `?${q}` : ''}`)
  },
  createInvoice: (body: any) => req<any>('POST', '/invoices', body),
  getInvoice: (id: string) => req<any>('GET', `/invoices/${id}`),
  updateInvoice: (id: string, body: any) => req<any>('PATCH', `/invoices/${id}`, body),
  sendInvoice: (id: string) => req<any>('POST', `/invoices/${id}/send`, {}),
  markInvoicePaid: (id: string) => req<any>('POST', `/invoices/${id}/mark-paid`, {}),
  deleteInvoice: (id: string) => req<any>('DELETE', `/invoices/${id}`),
  recordInvoicePayment: (id: string, body: { amount: number; note?: string }) => req<any>('POST', `/invoices/${id}/payment`, body),
  invoicePayments: (id: string) => req<any>('GET', `/invoices/${id}/payments`),

  // Bill Splits
  createBillSplit: (body: { title: string; description?: string; currency?: string; total_amount_minor?: number; creator_name?: string; participants: { name: string; phone: string; amount_minor: number; share_type?: string; share_value?: number; display_name?: string }[]; envType?: 'live' | 'sandbox' }) =>
    req<any>('POST', '/bill-splits', body),
  listBillSplits: () => req<any>('GET', '/bill-splits'),
  getBillSplit: (id: string) => req<any>('GET', `/bill-splits/${id}`),
  cancelBillSplit: (id: string) => req<any>('POST', `/bill-splits/${id}/cancel`, {}),

  // 2FA
  setup2fa: () => req<any>('POST', '/auth/2fa/setup', {}),
  enable2fa: (code: string) => req<any>('POST', '/auth/2fa/enable', { code }),
  disable2fa: (code: string) => req<any>('POST', '/auth/2fa/disable', { code }),
  verify2fa: async (partial_token: string, code: string) => {
    const data = await req<any>('POST', '/auth/2fa/verify', { partial_token, code })
    if (data.token) setToken(data.token)
    return data
  },

  // Password
  changePassword: (current_password: string, new_password: string) =>
    req<any>('PATCH', '/me/password', { current_password, new_password }),

  // Sessions
  sessions: () => req<any>('GET', '/sessions'),
  revokeSession: (id: string) => req<any>('DELETE', `/sessions/${id}`),

  // Webhook delivery logs & retry
  webhookDeliveries: (webhookId: string) => req<any>('GET', `/webhooks/${webhookId}/logs`),
  retryWebhookDelivery: (deliveryId: string) => req<any>('POST', `/webhooks/deliveries/${deliveryId}/retry`, {}),
}
