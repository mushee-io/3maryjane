# Metropolis Demo Runbook

Goal: prove that CL is not a dashboard. One user-owned CL Account must control real positions across independent Monad venues, calculate them as one risk surface, and reject or repair unsafe state transitions.

## Demo state

Use one deliberately small account with:

- Kuru spot exposure
- Perpl perp exposure
- Euler supply/debt exposure
- CL risk policy enabled

Never use mocked balances or hardcoded success states in the final recording.

## 90-second sequence

### 0–10s — thesis

Open the CL Terminal.

> One account. Multiple Monad markets. One risk layer.

Show the account address, owner, chain and three connected adapters.

### 10–30s — build the cross-protocol book

From the same CL Account:

1. fund Kuru / execute the configured MON spot trade
2. fund Perpl / open the configured MON perp hedge
3. supply/borrow through the configured Euler vault

Keep explorer tabs ready with the confirmed transaction hashes.

### 30–45s — unified portfolio

Refresh CL risk state and show:

- equity
- debt
- gross exposure
- net directional exposure
- leverage
- CL Health
- critical-move buffer
- per-asset exposure bucket

The key visual is the same MON economic exposure netting across Kuru and Perpl while Euler debt/collateral changes total portfolio constraints.

### 45–60s — prove the guard is real

Attempt an action that would violate the configured policy, for example withdrawing too much collateral or increasing exposure beyond the cap.

Expected result: transaction reverts. Explain that the underlying calls and withdrawal do not partially commit because final-state validation occurs in the same EVM transaction.

### 60–75s — solver + defense

Show the solver recommendation for the breached/stressed portfolio.

Execute an allowed defensive action through the owner path or pre-authorized defensive automation.

Examples:

- reduce Kuru spot exposure
- reduce Perpl directional exposure
- repay Euler debt

Do not claim the solver found a globally optimal action unless that property is actually proven. V1 returns deterministic risk-reduction recommendations under the configured rules.

### 75–90s — show improvement

Refresh CL state.

Show before → after:

```text
GROSS EXPOSURE       ↓
NET DIRECTIONAL      ↓
DEBT                 ↓ or unchanged
MARGIN UTILIZATION   ↓
CL HEALTH            ↑
CRITICAL MOVE BUFFER ↑
```

Finish on the API/SDK surface:

```text
getRisk(account)
getPolicy(account)
getSolverRecommendation(account)
executeBatch(account, actions)
```

Message: wallets, agents and protocols can consume the same clearing layer rather than rebuilding cross-protocol state and defensive execution themselves.

## Evidence that must exist before recording

- deployed CL core addresses
- deployed Kuru, Perpl and Euler adapters
- target + selector permissions configured
- risk registry configured for every demo asset/instrument
- account adapter authorizations current at the latest registry versions
- confirmed funded Kuru transaction
- confirmed funded Perpl transaction
- confirmed funded Euler transaction
- one policy-revert transaction/simulation that demonstrates enforcement
- one confirmed defensive transaction
- API health endpoint returning current Monad block
- Terminal reading the same account from chain

## Claims to avoid

Do not describe CL V1 as if independent protocols share collateral or honor CL margin directly. Underlying venues retain their native margin and liquidation rules.

Do not call `criticalMoveBps` an exact venue liquidation price.

Do not claim audit completion. Use "security hardened and CI tested" until an independent audit exists.

Do not claim a live integration without a confirmed transaction hash.

## Submission evidence

Attach or link:

- working CL Terminal
- repository
- short architecture diagram
- deployment manifest
- explorer links for demo transactions
- 90-second demo recording
- short write-up explaining the cross-protocol clearing problem and CL's trust boundaries
