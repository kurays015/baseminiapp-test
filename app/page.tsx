"use client";

import { useCallback, useEffect, useState } from "react";
// import { useMiniKit } from "@coinbase/onchainkit/minikit";
// import {
//   ConnectWallet,
//   Wallet,
//   WalletDropdown,
//   WalletDropdownDisconnect,
// } from "@coinbase/onchainkit/wallet";
// import {
//   Avatar,
//   Name,
//   Address,
//   Identity,
//   EthBalance,
// } from "@coinbase/onchainkit/identity";
import { useAccount, useWriteContract } from "wagmi";
import { ArtCanvas } from "./components/ArtCanvas";
import { ART_NFT_ABI, ART_NFT_ADDRESS } from "./lib/nftContract";
import styles from "./page.module.css";
import Image from "next/image";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Home() {
  // const { isFrameReady, setFrameReady } = useMiniKit();
  const { address } = useAccount();
  const [mintStatus, setMintStatus] = useState<
    "idle" | "uploading" | "minting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { writeContractAsync, isPending: isMintPending } = useWriteContract();

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // useEffect(() => {
  //   if (!isFrameReady) {
  //     setFrameReady();
  //   }
  // }, [setFrameReady, isFrameReady]);

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
      setMintStatus("uploading");

      try {
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
        setMintStatus("minting");

        await writeContractAsync({
          address: process.env
            .NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: ART_NFT_ABI,
          functionName: "mint",
          args: [address, metadataUri],
        });

        setMintStatus("success");
      } catch (e) {
        setMintStatus("error");
        setErrorMessage(
          e instanceof Error ? e.message : "Something went wrong.",
        );
      }
    },
    [address, writeContractAsync],
  );

  const isBusy =
    mintStatus === "uploading" || mintStatus === "minting" || isMintPending;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Brushie&apos;s by Densityy</h1>
            <Image
              className={styles.logo}
              src="https://media.istockphoto.com/id/905247136/vector/paint-icon.jpg?s=612x612&w=0&k=20&c=BHuKjO4-V5_6mYASmmha4wS1ag4vQv3GH2y-kdB6HNM="
              width={96}
              height={96}
              alt="Brushies logo"
              priority
            />
          </div>
          <p className={styles.subtitle}>
            Turn your imagination into on-chain art on Base
          </p>
        </div>

        <div className={styles.panel}>
          <div className={styles.walletRow}>
            {/* <Wallet>
              <ConnectWallet />
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address className="text-black" />
                  <EthBalance />
                </Identity>

                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet> */}
          </div>

          {/* {isConnected && ( */}
          <>
            <ArtCanvas onExport={handleExportAndMint} disabled={isBusy} />
            {mintStatus === "uploading" && (
              <p className={styles.status}>Uploading art to IPFS…</p>
            )}
            {mintStatus === "minting" && (
              <p className={styles.status}>
                Minting NFT… Confirm in your wallet.
              </p>
            )}
            {mintStatus === "success" && (
              <p className={styles.statusSuccess}>NFT minted successfully.</p>
            )}
            {mintStatus === "error" && errorMessage && (
              <p className={styles.statusError}>{errorMessage}</p>
            )}
          </>
          {/* )} */}

          {/* {!isConnected && (
            <p className={styles.hint}>Connect a wallet to draw and mint.</p>
          )} */}
        </div>
      </div>
    </div>
  );
}
