import type { Signal, Simulation } from './types'
import { defaultLimits } from './engine'

const simKey = (address: string) => `openrisk:simulation:${address.toLowerCase()}`
const SIGNALS_KEY = 'openrisk:signals'

// Fills in fields that older saved simulations (Phase 1) do not have.
function normalize(raw: Simulation): Simulation {
  const limits = defaultLimits(raw.riskLimitPercent)
  return {
    ...raw,
    status: raw.status ?? 'ACTIVE',
    dailyLossLimitPercent: raw.dailyLossLimitPercent ?? limits.dailyLossLimitPercent,
    maxDrawdownLimitPercent: raw.maxDrawdownLimitPercent ?? limits.maxDrawdownLimitPercent,
    trades: raw.trades ?? [],
  }
}

export function loadSimulation(address: string): Simulation | null {
  try {
    const raw = localStorage.getItem(simKey(address))
    return raw ? normalize(JSON.parse(raw) as Simulation) : null
  } catch {
    return null
  }
}

export function saveSimulation(sim: Simulation): void {
  localStorage.setItem(simKey(sim.walletAddress), JSON.stringify(sim))
}

export function deleteSimulation(address: string): void {
  localStorage.removeItem(simKey(address))
}

// Signals are append-only: there is deliberately no edit or delete function.
export function loadSignals(): Signal[] {
  try {
    const raw = localStorage.getItem(SIGNALS_KEY)
    return raw ? (JSON.parse(raw) as Signal[]) : []
  } catch {
    return []
  }
}

export function addSignal(signal: Signal): void {
  const all = loadSignals()
  all.push(signal)
  localStorage.setItem(SIGNALS_KEY, JSON.stringify(all))
}

// Closing only adds exit data. The published fields and the hash never change.
export function closeSignal(id: string, exitPrice: number, closedAt: string): void {
  const all = loadSignals()
  const s = all.find((x) => x.id === id)
  if (!s || s.status === 'CLOSED') return
  s.status = 'CLOSED'
  s.exitPrice = exitPrice
  s.closedAt = closedAt
  localStorage.setItem(SIGNALS_KEY, JSON.stringify(all))
    }
