export type Attestation = {
  agentId: string;
  taskId: string;
  resultHash: string;
  simulatedTx: string;
  txHash: string | null;
  at: string;
};
