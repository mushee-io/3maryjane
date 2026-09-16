# CL build milestones

## Complete in current codebase

- [x] M1 Repository + architecture
- [x] M2 CL Account
- [x] M3 Asset custody / permissions
- [x] M4 Adapter standard + registry
- [x] M5 Kuru adapter
- [x] M6 Perpl adapter
- [x] M7 Euler adapter
- [x] M8 Position normalization envelope
- [x] M9 Unified Portfolio Lens / ledger read path
- [x] M10 Cross-protocol atomic execution primitive
- [x] M11 Exposure engine
- [x] M12 Unified leverage engine
- [x] M13 CL Health
- [x] M14 Portfolio critical-move / liquidation-buffer engine V1
- [x] M15 Stress engine
- [x] M16 Portfolio Margin Engine V1
- [x] M17 Enforceable risk policy engine
- [x] M18 Intent engine
- [x] M19 Capital Router V1
- [x] M20 Multi-step planner
- [x] M21 Risk solver
- [x] M22 Automated defensive actions
- [x] M23 Keeper network
- [x] M24 Simulation engine

## M11-M17 implementation notes

The risk stack is implemented in `RiskRegistry`, `RiskEngine`, `RiskPolicyManager`, `IRiskGuard`, and the risk-guard path in `CLAccount`.

- Raw Kuru, Perpl, and Euler positions are converted to canonical USD risk using configured asset/instrument mappings and fresh price sources.
- Positions sharing an economic underlying are netted across protocols into one risk bucket.
- Portfolio metrics include equity, debt, gross exposure, directional exposure, leverage, initial margin, maintenance margin, margin utilization, health, and critical-move buffer.
- Portfolio Margin V1 charges full directional margin on net exposure and a smaller basis/hedge charge on offsetting long/short pairs.
- The stress engine supports default configured shocks and explicit per-asset scenario shocks.
- Risk policy enforcement is transaction-level: CL captures portfolio state before execution, validates the final state after all protocol calls, and reverts the entire transaction if the policy is violated.
- Enforcement fails closed if a covered adapter cannot be read, required instrument configuration is missing, or a required price is invalid/stale.

`criticalMoveBps` is a CL portfolio-level linear adverse-move buffer estimate. It is not presented as an exact native liquidation price for Kuru, Perpl, Euler, or any other independent protocol; those venues continue to enforce their own liquidation rules.

## M18-M24 implementation notes

The decision/automation stack is implemented in `IntentEngine`, `CapitalRouter`, `MultiStepPlanner`, `RiskSolver`, `DefensiveExecutor`, `KeeperNetwork`, `SimulationEngine`, and the defensive-operator path in `CLAccount`.

- Intents are owner-authenticated, nonce-bound economic objectives; they do not grant custody.
- Capital routing deterministically ranks same-input quotes after gas and explicit risk penalties.
- Multi-step plans commit an exact ordered `AdapterAction[]` hash, expiry and linked intent.
- Risk solver output is venue-neutral and recommends hedge, repay or deleverage actions from live policy breaches.
- Defensive automation can only run through an owner-authorized `CLAccount` operator and must be strictly risk reducing.
- Strict defense prevents aggregate margin, gross/directional exposure and debt from worsening; per-asset net exposure also cannot worsen.
- Keeper jobs are user-created, cooldown-bounded and action-count-bounded.
- Simulation projects portfolio-level assets/debt/PnL/exposure/margin deltas and recomputes leverage, health, margin utilization and critical-move buffer.
- Exact venue execution remains an `eth_call`/live-integration concern; the onchain simulator does not pretend to emulate arbitrary protocol state transitions.

See `docs/INTENT_AUTOMATION.md` for the M18-M24 architecture and trust boundaries.

M10-M24 are compiler/test targeted. The real funded Monad demonstration still requires deployment, verified network-specific market/vault/feed configuration, funded accounts, and successful live Kuru -> Perpl -> Euler transactions.

## Next

- [ ] M25 SDK
- [ ] M26 Public Risk API
- [ ] M27 Protocol onboarding framework
- [ ] M28 CL Terminal
- [ ] M29 Security hardening
- [ ] M30 Metropolis production demo
