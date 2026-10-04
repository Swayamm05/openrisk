import { useAccount } from 'wagmi'
import { ConnectButton } from '../components/ConnectButton'
import { Disclaimer } from '../components/Disclaimer'

type Props = { onStart: () => void }

export function Landing({ onStart }: Props) {
  const { isConnected } = useAccount()

  return (
    <div className="space-y-10">
      <section className="space-y-5 pt-8">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Risk-controlled trading simulation with transparent trader signals.
        </h1>
        <p className="max-w-2xl text-slate-300">
          Pick virtual capital and a maximum risk limit. Follow a trader&apos;s published signals in a
          simulation that sizes every trade to your limit. No real money is ever deposited.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          {isConnected ? (
            <button
              onClick={onStart}
              className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Create Simulation
            </button>
          ) : (
            <ConnectButton />
          )}
          <a
            href="#traders"
            className="rounded-lg border border-slate-600 px-5 py-2 hover:bg-slate-800"
          >
            Explore Traders
          </a>
        </div>
      </section>

      <section id="traders" className="space-y-3">
        <h2 className="text-xl font-semibold">Traders</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="font-semibold">OpenRisk Founder Trader</p>
          <p className="text-sm text-slate-400">
            The first model trader. Publishes signals manually with entry, stop loss, and take profit.
            Public statistics arrive in Phase 6.
          </p>
        </div>
      </section>

      <Disclaimer />
    </div>
  )
    }
