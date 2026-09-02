import type { SampleTrace } from "@/domain/sample-trace";
import type { WorkReport } from "@/domain/work-report";

export type Attestation = {
  agentId: string;
  taskId: string;
  resultHash: string;
  txHash: string | null;
  at: string;
  work: WorkReport;
  trace: SampleTrace;
};
