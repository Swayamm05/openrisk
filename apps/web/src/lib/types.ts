export type MilestoneStatus = 'NOT_REACHED' | 'REACHED'
export type BillingStatus = 'NOT_TRIGGERED' | 'PENDING' | 'PAID'
export type Direction = 'LONG' | 'SHORT'

export type SignalInput = {
  symbol: string
  direction: Direction
  entry: number
  stopLoss: number
  takeProfit: number
  thesis: string
  maxLeverage?: number
}

// Mirrors the future `trade_signals` table. Published fields never change.
export type Signal = SignalInput & {
  id: string
  publishedAt: string
  hash: string
  status: 'OPEN' | 'CLOSED'
  exitPrice?: number
  closedAt?: string
}

// Mirrors the future `simulation_trades` table.
export type SimTrade = {
  id: string
  signalId: string
  symbol: string
  direction: Direction
  entry: number
  stopLoss: number
  takeProfit: number
  quantity: number
  notional: number
  riskAmount: number
  leverage: number
  cappedByLeverage: boolean
  status: 'OPEN' | 'CLOSED' | 'SKIPPED'
  skipReason?: string
  exitPrice?: number
  pnl?: number
  openedAt: string
  closedAt?: string
}

export type MilestoneRecord = {
  startingCapital: number
  milestonePercent: number
  milestoneEquity: number
  peakEquity: number
  triggeredAt: string
  feeAmount: number | null
  paymentTxHash: string | null
}

export type Simulation = {
  id: string
  walletAddress: string
  traderName: string
  startingCapital: number
  currentEquity: number
  peakEquity: number
  riskLimitPercent: number
  maxLossPerTrade: number
  drawdownPercent: number
  dailyLossLimitPercent: number
  maxDrawdownLimitPercent: number
  status: 'ACTIVE' | 'FAILED'
  failReason?: string
  milestonePercent: number
  milestoneEquity: number
  milestoneStatus: MilestoneStatus
  billingStatus: BillingStatus
  milestoneRecord?: MilestoneRecord
  trades: SimTrade[]
  createdAt: string
}
