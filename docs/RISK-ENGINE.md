# Risk engine (Phase 2)

- Position size = maxLoss / |entry - stop|, where maxLoss = current equity x risk %.
- Leverage cap: default 3x. If the size exceeds it, the size is reduced, so risk ends up below the limit.
- Only signals published after a simulation starts are applied (no mid-trade joins).
- Simulated exits are clamped between the stop and target (stop-loss enforcement). Real fills can slip.
- Daily loss limit = 2x per-trade risk of starting capital. Once reached, new signals that day are SKIPPED.
- Max drawdown limit = 10x per-trade risk, capped at 30%. Breaching it ends the simulation.
- Milestone: +20% of realized equity, triggered once. Unrealized P&L needs live prices (Phase 3).
- These calculations currently run in the browser. Phase 3 moves them to the backend, which becomes the source of truth.
