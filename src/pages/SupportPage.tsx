import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Mail, MessageSquare, BookOpen, ExternalLink, Zap, AlertCircle, FileText } from 'lucide-react'
import { api } from '../api'

const ICON_MAP: Record<string, any> = { Mail, MessageSquare, BookOpen, Zap, FileText, AlertCircle }

const DEFAULT: any = {
  contacts: [
    { id: '1', icon: 'Mail',          label: 'Email Support', desc: 'support@wisopay.io', action: 'mailto:support@wisopay.io' },
    { id: '2', icon: 'MessageSquare', label: 'WhatsApp',      desc: '+255 744 447 401',  action: 'https://wa.me/255744447401' },
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
  Mail:          { bg: 'bg-p-info/10',    icon: 'text-p-info' },
  MessageSquare: { bg: 'bg-p-good/10', icon: 'text-p-good' },
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
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-1">
        <h1 className="text-2xl font-semibold tracking-tight text-p-fg">Support & Help</h1>
        <p className="text-xs text-p-faint">Get help with your integration</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contacts.map((c: any) => {
            const Icon = ICON_MAP[c.icon] ?? Mail
            const colors = CONTACT_COLORS[c.icon] ?? { bg: 'bg-p-panel2', icon: 'text-p-ink2' }
            return (
              <a
                key={c.id}
                href={c.action || '#'}
                className={`block bg-p-panel rounded-xl border border-p-line shadow-sm p-5 hover:shadow-md transition-shadow ${c.action ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
              >
                <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={colors.icon} />
                </div>
                <p className="text-sm font-semibold text-p-fg">{c.label}</p>
                <p className="text-xs text-p-faint mt-0.5">{c.desc}</p>
              </a>
            )
          })}
        </div>

        {/* Resources */}
        <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
          <p className="text-sm font-bold text-p-fg mb-4">Resources</p>
          <div className="space-y-2">
            {resources.map((r: any) => {
              const Icon = ICON_MAP[r.icon] ?? FileText
              const hasHref = !!r.href
              return (
                <a
                  key={r.id}
                  href={r.href || '#'}
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-p-panel2 transition-colors group ${!hasHref ? 'opacity-60 cursor-default' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-p-panel2 flex items-center justify-center flex-shrink-0 group-hover:bg-p-good/10 transition-colors">
                    <Icon size={14} className="text-p-muted group-hover:text-p-good transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-p-fg">{r.label}</p>
                    <p className="text-xs text-p-faint">{r.desc}</p>
                  </div>
                  {hasHref
                    ? <ExternalLink size={12} className="text-p-faint group-hover:text-p-muted transition-colors flex-shrink-0" />
                    : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">SOON</span>
                  }
                </a>
              )
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-p-panel rounded-xl border border-p-line shadow-sm p-5">
          <p className="text-sm font-bold text-p-fg mb-4">Frequently Asked Questions</p>
          <div className="space-y-4">
            {faq.map((item: any, i: number) => (
              <div key={item.id} className={`pb-4 ${i < faq.length - 1 ? 'border-b border-p-line' : ''}`}>
                <p className="text-sm font-semibold text-p-fg mb-1">{item.q}</p>
                <p className="text-xs text-p-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {footer && (
          <div className="text-center pb-4">
            <p className="text-xs text-p-faint">{footer}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
