export type HireFacilitator = "kiln" | "b402";

export type Hire = {
  agentId: string;
  simulatedTx: string;
  txHash: string | null;
  maxUsdt: number;
  hours: number;
  facilitator: HireFacilitator;
  at: string;
  leaseId: string | null;
};
