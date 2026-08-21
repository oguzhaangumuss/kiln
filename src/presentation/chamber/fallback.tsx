"use client";

import type { AgentKind } from "@/domain/agent";
import type { ChamberPhase } from "@/presentation/chamber/phase";

export function KilnChamberFallback({
  kind,
  phase,
}: {
  kind: AgentKind;
  phase: ChamberPhase;
}) {
  const playing = phase === "firing" || phase === "sealing" || phase === "hired" || phase === "attested";

  return (
    <div className="relative h-full overflow-hidden bg-bg">
      <div className="absolute inset-0 kiln-stage-grid" />
      <div
        className={`absolute bottom-8 left-8 h-16 w-10 border border-amber bg-panel ${playing ? "kiln-agent-walk" : ""}`}
      >
        <div className="mx-auto mt-2 h-2 w-6 bg-amber" />
      </div>
      <div className="absolute bottom-8 right-10 h-28 w-24 border border-line bg-panel/80">
        {kind === "health-factor" ? (
          <div className="relative h-full w-full p-2">
            <div className={`absolute bottom-2 left-2 right-2 bg-ok ${playing ? "kiln-fill" : "h-1/2"}`} />
            <div className="absolute left-1 right-1 top-[38%] h-0.5 bg-heat" />
          </div>
        ) : kind === "yield" ? (
          <div className="flex h-full items-end justify-around p-2">
            <div className="h-16 w-6 bg-line" />
            <div className={`w-6 bg-amber ${playing ? "kiln-fill" : "h-12"}`} />
          </div>
        ) : kind === "grid" ? (
          <div className="relative h-full">
            <div className="absolute left-2 right-2 top-6 h-px bg-heat" />
            <div className="absolute left-2 right-2 bottom-8 h-px bg-heat" />
            <div
              className={`absolute left-1/2 top-10 h-3 w-3 -translate-x-1/2 rounded-full bg-amber ${playing ? "kiln-bounce" : ""}`}
            />
          </div>
        ) : kind === "rebalancing" ? (
          <div className="relative h-full">
            <div className="absolute left-2 right-2 top-5 h-px bg-ok" />
            <div className="absolute left-2 right-2 bottom-7 h-px bg-ok" />
            <div
              className={`absolute left-1/3 top-8 h-2 w-8 bg-amber ${playing ? "kiln-bounce" : ""}`}
            />
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 gap-1 p-2">
            <div className="border border-ok" />
            <div className="border border-ok" />
            <div className="border border-ok" />
            <div className="border border-ok" />
          </div>
        )}
      </div>
      {phase === "hired" || phase === "sealing" ? (
        <div className="pointer-events-none absolute inset-y-6 left-1/4 right-1/4 border-x-2 border-amber/70" />
      ) : null}
    </div>
  );
}
