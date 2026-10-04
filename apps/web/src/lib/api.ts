import { API_URL } from '../config/api'
import type { Signal, SignalInput, Simulation } from './types'

let authToken = ''

export function setToken(token: string) {
  authToken = token
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API_URL) throw new Error('Backend address is not set. Edit apps/web/src/config/api.ts')
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return data as T
}

export const api = {
  nonce: (address: string) =>
    request<{ message: string }>('/auth/nonce', { method: 'POST', body: { address } }),
  verify: (address: string, signature: string) =>
    request<{ token: string; isTrader: boolean }>('/auth/verify', {
      method: 'POST',
      body: { address, signature },
    }),
  signals: () => request<{ signals: Signal[] }>('/signals'),
  publish: (input: SignalInput) =>
    request<{ signal: Signal }>('/signals', { method: 'POST', body: input }),
  close: (id: string, exitPrice: number) =>
    request<{ ok: true }>(`/signals/${id}/close`, { method: 'POST', body: { exitPrice } }),
  mySimulation: () => request<{ simulation: Simulation | null }>('/simulations/me'),
  createSimulation: (startingCapital: number, riskLimitPercent: number) =>
    request<{ simulation: Simulation }>('/simulations', {
      method: 'POST',
      body: { startingCapital, riskLimitPercent },
    }),
  deleteSimulation: () => request<{ ok: true }>('/simulations/me', { method: 'DELETE' }),
    }
