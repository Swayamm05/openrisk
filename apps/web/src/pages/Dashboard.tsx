import { Disclaimer } from '../components/Disclaimer'
import { Stat } from '../components/Stat'
import { riskUtilization } from '../lib/engine'
import { drawdownPercent, formatUsd, milestoneProgress, round } from '../lib/risk'
import type { SimTrade, Simulation } from '../lib/types'

type Props = { sim: Simulation; onReset: () => void }

function TradeRow({ t }: { t: SimTrade }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          {t.symbol}{' '}
          <span className={t.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{t.direction}</span>
        </span>
        <span className="text-slate-400">{t.status}</span>
      </div>
      {t.status === 'SKIPPED' ? (
        <p className="text-slate-400">{t.skipReason}</p>
      ) : (
        <p className="text-slate-400">
          Size {t.quantity} · Entry {formatUsd(t.entry)} · Stop {formatUsd(t.stopLoss)} · Target{' '}
          {formatUsd(t.takeProfit)} · Risk {formatUsd(t.riskAmount)} · {t.leverage}x
          {t.exitPrice !== undefined && ` · Exit ${formatUsd(t.exitPrice)}`}
        </p>
      )}
      {t.pnl !== undefined && (
        <p className={t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>P&L {formatUsd(t.pnl)}</p>
      )}
    </div>
  )
}

export function Dashboard({ sim, onReset }: Props) {
  const pnl = round(sim.currentEquity - sim.startingCapital)
  const returnPct = round((pnl / sim.startingCapital) * 100, 2)
  const dd = drawdownPercent(sim.peakEquity, sim.currentEquity)
  const progress = milestoneProgress(sim.startingCapital, sim.currentEquity, sim.milestoneEquity)
  const tone = pnl > 0 ? 'good' : pnl < 0 ? 'bad' : 'normal'
  const util = riskUtilization(sim, new Date().toISOString())

  const active = sim.trades.filter((t) => t.status === 'OPEN')
  const history = [...sim.trades].filter((t) => t.status !== 'OPEN').reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Simulation Dashboard</h1>
        <p className="text-sm text-slate-400">Following: {sim.traderName}</p>
      </div>
      <Disclaimer />

      {sim.status === 'FAILED' && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">
          <strong>Simulation ended.</strong> {sim.failReason}
        </div>
      )}

      {sim.milestoneStatus === 'REACHED' && sim.milestoneRecord && (
        <section className="space-y-1 rounded-xl border border-emerald-400 bg-emerald-500/10 p-4">
          <h2 className="text-xl font-bold text-emerald-300">MILESTONE REACHED</h2>
          <p className="text-sm">Starting simulation: {formatUsd(sim.milestoneRecord.startingCapital)}</p>
          <p className="text-sm">Simulation equity at milestone: {formatUsd(sim.milestoneRecord.milestoneEquity)}</p>
          <p className="text-sm">Simulation return: +{sim.milestoneRecord.milestonePercent}%</p>
          <p className="text-sm">Service fee: to be set in Phase 5 (USDC on Arc). Nothing is charged now.</p>
          <p className="text-xs text-slate-400">
            Reached {new Date(sim.milestoneRecord.triggeredAt).toLocaleString()}. Simulated performance is
            hypothetical and is not your actual investment return. This milestone is counted once.
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Starting capital" value={formatUsd(sim.startingCapital)} sub="virtual" />
        <Stat label="Current equity" value={formatUsd(sim.currentEquity)} sub="simulated" />
        <Stat label="Realized P&L" value={formatUsd(pnl)} tone={tone} sub="hypothetical" />
        <Stat label="Return" value={`${returnPct}%`} tone={tone} sub="hypothetical" />
        <Stat label="Unrealized P&L" value="n/a" sub="needs live prices (Phase 3)" />
        <Stat label="Risk limit" value={`${sim.riskLimitPercent}%`} sub={`${formatUsd(sim.maxLossPerTrade)} per trade`} />
        <Stat label="Risk utilization" value={`${util}%`} sub="of daily loss budget" />
        <Stat label="Drawdown" value={`${dd}%`} sub={`limit ${sim.maxDrawdownLimitPercent}%`} />
        <Stat label="Daily loss limit" value={`${sim.dailyLossLimitPercent}%`} />
        <Stat label="Open trades" value={String(active.length)} />
        <Stat label="Status" value={sim.status} />
        <Stat label="Billing" value={sim.billingStatus.replace('_', ' ')} />
      </div>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex justify-between text-sm">
          <span>Milestone progress (+{sim.milestonePercent}%)</span>
          <span>
            {formatUsd(sim.currentEquity)} / {formatUsd(sim.milestoneEquity)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-slate-500">
          Based on realized simulation equity. Reaching it triggers a one-time service fee in a later phase.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Active trades</h2>
        {active.length === 0 && (
          <p className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            No open simulation trades.
          </p>
        )}
        {active.map((t) => (
          <TradeRow key={t.id} t={t} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Trade history</h2>
        {history.length === 0 && (
          <p className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Empty.</p>
        )}
        {history.map((t) => (
          <TradeRow key={t.id} t={t} />
        ))}
      </section>

      <button
        onClick={() => {
          if (confirm('Delete this simulation? This cannot be undone.')) onReset()
        }}
        className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
      >
        Reset simulation
      </button>
    </div>
  )
          }
