# OpenRisk

Risk-controlled trading **simulation** with transparent trader signals, built for Arc and USDC.

> **Simulation only.** All capital in OpenRisk is virtual. The app never holds, pools, or trades user funds, and simulated performance is hypothetical. It is not an investment return and not financial advice.

**Live demo:** https://YOUR-USERNAME.github.io/openrisk/

## What it does

1. A user connects a wallet and creates a simulation: virtual capital ($1 to $100,000) and a maximum risk per trade (for example 2%).
2. A trader publishes signals with entry, stop loss, and take profit.
3. A risk engine sizes each signal for every simulation so the loss at the stop never exceeds that user's risk limit.
4. Users see the size for their own account and can place real trades themselves if they choose. OpenRisk never executes anything.
5. When a simulation reaches a +20% milestone, a one-time service fee becomes due (billing arrives in Phase 5).

Example: with $10 and 2% risk, the maximum loss per trade is $0.20. For ETH long, entry $2,700, stop $2,665, the size is about 0.0057 ETH.

## Features (Phase 2)

- Wallet connection (wagmi and viem)
- Simulation setup with presets and custom values
- Risk engine: position sizing, 3x leverage cap, daily loss limit, max drawdown limit, one-time milestone detection
- Trader dashboard: publish and close signals, performance in R
- Signals are append-only. They cannot be edited or deleted, and each has a SHA-256 hash
- "Size for your account" card on every signal

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Wallet, create simulation, dashboard | Done |
| 2 | Trader dashboard, risk engine, milestone | Done |
| 3 | PostgreSQL, Prisma, API, live prices | Next |
| 4 | Arc contracts (registries, signal proofs) | Planned |
| 5 | USDC milestone billing | Planned |
| 6 | Notifications, analytics, public trader profiles | Planned |

## Current limitations

- Data is stored in your browser only, so signals are not shared between devices until Phase 3.
- Calculations run in the browser. The Phase 3 backend becomes the source of truth.
- The Trader page is open to anyone until trader registration exists.
- No live prices yet, so unrealized P&L is not shown.
- Arc network values are intentionally not set. They will come from the official Arc documentation in Phase 4.

## Run locally

Requires Node.js 18 or newer.

    npm run install:web
    npm run dev

Then open http://localhost:5173.

## Deploy

Pushing to `main` builds and publishes the site with GitHub Pages. In the repo, go to Settings, then Pages, and set the source to GitHub Actions.

## Project structure

    apps/web/        React + Vite + TypeScript + Tailwind app
    backend/         Node API (Phase 3)
    contracts/       Solidity + Foundry (Phases 4-5)
    database/        PostgreSQL + Prisma (Phase 3)
    docs/            Architecture and risk engine notes

## Product boundaries

Version 1 does not accept deposits, pool funds, hold custody, copy trades with real money, or present simulated returns as real returns. Real-money features would need separate legal, regulatory, custody, and security review.

## License

MIT (add a LICENSE file)
