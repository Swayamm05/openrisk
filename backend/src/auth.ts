import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'
import { verifyMessage } from 'viem'
import type { NextFunction, Request, Response } from 'express'
import { config } from './config'

// One-time sign-in challenges, kept in memory for 5 minutes.
const challenges = new Map<string, { message: string; expires: number }>()

export function createChallenge(address: string): string {
  const nonce = randomBytes(16).toString('hex')
  const issuedAt = new Date().toISOString()
  const message = [
    'Sign in to OpenRisk',
    '',
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt}`,
    '',
    'This signature proves you own this wallet. It costs no gas, sends no funds, and gives OpenRisk no access to your assets.',
  ].join('\n')
  challenges.set(address.toLowerCase(), { message, expires: Date.now() + 5 * 60 * 1000 })
  return message
}

export async function checkSignature(address: string, signature: string): Promise<boolean> {
  const key = address.toLowerCase()
  const entry = challenges.get(key)
  if (!entry || entry.expires < Date.now()) return false
  challenges.delete(key) // each challenge works once
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message: entry.message,
      signature: signature as `0x${string}`,
    })
  } catch {
    return false
  }
}

export function issueToken(address: string): string {
  return jwt.sign({ address: address.toLowerCase() }, config.jwtSecret, { expiresIn: '12h' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { address?: string }
    if (!payload.address) throw new Error('no address')
    res.locals.address = payload.address
    next()
  } catch {
    res.status(401).json({ error: 'Please sign in with your wallet.' })
  }
}

export function requireTrader(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.address !== config.traderAddress) {
    res.status(403).json({ error: 'Only the registered trader can do this.' })
    return
  }
  next()
  }
