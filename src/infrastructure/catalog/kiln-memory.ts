import type { KilnMemoryPort } from "@/application/ports/kiln-memory-port";

const memory = new Map<string, "passed" | "failed" | "skipped">();

export const kilnMemory: KilnMemoryPort = {
  get(agentId) {
    return memory.get(agentId) ?? "none";
  },
  set(agentId, value) {
    memory.set(agentId, value);
  },
};
