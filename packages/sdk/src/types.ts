export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export type PositionType =
  | "CASH"
  | "SPOT"
  | "PERP"
  | "SUPPLY"
  | "DEBT"
  | "LP"
  | "OTHER";

export interface NormalizedPosition {
  protocolId: Hex;
  instrumentId: Hex;
  asset: Address;
  positionType: PositionType;
  /** Raw signed exposure in the integrated protocol's native position units. */
  signedExposure: bigint;
  /** 0 means intentionally unvalued until a price/decimal provider is applied. */
  notional: bigint;
  collateral: bigint;
  debt: bigint;
  pnl: bigint;
  metadata: Hex;
}

export interface ValuedPosition extends NormalizedPosition {
  valueUsd: bigint;
  valueDecimals: number;
}

export interface ExposureBucket {
  asset: Address;
  signedExposure: bigint;
  positionCount: number;
}
