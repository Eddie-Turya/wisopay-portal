import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Mail, MessageSquare, BookOpen, ExternalLink, Zap, AlertCircle, FileText } from 'lucide-react'
import { api } from '../api'

const ICON_MAP: Record<string, any> = { Mail, MessageSquare, BookOpen, Zap, FileText, AlertCircle }

const DEFAULT: any = {
  contacts: [
    { id: '1', icon: 'Mail',          label: 'Email Support', desc: 'support@wisopay.io', action: 'mailto:support@wisopay.io' },
    { id: '2', icon: 'MessageSquare', label: 'WhatsApp',      desc: '+255 000 000 000',  action: '' },
    { id: '3', icon: 'BookOpen',      label: 'API Docs',      desc: 'Full reference',    action: '/docs' },
  ],
  resources: [
    { id: '1', icon: 'Zap',         label: 'Getting Started Guide', desc: 'Set up your first integration in minutes', href: '/docs' },
    { id: '2', icon: 'FileText',    label: 'Webhook Reference',      desc: 'Event types, payloads, and retry logic',  href: '/webhooks' },
    { id: '3', icon: 'AlertCircle', label: 'API Status Page',        desc: 'Real-time uptime and incident reports',   href: '' },
  ],
  faq: [
    { id: '1', q: 'How long do USSD payment prompts stay active?',   a: "USSD sessions stay active for about 3–5 minutes. If the customer doesn't respond, the payment moves to FAILED and you can retry." },
    { id: '2', q: 'Can I issue a partial refund?',                   a: 'Yes. Pass an amount_minor less than the original when refunding. Partial refunds are supported.' },
    { id: '3', q: 'How do webhooks retry on failure?',               a: 'Failed webhooks retry up to 5 times with exponential backoff (30s, 2m, 10m, 1h, 6h). Check the Webhook Logs tab for delivery history.' },
    { id: '4', q: 'What currencies are supported?',                  a: 'Currently TZS (Tanzanian Shilling) via Vodacom M-Pesa, Airtel Money, and Tigo Pesa.' },
    { id: '5', q: 'How do I get my live API key?',                   a: 'Go to API Keys in the sidebar and generate or rotate your production key. Live keys start with dpay_live_.' },
    { id: '6', q: 'Is there a sandbox / test mode?',                 a: 'Yes. Use your sandbox key to test. Sandbox payments complete immediately and trigger webhooks without real USSD pushes.' },
  ],
  footer: 'Response times: email within 24h on weekdays · WhatsApp typically within 2h during business hours',
}

const CONTACT_COLORS: Record<string, { bg: string; icon: string }> = {
  Mail:          { bg: 'bg-blue-50',    icon: 'text-blue-600' },
  MessageSquare: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  BookOpen:      { bg: 'bg-violet-50',  icon: 'text-violet-600' },
}

const CACHE_KEY = 'wsupport_content'

function loadCached() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch { return null }
}

export function SupportPage() {
  const [content, setContent] = useState<any>(loadCached() ?? DEFAULT)

  useEffect(() => {
    api.supportContent()
      .then(data => {
        if (data) {
          setContent(data)
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
        }
      })
      .catch(() => {})
  }, [])

  const { contacts, resources, faq, footer } = content

  return (
    <Layout>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-base font-bold text-gray-900">Support & Help</h1>
        <p className="text-xs text-gray-400">Get help with your integration</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contacts.map((c: any) => {
            const Icon = ICON_MAP[c.icon] ?? Mail
            const colors = CONTACT_COLORS[c.icon] ?? { bg: 'bg-gray-50', icon: 'text-gray-600' }
            return (
              <a
                key={c.id}
                href={c.action || '#'}
                className={`block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow ${c.action ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
              >
                <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={colors.icon} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{c.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
              </a>
            )
          })}
        </div>

        {/* Resources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Resources</p>
          <div className="space-y-2">
            {resources.map((r: any) => {
              const Icon = ICON_MAP[r.icon] ?? FileText
              const hasHref = !!r.href
              return (
                <a
                  key={r.id}
                  href={r.href || '#'}
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group ${!hasHref ? 'opacity-60 cursor-default' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 transition-colors">
                    <Icon size={14} className="text-gray-500 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.desc}</p>
                  </div>
                  {hasHref
                    ? <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                    : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">SOON</span>
                  }
                </a>
              )
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-900 mb-4">Frequently Asked Questions</p>
          <div className="space-y-4">
            {faq.map((item: any, i: number) => (
              <div key={item.id} className={`pb-4 ${i < faq.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <p className="text-sm font-semibold text-gray-800 mb-1">{item.q}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {footer && (
          <div className="text-center pb-4">
            <p className="text-xs text-gray-400">{footer}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
