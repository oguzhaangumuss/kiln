export function isAddress(value: string | undefined | null): value is `0x${string}` {
  return Boolean(value?.startsWith("0x") && value.length === 42);
}

export type KilnContracts = {
  attestation: `0x${string}`;
  envelope: `0x${string}`;
};

const STORAGE_KEY = "kiln.v1.contracts.97";

export function envKilnContracts(): KilnContracts | null {
  const attestation = process.env.NEXT_PUBLIC_KILN_ATTESTATION?.trim();
  const envelope = process.env.NEXT_PUBLIC_KILN_ENVELOPE?.trim();
  if (isAddress(attestation) && isAddress(envelope)) {
    return { attestation, envelope };
  }
  return null;
}

export function readKilnContracts(): KilnContracts | null {
  const fromEnv = envKilnContracts();
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KilnContracts;
    if (isAddress(parsed.attestation) && isAddress(parsed.envelope)) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function writeKilnContracts(pair: KilnContracts): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
  window.dispatchEvent(new Event("kiln-contracts"));
}
