import type { ReactNode } from 'react'
import { ArrowLeft, Check } from 'lucide-react'

type Variant = 'login' | 'signup'

const PANEL: Record<Variant, { title: string; lead: string; points: string[] }> = {
  login: {
    title: 'Every mobile wallet in Tanzania, one dashboard.',
    lead: 'Track payments, send USSD pushes and manage your API keys from one place.',
    points: ['M-Pesa, Airtel Money, Mixx by Yas and HaloPesa', 'Signed webhooks the moment a payment completes', 'Settlement to your merchant wallet'],
  },
  signup: {
    title: 'Start collecting mobile money in minutes.',
    lead: 'Sandbox keys right after sign-up. Go live once your business documents are verified.',
    points: ['2% per successful payment, no monthly fee', 'You choose who pays the fee: you or your customer', 'API, payment links and USSD push from one account'],
  },
}

export function AuthLayout({ variant, children }: { variant: Variant; children: ReactNode }) {
  const p = PANEL[variant]
  return (
    <div className="auth min-h-screen bg-white text-[#1a1a1c] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col px-4 sm:px-8 lg:px-14">
        <header className="flex items-center justify-between py-6">
          <a href="https://wisopay.io" className="flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.03em]">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-[9px]" />
            wisopay
          </a>
          <a href="https://wisopay.io" className="group inline-flex items-center gap-1.5 text-sm text-[#5c6166] transition-colors hover:text-[#1a1a1c]">
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Back to site
          </a>
        </header>

        <main className="flex flex-1 items-center justify-center py-8">
          <div className={`auth-up w-full ${variant === 'signup' ? 'max-w-[560px]' : 'max-w-[400px]'}`}>{children}</div>
        </main>

        <footer className="flex flex-wrap justify-between gap-3 py-6 text-[13px] text-[#8a8f96]">
          <span>© {new Date().getFullYear()} WisoPay</span>
          <span className="flex gap-4">
            <a href="https://wisopay.io/contact" className="hover:text-[#1a1a1c]">Help</a>
            <a href="https://wisopay.io/contact" className="hover:text-[#1a1a1c]">Privacy</a>
            <a href="https://wisopay.io/contact" className="hover:text-[#1a1a1c]">Terms</a>
          </span>
        </footer>
      </div>

      <aside className="relative hidden h-screen overflow-hidden p-3 lg:sticky lg:top-0 lg:block">
        <div className="relative flex h-full min-h-[640px] flex-col justify-between overflow-hidden rounded-[28px] bg-[#07090c] p-12 text-white">
          <div className="auth-glow pointer-events-none absolute left-1/2 top-[38%] aspect-square w-[170%] -translate-x-1/2 rounded-full" aria-hidden="true" />

          <span className="relative inline-flex w-fit items-center rounded-full bg-[#e4f8ef] px-3.5 py-1.5 text-[13px] font-medium text-[#067a55]">
            Mobile money payments in Tanzania
          </span>

          <div className="relative">
            <h2 className="max-w-[440px] text-[clamp(30px,2.6vw,40px)] font-normal leading-[1.15] tracking-[-0.015em] [text-wrap:balance]">{p.title}</h2>
            <p className="mt-4 max-w-[420px] text-[16px] leading-relaxed text-white/65">{p.lead}</p>
            <ul className="mt-8 flex flex-col gap-3">
              {p.points.map(t => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-white/85">
                  <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-[#0eb981]"><Check size={12} strokeWidth={3} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="auth-float relative w-full max-w-[360px] self-end rounded-[20px] bg-white p-5 text-[#1a1a1c] shadow-[0_30px_60px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between text-[13px] text-[#8a8f96]">
              <span>Latest payment</span>
              <span className="inline-flex items-center gap-1.5 text-[#067a55]"><span className="auth-dot h-1.5 w-1.5 rounded-full bg-[#0eb981]" />Completed</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[22px] font-medium tabular-nums tracking-[-0.01em]">TZS 25,000</p>
                <p className="text-[13px] text-[#5c6166]">M-Pesa · 255 712 ••• 678</p>
              </div>
              <span className="rounded-full bg-[#e4f8ef] px-2.5 py-1 text-[12px] font-medium text-[#067a55]">Webhook 200</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export const authInput =
  'h-12 w-full rounded-xl border border-[#e7e9ee] bg-white px-4 text-[15px] text-[#1a1a1c] placeholder:text-[#a3a8ae] outline-none transition focus:border-[#0eb981] focus:ring-4 focus:ring-[#0eb981]/15'

export const authLabel = 'mb-1.5 block text-[13px] font-medium text-[#1a1a1c]'

export const authPrimary =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0eb981] text-[15px] font-semibold text-white transition hover:bg-[#0ca674] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60'

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="auth-up mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}
