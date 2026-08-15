export type Envelope = {
  maxUsdt: number;
  hours: number;
  revoked: boolean;
  onchainId: number | null;
};

export function envelopeAllowsHire(envelope: Envelope): boolean {
  return !envelope.revoked && envelope.maxUsdt > 0 && envelope.hours > 0;
}
