import type { HireFacilitator } from "@/domain/hire";

export type X402Accepts = {
  scheme: "exact";
  network: "bsc-testnet" | "bsc";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: {
    facilitator: HireFacilitator;
    name: string;
  };
};

export type X402Challenge = {
  x402Version: 1;
  error: string;
  accepts: X402Accepts[];
};

export type X402Payment = {
  envelopeTx?: string;
  envelopeId?: string;
  hirer?: string;
};

export function facilitatorFromEnv(): HireFacilitator {
  return process.env.B402_API_KEY?.trim() ? "b402" : "kiln";
}

export function payToFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_KILN_ENVELOPE?.trim() ||
    process.env.KILN_TREASURY?.trim() ||
    "0x0000000000000000000000000000000000008004"
  );
}

export function buildHireChallenge(maxUsdt: number): X402Challenge {
  const facilitator = facilitatorFromEnv();
  return {
    x402Version: 1,
    error: "X-PAYMENT header required",
    accepts: [
      {
        scheme: "exact",
        network: "bsc-testnet",
        maxAmountRequired: String(Math.max(1, Math.round(maxUsdt * 1e6))),
        resource: "/api/hire",
        description: "Kiln hire under a spend envelope",
        mimeType: "application/json",
        payTo: payToFromEnv(),
        maxTimeoutSeconds: 300,
        asset: facilitator === "b402" ? "USDT" : "BNB",
        extra: {
          facilitator,
          name: facilitator === "b402" ? "Binance B402" : "Kiln facilitator",
        },
      },
    ],
  };
}

export function parsePaymentHeader(header: string | null): X402Payment | null {
  if (!header?.trim()) return null;
  try {
    const decoded = header.includes("{")
      ? header
      : Buffer.from(header, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as X402Payment;
    return parsed;
  } catch {
    return null;
  }
}

export function paymentLooksSettled(payment: X402Payment): boolean {
  const tx = payment.envelopeTx?.trim() ?? "";
  return /^0x[0-9a-fA-F]{64}$/.test(tx);
}
