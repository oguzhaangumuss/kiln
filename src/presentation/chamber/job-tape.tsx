"use client";

import { useState } from "react";
import type { Agent } from "@/domain/agent";
import type { SampleTrace } from "@/domain/sample-trace";
import { explainSample } from "@/domain/sample-trace";
import { groupPublishedJob, heroJobs, type JobGroup, type PublishedJob } from "@/domain/published-job";
import type { ChamberPhase } from "@/presentation/chamber/phase";

const GROUP_LABEL: Record<JobGroup, string> = {
  pay: "Pay",
  read: "Read",
  yield: "Yield",
  escrow: "Escrow",
  bridge: "Bridge",
  other: "Other",
};

function stateClass(state: string): string {
  if (state === "live" || state === "ok") return "border-ok text-ok";
  if (state === "closed") return "border-amber text-amber";
  if (state === "dead") return "border-heat text-heat";
  return "border-line text-ink/50";
}

function stateWord(state: string): string {
  if (state === "live") return "Answered";
  if (state === "ok") return "Done";
  if (state === "closed") return "Closed";
  if (state === "dead") return "Failed";
  return "Wait";
}

function outcomeLabel(outcome: string, attested: boolean): string {
  if (outcome === "wait") return "Running";
  if (outcome === "pass") return attested ? "Sample passed" : "Catalog loaded";
  if (outcome === "fail") return attested ? "Sample failed" : "Catalog not loaded yet";
  if (outcome === "closed") return "No job URL";
  return attested ? "Sample recorded" : "Before sample";
}

function JobList({ jobs }: { jobs: PublishedJob[] }) {
  const [open, setOpen] = useState(false);
  if (jobs.length === 0) return null;
  const hero = heroJobs(jobs, 6);
  const grouped = new Map<JobGroup, PublishedJob[]>();
  for (const job of jobs) {
    const group = groupPublishedJob(job);
    const list = grouped.get(group) ?? [];
    list.push(job);
    grouped.set(group, list);
  }
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="font-mono text-[10px] tracking-[0.18em] text-ok uppercase">Published jobs</p>
      <ul className="mt-2 grid gap-2">
        {hero.map((job) => (
          <li key={job.name} className="border border-line px-3 py-2">
            <p className="font-mono text-[11px] text-ink">
              {job.name}
              <span className="ml-2 text-[10px] uppercase text-ink/45">
                {GROUP_LABEL[groupPublishedJob(job)]}
              </span>
            </p>
            {job.description ? (
              <p className="mt-1 font-sans text-[13px] leading-5 text-ink/80">{job.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {jobs.length > 6 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-3 font-mono text-[10px] tracking-[0.14em] text-ink/45 uppercase"
        >
          {open ? "Hide all outputs" : `Show all ${jobs.length} outputs`}
        </button>
      ) : null}
      {open ? (
        <div className="mt-3 grid gap-3">
          {[...grouped.entries()].map(([group, rows]) => (
            <div key={group}>
              <p className="font-mono text-[10px] uppercase text-amber">
                {GROUP_LABEL[group]} · {rows.length}
              </p>
              <ul className="mt-1 grid gap-1">
                {rows.map((job) => (
                  <li key={`${group}-${job.name}`} className="font-sans text-[12px] leading-5 text-ink/75">
                    <span className="font-mono text-[11px] text-ink">{job.name}</span>
                    {job.description ? ` — ${job.description}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function JobTape({
  phase,
  agent,
  trace,
}: {
  phase: ChamberPhase;
  agent: Agent;
  trace: SampleTrace | null;
}) {
  const [showLog, setShowLog] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const story = explainSample({
    handle: agent.handle,
    mandate: agent.mandate,
    kind: agent.kind,
    pulse: agent.pulse,
    protocols: agent.protocols,
    claimedJobs: agent.claimedJobs ?? [],
    cardHydrated: agent.cardHydrated,
    firing: phase === "firing",
    trace,
  });
  const jobs = trace?.jobs?.length ? trace.jobs : agent.claimedJobs ?? [];

  return (
    <div className="overflow-hidden border border-line bg-bg">
      <p className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-ok uppercase">
        <span>What this agent does</span>
        <span className={story.outcome === "fail" ? "text-heat" : story.outcome === "pass" ? "text-ok" : "text-ink/45"}>
          {outcomeLabel(story.outcome, phase === "attested" || phase === "hired")}
        </span>
      </p>
      <div className="px-4 py-4">
        <p className="font-sans text-[15px] leading-6 text-ink">{story.headline}</p>
        <ol className="mt-4 grid gap-3">
          {story.steps.map((step) => (
            <li key={step.n} className="grid grid-cols-[2rem_1fr] gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center border font-mono text-[11px] ${stateClass(step.state)}`}
              >
                {step.n}
              </span>
              <div>
                <p className="flex flex-wrap items-baseline gap-2 font-mono text-[11px] tracking-wide uppercase">
                  <span className="text-ink">{step.title}</span>
                  <span className={stateClass(step.state).split(" ")[1]}>{stateWord(step.state)}</span>
                </p>
                <p className="mt-1 break-all font-sans text-[13px] leading-5 text-ink/80">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <JobList jobs={jobs} />
      </div>
      {trace && (trace.ticks.length > 0 || trace.bodyPreview) ? (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setShowLog((open) => !open)}
            className="w-full px-4 py-2 text-left font-mono text-[10px] tracking-[0.14em] text-ink/45 uppercase"
          >
            {showLog ? "Hide timed log" : "Show timed log"}
          </button>
          {showLog ? (
            <div className="max-h-40 overflow-auto px-4 pb-3 font-mono text-[11px] leading-5 text-ink/55">
              {trace.ticks.map((tick, index) => (
                <p key={`${tick.step}-${index}`}>
                  T+{(tick.tMs / 1000).toFixed(2)}s {tick.step} · {tick.title} — {tick.detail}
                </p>
              ))}
            </div>
          ) : null}
          {trace.bodyPreview ? (
            <>
              <button
                type="button"
                onClick={() => setShowJson((open) => !open)}
                className="w-full border-t border-line px-4 py-2 text-left font-mono text-[10px] tracking-[0.14em] text-ink/45 uppercase"
              >
                {showJson ? "Hide raw catalog JSON" : "Show raw catalog JSON"}
              </button>
              {showJson ? (
                <pre className="max-h-56 overflow-auto px-4 pb-3 font-mono text-[10px] leading-4 text-ink/55 whitespace-pre-wrap break-all">
                  {trace.bodyPreview}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
