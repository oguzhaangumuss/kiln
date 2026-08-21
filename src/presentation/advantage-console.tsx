"use client";

import { useMemo, useState } from "react";
import { ADVANTAGE_TASKS, renderAdvantageMarkdown } from "@/domain/advantage";

export function AdvantageConsole() {
  const [ran, setRan] = useState(false);
  const markdown = useMemo(
    () => renderAdvantageMarkdown(new Date().toISOString()),
    [ran],
  );

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kiln-termiX-advantage.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const without = ADVANTAGE_TASKS.reduce((s, t) => s + t.withoutAgent.minutes, 0);
  const withAgent = ADVANTAGE_TASKS.reduce((s, t) => s + t.withAgent.minutes, 0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <p className="font-mono text-[11px] font-medium tracking-[0.28em] text-amber uppercase">
        TermiX · Agent Advantage
      </p>
      <h1 className="mt-2 font-mono text-3xl font-semibold">
        Hire through Kiln vs doing the job yourself.
      </h1>
      <p className="mt-3 font-sans text-sm leading-6 text-ink/80">
        Three real tasks, both ways: time, cost, output quality, and attached outputs.
        One is trading (grid), one is security (liquidation). Kiln is a hire desk — sample
        reads the published catalog. No invented win-rate. TermiX can hire these cards
        themselves.
      </p>
      <div className="mt-6 grid gap-4">
        {ADVANTAGE_TASKS.map((task) => (
          <article key={task.id} className="border border-line">
            <header className="border-b border-line bg-panel px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-ok">
                {task.category} · {task.stakes}
              </p>
              <h2 className="mt-1 font-mono text-sm text-ink">{task.title}</h2>
            </header>
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase text-heat">Without agent</p>
                <p className="mt-1 font-mono text-[11px] text-heat">
                  {task.withoutAgent.minutes} min · ${task.withoutAgent.costUsd} unbounded
                </p>
                <p className="mt-2 font-sans text-[13px] leading-5 text-ink/80">
                  {task.withoutAgent.quality}
                </p>
                <ul className="mt-2 grid gap-1 font-mono text-[10px] text-ink/60">
                  {task.withoutAgent.outputs.map((line) => (
                    <li key={line}>— {line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-ok">Hired through Kiln</p>
                <p className="mt-1 font-mono text-[11px] text-ok">
                  {task.withAgent.minutes} min · envelope cap ${task.withAgent.costUsd} USDT
                </p>
                <p className="mt-2 font-sans text-[13px] leading-5 text-ink/80">
                  {task.withAgent.quality}
                </p>
                <ul className="mt-2 grid gap-1 font-mono text-[10px] text-ink/60">
                  {task.withAgent.outputs.map((line) => (
                    <li key={line}>— {line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-amber">
        Total {without} min → {withAgent.toFixed(1)} min ({(without - withAgent).toFixed(1)} min
        saved). Cost: unbounded wallet vs $50 USDT cap per hire, revocable.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRan(true)}
          className="border border-amber bg-amber px-4 py-2 font-mono text-xs font-semibold text-bg uppercase"
        >
          Stamp report
        </button>
        <button
          type="button"
          onClick={download}
          className="border border-ok px-4 py-2 font-mono text-xs text-ok uppercase"
        >
          Download .md
        </button>
        <a href="/" className="border border-line px-4 py-2 font-mono text-xs uppercase">
          Back to marketplace
        </a>
      </div>
      {ran ? (
        <pre className="mt-6 overflow-x-auto border border-line bg-panel p-4 font-mono text-[10px] leading-5 text-ink/80">
          {markdown}
        </pre>
      ) : null}
    </div>
  );
}
