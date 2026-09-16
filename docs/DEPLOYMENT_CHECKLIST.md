# CL Monad Deployment Checklist

This checklist is intentionally fail-closed. Do not replace missing addresses, markets, feeds or vaults with guessed values.

## 0. Preflight

- `forge build`
- `forge build --sizes --skip script --skip test`
- `forge test -vvv`
- `npm install --ignore-scripts`
- `npm run typecheck`
- `npm run build:apps`
- confirm the intended Monad chain ID (`10143` testnet or `143` mainnet)
- re-verify Kuru, Perpl, Euler and oracle addresses from primary sources
- use a fresh low-value deployment wallet for the demo
- never commit `PRIVATE_KEY`

## 1. Environment

Copy `.env.example` to a local ignored `.env` and fill only verified values.

Required adapter tracking values are CSV lists:

```text
KURU_TRACKED_TOKENS=0xTokenA,0xTokenB
KURU_MARKETS=0xMarketA
PERPL_TRACKED_PERP_IDS=64
EULER_TRACKED_VAULTS=0xVaultA
```

The deployment scripts reject empty tracked sets. That is deliberate: a live adapter with no read universe would let execution exist without corresponding portfolio visibility.

## 2. Deploy core

```bash
forge script script/DeployCore.s.sol:DeployCore \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

Record:

- `AdapterRegistry`
- `CLAccountFactory`

Set `ADAPTER_REGISTRY` before continuing.

## 3. Deploy adapters

```bash
forge script script/DeployAdapters.s.sol:DeployAdapters \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

Record:

- `KuruAdapter`
- `PerplAdapter`
- `EulerAdapter`

Set `KURU_ADAPTER`, `PERPL_ADAPTER`, `EULER_ADAPTER`.

## 4. Configure exact execution permissions

Run **before any account authorizes an adapter**:

```bash
forge script script/ConfigureAdapterPermissions.s.sol:ConfigureAdapterPermissions \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

This configures:

- adapter activation
- exact execution targets
- exact function selectors
- selector enforcement

Every change increments the adapter version. If permissions change later, existing user authorizations intentionally become stale.

## 5. Deploy risk + automation stack

```bash
forge script script/DeployRiskAutomation.s.sol:DeployRiskAutomation \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

Record all emitted addresses and populate the `CL_*` / `VITE_CL_*` environment variables.

## 6. Configure risk universe

Before enabling a risk guard for a funded account, configure every asset and derivative used by the tracked adapters:

- price source
- token decimals
- initial margin
- maintenance margin
- hedge/basis margin
- stress shock
- max staleness
- Perpl instrument underlying
- Perpl collateral asset
- Perpl exposure/collateral/PnL decimals

A missing mapping is expected to fail closed.

## 7. Create and initialize CL Account

Create the account from `CLAccountFactory` using the owner's chosen salt.

Then, in this order:

1. allow required wallet assets
2. authorize Kuru / Perpl / Euler adapters **after registry configuration is final**
3. configure the account risk policy
4. install/enable `RiskPolicyManager` as the risk guard
5. optionally authorize the `DefensiveExecutor` as defensive operator
6. create keeper jobs only after the defensive path is tested manually

## 8. Funded smoke test

Use the smallest practical amounts.

Required proof sequence:

1. deposit/fund a CL Account
2. Kuru: fund margin and execute a spot action
3. Perpl: create/fund account and open a small perp position
4. Euler: supply collateral and borrow or repay
5. query CL unified risk
6. confirm all three venue states are visible
7. run a stress scenario
8. create a deliberate low-severity policy breach or test condition
9. obtain solver recommendation
10. execute a defensive action
11. confirm post-state risk improvement

Capture transaction hashes for every state-changing step.

## 9. Negative security smoke tests

Before recording the final demo:

- unapproved selector reverts
- unapproved target reverts
- stale adapter authorization reverts
- unauthorized keeper reverts
- defensive action that increases risk reverts
- stale oracle observation reverts
- withdrawal violating policy reverts atomically
- malformed adapter action reverts
- downstream protocol revert leaves no partial CL state

## 10. API + Terminal

API:

```bash
npm --workspace @cl-monad/api run build
npm --workspace @cl-monad/api run start
```

Terminal:

```bash
npm --workspace @cl-monad/terminal run build
```

Verify the terminal and API are pointed at the same chain and deployment addresses.

## 11. Final evidence bundle

Keep a deployment manifest containing:

- chain ID
- deployment timestamp/block
- all CL contract addresses
- all adapter addresses
- underlying Kuru/Perpl/Euler targets
- tracked markets/perp IDs/vaults
- oracle sources
- registry adapter versions
- CL Account address
- demo transaction hashes
- final CI commit SHA

No deployment should be described as live/complete until the funded transactions are confirmed on the intended Monad network.
