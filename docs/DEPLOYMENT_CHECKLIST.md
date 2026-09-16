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
- verify Perpl position/collateral/PnL unit conventions before setting risk decimals
- use a fresh low-value deployment wallet for the demo
- never commit `PRIVATE_KEY`

## 1. Environment

Copy `.env.example` to a local ignored `.env` and fill only verified values.

Required tracking values are CSV lists:

```text
KURU_TRACKED_TOKENS=0xTokenA,0xTokenB
KURU_MARKETS=0xMarketA
PERPL_TRACKED_PERP_IDS=64
EULER_TRACKED_VAULTS=0xVaultA
FREE_COLLATERAL_ASSETS=0xStablecoin,0xWrappedMon
```

The deployment scripts reject empty tracked sets. That is deliberate: a live adapter with no read universe would let execution exist without corresponding portfolio visibility. `FREE_COLLATERAL_ASSETS` feeds the read-only `WalletBalanceAdapter`, which keeps assets sitting directly in the CL Account visible to portfolio risk.

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

## 3. Deploy adapters + free-collateral source

```bash
forge script script/DeployAdapters.s.sol:DeployAdapters \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

Record:

- `KuruAdapter`
- `PerplAdapter`
- `EulerAdapter`
- `WalletBalanceAdapter`

Set `KURU_ADAPTER`, `PERPL_ADAPTER`, `EULER_ADAPTER`, and `WALLET_BALANCE_ADAPTER`.

The wallet-balance adapter is a read-only risk source; it does not need execution permissions or normal adapter authorization to contribute to a policy's configured risk universe.

## 4. Configure exact execution permissions

Run **before any account authorizes an executable adapter**:

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

Every permission change increments the adapter version. If permissions change later, existing user authorizations intentionally become stale.

## 5. Deploy risk + automation stack

```bash
forge script script/DeployRiskAutomation.s.sol:DeployRiskAutomation \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

Record all emitted addresses and populate the `CL_*` / `VITE_CL_*` environment variables.

Set `RISK_REGISTRY` to the deployed risk registry before the next step.

## 6. Configure the Metropolis risk universe

For the primary demo pair, `.env.example` exposes explicit values for:

- underlying asset + Chainlink-compatible feed
- collateral asset + feed
- token decimals
- initial margin
- maintenance margin
- hedge/basis margin
- stress shock
- maximum feed staleness
- Perpl exposure/collateral/PnL decimals

After independently verifying those values, run:

```bash
forge script script/ConfigureDemoRisk.s.sol:ConfigureDemoRisk \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast -vvvv
```

The script deploys CL `ChainlinkPriceSource` wrappers, configures the underlying/collateral assets, and maps every `PERPL_TRACKED_PERP_IDS` entry to the configured economic underlying and collateral asset.

For a broader deployment, configure every additional asset and derivative used by tracked Kuru tokens, Euler vault assets and Perpl instruments before enabling the risk guard. A missing mapping is expected to fail closed.

## 7. Create and initialize CL Account

Create the account from `CLAccountFactory` using the owner's chosen salt.

Then, in this order:

1. allow required wallet assets
2. authorize Kuru / Perpl / Euler adapters **after registry configuration is final**
3. configure the account risk policy using Kuru, Perpl, Euler **and `WalletBalanceAdapter`** as risk sources
4. install/enable `RiskPolicyManager` as the risk guard
5. optionally authorize the `DefensiveExecutor` as defensive operator
6. create keeper jobs only after the defensive path is tested manually

Do not authorize `WalletBalanceAdapter` for account execution; it is intentionally source-only.

## 8. Funded smoke test

Use the smallest practical amounts.

Required proof sequence:

1. deposit/fund a CL Account
2. confirm free collateral appears through `WalletBalanceAdapter`
3. Kuru: fund margin and execute a spot action
4. Perpl: create/fund account and open a small perp position
5. Euler: supply collateral and borrow or repay
6. query CL unified risk
7. confirm all three venue states plus direct free collateral are visible
8. run a stress scenario
9. create a deliberate low-severity policy breach or test condition
10. obtain solver recommendation
11. execute a defensive action
12. confirm post-state risk improvement

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
- configured venue read failure fails closed
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

Populate `CL_*_ADAPTER` and `VITE_CL_*_ADAPTER` values so both surfaces display the same integration set. Verify the Terminal and API point at the same chain and CL deployment addresses.

## 11. Final evidence bundle

Keep a deployment manifest in `deployments/` containing:

- chain ID
- deployment timestamp/block
- all CL contract addresses
- all four risk/adapter source addresses
- underlying Kuru/Perpl/Euler targets
- tracked markets/perp IDs/vaults/free-collateral assets
- oracle sources
- registry adapter versions
- CL Account address
- demo transaction hashes
- final CI commit SHA

No deployment should be described as live/complete until the funded transactions are confirmed on the intended Monad network.
