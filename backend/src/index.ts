import express from 'express'
import type { Request, RequestHandler, Response } from 'express'
import cors from 'cors'
import { isAddress } from 'viem'
import { config } from './config'
import { prisma } from './db'
import { checkSignature, createChallenge, issueToken, requireAuth, requireTrader } from './auth'
import { hashSignal } from './hash'
import { signalStats, simulationParams, validateSignal } from './engine'
import type { SignalInput } from './engine'
import { closeSignalById, signalToEngine, syncAll, syncOne } from './sync'
import { startPriceMonitor } from './monitor'

const app = express()
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }))
app.use(express.json({ limit: '20kb' }))

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next)
  }

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// ---------- Sign-in ----------
app.post(
  '/auth/nonce',
  wrap(async (req, res) => {
    const address = String(req.body?.address ?? '')
    if (!isAddress(address)) {
      res.status(400).json({ error: 'Invalid wallet address.' })
      return
    }
    res.json({ message: createChallenge(address) })
  }),
)

app.post(
  '/auth/verify',
  wrap(async (req, res) => {
    const address = String(req.body?.address ?? '')
    const signature = String(req.body?.signature ?? '')
    if (!isAddress(address) || !signature) {
      res.status(400).json({ error: 'Invalid request.' })
      return
    }
    const ok = await checkSignature(address, signature)
    if (!ok) {
      res.status(401).json({ error: 'Signature check failed. Try signing in again.' })
      return
    }
    const lower = address.toLowerCase()
    await prisma.user.upsert({
      where: { walletAddress: lower },
      update: {},
      create: { walletAddress: lower },
    })
    res.json({ token: issueToken(lower), isTrader: lower === config.traderAddress })
  }),
)

// ---------- Signals ----------
app.get(
  '/signals',
  wrap(async (_req, res) => {
    const rows = await prisma.tradeSignal.findMany({ orderBy: { publishedAt: 'asc' } })
    res.json({ signals: rows.map(signalToEngine) })
  }),
)

app.get(
  '/stats',
  wrap(async (_req, res) => {
    const rows = await prisma.tradeSignal.findMany()
    res.json(signalStats(rows.map(signalToEngine)))
  }),
)

app.post(
  '/signals',
  requireAuth,
  requireTrader,
  wrap(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>
    if (b.direction !== 'LONG' && b.direction !== 'SHORT') {
      res.status(400).json({ error: 'Direction must be LONG or SHORT.' })
      return
    }
    const input: SignalInput = {
      symbol: typeof b.symbol === 'string' ? b.symbol.trim().toUpperCase().slice(0, 21) : '',
      direction: b.direction,
      entry: Number(b.entry),
      stopLoss: Number(b.stopLoss),
      takeProfit: Number(b.takeProfit),
      thesis: typeof b.thesis === 'string' ? b.thesis.trim().slice(0, 2000) : '',
      maxLeverage:
        b.maxLeverage === undefined || b.maxLeverage === null ? undefined : Number(b.maxLeverage),
    }
    if (!/^[A-Z0-9]{2,10}(\/[A-Z0-9]{2,10})?$/.test(input.symbol)) {
      res.status(400).json({ error: 'Symbol must look like ETH/USDC.' })
      return
    }
    const problem = validateSignal(input)
    if (problem) {
      res.status(400).json({ error: problem })
      return
    }

    const trader = await prisma.trader.findUniqueOrThrow({
      where: { walletAddress: config.traderAddress },
    })
    const publishedAt = new Date()
    const signalHash = hashSignal({ ...input, publishedAt: publishedAt.toISOString() })

    const row = await prisma.tradeSignal.create({
      data: {
        traderId: trader.id,
        symbol: input.symbol,
        direction: input.direction,
        entryPrice: input.entry,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        thesis: input.thesis,
        maxLeverage: input.maxLeverage ?? null,
        publishedAt,
        signalHash,
      },
    })

    const sims = await prisma.simulation.findMany({ select: { userId: true } })
    if (sims.length) {
      await prisma.notification.createMany({
        data: sims.map((s) => ({ userId: s.userId, tradeSignalId: row.id })),
      })
    }
    await syncAll()
    res.status(201).json({ signal: signalToEngine(row) })
  }),
)

app.post(
  '/signals/:id/close',
  requireAuth,
  requireTrader,
  wrap(async (req, res) => {
    const exitPrice = Number(req.body?.exitPrice)
    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      res.status(400).json({ error: 'Enter a valid exit price.' })
      return
    }
    const closed = await closeSignalById(String(req.params.id), exitPrice)
    if (!closed) {
      res.status(404).json({ error: 'Signal not found or already closed.' })
      return
    }
    res.json({ ok: true })
  }),
)

// ---------- Simulations ----------
app.post(
  '/simulations',
  requireAuth,
  wrap(async (req, res) => {
    const capital = Number(req.body?.startingCapital)
    const risk = Number(req.body?.riskLimitPercent)
    if (!(capital >= 1 && capital <= 100000)) {
      res.status(400).json({ error: 'Capital must be from $1 to $100,000.' })
      return
    }
    if (!(risk >= 0.1 && risk <= 10)) {
      res.status(400).json({ error: 'Risk must be from 0.1% to 10%.' })
      return
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { walletAddress: res.locals.address } })
    const existing = await prisma.simulation.findUnique({ where: { userId: user.id } })
    if (existing) {
      res.status(409).json({ error: 'You already have a simulation. Reset it first.' })
      return
    }
    const trader = await prisma.trader.findUniqueOrThrow({
      where: { walletAddress: config.traderAddress },
    })

    const p = simulationParams(capital, risk)
    const created = await prisma.simulation.create({
      data: {
        userId: user.id,
        traderId: trader.id,
        startingCapital: capital,
        currentEquity: capital,
        peakEquity: capital,
        riskLimitPercent: risk,
        maxLoss: p.maxLoss,
        drawdown: 0,
        dailyLossLimitPercent: p.dailyLossLimitPercent,
        maxDrawdownLimitPercent: p.maxDrawdownLimitPercent,
        milestoneEquity: p.milestoneEquity,
      },
    })
    await prisma.performanceSnapshot.create({
      data: { simulationId: created.id, equity: capital, pnl: 0, drawdown: 0 },
    })
    res.status(201).json({ simulation: await syncOne(created.id) })
  }),
)

app.get(
  '/simulations/me',
  requireAuth,
  wrap(async (_req, res) => {
    const sim = await prisma.simulation.findFirst({
      where: { user: { walletAddress: res.locals.address } },
      select: { id: true },
    })
    if (!sim) {
      res.json({ simulation: null })
      return
    }
    res.json({ simulation: await syncOne(sim.id) })
  }),
)

app.delete(
  '/simulations/me',
  requireAuth,
  wrap(async (_req, res) => {
    const sim = await prisma.simulation.findFirst({
      where: { user: { walletAddress: res.locals.address } },
    })
    if (!sim) {
      res.json({ ok: true })
      return
    }
    if (sim.milestoneStatus === 'REACHED') {
      res.status(409).json({ error: 'A simulation that reached its milestone cannot be reset.' })
      return
    }
    await prisma.simulation.delete({ where: { id: sim.id } })
    res.json({ ok: true })
  }),
)

// ---------- Errors ----------
app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Server error. Please try again.' })
})

async function main() {
  // Make sure the registered trader exists in the database.
  await prisma.trader.upsert({
    where: { walletAddress: config.traderAddress },
    update: {},
    create: {
      walletAddress: config.traderAddress,
      displayName: 'OpenRisk Founder Trader',
      description: 'The first model trader. Publishes signals manually.',
      verified: true,
    },
  })
  if (config.priceMonitor) startPriceMonitor()
  app.listen(config.port, () => console.log(`OpenRisk API listening on port ${config.port}`))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
