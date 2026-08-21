export function hireBlockers(input: {
  connected: boolean;
  sampled: boolean;
  capOk: boolean;
  contractsReady: boolean;
}): string[] {
  const reasons: string[] = [];
  if (!input.connected) reasons.push("Connect a wallet on BSC testnet.");
  if (!input.sampled) reasons.push("Fire sample, or skip it, so hire is not a blind click.");
  if (!input.capOk) reasons.push("Set a spend cap above zero. Revoked envelopes cannot hire.");
  if (!input.contractsReady) {
    reasons.push("Load Kiln contracts from the wallet bar (shared addresses or Deploy).");
  }
  return reasons;
}
