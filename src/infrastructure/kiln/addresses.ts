export const KILN_TESTNET_CHAIN_ID = 97;

export function kilnAttestationAddress(): `0x${string}` | null {
  const value = process.env.NEXT_PUBLIC_KILN_ATTESTATION?.trim();
  return value?.startsWith("0x") && value.length === 42 ? (value as `0x${string}`) : null;
}

export function kilnEnvelopeAddress(): `0x${string}` | null {
  const value = process.env.NEXT_PUBLIC_KILN_ENVELOPE?.trim();
  return value?.startsWith("0x") && value.length === 42 ? (value as `0x${string}`) : null;
}
