import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import { api } from './lib/api'
import { Header, type Screen } from './components/Header'
import { Landing } from './pages/Landing'
import { CreateSimulation } from './pages/CreateSimulation'
import { Dashboard } from './pages/Dashboard'
import { Signals } from './pages/Signals'
import { Trader } from './pages/Trader'
import type { Signal, SignalInput, Simulation } from './lib/types'

function messageOf(e: unknown): string {
  const text = e instanceof Error ? e.message : ''
  if (/failed to fetch|networkerror/i.test(text)) {
    return 'Could not reach the server. It may be waking up, so try again in a minute.'
  }
  return text || 'Something went wrong.'
}

export default function App() {
  const { address, isSignedIn, isTrader: canTrade } = useAuth()
  const [screen, setScreen] = useState<Screen>('landing')
  const [sim, setSim] = useState<Simulation | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [toast, setToast] = useState('')

  // Load shared signals, and this user's simulation if signed in.
  async function refresh() {
    try {
      const s = await api.signals()
      setSignals(s.signals)
      if (isSignedIn) {
        const m = await api.mySimulation()
        setSim(m.simulation)
      } else {
        setSim(null)
      }
    } catch (e) {
      setToast(messageOf(e))
    }
  }

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), 30000)
    return () => clearInterval(id)
  }, [address])

  function navigate(next: Screen) {
    void refresh()
    setScreen(next === 'dashboard' && !sim ? 'create' : next)
  }

  // The server recomputes every number. Only capital and risk are sent.
  async function handleCreate(newSim: Simulation) {
    try {
      await api.createSimulation(newSim.startingCapital, newSim.riskLimitPercent)
      await refresh()
      setScreen('dashboard')
    } catch (e) {
      setToast(messageOf(e))
    }
  }

  async function handleReset() {
    try {
      await api.deleteSimulation()
      await refresh()
      setScreen('create')
    } catch (e) {
      setToast(messageOf(e))
    }
  }

  async function handlePublish(input: SignalInput) {
    try {
      await api.publish(input)
    } catch (e) {
      setToast(messageOf(e))
      throw e
    }
    await refresh()
  }

  async function handleClose(id: string, exitPrice: number) {
    try {
      await api.close(id, exitPrice)
      await refresh()
    } catch (e) {
      setToast(messageOf(e))
    }
  }

  return (
    <div className="min-h-screen">
      <Header screen={screen} onNavigate={navigate} canTrade={canTrade} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {screen === 'landing' && <Landing onStart={() => navigate(sim ? 'dashboard' : 'create')} />}
        {screen === 'create' && <CreateSimulation onCreate={handleCreate} />}
        {screen === 'dashboard' && sim && <Dashboard sim={sim} onReset={handleReset} />}
        {screen === 'signals' && <Signals signals={signals} sim={sim} />}
        {screen === 'trader' && canTrade && (
          <Trader signals={signals} onPublish={handlePublish} onClose={handleClose} />
        )}
        {screen === 'trader' && !canTrade && (
          <p className="rounded-lg border border-slate-700 p-4 text-sm text-slate-400">
            The Trader page is locked. Sign in with the registered trader wallet to open it.
          </p>
        )}
      </main>
      {toast && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border border-red-500/60 bg-slate-900 p-3 text-sm text-red-200 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="text-slate-400">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
            }
