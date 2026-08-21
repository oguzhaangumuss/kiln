export type JobGroup = "pay" | "read" | "yield" | "escrow" | "bridge" | "other";

export type PublishedJob = {
  name: string;
  description: string;
};

export type AdvertisedService = {
  name: string;
  endpoint: string;
};

export function groupPublishedJob(job: PublishedJob): JobGroup {
  const text = `${job.name} ${job.description}`.toLowerCase();
  if (/\b(escrow|dispute|refund|arbiter)\b/.test(text)) return "escrow";
  if (/\b(bridge|ccip|oft|layerzero)\b/.test(text)) return "bridge";
  if (/\b(yield|apy|lending|stake|unstake|reserves)\b/.test(text)) return "yield";
  if (/\b(quote|balance|doctor|info|status|list|receipt|history|positions|feeds|memory|report)\b/.test(text)) {
    return "read";
  }
  if (/\b(pay|payment|invoice|payout|send|deposit|withdraw)\b/.test(text)) return "pay";
  return "other";
}

export function heroJobs(jobs: PublishedJob[], limit = 6): PublishedJob[] {
  const scored = jobs.map((job, index) => ({ job, index, score: heroScore(job) }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((row) => row.job);
}

function heroScore(job: PublishedJob): number {
  const name = job.name.toLowerCase();
  if (/quote|balance|doctor|info|status|list|receipt|reserves|positions/.test(name)) return 3;
  if (/pay|send|deposit|withdraw|stake|bridge/.test(name)) return 1;
  return 2;
}

export function jobsFromUnknown(raw: unknown): PublishedJob[] {
  if (!Array.isArray(raw)) return [];
  const jobs: PublishedJob[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const job = asPublishedJob(item);
    if (!job || seen.has(job.name)) continue;
    seen.add(job.name);
    jobs.push(job);
    if (jobs.length >= 80) break;
  }
  return jobs;
}

function asPublishedJob(raw: unknown): PublishedJob | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const name = raw.trim().slice(0, 80);
    return name ? { name, description: "" } : null;
  }
  if (typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? row.id ?? "").trim().slice(0, 80);
  if (!name) return null;
  const description = String(row.description ?? row.desc ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return { name, description };
}
