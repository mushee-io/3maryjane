import type { Address } from "./types";

export interface KuruDeployment {
  marginAccount: Address;
  router: Address;
  forwarder: Address;
  tokens: Record<string, Address>;
  markets: Record<string, Address>;
}

export interface PerplDeployment {
  exchange: Address;
  collateral: Address;
  restUrl: string;
  websocketUrl: string;
  perpIds: Record<string, number>;
}

export interface EulerDeployment {
  evc: Address;
  eVaultFactory: Address;
  vaultLens?: Address;
  accountLens?: Address;
}

export const kuru = {
  143: {
    marginAccount: "0x2A68ba1833cDf93fa9Da1EEbd7F46242aD8E90c5",
    router: "0xd651346d7c789536ebf06dc72aE3C8502cd695CC",
    forwarder: "0x974E61BBa9C4704E8Bcc1923fdC3527B41323FAA",
    tokens: {
      WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
      AUSD: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
      USDC: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    },
    markets: {
      "MON-AUSD": "0x131a2e70a5b31a517a74b8c567149bc294470da9",
      "MON-USDC": "0x065C9d28E428A0db40191a54d33d5b7c71a9C394",
    },
  },
  10143: {
    marginAccount: "0xd029C2D98ff85D8F64799017fE00a59B1159CE02",
    router: "0x7EFbE105Ca7415dE98F96622173458ac1c054630",
    forwarder: "0x681bB1508E14433b148a2549ba2726454aDc9BB4",
    tokens: {
      USDC: "0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570",
    },
    markets: {
      "MON-USDC": "0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9",
    },
  },
} as const satisfies Record<number, KuruDeployment>;

export const perpl = {
  143: {
    exchange: "0x34B6552d57a35a1D042CcAe1951BD1C370112a6F",
    collateral: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
    restUrl: "https://app.perpl.xyz/api",
    websocketUrl: "wss://app.perpl.xyz",
    perpIds: { BTC: 1, MON: 10, ETH: 20, SOL: 31, HYPE: 40, ZEC: 50 },
  },
  10143: {
    exchange: "0x1964c32f0be608e7d29302aff5e61268e72080cc",
    collateral: "0xdf5b718d8fcc173335185a2a1513ee8151e3c027",
    restUrl: "https://testnet.perpl.xyz/api",
    websocketUrl: "wss://testnet.perpl.xyz",
    perpIds: { BTC: 16, ETH: 32, SOL: 48, MON: 64, ZEC: 256 },
  },
} as const satisfies Record<number, PerplDeployment>;

export const euler = {
  143: {
    evc: "0x7a9324E8f270413fa2E458f5831226d99C7477CD",
    eVaultFactory: "0xba4Dd672062dE8FeeDb665DD4410658864483f1E",
    vaultLens: "0x15d1cc54fb3f7c0498fc991a23d8dc00df3c32a0",
    accountLens: "0x960d481229f70c3c1cbcd3fa2d223f55db9f36ee",
  },
} as const satisfies Record<number, EulerDeployment>;
