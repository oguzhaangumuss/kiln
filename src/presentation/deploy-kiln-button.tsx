"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { kilnAttestationAbi, kilnEnvelopeAbi } from "@/infrastructure/kiln/abi";
import {
  kilnAttestationBytecode,
  kilnEnvelopeBytecode,
} from "@/infrastructure/kiln/bytecode";
import { writeKilnContracts } from "@/presentation/kiln-session";

export function DeployKilnButton() {
  const { isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deploy() {
    if (!walletClient || !publicClient) return;
    setBusy(true);
    setError(null);
    try {
      const attHash = await walletClient.deployContract({
        abi: kilnAttestationAbi,
        bytecode: kilnAttestationBytecode,
        chain: bscTestnet,
      });
      const attReceipt = await publicClient.waitForTransactionReceipt({ hash: attHash });
      const envHash = await walletClient.deployContract({
        abi: kilnEnvelopeAbi,
        bytecode: kilnEnvelopeBytecode,
        chain: bscTestnet,
      });
      const envReceipt = await publicClient.waitForTransactionReceipt({ hash: envHash });
      const attestation = attReceipt.contractAddress;
      const envelope = envReceipt.contractAddress;
      if (!attestation || !envelope) {
        throw new Error("Deployment confirmed, but a contract address was missing from the receipt.");
      }
      writeKilnContracts({ attestation, envelope });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected || chainId !== bscTestnet.id) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void deploy()}
        className="border border-ok px-2 py-1 font-mono text-[10px] uppercase text-ok disabled:opacity-40"
      >
        {busy ? "Deploying…" : "Deploy Kiln contracts"}
      </button>
      {error ? <p className="max-w-xs text-right font-mono text-[9px] text-heat">{error}</p> : null}
    </div>
  );
}
