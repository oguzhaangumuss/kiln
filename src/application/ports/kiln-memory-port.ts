export type KilnMemoryPort = {
  get(agentId: string): "none" | "passed" | "failed" | "skipped";
  set(agentId: string, value: "passed" | "failed" | "skipped"): void;
};
