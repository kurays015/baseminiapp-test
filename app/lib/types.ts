import { Abi, Address, Hex } from "viem";

export type SendSponsoredContractCallParams<
  TAbi extends Abi,
  TFunctionName extends string,
> = Omit<SendSponsoredCallsParams, "calls"> & {
  to: Address;
  abi: TAbi;
  functionName: TFunctionName;
  args: readonly unknown[];
  value?: Hex;
};

export type SendSponsoredCallsParams = {
  calls: SponsoredCall[];
  from: Address;
};

export type SponsoredCall = {
  to: Address;
  value?: Hex; // defaults to 0x0
  data: Hex;
};
