"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Avatar,
  Name,
  Address,
  Identity,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";
import { ArtCanvas } from "./components/ArtCanvas";
import { ART_NFT_ABI, ART_NFT_ADDRESS } from "./lib/nftContract";
import styles from "./page.module.css";
import { sdk } from "@farcaster/miniapp-sdk";
import { sendSponsoredContractCall } from "./lib/sponsoredCalls";

export default function Home() {
  const { address } = useAccount();
  const [mintStatus, setMintStatus] = useState<
    "idle" | "uploading" | "minting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [isValidDevice, setIsValidDevice] = useState(true);

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent,
        );
      const isValidScreenSize = window.innerWidth <= 768;
      setIsValidDevice(isMobileDevice || isValidScreenSize);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const handleExportAndMint = useCallback(
    async (blob: Blob) => {
      if (!address) {
        setErrorMessage("Connect your wallet first.");
        setMintStatus("error");
        return;
      }
      if (!ART_NFT_ADDRESS) {
        setErrorMessage(
          "NFT contract not configured. Set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS.",
        );
        setMintStatus("error");
        return;
      }

      setErrorMessage("");
      setTxHash("");
      setMintStatus("uploading");

      try {
        // Step 1: Upload to IPFS
        console.log("Uploading to IPFS...");
        const form = new FormData();
        form.append("image", blob, "art.png");
        form.append("name", `Base Art #${Date.now()}`);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        const { metadataUri } = (await res.json()) as { metadataUri: string };
        console.log("Metadata URI:", metadataUri);

        // Step 2: Mint with sponsored transaction
        setMintStatus("minting");
        console.log("Minting NFT with sponsored transaction...");
        console.log("Contract:", ART_NFT_ADDRESS);
        console.log("Recipient:", address);

        const result = await sendSponsoredContractCall({
          to: ART_NFT_ADDRESS as `0x${string}`,
          abi: ART_NFT_ABI,
          functionName: "mint",
          args: [address, metadataUri],
          from: address, // IMPORTANT: Pass the address from wagmi
        });

        console.log("Sponsored mint result:", result);

        // Extract transaction hash from result
        if (result) {
          let hash = "";
          if (typeof result === "string") {
            hash = result;
          } else if (typeof result === "object" && result !== null) {
            // Try to extract hash from various possible structures
            hash =
              (result as { hash?: string }).hash ||
              (result as { txHash?: string }).txHash ||
              (result as { transactionHash?: string }).transactionHash ||
              JSON.stringify(result);
          }
          setTxHash(hash);
        }

        setMintStatus("success");
      } catch (e) {
        console.error("Mint error:", e);
        setMintStatus("error");
        setErrorMessage(
          e instanceof Error ? e.message : "Something went wrong.",
        );
      }
    },
    [address],
  );

  const isBusy = mintStatus === "uploading" || mintStatus === "minting";

  return (
    <div className={styles.container}>
      {!isValidDevice ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
            background: "#0f172a",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "500px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "2rem",
                marginBottom: "0.75rem",
                color: "#fff",
              }}
            >
              📱 Mobile & Tablet Only
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "rgba(255,255,255,0.9)",
                lineHeight: "1.6",
                marginBottom: "1rem",
              }}
            >
              Brushie&apos;s is designed for mobile phones and tablets (up to
              768px width).
            </p>
            <p
              style={{
                fontSize: "1rem",
                color: "rgba(255,255,255,0.7)",
                lineHeight: "1.6",
              }}
            >
              Please open this app on your phone or tablet, or resize your
              browser window to a smaller width to start creating on-chain art!
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.panel}>
            <div className={styles.walletRow}>
              <Wallet>
                <ConnectWallet disconnectedLabel="Connect" />
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address className="text-black" />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>

            <ArtCanvas onExport={handleExportAndMint} disabled={isBusy} />

            {mintStatus === "uploading" && (
              <p className={styles.status}>Uploading…</p>
            )}
            {mintStatus === "minting" && (
              <p className={styles.status}>Minting…</p>
            )}
            {mintStatus === "success" && (
              <div className={styles.statusSuccess}>
                <p>Minted!</p>
                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.txLink}
                  >
                    View on Basescan
                  </a>
                )}
              </div>
            )}
            {mintStatus === "error" && errorMessage && (
              <p className={styles.statusError}>{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
