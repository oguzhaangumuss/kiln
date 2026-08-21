import type { PublishedJob } from "@/domain/published-job";
import { heroJobs } from "@/domain/published-job";

export type ProbeStep =
  | "index"
  | "services"
  | "probe"
  | "skills"
  | "market"
  | "hash"
  | "verdict";

export type ProbeStatus = "ok" | "fail" | "skip" | "info";

export type ProbeTick = {
  tMs: number;
  step: ProbeStep;
  status: ProbeStatus;
  title: string;
  detail: string;
};

export type SampleTrace = {
  reachable: boolean;
  protocol: string | null;
  endpoint: string | null;
  latencyMs: number | null;
  httpStatus: number | null;
  skills: string[];
  jobs: PublishedJob[];
  snippet: string;
  bodyPreview: string;
  transport: string | null;
  catalogName: string | null;
  catalogVersion: string | null;
  docsUrl: string | null;
  hydrateFailed: boolean;
  ticks: ProbeTick[];
  verdict: string;
};

export function emptyTrace(): SampleTrace {
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
    ticks: [],
    verdict: "No probe yet.",
  };
}

export type StoryState = "wait" | "ok" | "closed" | "live" | "dead";

export type SampleStoryStep = {
  n: number;
  title: string;
  body: string;
  state: StoryState;
};

export type SampleStory = {
  headline: string;
  outcome: "wait" | "pass" | "fail" | "closed" | "idle";
  steps: SampleStoryStep[];
};

function hashOf(trace: SampleTrace): string {
  return trace.ticks.find((tick) => tick.step === "hash")?.detail ?? "";
}

function jobLine(jobs: PublishedJob[]): string {
  if (jobs.length === 0) return "";
  const hero = heroJobs(jobs, 6)
    .map((job) => (job.description ? `${job.name} — ${job.description}` : job.name))
    .join(" · ");
  const more = jobs.length > 6 ? ` +${jobs.length - 6} more` : "";
  return `${jobs.length} published job${jobs.length === 1 ? "" : "s"}: ${hero}${more}`;
}

export function explainSample(input: {
  handle: string;
  mandate: string;
  kind: string;
  pulse: string;
  protocols: string[];
  claimedJobs: PublishedJob[];
  cardHydrated: boolean;
  firing: boolean;
  trace: SampleTrace | null;
}): SampleStory {
  const jobs = input.trace?.jobs?.length ? input.trace.jobs : input.claimedJobs;
  const purpose = `${input.handle} is for: ${input.mandate}`;

  if (input.firing) {
    return {
      headline: "Reading the name card, then the published job list…",
      outcome: "wait",
      steps: [
        { n: 1, title: "What this agent is for", body: purpose, state: "wait" },
        {
          n: 2,
          title: "Load published jobs",
          body: "Kiln GETs the advertised URL and lists tools/skills the owner published.",
          state: "wait",
        },
        {
          n: 3,
          title: "Stamp the check",
          body: "A hash records this catalog read. It is not a film of the agent paying or trading.",
          state: "wait",
        },
      ],
    };
  }

  if (!input.trace) {
    const door = input.protocols.length > 0 || input.cardHydrated;
    return {
      headline: jobs.length
        ? `${input.handle} published a job list. Fire sample will verify it over HTTP.`
        : door
          ? "Fire sample will read the card, then fetch whatever job list the door publishes."
          : "This agent published a name. Kiln has not loaded a job catalog yet.",
      outcome: "idle",
      steps: [
        { n: 1, title: "What this agent is for", body: purpose, state: "ok" },
        {
          n: 2,
          title: "Published jobs",
          body: jobs.length
            ? jobLine(jobs)
            : "No tools on the list row. Selecting the agent loads the 8004scan detail card.",
          state: jobs.length ? "ok" : "closed",
        },
        {
          n: 3,
          title: "Stamp the check",
          body: "Fire sample writes a hash of this catalog read so hiring can unlock.",
          state: "ok",
        },
      ],
    };
  }

  const hash = hashOf(input.trace);
  const who = purpose;
  const catalog = jobLine(input.trace.jobs ?? []);

  if (input.trace.hydrateFailed && !input.trace.endpoint) {
    return {
      headline: "Could not refresh the 8004scan card, so Kiln never reached a job URL.",
      outcome: "fail",
      steps: [
        { n: 1, title: "What this agent is for", body: who, state: "ok" },
        {
          n: 2,
          title: "Card refresh",
          body: "The list row often omits MCP/A2A URLs. Detail fetch failed — this is not the same as a closed door.",
          state: "dead",
        },
        {
          n: 3,
          title: "Stamp the check",
          body: hash ? `Recorded ${hash}. Retry Fire sample.` : "Retry Fire sample.",
          state: "dead",
        },
      ],
    };
  }

  if (!input.trace.endpoint) {
    return {
      headline: "We read the name. This card still has no public job URL.",
      outcome: "closed",
      steps: [
        { n: 1, title: "What this agent is for", body: who, state: "ok" },
        {
          n: 2,
          title: "Published jobs",
          body: "No A2A or MCP URL after the detail card. Kiln cannot list live tools for this agent.",
          state: "closed",
        },
        {
          n: 3,
          title: "Stamp the check",
          body: hash
            ? `Recorded ${hash}. This proves we looked. It is not a recording of this agent working.`
            : "Check recorded. This is not a recording of the agent working.",
          state: "ok",
        },
      ],
    };
  }

  if (input.trace.reachable) {
    const transport =
      input.trace.transport === "stdio"
        ? " Transport is stdio: Kiln listed the catalog and did not invoke tools (no payments from this panel)."
        : "";
    const meta = [
      input.trace.catalogName,
      input.trace.catalogVersion ? `v${input.trace.catalogVersion}` : null,
      `${input.trace.latencyMs ?? "?"}ms`,
      `HTTP ${input.trace.httpStatus ?? "ok"}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      headline: catalog
        ? `Catalog answered. ${input.trace.jobs?.length ?? 0} published jobs.`
        : `The advertised URL answered in ${input.trace.latencyMs ?? "?"}ms.`,
      outcome: "pass",
      steps: [
        { n: 1, title: "What this agent is for", body: who, state: "ok" },
        {
          n: 2,
          title: "Door answered",
          body: `${input.trace.protocol ?? "URL"} · ${meta} · ${input.trace.endpoint}`,
          state: "live",
        },
        {
          n: 3,
          title: "What they published",
          body: `${catalog || input.trace.snippet || "JSON answered but listed no tools/skills."}${transport}`,
          state: "live",
        },
        {
          n: 4,
          title: "Stamp the check",
          body: hash ? `Recorded ${hash}` : "Check recorded.",
          state: "ok",
        },
      ],
    };
  }

  return {
    headline: "A job URL is listed, but it did not return a healthy catalog.",
    outcome: "fail",
    steps: [
      { n: 1, title: "What this agent is for", body: who, state: "ok" },
      {
        n: 2,
        title: "Door failed",
        body: `${input.trace.endpoint} · ${
          input.trace.httpStatus !== null ? `HTTP ${input.trace.httpStatus}` : "timeout or refused"
        }.`,
        state: "dead",
      },
      {
        n: 3,
        title: "Stamp the check",
        body: hash
          ? `Recorded ${hash}. Treat this agent as silent until the catalog answers.`
          : "Treat this agent as silent until the catalog answers.",
        state: "dead",
      },
    ],
  };
}
