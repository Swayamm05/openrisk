// Creates a SHA-256 fingerprint of a signal's published fields.
// Phase 4 stores this hash on Arc as a tamper-proof timestamp.
export async function hashSignal(fields: {
  symbol: string
  direction: string
  entry: number
  stopLoss: number
  takeProfit: number
  thesis: string
  maxLeverage?: number
  publishedAt: string
}): Promise<string> {
  const canonical = JSON.stringify([
    fields.symbol,
    fields.direction,
    fields.entry,
    fields.stopLoss,
    fields.takeProfit,
    fields.thesis,
    fields.maxLeverage ?? null,
    fields.publishedAt,
  ])
  const bytes = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return '0x' + hex
    }
