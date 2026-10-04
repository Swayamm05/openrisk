// Connects the pure engine to the database.
import type { Prisma, TradeSignal } from '@prisma/client'
import { prisma } from './db'
import { syncSimulation } from './engine'
import type { Signal, SimTrade, Simulation as EngineSim } from './engine'

export const simInclude = {
  trades: true,
  user: true,
  trader: true,
  billingEvents: true,
} satisfies Prisma.SimulationInclude

type DbSim = Prisma.SimulationGetPayload<{ include: typeof simInclude }>
type DbTrade = DbSim['trades'][number]

export function signalToEngine(s: TradeSignal): Signal {
  return {
    id: s.id,
    symbol: s.symbol,
    direction: s.direction as 'LONG' | 'SHORT',
    entry: s.entryPrice,
    stopLoss: s.stopLoss,
    takeProfit: s.takeProfit,
    thesis: s.thesis,
    maxLeverage: s.maxLeverage ?? undefined,
    publishedAt: s.publishedAt.toISOString(),
    hash: s.signalHash,
    status: s.status as 'OPEN' | 'CLOSED',
    exitPrice: s.exitPrice ?? undefined,
    closedAt: s.closedAt ? s.closedAt.toISOString() : undefined,
  }
}

function tradeToEngine(t: DbTrade): SimTrade {
  return {
    id: t.id,
    signalId: t.signalId,
    symbol: t.symbol,
    direction: t.direction as 'LONG' | 'SHORT',
    entry: t.simulatedEntry,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    quantity: t.quantity,
    notional: t.notional,
    riskAmount: t.riskAmount,
    leverage: t.leverage,
    cappedByLeverage: t.cappedByLeverage,
    status: t.status as 'OPEN' | 'CLOSED' | 'SKIPPED',
    skipReason: t.skipReason ?? undefined,
    exitPrice: t.simulatedExit ?? undefined,
    pnl: t.pnl ?? undefined,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : undefined,
  }
}

function simToEngine(s: DbSim): EngineSim {
  const ev = s.billingEvents[0]
  const trades = [...s.trades].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime())
  return {
    id: s.id,
    walletAddress: s.user.walletAddress,
    traderName: s.trader.displayName,
    startingCapital: s.startingCapital,
    currentEquity: s.currentEquity,
    peakEquity: s.peakEquity,
    riskLimitPercent: s.riskLimitPercent,
    maxLossPerTrade: s.maxLoss,
    drawdownPercent: s.drawdown,
    dailyLossLimitPercent: s.dailyLossLimitPercent,
    maxDrawdownLimitPercent: s.maxDrawdownLimitPercent,
    status: s.status as 'ACTIVE' | 'FAILED',
    failReason: s.failReason ?? undefined,
    milestonePercent: s.milestonePercent,
    milestoneEquity: s.milestoneEquity,
    milestoneStatus: s.milestoneStatus as 'NOT_REACHED' | 'REACHED',
    billingStatus: s.billingStatus as 'NOT_TRIGGERED' | 'PENDING' | 'PAID',
    milestoneRecord: ev
      ? {
          startingCapital: s.startingCapital,
          milestonePercent: ev.milestonePercent,
          milestoneEquity: ev.milestoneEquity,
          peakEquity: ev.peakEquity,
          triggeredAt: ev.triggeredAt.toISOString(),
          feeAmount: ev.feeAmount,
          paymentTxHash: ev.paymentTxHash,
        }
      : undefined,
    trades: trades.map(tradeToEngine),
    createdAt: s.createdAt.toISOString(),
  }
}

/** Applies all signals to one simulation and saves the result. Returns the updated simulation. */
export async function syncOne(simId: string): Promise<EngineSim | null> {
  const db = await prisma.simulation.findUnique({ where: { id: simId }, include: simInclude })
  if (!db) return null

  const signals = await prisma.tradeSignal.findMany({
    where: { publishedAt: { gte: db.createdAt } },
    orderBy: { publishedAt: 'asc' },
  })

  const before = simToEngine(db)
  const after = syncSimulation(before, signals.map(signalToEngine))

  const ops: Prisma.PrismaPromise<unknown>[] = []
  const known = new Map(db.trades.map((t) => [t.signalId, t]))

  for (const t of after.trades) {
    const row = known.get(t.signalId)
    if (!row) {
      ops.push(
        prisma.simulationTrade.create({
          data: {
            id: t.id,
            simulationId: db.id,
            signalId: t.signalId,
            symbol: t.symbol,
            direction: t.direction,
            simulatedEntry: t.entry,
            stopLoss: t.stopLoss,
            takeProfit: t.takeProfit,
            quantity: t.quantity,
            notional: t.notional,
            riskAmount: t.riskAmount,
            leverage: t.leverage,
            cappedByLeverage: t.cappedByLeverage,
            simulatedExit: t.exitPrice ?? null,
            pnl: t.pnl ?? null,
            status: t.status,
            skipReason: t.skipReason ?? null,
            openedAt: new Date(t.openedAt),
            closedAt: t.closedAt ? new Date(t.closedAt) : null,
          },
        }),
      )
    } else if (row.status !== t.status) {
      ops.push(
        prisma.simulationTrade.update({
          where: { id: row.id },
          data: {
            status: t.status,
            simulatedExit: t.exitPrice ?? null,
            pnl: t.pnl ?? null,
            closedAt: t.closedAt ? new Date(t.closedAt) : null,
          },
        }),
      )
    }
  }

  ops.push(
    prisma.simulation.update({
      where: { id: db.id },
      data: {
        currentEquity: after.currentEquity,
        peakEquity: after.peakEquity,
        maxLoss: after.maxLossPerTrade,
        drawdown: after.drawdownPercent,
        status: after.status,
        failReason: after.failReason ?? null,
        milestoneStatus: after.milestoneStatus,
        billingStatus: after.billingStatus,
      },
    }),
  )

  if (after.currentEquity !== before.currentEquity) {
    ops.push(
      prisma.performanceSnapshot.create({
        data: {
          simulationId: db.id,
          equity: after.currentEquity,
          pnl: after.currentEquity - after.startingCapital,
          drawdown: after.drawdownPercent,
        },
      }),
    )
  }

  if (after.milestoneRecord && db.billingEvents.length === 0) {
    const rec = after.milestoneRecord
    ops.push(
      prisma.billingEvent.create({
        data: {
          simulationId: db.id,
          milestonePercent: rec.milestonePercent,
          milestoneEquity: rec.milestoneEquity,
          peakEquity: rec.peakEquity,
          feeAmount: null,
          currency: 'USDC',
          status: 'PENDING',
          triggeredAt: new Date(rec.triggeredAt),
        },
      }),
    )
  }

  await prisma.$transaction(ops)
  return after
}

export async function syncAll(): Promise<void> {
  const sims = await prisma.simulation.findMany({ select: { id: true } })
  for (const s of sims) {
    try {
      await syncOne(s.id)
    } catch (e) {
      console.error('sync failed for simulation', s.id, e)
    }
  }
}

/** Closes an open signal once, then updates every simulation. */
export async function closeSignalById(id: string, exitPrice: number): Promise<boolean> {
  const res = await prisma.tradeSignal.updateMany({
    where: { id, status: 'OPEN' },
    data: { status: 'CLOSED', exitPrice, closedAt: new Date() },
  })
  if (res.count === 0) return false
  await syncAll()
  return true
    }
