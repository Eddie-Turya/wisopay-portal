import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronRight, X, Webhook, FlaskConical, FileCheck, Zap } from 'lucide-react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

interface Step {
  id: string
  icon: React.ElementType
  title: string
  desc: string
  action?: string
  route?: string
  done: boolean
}

export function OnboardingChecklist() {
  const navigate = useNavigate()
  const merchant = (() => { try { return JSON.parse(localStorage.getItem('portalMerchant') || '{}') } catch { return {} } })()
  const merchantId = merchant.id
  const dismissKey = `onboarding_done_${merchantId}`

  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === '1')
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (dismissed) return
    Promise.all([
      api.webhooks().catch(() => ({ data: [] })),
      api.payments({ limit: 1, envType: 'sandbox' }).catch(() => ({ data: [] })),
    ]).then(([wh, payments]) => {
      const hasWebhook = wh.data?.length > 0
      const hasTested = payments.data?.length > 0
      const kycDone = ['active', 'live_enabled'].includes(merchant.status)
      const isLive = merchant.status === 'live_enabled'

      const list: Step[] = [
        {
          id: 'webhook',
          icon: Webhook,
          title: 'Add a webhook endpoint',
          desc: 'Get notified when payments complete',
          action: 'Add Webhook',
          route: '/webhooks',
          done: hasWebhook,
        },
        {
          id: 'test',
          icon: FlaskConical,
          title: 'Make a test payment',
          desc: 'Try the sandbox to verify your integration',
          action: 'Open Playground',
          route: '/playground',
          done: hasTested,
        },
        {
          id: 'kyc',
          icon: FileCheck,
          title: 'KYC approved',
          desc: 'Admin review of your submitted documents',
          done: kycDone,
        },
        {
          id: 'live',
          icon: Zap,
          title: 'Go live',
          desc: 'Switch to live mode and accept real payments',
          action: isLive ? undefined : 'Waiting for approval',
          done: isLive,
        },
      ]
      setSteps(list)
    }).finally(() => setLoading(false))
  }, [dismissed])

  const allDone = steps.every(s => s.done)
  const doneCount = steps.filter(s => s.done).length

  const dismiss = () => {
    localStorage.setItem(dismissKey, '1')
    setDismissed(true)
  }

  if (dismissed || loading || allDone) return null

  return (
    <div className="bg-p-panel border border-p-line rounded-2xl shadow-sm overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-p-good/10 border-b border-p-line">
        <div>
          <p className="text-sm font-semibold text-p-fg">Get started with Wisopay</p>
          <p className="text-xs text-p-muted mt-0.5">{doneCount} of {steps.length} steps complete</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-p-line rounded-full overflow-hidden">
            <div
              className="h-full bg-p-accent rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <button onClick={dismiss} className="text-emerald-400 hover:text-p-good transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-p-line">
        {steps.map(step => {
          const Icon = step.icon
          return (
            <div key={step.id} className={`flex items-center gap-4 px-5 py-3.5 ${step.done ? 'opacity-60' : ''}`}>
              {step.done
                ? <CheckCircle2 size={18} className="text-p-good flex-shrink-0" />
                : <Circle size={18} className="text-p-faint flex-shrink-0" />}
              <div className="w-8 h-8 rounded-lg bg-p-panel2 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className={step.done ? 'text-p-good' : 'text-p-faint'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${step.done ? 'text-p-faint line-through' : 'text-p-fg'}`}>{step.title}</p>
                <p className="text-xs text-p-faint">{step.desc}</p>
              </div>
              {!step.done && step.route && (
                <button
                  onClick={() => navigate(step.route!)}
                  className="flex items-center gap-1 text-xs font-semibold text-p-good hover:text-p-good transition-colors flex-shrink-0"
                >
                  {step.action} <ChevronRight size={12} />
                </button>
              )}
              {!step.done && !step.route && step.action && (
                <span className="text-xs text-p-faint italic flex-shrink-0">{step.action}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
