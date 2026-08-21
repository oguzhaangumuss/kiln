import type { Agent } from "@/domain/agent";
import type { ProbeTick, SampleTrace } from "@/domain/sample-trace";
import { jobsFromUnknown, type PublishedJob } from "@/domain/published-job";
import { fetchScanAgent } from "@/infrastructure/catalog/scan-catalog";

const MAX_BYTES = 12_288;
const TIMEOUT_MS = 5_000;

function isPrivateIPv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function blockedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Invalid endpoint URL.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Only http(s) endpoints can be probed.";
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return "Private hosts are blocked.";
  }
  if (isPrivateIPv4(host)) return "Private IP ranges are blocked.";
  if (host.includes(":")) return "IPv6 endpoints are skipped.";
  if (host.endsWith(".invalid")) return "Placeholder URL on a synthetic card.";
  return null;
}

async function getPublicJson(url: string): Promise<{ status: number; latencyMs: number; body: string }> {
  const started = Date.now();
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "application/json, text/plain;q=0.8",
      "User-Agent": "Kiln-sample/0.2",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const latencyMs = Date.now() - started;
  const buf = new Uint8Array(await res.arrayBuffer());
  const body = new TextDecoder().decode(buf.slice(0, MAX_BYTES));
  return { status: res.status, latencyMs, body };
}

type ParsedCatalog = {
  jobs: PublishedJob[];
  snippet: string;
  transport: string | null;
  catalogName: string | null;
  catalogVersion: string | null;
  docsUrl: string | null;
};

function parsePublishedWork(body: string): ParsedCatalog {
  const fallback: ParsedCatalog = {
    jobs: [],
    snippet: body.replace(/\s+/g, " ").trim().slice(0, 240),
    transport: null,
    catalogName: null,
    catalogVersion: null,
    docsUrl: null,
  };
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    const jobs = [
      ...jobsFromUnknown(json.tools),
      ...jobsFromUnknown(json.skills),
    ];
    const unique: PublishedJob[] = [];
    const seen = new Set<string>();
    for (const job of jobs) {
      if (seen.has(job.name)) continue;
      seen.add(job.name);
      unique.push(job);
    }
    const snippet = String(json.description || json.name || fallback.snippet)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
    return {
      jobs: unique,
      snippet,
      transport: json.transport ? String(json.transport) : null,
      catalogName: json.name ? String(json.name).slice(0, 80) : null,
      catalogVersion: json.version ? String(json.version).slice(0, 32) : null,
      docsUrl: typeof json.docs === "string" ? json.docs : null,
    };
  } catch {
    return fallback;
  }
}

function mark(
  ticks: ProbeTick[],
  started: number,
  step: ProbeTick["step"],
  status: ProbeTick["status"],
  title: string,
  detail: string,
): void {
  ticks.push({ tMs: Date.now() - started, step, status, title, detail });
}

function baseTrace(partial: Partial<SampleTrace> & Pick<SampleTrace, "ticks" | "verdict">): SampleTrace {
  return {
    reachable: false,
    protocol: null,
    endpoint: null,
    latencyMs: null,
    httpStatus: null,
    skills: [],
    jobs: [],
    snippet: "",
    bodyPreview: "",
    transport: null,
    catalogName: null,
    catalogVersion: null,
    docsUrl: null,
    hydrateFailed: false,
    ...partial,
  };
}

export async function probeAgent(agent: Agent): Promise<SampleTrace> {
  const started = Date.now();
  const ticks: ProbeTick[] = [];
  let live = agent;
  let hydrateFailed = false;

  if (!agent.cardHydrated && /^\d+$/.test(agent.agentId)) {
    try {
      live = { ...(await fetchScanAgent(agent.chainId || 56, agent.agentId)), cardHydrated: true };
      mark(
        ticks,
        started,
        "index",
        "ok",
        "8004scan card",
        `${live.handle} · ${live.kind} · pulse ${live.pulse}`,
      );
    } catch {
      hydrateFailed = true;
      mark(
        ticks,
        started,
        "index",
        "fail",
        "Card refresh failed",
        "List rows often omit MCP/A2A URLs. Detail fetch did not complete.",
      );
    }
  } else {
    mark(
      ticks,
      started,
      "index",
      agent.cardHydrated ? "ok" : "info",
      agent.cardHydrated ? "Detail card" : "Listed card",
      `${agent.handle} · ${agent.kind} · pulse ${agent.pulse}`,
    );
  }

  const endpoint =
    live.a2aEndpoint || live.mcpEndpoint || live.extraServices?.[0]?.endpoint || null;
  const protocol = live.a2aEndpoint
    ? "A2A"
    : live.mcpEndpoint
      ? "MCP"
      : live.extraServices?.[0]?.name || live.protocols[0] || null;
  const listed = live.protocols.length ? live.protocols.join(" · ") : "none on card";

  if (!endpoint) {
    const verdict = hydrateFailed
      ? "Could not refresh the 8004scan card, so Kiln never reached a job URL."
      : "Identity only. After the detail card, this agent still has no A2A or MCP URL.";
    mark(
      ticks,
      started,
      "services",
      hydrateFailed ? "fail" : "skip",
      hydrateFailed ? "No URL (refresh failed)" : "No public job URL",
      `Protocols: ${listed}`,
    );
    mark(ticks, started, "verdict", hydrateFailed ? "fail" : "skip", "No catalog", verdict);
    return baseTrace({
      protocol,
      hydrateFailed,
      ticks,
      verdict,
    });
  }

  mark(ticks, started, "services", "ok", protocol ?? "endpoint", endpoint);

  const blocked = blockedUrl(endpoint);
  if (blocked) {
    const verdict = `Endpoint listed but not probed: ${blocked}`;
    mark(ticks, started, "probe", "fail", "Probe blocked", blocked);
    mark(ticks, started, "verdict", "fail", "Blocked", verdict);
    return baseTrace({
      protocol,
      endpoint,
      hydrateFailed,
      ticks,
      verdict,
    });
  }

  try {
    const hit = await getPublicJson(endpoint);
    const parsed = parsePublishedWork(hit.body);
    const paid = hit.status === 402;
    const ok = (hit.status >= 200 && hit.status < 400) || paid;
    mark(
      ticks,
      started,
      "probe",
      ok ? "ok" : "fail",
      paid ? "HTTP 402 · x402" : `HTTP ${hit.status}`,
      `${hit.latencyMs}ms · ${ok ? "catalog answered" : "endpoint listed but not healthy"}`,
    );
    if (parsed.jobs.length) {
      mark(
        ticks,
        started,
        "skills",
        "ok",
        `${parsed.jobs.length} published jobs`,
        parsed.jobs
          .slice(0, 8)
          .map((job) => job.name)
          .join(" · "),
      );
    } else if (parsed.snippet) {
      mark(ticks, started, "skills", "info", "What the agent published", parsed.snippet);
    }
    if (parsed.transport === "stdio") {
      mark(
        ticks,
        started,
        "skills",
        "info",
        "stdio catalog",
        "Kiln listed tools. It did not invoke them (no payments from this panel).",
      );
    }

    for (const extra of (live.extraServices ?? []).slice(0, 3)) {
      if (extra.endpoint === endpoint) continue;
      if (blockedUrl(extra.endpoint)) continue;
      try {
        const extraHit = await getPublicJson(extra.endpoint);
        mark(
          ticks,
          started,
          "services",
          extraHit.status >= 200 && extraHit.status < 400 ? "ok" : "info",
          extra.name,
          `HTTP ${extraHit.status} · ${extraHit.latencyMs}ms · ${extra.endpoint}`,
        );
      } catch {
        mark(ticks, started, "services", "info", extra.name, `No answer · ${extra.endpoint}`);
      }
    }

    const verdict = ok
      ? parsed.jobs.length
        ? `Catalog answered in ${hit.latencyMs}ms with ${parsed.jobs.length} published jobs.${
            parsed.transport === "stdio"
              ? " Transport is stdio — Kiln read the list, it did not run q402_pay or any other tool."
              : ""
          }`
        : `Endpoint answered in ${hit.latencyMs}ms. No tool/skill list in the JSON.`
      : `Endpoint listed but returned HTTP ${hit.status}. Do not treat this agent as live.`;
    mark(ticks, started, "verdict", ok ? "ok" : "fail", ok ? "Catalog reachable" : "Unreachable", verdict);
    return baseTrace({
      reachable: ok,
      protocol,
      endpoint,
      latencyMs: hit.latencyMs,
      httpStatus: hit.status,
      skills: parsed.jobs.map((job) => job.name),
      jobs: parsed.jobs,
      snippet: parsed.snippet,
      bodyPreview: hit.body.slice(0, 8000),
      transport: parsed.transport,
      catalogName: parsed.catalogName,
      catalogVersion: parsed.catalogVersion,
      docsUrl: parsed.docsUrl,
      hydrateFailed,
      ticks,
      verdict,
    });
  } catch {
    const verdict = "Card lists an endpoint that did not answer. Kiln cannot read this agent’s job catalog right now.";
    mark(ticks, started, "probe", "fail", "No answer", `Timed out or refused after ${TIMEOUT_MS}ms`);
    mark(ticks, started, "verdict", "fail", "Unreachable", verdict);
    return baseTrace({
      protocol,
      endpoint,
      hydrateFailed,
      ticks,
      verdict,
    });
  }
}
