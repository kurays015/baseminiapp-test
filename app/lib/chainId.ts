import { base } from "@base-org/account";

export const chainId =
  process.env.NODE_ENV === "production"
    ? base.constants.CHAIN_IDS.base
    : base.constants.CHAIN_IDS.baseSepolia;
