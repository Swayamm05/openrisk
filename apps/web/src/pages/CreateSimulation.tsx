import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Disclaimer } from '../components/Disclaimer'
import {
  MILESTONE_PERCENT,
  calcPositionSize,
  formatUsd,
  maxLossPerTrade,
  milestoneEquity,
  round,
} from '../lib/risk'
import { defaultLimits } from '../lib/engine'
import type { Simulation } from '../lib/types'

const CAPITAL_PRESETS = [1, 10, 100, 1000]
const RISK_PRESETS = [1, 2, 5]
const TRADER_NAME = 'OpenRisk Founder Trader'

type Props = { onCreate: (sim: Simulation) => void }

export function CreateSimulation({ onCreate }: Props) {
  const { address, isConnected } = useAccount()

  const [capitalChoice, setCapitalChoice] = useState<number | 'custom'>(10)
  const [customCapital, setCustomCapital] = useState('')
  const [riskChoice, setRiskChoice] = useState<number | 'custom'>(2)
  const [customRisk, setCustomRisk] = useState('')

  const capital = capitalChoice === 'custom' ? Number(customCapital) : capitalChoice
  const risk = riskChoice === 'custom' ? Number(customRisk) : riskChoice

  const capitalOk = capital >= 1 && capital <= 100000
  const riskOk = risk >= 0.1 && risk <= 10
  const valid = capitalOk && riskOk

  const maxLoss = valid ? maxLossPerTrade(capital, risk) : 0
  const target = valid ? milestoneEquity(capital) : 0
  const limits = valid ? defaultLimits(risk) : null
  const example = valid
    ? calcPositionSize({ capital, riskPercent: risk, entry: 2700, stop: 2665 })
    : null

  function start() {
    if (!address || !valid) return
    const lim = defaultLimits(risk)
    const sim: Simulation = {
      id: crypto.randomUUID(),
      walletAddress: address,
      traderName: TRADER_NAME,
      startingCapital: capital,
      currentEquity: capital,
      peakEquity: capital,
      riskLimitPercent: risk,
      maxLossPerTrade: maxLossPerTrade(capital, risk),
      drawdownPercent: 0,
      dailyLossLimitPercent: lim.dailyLossLimitPercent,
      maxDrawdownLimitPercent: lim.maxDrawdownLimitPercent,
      status: 'ACTIVE',
      milestonePercent: MILESTONE_PERCENT,
      milestoneEquity: milestoneEquity(capital),
      milestoneStatus: 'NOT_REACHED',
      billingStatus: 'NOT_TRIGGERED',
      trades: [],
      createdAt: new Date().toISOString(),
    }
    onCreate(sim)
  }

  const chip = (active: boolean) =>
    `rounded-lg border px-4 py-2 text-sm ${
      active
        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
        : 'border-slate-700 hover:bg-slate-800'
    }`

  const input =
    'w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400'

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create Simulation</h1>
      <Disclaimer />

      <section className="space-y-2">
        <h2 className="font-semibold">Simulation capital (virtual USD)</h2>
        <div className="flex flex-wrap items-center gap-2">
          {CAPITAL_PRESETS.map((c) => (
            <button key={c} onClick={() => setCapitalChoice(c)} className={chip(capitalChoice === c)}>
              ${c.toLocaleString()}
            </button>
          ))}
          <button onClick={() => setCapitalChoice('custom')} className={chip(capitalChoice === 'custom')}>
            Custom
          </button>
          {capitalChoice === 'custom' && (
            <input
              className={input}
              type="number"
              min={1}
              max={100000}
              placeholder="e.g. 50"
              value={customCapital}
              onChange={(e) => setCustomCapital(e.target.value)}
            />
          )}
        </div>
        {!capitalOk && <p className="text-xs text-red-400">Enter an amount from $1 to $100,000.</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Maximum risk per trade</h2>
        <div className="flex flex-wrap items-center gap-2">
          {RISK_PRESETS.map((r) => (
            <button key={r} onClick={() => setRiskChoice(r)} className={chip(riskChoice === r)}>
              {r}%
            </button>
          ))}
          <button onClick={() => setRiskChoice('custom')} className={chip(riskChoice === 'custom')}>
            Custom
          </button>
          {riskChoice === 'custom' && (
            <input
              className={input}
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              placeholder="e.g. 1.5"
              value={customRisk}
              onChange={(e) => setCustomRisk(e.target.value)}
            />
          )}
        </div>
        {!riskOk && <p className="text-xs text-red-400">Enter a risk from 0.1% to 10%.</p>}
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Trader</h2>
        <p className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">{TRADER_NAME}</p>
      </section>

      {valid && limits && (
        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold">Your limits</h2>
          <p className="text-sm">
            Maximum loss per trade: <strong>{formatUsd(maxLoss)}</strong>
          </p>
          <p className="text-sm">
            Daily loss limit: <strong>{limits.dailyLossLimitPercent}%</strong> (
            {formatUsd(round((capital * limits.dailyLossLimitPercent) / 100))}). New trades are skipped for
            the rest of the day once it is reached.
          </p>
          <p className="text-sm">
            Max drawdown limit: <strong>{limits.maxDrawdownLimitPercent}%</strong>. Breaching it ends the
            simulation.
          </p>
          <p className="text-sm">
            {MILESTONE_PERCENT}% milestone equity: <strong>{formatUsd(target)}</strong>
          </p>
          {example && (
            <p className="text-xs text-slate-400">
              Example: ETH long, entry $2,700, stop $2,665 &rarr; simulated size{' '}
              {example.quantity.toFixed(4)} ETH (about {formatUsd(example.notional)} notional,{' '}
              {example.impliedLeverage.toFixed(2)}x of your capital). The loss at the stop is{' '}
              {formatUsd(example.maxLoss)}. Leverage is capped at 3x by default.
            </p>
          )}
        </section>
      )}

      <button
        onClick={start}
        disabled={!isConnected || !valid}
        className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start Simulation
      </button>
      {!isConnected && <p className="text-sm text-slate-400">Connect your wallet first.</p>}
    </div>
  )
      }
