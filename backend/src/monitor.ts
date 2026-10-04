// Optional: closes open signals when the market price touches the stop or the target.
// Turn on with PRICE_MONITOR=on. Checks every 30 seconds, so very fast wicks can be missed.
import { prisma } from './db'
import { closeSignalById } from './sync'

const cache = new Map<string, { price: number; at: number }>()

function toPair(symbol: string): string | null {
  const base = symbol.split('/')[0]?.trim().toUpperCase()
  return base && /^[A-Z0-9]{2,10}$/.test(base) ? `${base}-USD` : null
}

async function getPrice(symbol: string): Promise<number | null> {
  const pair = toPair(symbol)
  if (!pair) return null
  const hit = cache.get(pair)
  if (hit && Date.now() - hit.at < 15000) return hit.price
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`)
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { amount?: string } }
    const price = Number(json.data?.amount)
    if (!Number.isFinite(price) || price <= 0) return null
    cache.set(pair, { price, at: Date.now() })
    return price
  } catch {
    return null
  }
}

async function checkOpenSignals(): Promise<void> {
  const open = await prisma.tradeSignal.findMany({ where: { status: 'OPEN' } })
  for (const s of open) {
    const price = await getPrice(s.symbol)
    if (price === null) continue
    const long = s.direction === 'LONG'
    const hitStop = long ? price <= s.stopLoss : price >= s.stopLoss
    const hitTarget = long ? price >= s.takeProfit : price <= s.takeProfit
    if (!hitStop && !hitTarget) continue
    // If both are true at once, the stop wins (the conservative choice).
    await closeSignalById(s.id, hitStop ? s.stopLoss : s.takeProfit)
  }
}

export function startPriceMonitor(): void {
  setInterval(() => {
    checkOpenSignals().catch((e) => console.error('price monitor error', e))
  }, 30000)
}
