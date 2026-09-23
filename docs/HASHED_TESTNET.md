# Hashed — Monad Testnet MVP

Hashed is the stock-backed credit module inside **3maryjane**.

## Thesis

3maryjane already normalizes cross-protocol exposure and risk. Hashed turns that risk layer into a credit primitive:

1. deposit tokenized-equity collateral,
2. borrow hUSD against the collateral,
3. expose both collateral and debt back to 3maryjane through `HashedAdapter`,
4. let the existing clearing/risk stack see the complete position,
5. liquidate when the collateral-backed health factor falls below 1.0.

This is intentionally not a generic money market. The first wedge is **equity-backed credit on Monad**.

## Contracts

- `src/hashed/HashedUSD.sol` — testnet credit unit (6 decimals).
- `src/hashed/HashedCreditVault.sol` — collateral, LTV, health, repayment and liquidation.
- `src/adapters/HashedAdapter.sol` — normalizes Hashed collateral + debt into 3maryjane positions.
- `src/hashed/TestnetEquityToken.sol` — synthetic equity faucet token for demo/testnet use only.
- `script/DeployHashedTestnet.s.sol` — Monad testnet deployment script.

## Initial testnet market

The deploy script creates demo hNVDA and hAAPL collateral assets with manual testnet prices. These are synthetic demo assets and must never be described as real shares or production tokenized equities.

Initial risk parameters:

| Asset | LTV | Liquidation threshold | Liquidation bonus |
| --- | ---: | ---: | ---: |
| hNVDA | 60% | 75% | 5% |
| hAAPL | 65% | 78% | 5% |

## Deploy

Use the existing Monad testnet RPC and the deployed 3maryjane RiskRegistry:

```bash
export MONAD_TESTNET_RPC="https://testnet-rpc.monad.xyz"
export RISK_REGISTRY="0xdd6a9a09961b65dff5b91c550800d3791d199f3d"
read -s -p "Testnet private key: " PRIVATE_KEY
echo
export PRIVATE_KEY

forge script script/DeployHashedTestnet.s.sol:DeployHashedTestnet \
  --rpc-url "$MONAD_TESTNET_RPC" \
  --broadcast
```

Do not commit or paste `PRIVATE_KEY`.

## After deployment

The next integration step is to register the Hashed adapter with 3maryjane's AdapterRegistry and authorize the exact token/vault selectors on the configured demo CL account. Then add the deployment addresses to the terminal environment:

- `VITE_HASHED_VAULT`
- `VITE_HASHED_ADAPTER`
- `VITE_HASHED_USD`
- `VITE_HASHED_NVDA`
- `VITE_HASHED_AAPL`

## Production warning

The testnet manual price sources and synthetic equity tokens are demo infrastructure. Mainnet requires verified tokenized-equity contracts, production-grade oracle feeds, conservative market parameters, and an external security review.
