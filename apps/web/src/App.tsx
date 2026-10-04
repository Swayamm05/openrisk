import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Header, type Screen } from './components/Header'
import { Landing } from './pages/Landing'
import { CreateSimulation } from './pages/CreateSimulation'
import { Dashboard } from './pages/Dashboard'
import { Signals } from './pages/Signals'
import { Trader } from './pages/Trader'
import { syncSimulation } from './lib/engine'
import { hashSignal } from './lib/hash'
import {
  addSignal,
  closeSignal,
  deleteSimulation,
  loadSignals,
  loadSimulation,
  saveSimulation,
} from './lib/storage'
import type { Signal, SignalInput, Simulation } from './lib/types'

export default function App() {
  const { address } = useAccount()
  const [screen, setScreen] = useState<Screen>('landing')
  const [sim, setSim] = useState<Simulation | null>(null)
  const [signals, setSignals] = useState<Signal[]>(() => loadSignals())

  // Reload signals, apply any new ones to this wallet's simulation, and save.
  function refresh(addr: string | undefined) {
    const all = loadSignals()
    setSignals(all)
    if (!addr) {
      setSim(null)
      return
    }
    const loaded = loadSimulation(addr)
    if (!loaded) {
      setSim(null)
      return
    }
    const synced = syncSimulation(loaded, all)
    saveSimulation(synced)
    setSim(synced)
  }

  useEffect(() => {
    refresh(address)
  }, [address])

  function navigate(next: Screen) {
    refresh(address)
    setScreen(next === 'dashboard' && !sim ? 'create' : next)
  }

  function handleCreate(newSim: Simulation) {
    saveSimulation(newSim)
    setSim(newSim)
    setScreen('dashboard')
  }

  function handleReset() {
    if (address) deleteSimulation(address)
    setSim(null)
    setScreen('create')
  }

  async function handlePublish(input: SignalInput) {
    const publishedAt = new Date().toISOString()
    const hash = await hashSignal({ ...input, publishedAt })
    addSignal({
      ...input,
      id: crypto.randomUUID(),
      publishedAt,
      hash,
      status: 'OPEN',
    })
    refresh(address)
  }

  function handleClose(id: string, exitPrice: number) {
    closeSignal(id, exitPrice, new Date().toISOString())
    refresh(address)
  }

  return (
    <div className="min-h-screen">
      <Header screen={screen} onNavigate={navigate} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {screen === 'landing' && <Landing onStart={() => navigate(sim ? 'dashboard' : 'create')} />}
        {screen === 'create' && <CreateSimulation onCreate={handleCreate} />}
        {screen === 'dashboard' && sim && <Dashboard sim={sim} onReset={handleReset} />}
        {screen === 'signals' && <Signals signals={signals} sim={sim} />}
        {screen === 'trader' && (
          <Trader signals={signals} onPublish={handlePublish} onClose={handleClose} />
        )}
      </main>
    </div>
  )
  }
