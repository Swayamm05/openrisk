import { formatUsd } from '../lib/risk'
import { DEFAULT_MAX_LEVERAGE, signalR, sizeTrade } from '../lib/engine'
import type { Signal, Simulation } from '../lib/types'

type Props = { signal: Signal; sim: Simulation | null }

export function SignalCard({ signal: s, sim }: Props) {
  const risk = Math.abs(s.entry - s.stopLoss)
  const reward = Math.abs(s.takeProfit - s.entry)
  const rr = risk > 0 ? reward / risk : 0
  const cap = s.maxLeverage ?? DEFAULT_MAX_LEVERAGE
  const mine = sim?.trades.find((t) => t.signalId === s.id)
  const beforeJoin = sim ? s.publishedAt < sim.createdAt : false
  const sized = sim ? sizeTrade(sim.currentEquity, sim.riskLimitPercent, s.entry, s.stopLoss, cap) : null
  const r = signalR(s)

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {s.symbol}{' '}
          <span className={s.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{s.direction}</span>
        </h3>
        <span className="rounded bg-slate-800 px-2 py-1 text-xs">
          {s.status}
          {r !== null && ` · ${r.toFixed(2)}R`}
        </span>
      </div>

      <p className="rounded bg-amber-500/10 p-2 text-xs text-amber-200">
        <strong>Simulation trade.</strong> This is not an executed trade for your account.
      </p>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Entry</p>
          <p>{formatUsd(s.entry)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Stop</p>
          <p>{formatUsd(s.stopLoss)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Target</p>
          <p>{formatUsd(s.takeProfit)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Risk per unit</p>
          <p>
            {formatUsd(risk)} ({rr.toFixed(2)}R target)
          </p>
        </div>
      </div>

      {s.status === 'CLOSED' && s.exitPrice !== undefined && (
        <p className="text-sm text-slate-300">Closed at {formatUsd(s.exitPrice)}</p>
      )}
      {s.thesis && <p className="text-sm text-slate-300">Thesis: {s.thesis}</p>}

      <p className="text-xs text-slate-500">
        Trader: OpenRisk Founder Trader · Published {new Date(s.publishedAt).toLocaleString()}
        <br />
        Signal hash: {s.hash.slice(0, 18)}...
      </p>

      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm">
        <p className="font-semibold">Size for your account</p>
        {!sim && <p className="text-slate-400">Create a simulation to see the size for your account.</p>}
        {sim && sized && (
          <>
            <p>
              Size: {sized.quantity.toFixed(6)} ({formatUsd(sized.notional)} notional,{' '}
              {sized.leverage.toFixed(2)}x)
            </p>
            <p>Loss if stopped out: {formatUsd(sized.riskAmount)}</p>
            {sized.cappedByLeverage && (
              <p className="text-amber-300">
                Reduced to respect the {cap}x leverage cap, so the risk is below your {sim.riskLimitPercent}%
                limit.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Informational only, not investment advice. Based on your current simulation equity.
            </p>
          </>
        )}
        {sim && beforeJoin && (
          <p className="text-slate-400">Published before your simulation started, so not applied to it.</p>
        )}
        {sim && mine && (
          <p className="text-slate-300">
            Your simulation: {mine.status}
            {mine.skipReason ? ` (${mine.skipReason})` : ''}
            {mine.pnl !== undefined ? ` · P&L ${formatUsd(mine.pnl)}` : ''}
          </p>
        )}
      </div>
    </div>
  )
      }
