import { useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  http,
  isAddress,
  type WalletClient,
} from "viem";
import {
  createCLClient,
  euler,
  kuru,
  monadMainnet,
  monadTestnet,
  perpl,
  type Address,
  type CLDeployment,
  type Hex,
  type RiskPolicy,
  type RiskSnapshot,
  type SolverRecommendation,
} from "@cl-monad/sdk";

const configuredChainId = Number(import.meta.env.VITE_CL_CHAIN_ID ?? "10143");
const chain = configuredChainId === 143 ? monadMainnet : monadTestnet;
const rpcUrl = import.meta.env.VITE_CL_RPC_URL as string | undefined;
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

function envAddress(key: string): Address | undefined {
  const value = import.meta.env[key] as string | undefined;
  return value && isAddress(value) ? (getAddress(value) as Address) : undefined;
}

const deployment: CLDeployment = {
  chainId: chain.id,
  accountFactory: envAddress("VITE_CL_ACCOUNT_FACTORY"),
  adapterRegistry: envAddress("VITE_CL_ADAPTER_REGISTRY"),
  riskRegistry: envAddress("VITE_CL_RISK_REGISTRY"),
  riskEngine: envAddress("VITE_CL_RISK_ENGINE"),
  riskPolicyManager: envAddress("VITE_CL_RISK_POLICY_MANAGER"),
  riskSolver: envAddress("VITE_CL_RISK_SOLVER"),
  intentEngine: envAddress("VITE_CL_INTENT_ENGINE"),
  capitalRouter: envAddress("VITE_CL_CAPITAL_ROUTER"),
  multiStepPlanner: envAddress("VITE_CL_MULTI_STEP_PLANNER"),
  defensiveExecutor: envAddress("VITE_CL_DEFENSIVE_EXECUTOR"),
  keeperNetwork: envAddress("VITE_CL_KEEPER_NETWORK"),
  simulationEngine: envAddress("VITE_CL_SIMULATION_ENGINE"),
  adapters: {
    ...(envAddress("VITE_CL_KURU_ADAPTER") ? { Kuru: envAddress("VITE_CL_KURU_ADAPTER")! } : {}),
    ...(envAddress("VITE_CL_PERPL_ADAPTER") ? { Perpl: envAddress("VITE_CL_PERPL_ADAPTER")! } : {}),
    ...(envAddress("VITE_CL_EULER_ADAPTER") ? { Euler: envAddress("VITE_CL_EULER_ADAPTER")! } : {}),
    ...(envAddress("VITE_CL_WALLET_BALANCE_ADAPTER")
      ? { WalletBalance: envAddress("VITE_CL_WALLET_BALANCE_ADAPTER")! }
      : {}),
  },
};

function usd(value: bigint | undefined): string {
  if (value === undefined) return "—";
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const number = Number(formatUnits(absolute, 18));
  const rendered = Number.isFinite(number)
    ? number.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : formatUnits(absolute, 18);
  return negative ? `-${rendered}` : rendered;
}

function ratio(value: bigint | undefined): string {
  if (value === undefined) return "—";
  if (value > 1_000_000n * 10n ** 18n) return "∞";
  return `${Number(formatUnits(value, 18)).toFixed(2)}×`;
}

function percentBps(value: bigint | undefined): string {
  if (value === undefined) return "—";
  return `${(Number(value) / 100).toFixed(2)}%`;
}

function short(address: string | undefined): string {
  if (!address) return "not configured";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function App() {
  const reader = useMemo(() => createCLClient({ publicClient, deployment }), []);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [accountInput, setAccountInput] = useState("");
  const [risk, setRisk] = useState<RiskSnapshot | null>(null);
  const [policy, setPolicy] = useState<RiskPolicy | null>(null);
  const [recommendation, setRecommendation] = useState<SolverRecommendation | null>(null);
  const [accountState, setAccountState] = useState<Awaited<ReturnType<typeof reader.getAccountState>> | null>(null);
  const [adapterInput, setAdapterInput] = useState("");
  const [actionInput, setActionInput] = useState("0x");
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Enter a deployed CL Account to read its unified book.");

  const account = isAddress(accountInput) ? (getAddress(accountInput) as Address) : null;

  async function connectWallet() {
    const ethereum = (window as Window & { ethereum?: any }).ethereum;
    if (!ethereum) {
      setMessage("No injected EVM wallet found.");
      return;
    }
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chain.id.toString(16)}` }],
      });
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts[0] || !isAddress(accounts[0])) throw new Error("Wallet returned no account");
      const address = getAddress(accounts[0]) as Address;
      const wallet = createWalletClient({ account: address, chain, transport: custom(ethereum) });
      setWalletAddress(address);
      setWalletClient(wallet);
      setMessage(`Wallet connected on ${chain.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet connection failed");
    }
  }

  async function refresh() {
    if (!account) {
      setMessage("Enter a valid CL Account address.");
      return;
    }
    setBusy(true);
    setMessage("Reading Monad clearing state…");
    try {
      const [state, nextRisk, nextPolicy, solver] = await Promise.all([
        reader.getAccountState(account),
        deployment.riskPolicyManager ? reader.getRisk(account) : Promise.resolve(null),
        deployment.riskPolicyManager ? reader.getPolicy(account) : Promise.resolve(null),
        deployment.riskSolver ? reader.getSolverRecommendation(account) : Promise.resolve(null),
      ]);
      setAccountState(state);
      setRisk(nextRisk);
      setPolicy(nextPolicy);
      setRecommendation(solver?.recommendation ?? null);
      setMessage(`Clearing state synced from ${chain.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load clearing state");
    } finally {
      setBusy(false);
    }
  }

  async function executeRawAction() {
    if (!account || !walletClient || !walletAddress) {
      setMessage("Connect the owner wallet and enter a valid CL Account first.");
      return;
    }
    if (!isAddress(adapterInput) || !/^0x[0-9a-fA-F]*$/.test(actionInput) || actionInput.length % 2 !== 0) {
      setMessage("Adapter or action calldata is invalid.");
      return;
    }
    setBusy(true);
    setTxHash(null);
    try {
      const writer = createCLClient({ publicClient, walletClient, deployment });
      const hash = await writer.execute(account, getAddress(adapterInput) as Address, actionInput as Hex);
      setTxHash(hash);
      setMessage("Transaction submitted. Waiting for Monad confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      setMessage("Execution confirmed and post-trade CL risk validation passed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed");
      setBusy(false);
    }
  }

  const metrics = risk?.metrics;
  const protocolCards = [
    ["KURU", chain.id === 143 ? kuru[143].marginAccount : kuru[10143].marginAccount, deployment.adapters?.Kuru],
    ["PERPL", chain.id === 143 ? perpl[143].exchange : perpl[10143].exchange, deployment.adapters?.Perpl],
    ["EULER", chain.id === 143 ? euler[143].evc : undefined, deployment.adapters?.Euler],
    ["FREE COLLATERAL", undefined, deployment.adapters?.WalletBalance],
  ] as const;

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">MONAD / CLEARING INFRASTRUCTURE</div>
          <h1>CL</h1>
        </div>
        <div className="top-actions">
          <div className="network-dot"><span />{chain.name} · {chain.id}</div>
          <button className="button secondary" onClick={connectWallet}>
            {walletAddress ? short(walletAddress) : "CONNECT WALLET"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero-grid">
          <div>
            <p className="kicker">MONAD CLEARING NETWORK</p>
            <h2>One account.<br />Every market.<br /><span>One risk layer.</span></h2>
          </div>
          <div className="account-box">
            <label>CL ACCOUNT</label>
            <div className="input-row">
              <input
                value={accountInput}
                onChange={(event) => setAccountInput(event.target.value)}
                placeholder="0x…"
                spellCheck={false}
              />
              <button className="button" onClick={refresh} disabled={busy}>{busy ? "SYNCING" : "LOAD"}</button>
            </div>
            <p>{message}</p>
          </div>
        </section>

        <section className="metrics-grid">
          <Metric label="EQUITY" value={usd(metrics?.equityUsd)} />
          <Metric label="GROSS EXPOSURE" value={usd(metrics?.grossExposureUsd)} />
          <Metric label="NET DIRECTIONAL" value={usd(metrics?.directionalExposureUsd)} />
          <Metric label="LEVERAGE" value={ratio(metrics?.leverageE18)} />
          <Metric label="CL HEALTH" value={ratio(metrics?.healthE18)} emphasis />
          <Metric label="CRITICAL MOVE" value={percentBps(metrics?.criticalMoveBps)} />
        </section>

        <section className="two-col">
          <div className="panel">
            <div className="panel-title"><span>01</span> CROSS-PROTOCOL EXPOSURE</div>
            <div className="table">
              <div className="tr th"><span>ASSET</span><span>NET</span><span>GROSS</span><span>IM</span><span>MM</span></div>
              {risk?.exposures.length ? risk.exposures.map((exposure) => (
                <div className="tr" key={exposure.asset}>
                  <span className="mono">{short(exposure.asset)}</span>
                  <span>{usd(exposure.netUsd)}</span>
                  <span>{usd(exposure.grossUsd)}</span>
                  <span>{usd(exposure.initialMarginUsd)}</span>
                  <span>{usd(exposure.maintenanceMarginUsd)}</span>
                </div>
              )) : <div className="empty">NO VALUED EXPOSURE LOADED</div>}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title"><span>02</span> RISK SOLVER</div>
            <div className="solver-action">{recommendation?.action ?? "STANDBY"}</div>
            <div className="solver-grid">
              <div><small>ASSET</small><strong>{short(recommendation?.asset)}</strong></div>
              <div><small>CURRENT NET</small><strong>{usd(recommendation?.currentNetUsd)}</strong></div>
              <div><small>TARGET NET</small><strong>{usd(recommendation?.targetNetUsd)}</strong></div>
              <div><small>REPAY</small><strong>{usd(recommendation?.repayDebtUsd)}</strong></div>
            </div>
            <div className="status-line">
              <span className={risk?.ok ? "status good" : "status danger"}>{risk?.ok ? "POLICY PASS" : "POLICY BREACH"}</span>
              <span>margin util {metrics ? ratio(metrics.marginUtilizationE18) : "—"}</span>
            </div>
          </div>
        </section>

        <section className="two-col">
          <div className="panel">
            <div className="panel-title"><span>03</span> VENUES + RISK SOURCES</div>
            {protocolCards.map(([name, venue, adapter]) => (
              <div className="venue" key={name}>
                <div><strong>{name}</strong><small>{venue ? short(venue) : "direct CL Account balances"}</small></div>
                <div className="venue-right"><span className={adapter ? "light active" : "light"} />{adapter ? short(adapter) : "adapter pending"}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-title"><span>04</span> ACCOUNT CONTROL</div>
            <div className="control-grid">
              <div><small>OWNER</small><strong className="mono">{short(accountState?.owner)}</strong></div>
              <div><small>RISK GUARD</small><strong>{accountState?.riskGuardEnabled ? "ENFORCED" : "OFF"}</strong></div>
              <div><small>PAUSED</small><strong>{accountState ? (accountState.paused ? "YES" : "NO") : "—"}</strong></div>
              <div><small>MAX GROSS</small><strong>{usd(policy?.maxGrossExposureUsd)}</strong></div>
              <div><small>MAX DEBT</small><strong>{usd(policy?.maxDebtUsd)}</strong></div>
              <div><small>MIN HEALTH</small><strong>{ratio(policy?.minHealthE18)}</strong></div>
            </div>
          </div>
        </section>

        <section className="panel execution-panel">
          <div className="panel-title"><span>05</span> OWNER EXECUTION CONSOLE</div>
          <p className="warning">Raw adapter execution is intentionally explicit. CLAccount still enforces adapter authorization, target allowlists, selector permissions and the post-trade risk policy onchain.</p>
          <div className="execution-grid">
            <label>ADAPTER<input value={adapterInput} onChange={(e) => setAdapterInput(e.target.value)} placeholder="0x adapter" /></label>
            <label>ACTION CALLDATA<textarea value={actionInput} onChange={(e) => setActionInput(e.target.value)} rows={3} /></label>
            <button className="button danger-button" disabled={busy || !walletAddress} onClick={executeRawAction}>EXECUTE THROUGH CL</button>
          </div>
          {txHash && <div className="tx mono">TX {txHash}</div>}
        </section>
      </main>

      <footer>
        <span>CL / MONAD CLEARING NETWORK</span>
        <span>NON-CUSTODIAL · CROSS-PROTOCOL · FAIL-CLOSED</span>
      </footer>
    </div>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`metric ${emphasis ? "emphasis" : ""}`}><small>{label}</small><strong>{value}</strong></div>;
}
