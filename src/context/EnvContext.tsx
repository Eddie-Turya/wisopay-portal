import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api'

type Mode = 'live' | 'sandbox'

interface EnvCtx {
  mode: Mode
  setMode: (m: Mode) => void
  isSandbox: boolean
  liveEnabled: boolean
  merchantId: string | null
  refreshStatus: () => Promise<void>
  statusChecking: boolean
}

const Ctx = createContext<EnvCtx>({
  mode: 'sandbox', setMode: () => {}, isSandbox: true,
  liveEnabled: false, merchantId: null, refreshStatus: async () => {}, statusChecking: false,
})

export function EnvProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('portalMerchant') || '{}') } catch { return {} }
  })
  const [statusChecking, setStatusChecking] = useState(false)

  const liveEnabled = merchant.status === 'live_enabled'

  const [mode, setModeState] = useState<Mode>(() => {
    const saved = localStorage.getItem('portalEnvMode') as Mode
    const live = (() => {
      try { return JSON.parse(localStorage.getItem('portalMerchant') || '{}')?.status === 'live_enabled' } catch { return false }
    })()
    if (saved === 'live' && !live) return 'sandbox'
    return saved || 'sandbox'
  })

  const refreshStatus = useCallback(async () => {
    if (!api.isLoggedIn()) return
    setStatusChecking(true)
    try {
      const data = await api.me()
      if (!data?.merchant) return
      const updated = { ...merchant, ...data.merchant }
      localStorage.setItem('portalMerchant', JSON.stringify(updated))
      setMerchant(updated)
    } catch {
      // silently ignore — token may be expired, login guard handles it
    } finally {
      setStatusChecking(false)
    }
  }, [merchant])

  // Re-sync merchant state immediately after login (without waiting for mount re-run)
  // LoginPage dispatches 'portalLogin' after setting localStorage — reads fresh data
  useEffect(() => {
    const onLogin = () => {
      const fresh = (() => { try { return JSON.parse(localStorage.getItem('portalMerchant') || '{}') } catch { return {} } })()
      setMerchant(fresh)
      if (!api.isLoggedIn()) return
      api.me().then(data => {
        if (!data?.merchant) return
        const updated = { ...fresh, ...data.merchant }
        localStorage.setItem('portalMerchant', JSON.stringify(updated))
        setMerchant(updated)
      }).catch(() => {})
    }
    window.addEventListener('portalLogin', onLogin)
    return () => window.removeEventListener('portalLogin', onLogin)
  }, [])

  // Refresh on mount
  useEffect(() => { refreshStatus() }, [])

  // Refresh when user returns to this tab (admin may have changed status in another tab)
  useEffect(() => {
    const onFocus = () => { if (api.isLoggedIn()) refreshStatus() }
    window.addEventListener('visibilitychange', onFocus)
    return () => window.removeEventListener('visibilitychange', onFocus)
  }, [refreshStatus])

  // Reset to sandbox if live was enabled but merchant lost live_enabled
  useEffect(() => {
    if (mode === 'live' && !liveEnabled) {
      setModeState('sandbox')
      localStorage.setItem('portalEnvMode', 'sandbox')
    }
  }, [liveEnabled, mode])

  const setMode = (m: Mode) => {
    if (m === 'live' && !liveEnabled) return
    localStorage.setItem('portalEnvMode', m)
    setModeState(m)
  }

  return (
    <Ctx.Provider value={{ mode, setMode, isSandbox: mode === 'sandbox', liveEnabled, merchantId: merchant?.id ?? null, refreshStatus, statusChecking }}>
      {children}
    </Ctx.Provider>
  )
}

export const useEnv = () => useContext(Ctx)
