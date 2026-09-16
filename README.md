# CL — Monad Clearing Network

**One account. Multiple Monad protocols. Unified clearing, risk, liquidity, and execution.**

CL is a non-custodial cross-protocol clearing layer for Monad. A user-owned `CLAccount` holds capital and owns positions opened on integrated venues. Stateless adapters translate protocol-specific actions into tightly allowlisted calls that the account executes itself.

## What exists now

The current implementation covers Milestones 1–10 at the contract architecture level:

- deterministic user-owned CL accounts
- asset custody and withdrawals
- version-pinned adapter authorization
- adapter/target registry
- atomic cross-protocol `executeBatch`
- Kuru margin + CLOB adapter
- Perpl direct-onchain perp adapter
- Euler v2 lending adapter
- protocol-neutral position schema
- `PortfolioLens` for a unified position ledger
- TypeScript network/deployment constants and raw exposure helpers

See `docs/MILESTONES.md` and `docs/PROTOCOL_INTEGRATIONS.md`.

## Security model

1. Adapters never receive custody.
2. CL uses no adapter `delegatecall`.
3. Every low-level target is explicitly allowlisted per adapter.
4. Changing an adapter's target permissions increments its registry version and invalidates prior user authorization until the user re-authorizes.
5. Cross-protocol batches revert atomically when any underlying call fails.
6. Position normalization does not invent valuations. Unconverted positions intentionally return `notional = 0` until a verified valuation layer is applied.

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
  interfaces/
  lens/PortfolioLens.sol
packages/sdk/
script/
test/
docs/
```

## Monad configuration

- Mainnet chain ID: `143`
- Testnet chain ID: `10143`

Protocol deployment constants live in `packages/sdk/src/protocols.ts`. Euler EVault addresses are deliberately configured at deployment time rather than guessed or baked into the adapter.

## Build

```bash
forge build
forge test -vvv
```

This repository should not be deployed until the compiler/test suite is green and the target addresses for the selected network have been re-verified.

## Next build phase

Milestones 11–17 turn the ledger into the actual clearing engine: exposure, leverage, health, liquidation distance, stress testing, portfolio margin, and enforceable risk policies.
