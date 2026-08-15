import { kilnAttestationAbi, kilnEnvelopeAbi } from "@/infrastructure/kiln/abi";

export function prepareAttest(
  address: `0x${string}`,
  agentTokenId: bigint,
  resultHash: `0x${string}`,
) {
  return {
    address,
    abi: kilnAttestationAbi,
    functionName: "attest" as const,
    args: [agentTokenId, resultHash] as const,
  };
}

export function prepareOpenEnvelope(
  address: `0x${string}`,
  agentTokenId: bigint,
  maxUsdt: number,
  hours: number,
) {
  return {
    address,
    abi: kilnEnvelopeAbi,
    functionName: "open" as const,
    args: [agentTokenId, BigInt(Math.max(1, Math.round(maxUsdt))), BigInt(Math.max(1, hours))] as const,
  };
}

export function prepareRevoke(address: `0x${string}`, envelopeId: bigint) {
  return {
    address,
    abi: kilnEnvelopeAbi,
    functionName: "revoke" as const,
    args: [envelopeId] as const,
  };
}
