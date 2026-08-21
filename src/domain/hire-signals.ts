import type { Heartbeat } from "@/domain/heartbeat";
import { remainingLabel, type Lease } from "@/domain/lease";

export function isCommerceJob(name: string): boolean {
  return /8183|negotiate|notify|fulfill|settle|quote|erc-?8183/.test(name.toLowerCase());
}

export function commerceJobNames(skills: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const skill of skills) {
    const name = skill.trim();
    if (!name || seen.has(name) || !isCommerceJob(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function latestSkills(heartbeats: Heartbeat[]): string[] {
  for (const beat of heartbeats) {
    if (beat.skills.length > 0) return beat.skills;
  }
  return [];
}

export function monitorSignals(lease: Lease, heartbeats: Heartbeat[]) {
  const skills = latestSkills(heartbeats);
  const commerce = commerceJobNames(skills);
  return {
    door: {
      title: "Door",
      body:
        lease.lastHeartbeat?.reachable
          ? `Catalog answered${lease.lastHeartbeat.latencyMs !== null ? ` in ${lease.lastHeartbeat.latencyMs}ms` : ""}.`
          : lease.a2aEndpoint || lease.mcpEndpoint
            ? "Job URL listed. Last ping got no healthy catalog."
            : "No public job URL on this lease.",
    },
    commerce: {
      title: "Commerce",
      body: commerce.length
        ? `Published ERC-8183-style jobs: ${commerce.join(", ")}. Kiln lists them; it does not watch fills.`
        : skills.length
          ? "The door published jobs, none look like ERC-8183 negotiate/settle. Kiln does not invent a fill tape."
          : "No published commerce jobs yet. Ping the catalog.",
    },
    budget: {
      title: "Budget",
      body: `Cap ${lease.maxUsdt} USDT / ${lease.hours}h · ${remainingLabel(lease)}. Revoke stops this envelope. Remaining on-chain spend is not streamed here.`,
    },
  };
}
