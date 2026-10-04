// Phases 1-2 only read the wallet address. Placeholder chain until Phase 4,
// when the Arc chain is added from the OFFICIAL Arc docs. Never guess Arc values.
import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
  },
})
