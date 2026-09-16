# CL — Monad Clearing Network

**One account. Multiple Monad protocols. Unified clearing, margin, risk, routing, automation, liquidity, and execution.**

CL is a non-custodial cross-protocol clearing layer for Monad. A user-owned `CLAccount` holds capital and owns positions opened on integrated venues. Stateless adapters translate protocol-specific actions into tightly allowlisted calls that the account executes itself. The risk stack values and nets those positions across protocols before enforcing owner-defined portfolio limits at transaction level. The intent/automation stack can then plan, route, simulate and dispatch defensive actions without giving agents or keepers unrestricted custody.

## What exists now

The implementation covers Milestones 1–24:

- deterministic user-owned CL accounts
- asset custody and withdrawals
- version-pinned adapter authorization
- adapter/target registry
- atomic cross-protocol `executeBatch`
- Kuru margin + CLOB adapter
- Perpl direct-onchain perp adapter
- Euler v2 lending adapter
- protocol-neutral position schema
- `PortfolioLens` unified ledger read path
- canonical asset/instrument risk registry
- fresh-price fail-closed valuation
- cross-protocol exposure netting by economic underlying
- unified equity, debt, leverage and margin utilization
- CL Health and portfolio critical-move buffer
- scenario/default stress testing
- Portfolio Margin Engine V1
- owner-configured risk policies
- atomic post-trade policy enforcement in `CLAccount`
- owner-authenticated economic intents
- conservative same-input capital route ranking
- immutable multi-step plan commitments
- deterministic venue-neutral risk solver
- strict delegated defensive execution
- bounded keeper jobs
- portfolio risk-state simulation
- Chainlink-compatible 1e18 price-source wrapper

See `docs/MILESTONES.md`, `docs/RISK_ENGINE.md`, `docs/INTENT_AUTOMATION.md`, and `docs/PROTOCOL_INTEGRATIONS.md`.

## Execution flow

```text
User / Agent UI
       |
       v
  IntentEngine
       |
       v
 CapitalRouter
       |
       v
MultiStepPlanner ---> RiskSolver ---> SimulationEngine
       |
       v
   CLAccount
       |
       v
Kuru / Perpl / Euler
       |
       v
 RiskPolicyManager
       |
 violation => REVERT ALL
```

Defensive automation uses a narrower path:

```text
KeeperNetwork
      |
      v
DefensiveExecutor
      |
      v
CLAccount.executeDefensiveBatch
      |
      v
strict risk-reduction validation
      |
not safer => REVERT ALL
```

## Security model

1. Adapters never receive custody.
2. CL uses no adapter `delegatecall`.
3. Every low-level target is explicitly allowlisted per adapter.
4. Changing an adapter's target permissions increments its registry version and invalidates prior user authorization until the user re-authorizes.
5. Cross-protocol batches revert atomically when any underlying call fails.
6. Risk enforcement fails closed when a covered adapter cannot be read, a required derivative mapping is missing, or a required price is invalid/stale.
7. When the risk guard is enabled, adapters outside the policy's covered risk universe cannot execute.
8. Withdrawals are also subject to post-state policy validation.
9. Delegated defensive operators cannot withdraw and must finish in a strictly safer state; otherwise every underlying call rolls back.
10. Intents, solver output, routing and simulation do not grant execution authority by themselves.
11. `criticalMoveBps` is CL's portfolio adverse-move buffer estimate; independent protocols retain their own native liquidation rules.

## Repository layout

```text
src/
  CLAccount.sol
  CLAccountFactory.sol
  AdapterRegistry.sol
  adapters/
    KuruAdapter.sol
    PerplAdapter.sol
    EulerAdapter.sol
  lens/
    PortfolioLens.sol
  risk/
    RiskRegistry.sol
    RiskEngine.sol
    RiskPolicyManager.sol
  intent/
    IntentEngine.sol
  router/
    CapitalRouter.sol
  planning/
    MultiStepPlanner.sol
  solver/
    RiskSolver.sol
  automation/
    DefensiveExecutor.sol
    KeeperNetwork.sol
  simulation/
    SimulationEngine.sol
  oracles/
    ChainlinkPriceSource.sol
  interfaces/
  types/
packages/sdk/
script/
  DeployCore.s.sol
  DeployAdapters.s.sol
  DeployRiskAutomation.s.sol
test/
docs/
```

## Monad configuration

- Mainnet chain ID: `143`
- Testnet chain ID: `10143`

Protocol deployment constants live in `packages/sdk/src/protocols.ts`. Market, vault, instrument and oracle configuration is deliberately explicit rather than guessed or silently baked into the clearing engine.

## Build

```bash
forge build
forge build --sizes --skip script --skip test
forge test -vvv
```

The Solidity build, deployable size check, core execution tests, cross-protocol netting tests, stress tests, atomic risk-policy tests, intent/planner/router tests, defensive automation tests, solver tests and simulation tests are CI-covered once the current head is green. Live deployment still requires re-verifying the selected Monad network addresses and running the funded integration flow.

## Next build phase

Milestones 25–30 turn the protocol kernel into a product surface: production SDK, public risk API, protocol onboarding framework, CL Terminal, security hardening, and the funded Metropolis demo.
