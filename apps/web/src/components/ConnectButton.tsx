import { useConnect } from 'wagmi'
import { useAuth } from '../lib/auth'

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

export function ConnectButton() {
  const { connect, connectors, error: connectError, isPending } = useConnect()
  const { address, connectedAddress, isSignedIn, busy, error, signIn, signOut } = useAuth()

  if (isSignedIn && address) {
    return (
      <button
        onClick={signOut}
        className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
      >
        {shortAddress(address)} &middot; Sign out
      </button>
    )
  }

  if (connectedAddress) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => void signIn()}
          disabled={busy}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? 'Check your wallet...' : 'Sign in with wallet'}
        </button>
        <button onClick={signOut} className="text-xs text-slate-400 underline">
          Disconnect {shortAddress(connectedAddress)}
        </button>
        {error && <p className="max-w-xs text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {connectError && (
        <p className="max-w-xs text-xs text-red-400">
          Could not connect. Install a browser wallet (e.g. MetaMask) and try again.
        </p>
      )}
    </div>
  )
}
