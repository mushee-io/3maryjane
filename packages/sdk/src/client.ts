import type { PublicClient, WalletClient } from "viem";
import { clAccountAbi, erc20Abi, intentEngineAbi, riskPolicyManagerAbi, riskSolverAbi } from "./abis";
import type {
  AdapterAction,
  Address,
  AssetExposure,
  CLDeployment,
  Hex,
  PortfolioMetrics,
  RiskPolicy,
  RiskSnapshot,
  SolverAction,
  SolverRecommendation,
} from "./types";

export interface CreateCLClientOptions {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  deployment: CLDeployment;
}

export interface CreateIntentInput {
  account: Address;
  kind: number;
  asset: Address;
  targetNetUsd: bigint;
  maxNotionalUsd: bigint;
  deadline: bigint;
  constraintsHash: Hex;
  metadataHash: Hex;
}

interface RawPortfolioMetrics {
  assetsUsd: bigint;
  debtUsd: bigint;
  equityUsd: bigint;
  pnlUsd: bigint;
  grossExposureUsd: bigint;
  directionalExposureUsd: bigint;
  initialMarginUsd: bigint;
  maintenanceMarginUsd: bigint;
  leverageE18: bigint;
  healthE18: bigint;
  marginUtilizationE18: bigint;
  criticalMoveBps: bigint;
}

interface RawAssetExposure {
  asset: Address;
  netUsd: bigint;
  grossUsd: bigint;
  hedgedPairUsd: bigint;
  initialMarginUsd: bigint;
  maintenanceMarginUsd: bigint;
}

const solverActions: SolverAction[] = ["NONE", "HEDGE", "REPAY", "DELEVERAGE"];

function configured(value: Address | undefined, name: string): Address {
  if (!value) throw new Error(`${name} is not configured for this CL deployment`);
  return value;
}

function toMetrics(raw: RawPortfolioMetrics): PortfolioMetrics {
  return {
    assetsUsd: raw.assetsUsd,
    debtUsd: raw.debtUsd,
    equityUsd: raw.equityUsd,
    pnlUsd: raw.pnlUsd,
    grossExposureUsd: raw.grossExposureUsd,
    directionalExposureUsd: raw.directionalExposureUsd,
    initialMarginUsd: raw.initialMarginUsd,
    maintenanceMarginUsd: raw.maintenanceMarginUsd,
    leverageE18: raw.leverageE18,
    healthE18: raw.healthE18,
    marginUtilizationE18: raw.marginUtilizationE18,
    criticalMoveBps: raw.criticalMoveBps,
  };
}

function toExposure(raw: RawAssetExposure): AssetExposure {
  return {
    asset: raw.asset,
    netUsd: raw.netUsd,
    grossUsd: raw.grossUsd,
    hedgedPairUsd: raw.hedgedPairUsd,
    initialMarginUsd: raw.initialMarginUsd,
    maintenanceMarginUsd: raw.maintenanceMarginUsd,
  };
}

async function write(
  publicClient: PublicClient,
  walletClient: WalletClient | undefined,
  request: Parameters<PublicClient["simulateContract"]>[0],
): Promise<Hex> {
  if (!walletClient?.account) throw new Error("A connected wallet client is required for this operation");
  const simulation = await publicClient.simulateContract({ ...request, account: walletClient.account });
  return walletClient.writeContract(simulation.request);
}

export function createCLClient(options: CreateCLClientOptions) {
  const { publicClient, walletClient, deployment } = options;

  return {
    deployment,
    publicClient,
    walletClient,

    async getAccountState(account: Address) {
      const [owner, paused, riskGuard, riskGuardEnabled] = await Promise.all([
        publicClient.readContract({ address: account, abi: clAccountAbi, functionName: "owner" }),
        publicClient.readContract({ address: account, abi: clAccountAbi, functionName: "paused" }),
        publicClient.readContract({ address: account, abi: clAccountAbi, functionName: "riskGuard" }),
        publicClient.readContract({ address: account, abi: clAccountAbi, functionName: "riskGuardEnabled" }),
      ]);
      return { owner, paused, riskGuard, riskGuardEnabled };
    },

    async getRisk(account: Address): Promise<RiskSnapshot> {
      const manager = configured(deployment.riskPolicyManager, "riskPolicyManager");
      const result = await publicClient.readContract({
        address: manager,
        abi: riskPolicyManagerAbi,
        functionName: "check",
        args: [account],
      });
      const [ok, reason, metrics, exposures] = result;
      return {
        ok,
        reason,
        metrics: toMetrics(metrics),
        exposures: exposures.map(toExposure),
      };
    },

    async getPolicy(account: Address): Promise<RiskPolicy> {
      const manager = configured(deployment.riskPolicyManager, "riskPolicyManager");
      const p = await publicClient.readContract({
        address: manager,
        abi: riskPolicyManagerAbi,
        functionName: "policy",
        args: [account],
      });
      return {
        enabled: p.enabled,
        allowRiskReducingWhenBreached: p.allowRiskReducingWhenBreached,
        maxGrossExposureUsd: p.maxGrossExposureUsd,
        maxDebtUsd: p.maxDebtUsd,
        maxLeverageE18: p.maxLeverageE18,
        maxMarginUtilizationE18: p.maxMarginUtilizationE18,
        minHealthE18: p.minHealthE18,
        minCriticalMoveBps: p.minCriticalMoveBps,
      };
    },

    async getCoveredAdapters(account: Address): Promise<Address[]> {
      const manager = configured(deployment.riskPolicyManager, "riskPolicyManager");
      const result = await publicClient.readContract({
        address: manager,
        abi: riskPolicyManagerAbi,
        functionName: "adapters",
        args: [account],
      });
      return [...result];
    },

    async getSolverRecommendation(account: Address): Promise<{
      recommendation: SolverRecommendation;
      metrics: PortfolioMetrics;
      exposures: AssetExposure[];
    }> {
      const solver = configured(deployment.riskSolver, "riskSolver");
      const result = await publicClient.readContract({
        address: solver,
        abi: riskSolverAbi,
        functionName: "solve",
        args: [account],
      });
      const [r, metrics, exposures] = result;
      const actionIndex = Number(r.action);
      return {
        recommendation: {
          action: solverActions[actionIndex] ?? "NONE",
          reason: r.reason,
          asset: r.asset,
          currentNetUsd: r.currentNetUsd,
          targetNetUsd: r.targetNetUsd,
          reduceGrossUsd: r.reduceGrossUsd,
          repayDebtUsd: r.repayDebtUsd,
          severityBps: r.severityBps,
        },
        metrics: toMetrics(metrics),
        exposures: exposures.map(toExposure),
      };
    },

    async tokenBalance(token: Address, account: Address): Promise<bigint> {
      return publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account] });
    },

    async execute(account: Address, adapter: Address, action: Hex): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: account,
        abi: clAccountAbi,
        functionName: "execute",
        args: [adapter, action],
      });
    },

    async executeBatch(account: Address, actions: readonly AdapterAction[]): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: account,
        abi: clAccountAbi,
        functionName: "executeBatch",
        args: [[...actions]],
      });
    },

    async authorizeAdapter(account: Address, adapter: Address, authorized = true): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: account,
        abi: clAccountAbi,
        functionName: "authorizeAdapter",
        args: [adapter, authorized],
      });
    },

    async setRiskGuard(account: Address, guard: Address, enabled = true): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: account,
        abi: clAccountAbi,
        functionName: "setRiskGuard",
        args: [guard, enabled],
      });
    },

    async setDefensiveOperator(account: Address, operator: Address, authorized = true): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: account,
        abi: clAccountAbi,
        functionName: "setDefensiveOperator",
        args: [operator, authorized],
      });
    },

    async withdraw(account: Address, asset: Address, to: Address, amount: bigint): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: account,
        abi: clAccountAbi,
        functionName: "withdraw",
        args: [asset, to, amount],
      });
    },

    async createIntent(input: CreateIntentInput): Promise<Hex> {
      const engine = configured(deployment.intentEngine, "intentEngine");
      return write(publicClient, walletClient, {
        address: engine,
        abi: intentEngineAbi,
        functionName: "createIntent",
        args: [
          input.account,
          input.kind,
          input.asset,
          input.targetNetUsd,
          input.maxNotionalUsd,
          input.deadline,
          input.constraintsHash,
          input.metadataHash,
        ],
      });
    },

    async approveToken(token: Address, spender: Address, amount: bigint): Promise<Hex> {
      return write(publicClient, walletClient, {
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
      });
    },
  };
}
