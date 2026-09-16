# CL — Monad Clearing Network

**One account. Multiple Monad protocols. Unified clearing, margin, risk, routing, automation, liquidity, and execution.**

CL is a non-custodial cross-protocol clearing layer for Monad. A user-owned `CLAccount` holds capital and owns positions opened on integrated venues. Stateless adapters translate protocol-specific actions into tightly permissioned calls that the account executes itself. The risk stack values and nets those positions across protocols before enforcing owner-defined portfolio limits at transaction level. The intent/automation stack can then plan, route, simulate and dispatch defensive actions without giving agents or keepers unrestricted custody.

CL V1 is a cross-protocol portfolio-risk and execution layer. It does **not** pretend that independent venues share collateral or recognize CL margin. Kuru, Perpl, Euler and future integrations retain their own native collateral, margin and liquidation rules.

## Current state

The code-side build covers Milestones 1–29 plus the complete M30 deployment/demo toolchain. The final live-funded M30 checkbox remains external: contracts must still be broadcast from an authorized funded signer and the real Monad transaction hashes recorded.

Implemented today:

- deterministic user-owned CL accounts
- asset custody and policy-aware withdrawals
- version-pinned adapter authorization
- adapter target + exact function-selector permissions
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
- owner-configured risk policies and per-asset limits
- atomic post-trade policy enforcement in `CLAccount`
- owner-authenticated economic intents
- conservative same-input capital route ranking
- immutable multi-step plan commitments
- deterministic venue-neutral risk solver
- strict delegated defensive execution
- bounded keeper jobs
- portfolio risk-state simulation
- Chainlink-compatible 1e18 price-source wrapper
- production TypeScript SDK
- read-only Public Risk API
- protocol onboarding manifest framework
- CL Terminal
- explicit tracked-token/perp/vault deployment configuration
- exact Kuru/Perpl/Euler permission-configuration script
- threat model, deployment checklist and Metropolis demo runbook
- deployment evidence format for real addresses and transaction hashes

See `docs/MILESTONES.md`, `docs/RISK_ENGINE.md`, `docs/INTENT_AUTOMATION.md`, `docs/PROTOCOL_ONBOARDING.md`, `docs/THREAT_MODEL.md`, `docs/DEPLOYMENT_CHECKLIST.md`, and `docs/METROPOLIS_DEMO.md`.

## Execution flow

```text
User / Agent / CL Terminal
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
   target + selector guard
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
4. Production targets can enforce exact 4-byte function selectors.
5. Changing adapter activity, targets, selector permissions or selector enforcement increments its registry version and invalidates prior user authorization until the user re-authorizes.
6. Cross-protocol batches revert atomically when any underlying call fails.
7. Risk enforcement fails closed when a covered adapter cannot be read, a required derivative mapping is missing, or a required price is invalid/stale.
8. When the risk guard is enabled, adapters outside the policy's covered risk universe cannot execute.
9. Withdrawals are subject to post-state policy validation.
10. Delegated defensive operators cannot withdraw and must finish in a strictly safer state; otherwise every underlying call rolls back.
11. Intents, solver output, routing and simulation do not grant execution authority by themselves.
12. `criticalMoveBps` is CL's derived portfolio adverse-move buffer estimate; independent protocols retain their own native liquidation rules.

This is an implementation threat model and hardening pass, not an independent security audit. See `docs/THREAT_MODEL.md`.

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
packages/
  sdk/
  api/
  terminal/
script/
  DeployCore.s.sol
  DeployAdapters.s.sol
  ConfigureAdapterPermissions.s.sol
  DeployRiskAutomation.s.sol
deployments/
test/
docs/
```

## Monad configuration

- Mainnet chain ID: `143`
- Testnet chain ID: `10143`

Protocol deployment constants live in `packages/sdk/src/protocols.ts`. Live market, vault, instrument and oracle configuration is deliberately explicit rather than guessed or silently baked into the clearing engine. Re-verify network addresses against primary protocol sources immediately before any broadcast.

## Build

```bash
forge build
forge build --sizes --skip script --skip test
forge test -vvv
npm install --ignore-scripts
npm run typecheck
npm run build:apps
```

CI covers Solidity compilation, deployable bytecode sizes, the Forge suite, TypeScript typechecking and production SDK/API/Terminal builds.

## Deployment sequence

The fail-closed production sequence is documented in `docs/DEPLOYMENT_CHECKLIST.md`:

```text
DeployCore
   ↓
DeployAdapters with explicit tracked state
   ↓
ConfigureAdapterPermissions
   ↓
DeployRiskAutomation
   ↓
Configure asset/instrument risk universe
   ↓
Create CL Account
   ↓
Authorize adapters + install risk policy
   ↓
Funded Kuru / Perpl / Euler smoke test
   ↓
Solver / defensive execution
   ↓
Record real addresses + tx hashes in deployments/
```

The repository should not be described as a completed live deployment until those final funded transactions are confirmed on the intended Monad network.
