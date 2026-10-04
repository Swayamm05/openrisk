import { useState } from 'react'
import { Disclaimer } from '../components/Disclaimer'
import { Stat } from '../components/Stat'
import { formatUsd } from '../lib/risk'
import { signalR, signalStats, validateSignal } from '../lib/engine'
import type { Direction, Signal, SignalInput } from '../lib/types'

type Props = {
  signals: Signal[]
  onPublish: (input: SignalInput) => Promise<void>
  onClose: (id: string, exitPrice: number) => void
}

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400'

function CloseControl({ signal, onClose }: { signal: Signal; onClose: Props['onClose'] }) {
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  function submit() {
    const p = Number(price)
    if (!(p > 0)) {
      setError('Enter a valid exit price.')
      return
    }
    setError('')
    onClose(signal.id, p)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPrice(String(signal.takeProfit))}
          className="rounded border border-emerald-500/50 px-3 py-1 text-xs text-emerald-300"
        >
          Hit TP
        </button>
        <button
          onClick={() => setPrice(String(signal.stopLoss))}
          className="rounded border border-red-500/50 px-3 py-1 text-xs text-red-300"
        >
          Hit SL
        </button>
      </div>
      <div className="flex gap-2">
        <input
          className={field}
          type="number"
          step="any"
          inputMode="decimal"
          placeholder="Exit price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          onClick={submit}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Close
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Trader({ signals, onPublish, onClose }: Props) {
  const [symbol, setSymbol] = useState('ETH/USDC')
  const [direction, setDirection] = useState<Direction>('LONG')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [tp, setTp] = useState('')
  const [thesis, setThesis] = useState('')
  const [lev, setLev] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const input: SignalInput = {
      symbol: symbol.trim(),
      direction,
      entry: Number(entry),
      stopLoss: Number(stop),
      takeProfit: Number(tp),
      thesis: thesis.trim(),
      maxLeverage: lev ? Number(lev) : undefined,
    }
    const err = validateSignal(input)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setBusy(true)
    try {
      await onPublish(input)
      setEntry('')
      setStop('')
      setTp('')
      setThesis('')
      setLev('')
    } finally {
      setBusy(false)
    }
  }

  const stats = signalStats(signals)
  const open = signals.filter((s) => s.status === 'OPEN')
  const history = [...signals].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  const dirBtn = (d: Direction) =>
    `rounded-lg border px-4 py-2 text-sm ${
      direction === d
        ? d === 'LONG'
          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
          : 'border-red-400 bg-red-500/20 text-red-300'
        : 'border-slate-700'
    }`

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Trader Dashboard</h1>
      <Disclaimer />
      <p className="rounded-lg border border-slate-700 p-3 text-xs text-slate-400">
        Phase 2 demo: anyone can open this page in their own browser, and signals are stored only in this
        browser. Later phases restrict publishing to the registered trader wallet and store signals on the
        backend. Published signals cannot be edited or deleted.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Publish a signal</h2>
        <input className={field} placeholder="Asset, e.g. ETH/USDC" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => setDirection('LONG')} className={dirBtn('LONG')}>
            LONG
          </button>
          <button onClick={() => setDirection('SHORT')} className={dirBtn('SHORT')}>
            SHORT
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className={field} type="number" step="any" inputMode="decimal" placeholder="Entry" value={entry} onChange={(e) => setEntry(e.target.value)} />
          <input className={field} type="number" step="any" inputMode="decimal" placeholder="Stop loss" value={stop} onChange={(e) => setStop(e.target.value)} />
          <input className={field} type="number" step="any" inputMode="decimal" placeholder="Take profit" value={tp} onChange={(e) => setTp(e.target.value)} />
        </div>
        <input className={field} type="number" step="any" inputMode="decimal" placeholder="Max leverage cap (optional, default 3)" value={lev} onChange={(e) => setLev(e.target.value)} />
        <textarea className={field} rows={3} placeholder="Trade thesis (optional)" value={thesis} onChange={(e) => setThesis(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? 'Publishing...' : 'Publish signal'}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Open signals</h2>
        {open.length === 0 && <p className="text-sm text-slate-400">None open.</p>}
        {open.map((s) => (
          <div key={s.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">
              {s.symbol}{' '}
              <span className={s.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{s.direction}</span>
            </p>
            <p className="text-sm text-slate-400">
              Entry {formatUsd(s.entry)} · SL {formatUsd(s.stopLoss)} · TP {formatUsd(s.takeProfit)}
            </p>
            <CloseControl signal={s} onClose={onClose} />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Performance (in R)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Signals" value={String(stats.total)} sub={`${stats.closed} closed`} />
          <Stat label="Win rate" value={`${stats.winRate.toFixed(0)}%`} />
          <Stat label="Average R" value={stats.avgR.toFixed(2)} />
          <Stat label="Total R" value={stats.totalR.toFixed(2)} tone={stats.totalR >= 0 ? 'good' : 'bad'} />
          <Stat label="Profit factor" value={stats.profitFactor === null ? 'n/a' : stats.profitFactor.toFixed(2)} />
          <Stat label="Max drawdown" value={`${stats.maxDrawdownR.toFixed(2)}R`} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">All signals</h2>
        {history.length === 0 && <p className="text-sm text-slate-400">No signals yet.</p>}
        {history.map((s) => {
          const r = signalR(s)
          return (
            <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">
                  {s.symbol} {s.direction}
                </span>
                <span className="text-slate-400">
                  {s.status}
                  {r !== null && ` · ${r.toFixed(2)}R`}
                </span>
              </div>
              <p className="text-slate-400">
                {formatUsd(s.entry)} / SL {formatUsd(s.stopLoss)} / TP {formatUsd(s.takeProfit)}
                {s.exitPrice !== undefined && ` / exit ${formatUsd(s.exitPrice)}`}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(s.publishedAt).toLocaleString()} · {s.hash.slice(0, 18)}...
              </p>
            </div>
          )
        })}
      </section>
    </div>
  )
            }
