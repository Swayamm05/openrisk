# OpenRisk architecture

## Principle
Simulation-first. Capital is virtual. No deposits, pooling, custody, or real-money copy trading.
Arc and USDC are used only for identity, signal proofs, simulation registration, milestone records, and the USDC service fee. Prices and the simulation engine stay off-chain.

## Components
- apps/web: React, Vite, TypeScript, Tailwind, wagmi and viem.
- backend: Node and TypeScript API, source of truth for all risk math (Phase 3).
- database: PostgreSQL and Prisma (Phase 3).
- contracts: Foundry. TraderRegistry, SimulationRegistry, TradeSignalRegistry, milestone payment (Phases 4-5).

## Open issues to resolve
1. Fee must scale with capital. A flat $1 fee on a $1 simulation does not make sense.
2. The milestone depends on one trusted trader. Needs a server price feed and on-chain signal hashes.
3. Gaps and slippage: simulated stops fill at the stop, real ones can be worse.
4. Use decimals, not floats, in the backend.
5. A fee tied to simulated performance may count as paid investment advice in some jurisdictions. Get legal review before charging anyone.
6. Arc chain ID, RPC and USDC address must come from the official Arc docs in Phase 4.
7. Wallet sign-in (signed message) is needed in Phase 3 so the backend knows who owns a simulation.
8. Notifications need a channel such as email or Telegram, since wallet addresses alone cannot be notified.
