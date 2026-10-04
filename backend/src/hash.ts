import { createHash } from 'crypto'

// SHA-256 fingerprint of a signal's published fields.
// Phase 4 stores this hash on Arc as a tamper-proof timestamp.
export function hashSignal(f: {
  symbol: string
  direction: string
  entry: number
  stopLoss: number
  takeProfit: number
  thesis: string
  maxLeverage?: number
  publishedAt: string
}): string {
  const canonical = JSON.stringify([
    f.symbol,
    f.direction,
    f.entry,
    f.stopLoss,
    f.takeProfit,
    f.thesis,
    f.maxLeverage ?? null,
    f.publishedAt,
  ])
  return '0x' + createHash('sha256').update(canonical).digest('hex')
    }
