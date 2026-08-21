"use client";

import { useEffect, useState } from "react";
import { decodeEventLog } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { kilnEnvelopeAbi } from "@/infrastructure/kiln/abi";
import {
  prepareAttest,
  prepareOpenEnvelope,
  prepareRevoke,
} from "@/application/prepare-kiln";
import { readKilnContracts, type KilnContracts } from "@/presentation/kiln-session";

export function useKilnTx() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [contracts, setContracts] = useState<KilnContracts | null>(null);

  useEffect(() => {
    const sync = () => setContracts(readKilnContracts());
    sync();
    window.addEventListener("kiln-contracts", sync);
    return () => window.removeEventListener("kiln-contracts", sync);
  }, []);

  async function attest(agentTokenId: bigint, resultHash: `0x${string}`) {
    if (!contracts) throw new Error("Deploy Kiln contracts from the wallet bar first.");
    const hash = await writeContractAsync(
      prepareAttest(contracts.attestation, agentTokenId, resultHash),
    );
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async function openEnvelope(agentTokenId: bigint, maxUsdt: number, hours: number) {
    if (!contracts) throw new Error("Deploy Kiln contracts from the wallet bar first.");
    const hash = await writeContractAsync(
      prepareOpenEnvelope(contracts.envelope, agentTokenId, maxUsdt, hours),
    );
    const receipt = publicClient
      ? await publicClient.waitForTransactionReceipt({ hash })
      : null;
    let envelopeId: string | undefined;
    for (const log of receipt?.logs ?? []) {
      try {
        const parsed = decodeEventLog({
          abi: kilnEnvelopeAbi,
          data: log.data,
          topics: log.topics,
        });
        if (parsed.eventName === "Opened") {
          envelopeId = String(parsed.args.id);
        }
      } catch {
        // other logs
      }
    }
    return { hash, envelopeId };
  }

  async function revoke(envelopeId: bigint) {
    if (!contracts) throw new Error("The spend envelope contract is not connected.");
    const hash = await writeContractAsync(prepareRevoke(contracts.envelope, envelopeId));
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  return {
    address,
    isConnected,
    isPending,
    contractsReady: Boolean(contracts),
    contracts,
    attest,
    openEnvelope,
    revoke,
  };
}
