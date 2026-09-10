import { useEffect, useState } from 'react'
import { useEnv } from '../context/EnvContext'
import { Zap, X, ArrowRight, CheckCircle2 } from 'lucide-react'

export function LiveApprovedModal() {
  const { liveEnabled, merchantId, setMode } = useEnv()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!liveEnabled || !merchantId) return
    const key = `liveApprovedSeen_${merchantId}`
    try { if (!localStorage.getItem(key)) setVisible(true) } catch { setVisible(true) }
  }, [liveEnabled, merchantId])

  if (!visible) return null

  const dismiss = () => {
    if (merchantId) {
      try { localStorage.setItem(`liveApprovedSeen_${merchantId}`, '1') } catch {}
    }
    setVisible(false)
  }

  const goLive = () => {
    setMode('live')
    dismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Green celebration header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 pt-10 pb-16 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 w-52 h-52 rounded-full bg-white/10" />

          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Zap size={36} className="text-white" fill="white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">You're Live!</h2>
            <p className="text-emerald-100 text-sm leading-relaxed">Your KYC has been approved.<br />Real payments are now unlocked.</p>
          </div>
        </div>

        {/* Overlapping card */}
        <div className="px-8 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 divide-y divide-gray-100">
            {[
              'Accept real customer payments',
              'Live API keys now active',
              'Settlements enabled to your account',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 px-5 py-3.5">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-6 flex flex-col gap-3">
          <button onClick={goLive}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
            <Zap size={16} />
            Switch to Live Mode
            <ArrowRight size={16} />
          </button>
          <button onClick={dismiss}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
            Stay in Sandbox for now
          </button>
        </div>

        {/* Close */}
        <button onClick={dismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
          <X size={15} className="text-white" />
        </button>
      </div>
    </div>
  )
}
