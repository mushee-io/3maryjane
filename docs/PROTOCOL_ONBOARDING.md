# CL Protocol Onboarding Standard

CL integrations are adapters into a user-owned clearing account, not custody modules. A protocol is considered onboarded only when its execution and position-reading paths can participate safely in the CL risk universe.

## 1. Adapter contract

Every integration implements `ICLAdapter`:

```solidity
interface ICLAdapter {
    function protocolId() external view returns (bytes32);
    function buildExecution(address account, bytes calldata action)
        external view returns (CLTypes.Execution[] memory);
    function getPositions(address account)
        external view returns (CLTypes.Position[] memory);
}
```

The adapter must remain stateless with respect to user funds. `CLAccount` executes every returned call itself. An adapter must never require a user to transfer assets into the adapter.

## 2. Target allowlist

Every low-level target emitted by `buildExecution` must be registered in `AdapterRegistry` for that adapter. Changing target permissions increments the adapter registry version, invalidating existing account authorization until the owner explicitly re-authorizes the adapter.

A protocol manifest therefore declares:

- adapter address
- Monad chain ID
- normalized position types
- exact executable target addresses
- assets read by the adapter
- documentation / metadata

The SDK exports `validateProtocolManifest()` and `manifestSecurityChecklist()` to validate this envelope before registry onboarding.

## 3. Position normalization

`getPositions(account)` maps venue-native state into `CLTypes.Position` without inventing USD values.

Required fields:

```text
protocolId
instrumentId
asset
positionType
signedExposure
collateral
debt
pnl
metadata
```

`notional = 0` means deliberately unvalued. The Risk Engine owns valuation.

Derivative integrations must use a stable `instrumentId` and explicit `RiskRegistry.InstrumentConfig` for:

- economic underlying
- collateral asset
- exposure decimals
- collateral decimals
- PnL decimals

CL fails closed when a derivative is missing this mapping.

## 4. Read failure policy

Material state used for clearing risk cannot silently disappear. An adapter may isolate a genuinely unsupported or missing market, but a configured adapter read failure in the Risk Engine reverts the portfolio calculation. This prevents an unhealthy account from appearing safe because one venue is offline or malformed.

## 5. Required integration tests

Before a manifest is accepted:

1. deposit / fund venue position
2. open or create position
3. read normalized position
4. reduce / close position
5. withdraw / repay path
6. target allowlist rejection
7. stale adapter authorization rejection
8. malformed action rejection
9. protocol revert propagation
10. post-action CL risk-policy rollback

For lending/perp protocols, liquidation and health semantics remain venue-native. CL may model cross-protocol portfolio risk but must never claim to override the venue liquidator.

## 6. Manifest example

```ts
import { assertProtocolManifest } from "@cl-monad/sdk";

const manifest = assertProtocolManifest({
  id: "EXAMPLE_LEND",
  displayName: "Example Lending",
  chainId: 10143,
  adapter: "0x1111111111111111111111111111111111111111",
  positionTypes: ["SUPPLY", "DEBT"],
  targets: [
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
  ],
  assets: ["0x4444444444444444444444444444444444444444"],
  docsUrl: "https://example.invalid/docs",
});
```

## 7. Production acceptance

A manifest is not production-ready merely because it compiles. Mainnet/testnet addresses must be re-verified against primary protocol documentation immediately before deployment. The funded integration flow must produce real transaction hashes and the resulting positions must be visible through the CL risk API and Terminal.
