# CL — Monad Clearing Network

**One account. Multiple Monad protocols. Unified clearing, margin, risk, liquidity, and execution.**

CL is a non-custodial cross-protocol clearing layer for Monad. A user-owned `CLAccount` holds capital and owns positions opened on integrated venues. Stateless adapters translate protocol-specific actions into tightly allowlisted calls that the account executes itself. The risk stack then values and nets those positions across protocols before enforcing owner-defined portfolio limits at transaction level.

## What exists now

The implementation covers Milestones 1–17:

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
- optional strictly risk-reducing transitions for already-breached accounts
- Chainlink-compatible 1e18 price-source wrapper

See `docs/MILESTONES.md`, `docs/RISK_ENGINE.md`, and `docs/PROTOCOL_INTEGRATIONS.md`.

## Risk flow

```text
Kuru / Perpl / Euler
        |
        v
 normalized positions
        |
        v
   RiskRegistry
        |
        v
    RiskEngine
 exposure / margin / stress
        |
        v
 RiskPolicyManager
        |
        v
     CLAccount
 capture -> execute -> validate
                 |
        violation => REVERT ALL
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
9. `criticalMoveBps` is CL's portfolio adverse-move buffer estimate; independent protocols retain their own native liquidation rules.

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
  oracles/
    ChainlinkPriceSource.sol
  interfaces/
  types/
packages/sdk/
script/
  DeployCore.s.sol
  DeployAdapters.s.sol
  DeployRisk.s.sol
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

The Solidity build, deployable size check, core execution tests, cross-protocol netting tests, stress tests and atomic risk-policy tests are CI-covered. Live deployment still requires re-verifying the selected Monad network addresses and running the funded integration flow.

## Next build phase

Milestones 18–24 build on the clearing-risk kernel: intent parsing, capital routing, multi-step planning, a risk solver, automated defensive actions, keeper execution and pre-trade simulation.
