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

const solverActions: SolverAction[] = ["NONE", "HEDGE", "REPAY", "DELEVERAGE"];

function configured(value: Address | undefined, name: string): Address {
  if (!value) throw new Error(`${name} is not configured for this CL deployment`);
  return value;
}

function toMetrics(raw: readonly unknown[]): PortfolioMetrics {
  return {
    assetsUsd: raw[0] as bigint,
    debtUsd: raw[1] as bigint,
    equityUsd: raw[2] as bigint,
    pnlUsd: raw[3] as bigint,
    grossExposureUsd: raw[4] as bigint,
    directionalExposureUsd: raw[5] as bigint,
    initialMarginUsd: raw[6] as bigint,
    maintenanceMarginUsd: raw[7] as bigint,
    leverageE18: raw[8] as bigint,
    healthE18: raw[9] as bigint,
    marginUtilizationE18: raw[10] as bigint,
    criticalMoveBps: raw[11] as bigint,
  };
}

function toExposure(raw: readonly unknown[]): AssetExposure {
  return {
    asset: raw[0] as Address,
    netUsd: raw[1] as bigint,
    grossUsd: raw[2] as bigint,
    hedgedPairUsd: raw[3] as bigint,
    initialMarginUsd: raw[4] as bigint,
    maintenanceMarginUsd: raw[5] as bigint,
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
        metrics: toMetrics(metrics as unknown as readonly unknown[]),
        exposures: exposures.map((item) => toExposure(item as unknown as readonly unknown[])),
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
        enabled: p[0],
        allowRiskReducingWhenBreached: p[1],
        maxGrossExposureUsd: p[2],
        maxDebtUsd: p[3],
        maxLeverageE18: p[4],
        maxMarginUtilizationE18: p[5],
        minHealthE18: p[6],
        minCriticalMoveBps: p[7],
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
      const actionIndex = Number(r[0]);
      return {
        recommendation: {
          action: solverActions[actionIndex] ?? "NONE",
          reason: r[1],
          asset: r[2],
          currentNetUsd: r[3],
          targetNetUsd: r[4],
          reduceGrossUsd: r[5],
          repayDebtUsd: r[6],
          severityBps: r[7],
        },
        metrics: toMetrics(metrics as unknown as readonly unknown[]),
        exposures: exposures.map((item) => toExposure(item as unknown as readonly unknown[])),
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
