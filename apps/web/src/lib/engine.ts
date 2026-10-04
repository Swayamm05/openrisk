// The risk and simulation engine. Pure functions, no React.
// In Phase 3 this moves to the backend, which becomes the source of truth.
import type { Direction, Signal, SimTrade, Simulation } from './types'
import { calcPositionSize, drawdownPercent, round } from './risk'

export const DEFAULT_MAX_LEVERAGE = 3

/** Default prop-firm style limits, based on the per-trade risk. */
export function defaultLimits(riskPercent: number) {
  return {
    dailyLossLimitPercent: round(riskPercent * 2, 2),
    maxDrawdownLimitPercent: round(Math.min(riskPercent * 10, 30), 2),
  }
}

export type SizedTrade = {
  quantity: number
  notional: number
  riskAmount: number
  maxLoss: number
  leverage: number
  cappedByLeverage: boolean
}

/** Size a trade so the loss at the stop fits the risk limit, then apply the leverage cap. */
export function sizeTrade(
  equity: number,
  riskPercent: number,
  entry: number,
  stop: number,
  maxLeverage: number,
): SizedTrade | null {
  const base = calcPositionSize({ capital: equity, riskPercent, entry, stop })
  if (!base) return null
  let quantity = base.quantity
  let capped = false
  const maxNotional = equity * maxLeverage
  if (base.notional > maxNotional) {
    quantity = maxNotional / entry
    capped = true
  }
  quantity = round(quantity, 8)
  const notional = quantity * entry
  return {
    quantity,
    notional,
    riskAmount: quantity * Math.abs(entry - stop),
    maxLoss: base.maxLoss,
    leverage: notional / equity,
    cappedByLeverage: capped,
  }
}

/** Returns an error message, or null if the signal is valid. */
export function validateSignal(i: {
  symbol: string
  direction: Direction
  entry: number
  stopLoss: number
  takeProfit: number
  maxLeverage?: number
}): string | null {
  if (!i.symbol.trim()) return 'Enter an asset, e.g. ETH/USDC.'
  if (![i.entry, i.stopLoss, i.takeProfit].every((n) => Number.isFinite(n) && n > 0)) {
    return 'Entry, stop loss and take profit must be positive numbers.'
  }
  if (i.direction === 'LONG' && !(i.stopLoss < i.entry && i.entry < i.takeProfit)) {
    return 'For a LONG: stop loss < entry < take profit.'
  }
  if (i.direction === 'SHORT' && !(i.takeProfit < i.entry && i.entry < i.stopLoss)) {
    return 'For a SHORT: take profit < entry < stop loss.'
  }
  if (i.maxLeverage !== undefined && !(i.maxLeverage >= 1 && i.maxLeverage <= 20)) {
    return 'Leverage cap must be between 1 and 20.'
  }
  return null
}

export function tradePnl(direction: Direction, entry: number, exit: number, quantity: number): number {
  return (direction === 'LONG' ? exit - entry : entry - exit) * quantity
}

/** Stop-loss enforcement: a simulated exit never goes beyond the stop or the target. */
export function clampExit(s: Pick<Signal, 'stopLoss' | 'takeProfit'>, price: number): number {
  const lo = Math.min(s.stopLoss, s.takeProfit)
  const hi = Math.max(s.stopLoss, s.takeProfit)
  return Math.min(hi, Math.max(lo, price))
}

const dayKey = (iso: string) => iso.slice(0, 10)

export function dailyPnl(sim: Simulation, iso: string): number {
  const day = dayKey(iso)
  let sum = 0
  for (const t of sim.trades) {
    if (t.status === 'CLOSED' && t.closedAt && dayKey(t.closedAt) === day) sum += t.pnl ?? 0
  }
  return round(sum)
}

export function dailyLimitAmount(sim: Simulation): number {
  return round((sim.startingCapital * sim.dailyLossLimitPercent) / 100)
}

export function openRisk(sim: Simulation): number {
  let sum = 0
  for (const t of sim.trades) if (t.status === 'OPEN') sum += t.riskAmount
  return round(sum)
}

/** Share of today's loss budget used by open risk plus today's realized losses. */
export function riskUtilization(sim: Simulation, nowIso: string): number {
  const limit = dailyLimitAmount(sim)
  if (limit <= 0) return 0
  const used = openRisk(sim) + Math.max(0, -dailyPnl(sim, nowIso))
  return round((used / limit) * 100, 1)
}

function openTrade(sim: Simulation, s: Signal): SimTrade {
  const base = {
    id: crypto.randomUUID(),
    signalId: s.id,
    symbol: s.symbol,
    direction: s.direction,
    entry: s.entry,
    stopLoss: s.stopLoss,
    takeProfit: s.takeProfit,
    openedAt: s.publishedAt,
  }
  const skip = (reason: string): SimTrade => ({
    ...base,
    quantity: 0,
    notional: 0,
    riskAmount: 0,
    leverage: 0,
    cappedByLeverage: false,
    status: 'SKIPPED',
    skipReason: reason,
  })

  if (sim.status === 'FAILED') return skip('Simulation ended (max drawdown breached).')
  if (-dailyPnl(sim, s.publishedAt) >= dailyLimitAmount(sim)) return skip('Daily loss limit reached.')

  const sized = sizeTrade(
    sim.currentEquity,
    sim.riskLimitPercent,
    s.entry,
    s.stopLoss,
    s.maxLeverage ?? DEFAULT_MAX_LEVERAGE,
  )
  if (!sized) return skip('Could not size this trade.')

  return {
    ...base,
    quantity: sized.quantity,
    notional: round(sized.notional),
    riskAmount: round(sized.riskAmount),
    leverage: round(sized.leverage, 2),
    cappedByLeverage: sized.cappedByLeverage,
    status: 'OPEN',
  }
}

function closeTrade(sim: Simulation, t: SimTrade, s: Signal): void {
  const exit = clampExit(s, s.exitPrice as number)
  const pnl = round(tradePnl(t.direction, t.entry, exit, t.quantity))
  t.status = 'CLOSED'
  t.exitPrice = exit
  t.pnl = pnl
  t.closedAt = s.closedAt

  sim.currentEquity = round(sim.currentEquity + pnl)
  sim.peakEquity = Math.max(sim.peakEquity, sim.currentEquity)

  // Milestone: one-time, triggered by realized simulation equity only.
  if (
    sim.status === 'ACTIVE' &&
    sim.milestoneStatus === 'NOT_REACHED' &&
    sim.currentEquity >= sim.milestoneEquity
  ) {
    sim.milestoneStatus = 'REACHED'
    sim.billingStatus = 'PENDING'
    sim.milestoneRecord = {
      startingCapital: sim.startingCapital,
      milestonePercent: sim.milestonePercent,
      milestoneEquity: sim.milestoneEquity,
      peakEquity: sim.peakEquity,
      triggeredAt: s.closedAt ?? new Date().toISOString(),
      feeAmount: null,
      paymentTxHash: null,
    }
  }

  // Max drawdown: ends the simulation.
  const dd = drawdownPercent(sim.peakEquity, sim.currentEquity)
  if (sim.status === 'ACTIVE' && dd >= sim.maxDrawdownLimitPercent) {
    sim.status = 'FAILED'
    sim.failReason = `Max drawdown of ${sim.maxDrawdownLimitPercent}% was breached.`
  }
}

/**
 * Applies all signal events (opens and closes, in time order) to a simulation.
 * Only signals published after the simulation started are applied (no mid-trade joins).
 * Safe to call repeatedly: already-applied events are skipped.
 */
export function syncSimulation(input: Simulation, signals: Signal[]): Simulation {
  const sim: Simulation = { ...input, trades: input.trades.map((t) => ({ ...t })) }

  type Ev = { time: string; kind: 'open' | 'close'; signal: Signal }
  const events: Ev[] = []
  for (const s of signals) {
    if (s.publishedAt < sim.createdAt) continue
    events.push({ time: s.publishedAt, kind: 'open', signal: s })
    if (s.status === 'CLOSED' && s.closedAt) events.push({ time: s.closedAt, kind: 'close', signal: s })
  }
  events.sort((a, b) => {
    if (a.time === b.time) return a.kind === 'open' ? -1 : 1
    return a.time < b.time ? -1 : 1
  })

  for (const ev of events) {
    const s = ev.signal
    const existing = sim.trades.find((t) => t.signalId === s.id)
    if (ev.kind === 'open') {
      if (existing) continue
      sim.trades.push(openTrade(sim, s))
    } else {
      if (!existing || existing.status !== 'OPEN' || s.exitPrice === undefined) continue
      closeTrade(sim, existing, s)
    }
  }

  sim.maxLossPerTrade = round((sim.currentEquity * sim.riskLimitPercent) / 100)
  sim.drawdownPercent = drawdownPercent(sim.peakEquity, sim.currentEquity)
  return sim
}

/** R multiple of a closed signal: profit divided by the risk taken. */
export function signalR(s: Signal): number | null {
  if (s.status !== 'CLOSED' || s.exitPrice === undefined) return null
  const exit = clampExit(s, s.exitPrice)
  const risk = Math.abs(s.entry - s.stopLoss)
  if (risk === 0) return null
  const move = s.direction === 'LONG' ? exit - s.entry : s.entry - exit
  return move / risk
}

export type SignalStats = {
  total: number
  closed: number
  wins: number
  winRate: number
  avgR: number
  totalR: number
  profitFactor: number | null
  maxDrawdownR: number
}

export function signalStats(signals: Signal[]): SignalStats {
  const closed = signals
    .filter((s) => s.status === 'CLOSED')
    .sort((a, b) => (a.closedAt ?? '').localeCompare(b.closedAt ?? ''))
  const rs = closed.map(signalR).filter((r): r is number => r !== null)

  const wins = rs.filter((r) => r > 0).length
  const totalR = rs.reduce((a, b) => a + b, 0)
  const gain = rs.filter((r) => r > 0).reduce((a, b) => a + b, 0)
  const loss = Math.abs(rs.filter((r) => r < 0).reduce((a, b) => a + b, 0))

  let cum = 0
  let peak = 0
  let maxDd = 0
  for (const r of rs) {
    cum += r
    peak = Math.max(peak, cum)
    maxDd = Math.max(maxDd, peak - cum)
  }

  return {
    total: signals.length,
    closed: rs.length,
    wins,
    winRate: rs.length ? (wins / rs.length) * 100 : 0,
    avgR: rs.length ? totalR / rs.length : 0,
    totalR,
    profitFactor: loss > 0 ? gain / loss : null,
    maxDrawdownR: maxDd,
  }
}
