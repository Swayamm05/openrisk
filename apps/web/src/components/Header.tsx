import { ConnectButton } from './ConnectButton'

export type Screen = 'landing' | 'create' | 'dashboard' | 'signals' | 'trader'

type Props = {
  screen: Screen
  onNavigate: (s: Screen) => void
}

export function Header({ screen, onNavigate }: Props) {
  const link = (s: Screen, label: string) => (
    <button
      onClick={() => onNavigate(s)}
      className={`whitespace-nowrap text-sm ${
        screen === s ? 'text-emerald-400' : 'text-slate-300 hover:text-white'
      }`}
    >
      {label}
    </button>
  )

  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <button onClick={() => onNavigate('landing')} className="text-lg font-bold">
          Open<span className="text-emerald-400">Risk</span>
        </button>
        <ConnectButton />
      </div>
      <nav className="mx-auto flex max-w-5xl gap-5 overflow-x-auto px-4 pb-3">
        {link('landing', 'Home')}
        {link('create', 'New Simulation')}
        {link('dashboard', 'Dashboard')}
        {link('signals', 'Signals')}
        {link('trader', 'Trader')}
      </nav>
    </header>
  )
}
