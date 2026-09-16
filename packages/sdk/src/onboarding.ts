import { getAddress, isAddress } from "viem";
import type { Address, ProtocolManifest } from "./types";

export interface ManifestValidation {
  ok: boolean;
  errors: string[];
  normalized?: ProtocolManifest;
}

const supportedChains = new Set([143, 10143]);

function uniqueAddresses(values: readonly Address[]): Address[] {
  return [...new Set(values.map((value) => getAddress(value) as Address))];
}

export function validateProtocolManifest(input: ProtocolManifest): ManifestValidation {
  const errors: string[] = [];
  if (!/^[A-Z0-9_]{2,32}$/.test(input.id)) errors.push("id must be 2-32 uppercase letters, digits or underscores");
  if (!input.displayName.trim()) errors.push("displayName is required");
  if (!supportedChains.has(input.chainId)) errors.push(`unsupported Monad chainId ${input.chainId}`);
  if (!isAddress(input.adapter) || input.adapter === "0x0000000000000000000000000000000000000000") {
    errors.push("adapter must be a non-zero address");
  }
  if (input.targets.length === 0) errors.push("at least one allowlisted target is required");
  if (input.positionTypes.length === 0) errors.push("at least one normalized position type is required");
  for (const target of input.targets) {
    if (!isAddress(target) || target === "0x0000000000000000000000000000000000000000") {
      errors.push(`invalid target ${target}`);
    }
  }
  for (const asset of input.assets) {
    if (!isAddress(asset)) errors.push(`invalid asset ${asset}`);
  }
  if (errors.length !== 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    normalized: {
      ...input,
      adapter: getAddress(input.adapter) as Address,
      targets: uniqueAddresses(input.targets),
      assets: uniqueAddresses(input.assets),
    },
  };
}

export function assertProtocolManifest(input: ProtocolManifest): ProtocolManifest {
  const result = validateProtocolManifest(input);
  if (!result.ok || !result.normalized) throw new Error(`Invalid CL protocol manifest: ${result.errors.join("; ")}`);
  return result.normalized;
}

export function manifestSecurityChecklist(manifest: ProtocolManifest): string[] {
  return [
    `${manifest.id}: adapter does not custody funds`,
    `${manifest.id}: every execution target is explicitly allowlisted`,
    `${manifest.id}: getPositions() fails closed for material read failures`,
    `${manifest.id}: units/decimals are documented before risk mapping`,
    `${manifest.id}: derivative instruments have explicit underlying/collateral mapping`,
    `${manifest.id}: live addresses are re-verified for chain ${manifest.chainId}`,
    `${manifest.id}: fork/live integration tests cover deposits, exits and failure paths`,
  ];
}
