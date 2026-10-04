import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, error, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
      >
        {shortAddress(address)} &middot; Disconnect
      </button>
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
      {error && (
        <p className="max-w-xs text-xs text-red-400">
          Could not connect. Install a browser wallet (e.g. MetaMask) and try again.
        </p>
      )}
    </div>
  )
}
