import { createBaseAccountSDK, base } from "@base-org/account";
import { encodeFunctionData, numberToHex } from "viem";
import type { Abi, EncodeFunctionDataParameters, Hex } from "viem";
import {
  SendSponsoredCallsParams,
  SendSponsoredContractCallParams,
} from "./types";

/**
 * Sends a sponsored (paymaster-backed) `wallet_sendCalls` request via Base Account.
 * Reusable for any contract calls once you provide the encoded `data`.
 */

export async function sendSponsoredCalls({
  calls,
  from,
}: SendSponsoredCallsParams) {
  const paymasterServiceUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_PAYMASTER_PROXY_SERVER_URL
      : process.env.NEXT_PUBLIC_TEST_PAYMASTER_PROXY_SERVER_URL;

  const chainId =
    process.env.NODE_ENV === "production"
      ? base.constants.CHAIN_IDS.base
      : base.constants.CHAIN_IDS.baseSepolia;

  console.log("🔍 Paymaster Debug:");
  console.log("  - Environment:", process.env.NODE_ENV);
  console.log(
    "  - Paymaster URL:",
    paymasterServiceUrl ? "✅ Set" : "❌ Missing",
  );
  console.log("  - From address:", from);
  console.log("  - Chain ID:", chainId);
  console.log("  - Calls:", calls.length);

  if (!paymasterServiceUrl) {
    throw new Error(
      "Missing paymaster URL. Set NEXT_PUBLIC_PAYMASTER_PROXY_SERVER_URL or NEXT_PUBLIC_TEST_PAYMASTER_PROXY_SERVER_URL",
    );
  }

  if (!from) {
    throw new Error(
      "No account address provided. Please pass the user's address via 'from' parameter.",
    );
  }

  // IMPORTANT: appChainIds is required for the SDK to work properly
  const sdk = createBaseAccountSDK({
    appName: "Brushies by Densityy",
    appLogoUrl:
      "https://media.istockphoto.com/id/905247136/vector/paint-icon.jpg?s=612x612&w=0&k=20&c=BHuKjO4-V5_6mYASmmha4wS1ag4vQv3GH2y-kdB6HNM=",
    appChainIds: [base.constants.CHAIN_IDS.baseSepolia],
  });

  const provider = sdk.getProvider();

  // Normalize minimal shape expected by `wallet_sendCalls`.
  const normalizedCalls = calls.map((c) => ({
    to: c.to,
    value: c.value ?? ("0x0" as Hex),
    data: c.data,
  }));

  console.log("📤 Sending wallet_sendCalls with paymaster...");

  const result = await provider.request({
    method: "wallet_sendCalls",
    params: [
      {
        version: "1.0",
        chainId: numberToHex(chainId),
        from: from,
        calls: normalizedCalls,
        capabilities: {
          paymasterService: { url: paymasterServiceUrl },
        },
      },
    ],
  });

  console.log("✅ Transaction sent:", result);
  return result;
}

/**
 * Convenience wrapper: build calldata from ABI + fn + args,
 * then send as a single sponsored call.
 */
export async function sendSponsoredContractCall<
  const TAbi extends Abi,
  const TFunctionName extends string,
>({
  to,
  abi,
  functionName,
  args,
  value,
  from,
  ...rest
}: SendSponsoredContractCallParams<TAbi, TFunctionName>) {
  const data = encodeFunctionData({
    abi,
    functionName,
    args,
  } as EncodeFunctionDataParameters<Abi>);

  return await sendSponsoredCalls({
    ...rest,
    from,
    calls: [{ to, value, data }],
  });
}
