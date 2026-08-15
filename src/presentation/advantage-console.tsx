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
      <h1 className="mt-2 font-mono text-3xl font-semibold">Three jobs. With vs without Kiln.</h1>
      <p className="mt-3 font-sans text-sm leading-6 text-ink/80">
        No fake explorer hashes. These are the marketplace tasks the juri asked for:
        find a yield agent, compare two identities, hire under a cap.
      </p>
      <div className="mt-6 overflow-x-auto border border-line">
        <table className="w-full font-mono text-[11px]">
          <thead className="bg-panel text-ok">
            <tr>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2 text-left">Without agent</th>
              <th className="px-3 py-2 text-left">With Kiln</th>
            </tr>
          </thead>
          <tbody>
            {ADVANTAGE_TASKS.map((task) => (
              <tr key={task.id} className="border-t border-line">
                <td className="px-3 py-3 align-top text-ink">{task.title}</td>
                <td className="px-3 py-3 align-top text-heat">
                  {task.withoutAgent.minutes} min · {task.withoutAgent.outcome}
                </td>
                <td className="px-3 py-3 align-top text-ok">
                  {task.withAgent.minutes} min · {task.withAgent.outcome}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 font-mono text-xs text-amber">
        Total {without} min → {withAgent} min ({without - withAgent} min saved).
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
          Back to bay
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
