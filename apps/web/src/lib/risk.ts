export const MILESTONE_PERCENT = 20

export function round(value: number, decimals = 4): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/** Max simulated loss per trade. $10 at 2% = $0.20 */
export function maxLossPerTrade(capital: number, riskPercent: number): number {
  return round((capital * riskPercent) / 100)
}

/** Milestone equity. $10 and 20% = $12 */
export function milestoneEquity(capital: number, milestonePercent = MILESTONE_PERCENT): number {
  return round(capital * (1 + milestonePercent / 100))
}

export type PositionSize = {
  maxLoss: number
  riskPerUnit: number
  quantity: number
  notional: number
  impliedLeverage: number
}

/** quantity = maxLoss / |entry - stop| */
export function calcPositionSize(input: {
  capital: number
  riskPercent: number
  entry: number
  stop: number
}): PositionSize | null {
  const { capital, riskPercent, entry, stop } = input
  const riskPerUnit = Math.abs(entry - stop)
  if (!(capital > 0) || !(riskPercent > 0) || !(entry > 0) || !(stop > 0) || riskPerUnit === 0) {
    return null
  }
  const maxLoss = maxLossPerTrade(capital, riskPercent)
  const quantity = maxLoss / riskPerUnit
  const notional = quantity * entry
  return { maxLoss, riskPerUnit, quantity, notional, impliedLeverage: notional / capital }
}

export function drawdownPercent(peak: number, current: number): number {
  if (peak <= 0) return 0
  return round(Math.max(0, ((peak - current) / peak) * 100), 2)
}

export function milestoneProgress(start: number, current: number, target: number): number {
  const span = target - start
  if (span <= 0) return 0
  return Math.min(100, Math.max(0, ((current - start) / span) * 100))
}

export function formatUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
                                }
