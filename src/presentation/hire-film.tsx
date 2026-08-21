"use client";

export type HireFilmStep = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ n: HireFilmStep; label: string; hint: string }> = [
  { n: 1, label: "Pick", hint: "Choose an agent by category" },
  { n: 2, label: "Sample", hint: "Read the published job list" },
  { n: 3, label: "Cap", hint: "Set max USDT and hours" },
  { n: 4, label: "Hire", hint: "Sign once, then lock the cap" },
  { n: 5, label: "Watch", hint: "Door, commerce jobs, budget" },
];

export function hireFilmStep(input: {
  picked: boolean;
  sampled: boolean;
  envelopeReady: boolean;
  paying: boolean;
  hired: boolean;
}): HireFilmStep {
  if (input.hired) return 5;
  if (input.paying) return 4;
  if (input.sampled && input.envelopeReady) return 4;
  if (input.sampled) return 3;
  if (input.picked) return 2;
  return 1;
}

export function HireFilm({ current }: { current: HireFilmStep }) {
  return (
    <ol className="grid grid-cols-5 gap-px border border-line bg-line">
      {STEPS.map((step) => {
        const on = current === step.n;
        const done = current > step.n;
        const tone = on
          ? "bg-amber text-bg"
          : done
            ? "bg-ok/20 text-ok"
            : "bg-bg text-ink/40";
        return (
          <li key={step.n} className={`px-2 py-2 ${tone}`}>
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase">
              {step.n} · {step.label}
            </p>
            <p className={`mt-1 hidden font-sans text-[11px] leading-4 sm:block ${on ? "text-bg/80" : ""}`}>
              {step.hint}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
