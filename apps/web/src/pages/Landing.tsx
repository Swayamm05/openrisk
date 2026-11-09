
import { useAuth } from '../lib/auth'
import { ConnectButton } from '../components/ConnectButton'
import { Disclaimer } from '../components/Disclaimer'

type Props = { onStart: () => void }

export function Landing({ onStart }: Props) {
  const { isSignedIn } = useAuth()

  return (
    <div className="space-y-12">
      <section className="space-y-5 pt-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Crypto Risk Intelligence • Deal Discovery • Capital Allocation
        </p>

        <h1 className="text-4xl font-bold sm:text-5xl">
          Analyse Risk. Discover Opportunities. Connect Capital.
        </h1>

        <p className="max-w-3xl text-slate-300">
          OpenRisk is being developed as a crypto risk-intelligence and
          deal-facilitation network. We aim to help investors, hedge funds,
          traders, market makers, protocols and crypto businesses assess
          counterparties, discover commercially attractive opportunities
          and connect with suitable partners for deals and capital deployment.
        </p>

        <div className="flex flex-wrap items-start gap-3">
          {isSignedIn ? (
            <button
              onClick={onStart}
              className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Open Simulation Prototype
            </button>
          ) : (
            <ConnectButton />
          )}
          <a
            href="#vision"
            className="rounded-lg border border-slate-600 px-5 py-2 hover:bg-slate-800"
          >
            Explore OpenRisk
          </a>
        </div>
      </section>

      <section id="vision" className="space-y-5">
        <h2 className="text-2xl font-semibold">What OpenRisk aims to do</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-emerald-400">Analyse Risk</h3>
            <p className="mt-2 text-sm text-slate-300">
              Assess counterparty credibility, trading records, exposure,
              liquidity, operational risks and deal-specific risk factors.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-emerald-400">
              Discover & Facilitate Deals
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Help relevant participants discover counterparties and coordinate
              OTC, liquidity, market-making, strategic and other crypto-market
              opportunities.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-emerald-400">
              Support Capital Allocation
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Help investors and capital providers evaluate traders, strategies,
              funds, protocols and opportunities against their risk preferences.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Who we aim to connect</h2>
        <p className="max-w-3xl text-slate-300">
          Hedge funds, crypto funds, investors, traders, trading firms,
          market makers, liquidity providers, OTC participants, blockchain
          protocols, token projects and crypto businesses.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Working prototype</h2>
        <div className="rounded-xl border border-emerald-900 bg-slate-900 p-5">
          <p className="font-semibold">Risk-controlled trading simulation</p>
          <p className="mt-2 text-sm text-slate-300">
            The current prototype provides wallet authentication, virtual
            trading simulations, risk-based position sizing, risk limits and
            trade-record infrastructure. It is the technical foundation for
            the broader OpenRisk network.
          </p>
          <p className="mt-3 text-sm text-amber-300">
            Deal discovery, counterparty matching and real-money capital
            allocation are planned capabilities, not currently live features.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Our direction</h2>
        <p className="max-w-3xl text-slate-300">
          We want to make crypto-market opportunities easier to assess,
          counterparties easier to discover and capital deployment more
          informed. OpenRisk is being built incrementally, with risk
          transparency and responsible product boundaries at its core.
        </p>
      </section>

      <Disclaimer />
    </div>
  )
}
