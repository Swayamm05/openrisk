import { Disclaimer } from '../components/Disclaimer'
import { SignalCard } from '../components/SignalCard'
import type { Signal, Simulation } from '../lib/types'

type Props = { signals: Signal[]; sim: Simulation | null }

export function Signals({ signals, sim }: Props) {
  const sorted = [...signals].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trade Signals</h1>
      <Disclaimer />
      {sorted.length === 0 && (
        <p className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          No signals published yet.
        </p>
      )}
      <div className="space-y-4">
        {sorted.map((s) => (
          <SignalCard key={s.id} signal={s} sim={sim} />
        ))}
      </div>
    </div>
  )
}
