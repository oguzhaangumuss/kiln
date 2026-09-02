"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListedAgent, ListAgentsResult } from "@/application/list-agents";
import type { AgentKind } from "@/domain/agent";
import { CATEGORY_MANDATE, FIRST_CLASS_KINDS, kindLabel } from "@/domain/kind";
import type { Attestation } from "@/domain/attestation";
import type { Envelope } from "@/domain/envelope";
import type { Hire } from "@/domain/hire";
import type { SampleTrace } from "@/domain/sample-trace";
import { flagLabel, type Heat } from "@/domain/trust";
import type { AgentSort, PulseFilter } from "@/domain/catalog-query";
import { tokenIdOf } from "@/domain/agent-id";
import { WalletBar } from "@/presentation/wallet-bar";
import { useKilnTx } from "@/presentation/use-kiln-tx";
import { HireFilm, hireFilmStep } from "@/presentation/hire-film";
import { MyHireDetail, MyHiresList, useHireBook } from "@/presentation/my-hires";
import { KilnChamber } from "@/presentation/chamber/kiln-chamber";
import { CategoryDeckPanel } from "@/presentation/category-deck";
import { FrontDoorStrip, useFrontDoorDismissed } from "@/presentation/front-door";
import { HireLogsDetail, HireLogsPanel } from "@/presentation/hire-logs";
import { JargonTip } from "@/presentation/jargon-tip";
import { hireBlockers } from "@/domain/hire-blockers";
import type { ChamberPhase } from "@/presentation/chamber/phase";

function heatLabel(heat: Heat): string {
  if (heat === "high") return "High risk";
  if (heat === "medium") return "Medium risk";
  return "Low risk";
}

function chamberPhase(input: {
  revoked: boolean;
  hired: boolean;
  sealing: boolean;
  firing: boolean;
  attested: boolean;
  skipped: boolean;
}): ChamberPhase {
  if (input.revoked) return "revoked";
  if (input.hired) return "hired";
  if (input.sealing) return "sealing";
  if (input.firing) return "firing";
  if (input.attested) return "attested";
  if (input.skipped) return "skipped";
  return "idle";
}

function heatClass(heat: Heat): string {
  if (heat === "high") return "text-heat";
  if (heat === "medium") return "text-amber";
  return "text-ok";
}

const PAGE = 50;

const SORTS: Array<{ id: AgentSort; label: string }> = [
  { id: "relevance", label: "Relevance" },
  { id: "feedback", label: "Most feedback" },
  { id: "score", label: "Highest score" },
  { id: "live", label: "Live first" },
  { id: "risk", label: "Lowest risk" },
  { id: "name", label: "Name A–Z" },
];

const PULSES: Array<{ id: PulseFilter; label: string }> = [
  { id: "all", label: "Any pulse" },
  { id: "live", label: "Live" },
  { id: "stale", label: "Stale" },
  { id: "unknown", label: "Unknown" },
];

const CHIPS: Array<{ id: AgentKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  ...FIRST_CLASS_KINDS.map((id) => ({ id, label: kindLabel(id) })),
];

export function BayConsole() {
  const kiln = useKilnTx();
  const book = useHireBook();
  const frontDoor = useFrontDoorDismissed();
  const [desk, setDesk] = useState<"bay" | "hires" | "logs">("bay");
  const [advanced, setAdvanced] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(true);
  const [workOpen, setWorkOpen] = useState(false);
  const [page, setPage] = useState<ListAgentsResult | null>(null);
  const [hideHighHeat, setHideHighHeat] = useState(false);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [category, setCategory] = useState<AgentKind | "all">("all");
  const [sort, setSort] = useState<AgentSort>("relevance");
  const [pulse, setPulse] = useState<PulseFilter>("all");
  const [x402Only, setX402Only] = useState(false);
  const [doorOnly, setDoorOnly] = useState(false);
  const [minFeedback, setMinFeedback] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [envelope, setEnvelope] = useState<Envelope>({
    maxUsdt: 50,
    hours: 6,
    revoked: false,
    onchainId: null,
  });
  const [firing, setFiring] = useState(false);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [hire, setHire] = useState<Hire | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SampleTrace | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoadError(null);
    setCatalogBusy(true);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(PAGE),
      hideHighHeat: hideHighHeat ? "1" : "0",
      q: qDebounced,
      category,
      sort,
      pulse,
      x402: x402Only ? "1" : "0",
      door: doorOnly ? "1" : "0",
      minFeedback: String(minFeedback),
    });
    try {
      const res = await fetch(`/api/agents?${params.toString()}`);
      if (!res.ok) {
        setLoadError("The agent catalog could not be loaded. Try again.");
        return;
      }
      const data = (await res.json()) as ListAgentsResult;
      setPage(data);
      setSelectedId((current) => {
        if (current && data.items.some((row) => row.agent.id === current)) {
          return current;
        }
        return data.items[0]?.agent.id ?? "";
      });
    } catch {
      setLoadError("The agent catalog could not be loaded. Try again.");
    } finally {
      setCatalogBusy(false);
    }
  }, [offset, hideHighHeat, qDebounced, category, sort, pulse, x402Only, doorOnly, minFeedback]);

  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreview(null);
    void (async () => {
      const snapshot = pageRef.current?.items.find((row) => row.agent.id === selectedId)?.agent;
      const res = await fetch("/api/agents/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedId,
          tokenId: snapshot?.agentId,
          chainId: snapshot?.chainId,
          agent: snapshot,
        }),
      });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { agent: ListedAgent["agent"]; trace: SampleTrace };
      if (cancelled) return;
      setPreview(data.trace);
      setPage((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((row) =>
            row.agent.id === data.agent.id || row.agent.id === selectedId
              ? { ...row, agent: data.agent }
              : row,
          ),
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected: ListedAgent | undefined = page?.items.find(
    (row) => row.agent.id === selectedId,
  );
  const compared = useMemo(
    () => (page?.items ?? []).filter((row) => compareIds.includes(row.agent.id)),
    [page, compareIds],
  );
  const blockers = hireBlockers({
    connected: kiln.isConnected,
    sampled: Boolean(attestation) || skipped,
    capOk: envelope.maxUsdt > 0 && envelope.hours > 0 && !envelope.revoked,
    contractsReady: kiln.contractsReady,
  });
  const canHire = Boolean(selected) && blockers.length === 0;

  function resetDeck() {
    setAttestation(null);
    setSkipped(false);
    setHire(null);
    setError(null);
  }

  function agentLookup(agent: ListedAgent["agent"]) {
    return {
      agentId: agent.id,
      tokenId: agent.agentId,
      chainId: agent.chainId,
      agent,
    };
  }

  async function onFire() {
    if (!selected) return;
    setError(null);
    setHire(null);
    setFiring(true);
    setAttestation(null);
    setSkipped(false);
    try {
      const res = await fetch("/api/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...agentLookup(selected.agent) }),
      });
      if (!res.ok) throw new Error("sample failed");
      const result = (await res.json()) as Attestation;
      let txHash: string | null = null;
      if (kiln.isConnected && kiln.contractsReady) {
        txHash = await kiln.attest(
          tokenIdOf(selected.agent),
          result.resultHash as `0x${string}`,
        );
      }
      setAttestation({ ...result, txHash });
    } catch {
      setError("Sample could not be completed. Try again before hiring.");
    } finally {
      setFiring(false);
    }
  }

  async function onSkip() {
    if (!selected) return;
    await fetch("/api/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...agentLookup(selected.agent), skip: true }),
    });
    setSkipped(true);
    setError(null);
  }

  async function onHire() {
    if (!selected) return;
    setError(null);
    try {
      if (!book.signedForThisWallet) {
        const signed = await book.signIn();
        if (!signed) {
          throw new Error("Sign the hire book so this lease is stored on your wallet.");
        }
      }
      const first = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...agentLookup(selected.agent),
          maxUsdt: envelope.maxUsdt,
          hours: envelope.hours,
          attested: Boolean(attestation),
          skipped,
        }),
      });
      if (first.status !== 402 && !first.ok) {
        const fail = (await first.json()) as { error?: string };
        throw new Error(fail.error ?? "Hire blocked.");
      }

      let envelopeTx = attestation?.txHash ?? "";
      let envelopeId = envelope.onchainId ? String(envelope.onchainId) : "";
      if (kiln.contractsReady) {
        const opened = await kiln.openEnvelope(
          tokenIdOf(selected.agent),
          envelope.maxUsdt,
          envelope.hours,
        );
        envelopeTx = opened.hash;
        envelopeId = opened.envelopeId ?? envelopeId;
        setEnvelope((prev) => ({
          ...prev,
          onchainId: opened.envelopeId ? Number(opened.envelopeId) : prev.onchainId,
        }));
      } else if (!envelopeTx) {
        throw new Error("Connect a wallet on BSC testnet, then hire.");
      }

      const paid = await fetch("/api/hire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": JSON.stringify({
            envelopeTx,
            envelopeId,
            hirer: kiln.address,
          }),
        },
        body: JSON.stringify({
          ...agentLookup(selected.agent),
          maxUsdt: envelope.maxUsdt,
          hours: envelope.hours,
          attested: Boolean(attestation),
          skipped,
          sampleHash: attestation?.resultHash ?? null,
          sampleTrace: attestation?.trace ?? null,
        }),
      });
      if (!paid.ok) {
        const fail = (await paid.json()) as { error?: string };
        throw new Error(fail.error ?? "Hire could not be completed after payment.");
      }
      const hired = (await paid.json()) as Hire;
      setHire(hired);
      if (hired.leaseId) {
        setDesk("hires");
        setWorkOpen(true);
        book.setSelectedId(hired.leaseId);
        await book.loadLeases();
      } else {
        throw new Error("Hire finished without a stored lease. Sign the hire book and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hire blocked.");
    }
  }

  async function onRevoke() {
    setEnvelope((prev) => ({ ...prev, revoked: true }));
    if (envelope.onchainId && kiln.contractsReady) {
      try {
        await kiln.revoke(BigInt(envelope.onchainId));
      } catch {
        setError("On-chain revoke failed. The session cap is still marked revoked here.");
      }
    }
  }

  const total = page?.totalOnChain ?? 0;
  const film = hireFilmStep({
    picked: Boolean(selected),
    sampled: Boolean(attestation) || skipped,
    envelopeReady: envelope.maxUsdt > 0 && envelope.hours > 0 && !envelope.revoked,
    paying: kiln.isPending && !hire,
    hired: Boolean(hire),
  });

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-50 shrink-0 flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.28em] text-amber uppercase">
            KILN · BSC AGENT BAY
          </p>
          <h1 className="mt-1 font-mono text-3xl font-semibold tracking-tight text-ink">
            Find an agent. Read the job. Hire it.
          </h1>
          <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-ink/75">
            Browse without a wallet. Hiring asks you to sign once, then lock a spend{" "}
            <JargonTip term="envelope" />.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WalletBar />
          <a href="/advantage" className="font-mono text-[10px] uppercase text-ok underline">
            Why hire vs doing it yourself
          </a>
          <p className="max-w-md text-right font-mono text-[11px] leading-5 text-ok">
            {page?.warning ?? "Loading the agent index…"}
          </p>
        </div>
      </header>

      <FrontDoorStrip
        dismissed={frontDoor.dismissed}
        onDismiss={frontDoor.dismiss}
        onRestore={frontDoor.restore}
        onPickCategory={(kind) => {
          setDesk("bay");
          setOffset(0);
          setCategory(kind);
          setWorkOpen(false);
        }}
      />

      <main className="grid min-h-0 flex-1 overflow-hidden max-lg:grid-rows-1 lg:grid-cols-[minmax(300px,40%)_1fr]">
        <aside
          className={`min-h-0 flex-col overflow-hidden border-b border-line lg:flex lg:border-r lg:border-b-0 ${
            workOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="shrink-0 flex flex-col gap-2 border-b border-line px-5 py-3">
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => {
                  setDesk("bay");
                  setWorkOpen(false);
                }}
                className={`min-h-9 border px-2 py-1 font-mono text-[10px] uppercase ${
                  desk === "bay" ? "border-amber bg-amber text-bg" : "border-line text-ink/80"
                }`}
              >
                Bay
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesk("hires");
                  setWorkOpen(false);
                }}
                className={`min-h-9 border px-2 py-1 font-mono text-[10px] uppercase ${
                  desk === "hires" ? "border-amber bg-amber text-bg" : "border-line text-ink/80"
                }`}
              >
                My hires
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesk("logs");
                  setWorkOpen(false);
                }}
                className={`min-h-9 border px-2 py-1 font-mono text-[10px] uppercase ${
                  desk === "logs" ? "border-amber bg-amber text-bg" : "border-line text-ink/80"
                }`}
              >
                Logs
              </button>
            </div>
            {desk === "bay" ? (
            <>
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-xs tracking-[0.18em] text-ink uppercase">
                Agents
              </h2>
              <span className="font-mono text-[11px] text-ok">
                {page?.feed === "8004scan"
                  ? "8004scan"
                  : page?.feed === "bsc-rpc"
                    ? "BSC RPC"
                    : "…"}{" "}
                · {page?.items.length ?? 0} / {total}
              </span>
            </div>
            <p className="font-mono text-[10px] text-ink/55">○ compare, up to 3</p>
            <input
              value={q}
              onChange={(e) => {
                setOffset(0);
                setQ(e.target.value);
              }}
              placeholder="Search name, mandate, id, or owner…"
              className="border border-line bg-bg px-2 py-1.5 font-mono text-[11px] text-ink"
            />
            <div className="flex flex-wrap gap-1">
              {CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setOffset(0);
                    setCategory(chip.id);
                  }}
                  className={`min-h-9 border px-2 py-1 font-mono text-[10px] uppercase ${
                    category === chip.id
                      ? "border-amber bg-amber text-bg"
                      : "border-line text-ink/80"
                  }`}
                >
                  {chip.label}
                  {chip.id !== "all" && page
                    ? ` · ${page.kindCounts[chip.id] ?? 0}`
                    : ""}
                </button>
              ))}
            </div>
            {category !== "all" ? (
              <p className="font-sans text-[12px] leading-5 text-ink/75">
                {CATEGORY_MANDATE[category]}
              </p>
            ) : (
              <p className="font-sans text-[12px] leading-5 text-ink/65">
                Four jobs, equal depth: rebalancing, grid, yield, health factor.
              </p>
            )}
            <button
              type="button"
              onClick={() => setAdvanced((open) => !open)}
              aria-expanded={advanced}
              className="self-start min-h-9 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55"
            >
              {advanced ? "Hide advanced filters" : "Advanced filters"}
            </button>
            {category === "unknown" && !advanced ? (
              <p className="font-mono text-[10px] text-amber">
                Showing unclassified agents. Open advanced filters to change that.
              </p>
            ) : null}
            {advanced ? (
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setOffset(0);
                  setCategory("unknown");
                }}
                className={`min-h-9 border px-2 py-1 font-mono text-[10px] uppercase ${
                  category === "unknown"
                    ? "border-amber bg-amber text-bg"
                    : "border-line text-ink/80"
                }`}
              >
                Unclassified
              </button>
              <select
                value={sort}
                onChange={(e) => {
                  setOffset(0);
                  setSort(e.target.value as AgentSort);
                }}
                className="min-h-9 border border-line bg-bg px-2 py-1.5 font-mono text-[10px] text-ink"
              >
                {SORTS.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
              <select
                value={pulse}
                onChange={(e) => {
                  setOffset(0);
                  setPulse(e.target.value as PulseFilter);
                }}
                title="Pulse is last 8004scan card update, not a live door ping."
                className="min-h-9 border border-line bg-bg px-2 py-1.5 font-mono text-[10px] text-ink"
              >
                {PULSES.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
              <select
                value={String(minFeedback)}
                onChange={(e) => {
                  setOffset(0);
                  setMinFeedback(Number(e.target.value));
                }}
                className="min-h-9 border border-line bg-bg px-2 py-1.5 font-mono text-[10px] text-ink"
              >
                <option value="0">Any feedback</option>
                <option value="1">1+ feedback</option>
                <option value="5">5+ feedback</option>
              </select>
              <label className="flex items-center gap-2 border border-line px-2 py-1.5 font-mono text-[10px] text-ink/80">
                <input
                  type="checkbox"
                  checked={x402Only}
                  onChange={(e) => {
                    setOffset(0);
                    setX402Only(e.target.checked);
                  }}
                />
                <JargonTip term="x402" /> on card
              </label>
              <label className="flex items-center gap-2 border border-line px-2 py-1.5 font-mono text-[10px] text-ink/80">
                <input
                  type="checkbox"
                  checked={doorOnly}
                  onChange={(e) => {
                    setOffset(0);
                    setDoorOnly(e.target.checked);
                  }}
                />
                Has <JargonTip term="door" />
              </label>
            <label className="col-span-2 flex items-center gap-2 font-mono text-[11px] text-ink/80">
              <input
                type="checkbox"
                checked={hideHighHeat}
                onChange={(e) => {
                  setOffset(0);
                  setHideHighHeat(e.target.checked);
                }}
              />
              Hide high-risk
            </label>
            </div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-9 border border-line px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-40"
                disabled={offset <= 0}
                onClick={() => setOffset((n) => Math.max(0, n - PAGE))}
              >
                Prev
              </button>
              <button
                type="button"
                className="min-h-9 border border-line px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-40"
                disabled={offset + PAGE >= total}
                onClick={() => setOffset((n) => n + PAGE)}
              >
                Next
              </button>
            </div>
            {loadError ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[11px] text-heat">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="min-h-9 border border-heat px-2 py-1 font-mono text-[10px] uppercase text-heat"
                >
                  Retry
                </button>
              </div>
            ) : null}
            </>
            ) : (
              <h2 className="font-mono text-xs tracking-[0.18em] text-ink uppercase">
                {desk === "logs" ? "Logs" : "My hires"}
              </h2>
            )}
          </div>
          {desk === "hires" ? (
            <MyHiresList book={book} onOpen={() => setWorkOpen(true)} />
          ) : desk === "logs" ? (
            <HireLogsPanel />
          ) : (
            <>
          {compared.length > 0 ? (
            <div className="shrink-0 border-b border-line px-5 py-3">
              <p className="font-mono text-[10px] tracking-[0.16em] text-amber uppercase">
                Compare ({compared.length} of 3)
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {compared.map((row) => (
                  <div key={row.agent.id} className="border border-line px-2 py-2 font-mono text-[10px]">
                    <p className="truncate text-ink">{row.agent.handle}</p>
                    <p className={heatClass(row.trust.heat)}>
                      {heatLabel(row.trust.heat)} · {kindLabel(row.agent.kind)} · {row.agent.pulse}
                    </p>
                    <p className="text-ok">
                      {row.agent.protocols.length > 0
                        ? `Door ${row.agent.protocols.join("/")}`
                        : "No door"}
                      {" · "}
                      Feedback {row.agent.totalFeedbacks}
                      {row.agent.averageScore !== null ? ` · score ${row.agent.averageScore}` : ""}
                    </p>
                    <div className="mt-2">
                      <CategoryDeckPanel agent={row.agent} compact />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {catalogBusy && !page
              ? Array.from({ length: 8 }).map((_, index) => (
                  <li key={`skeleton-${index}`} className="border-b border-line px-5 py-4">
                    <div className="kiln-skeleton h-3 w-2/5" />
                    <div className="kiln-skeleton mt-2 h-3 w-4/5" />
                    <div className="kiln-skeleton mt-2 h-2 w-1/3" />
                  </li>
                ))
              : null}
            {!catalogBusy && page && page.items.length === 0 ? (
              <li className="px-5 py-4 font-sans text-sm leading-6 text-ink/80">
                No agents match this view. Clear a filter or try another category.
              </li>
            ) : null}
            {(page?.items ?? []).map((row) => {
              const active = row.agent.id === selectedId;
              const inCompare = compareIds.includes(row.agent.id);
              return (
                <li key={row.agent.id} className="border-b border-line">
                  <div
                    className={`flex w-full items-start gap-3 px-5 py-3.5 ${
                      active ? "bg-panel" : "hover:bg-panel/60"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={inCompare}
                      aria-label={
                        inCompare
                          ? `Remove ${row.agent.handle} from compare`
                          : `Compare ${row.agent.handle}, up to 3`
                      }
                      title="Compare, up to 3"
                      className="-ml-1 mt-0.5 min-h-9 min-w-9 font-mono text-[10px] text-ok"
                      onClick={() =>
                        setCompareIds((ids) => {
                          if (ids.includes(row.agent.id)) {
                            return ids.filter((id) => id !== row.agent.id);
                          }
                          return ids.length >= 3 ? ids : [...ids, row.agent.id];
                        })
                      }
                    >
                      <span aria-hidden>{inCompare ? "●" : "○"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(row.agent.id);
                        setWorkOpen(true);
                        resetDeck();
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center justify-between gap-2 font-mono text-xs">
                        <span className="truncate text-ink">{row.agent.handle}</span>
                        <span className={`shrink-0 text-[10px] uppercase ${heatClass(row.trust.heat)}`}>
                          {heatLabel(row.trust.heat)}
                        </span>
                      </span>
                      <span className="mt-1 block font-sans text-[13px] leading-5 text-ink/80">
                        {row.agent.mandate}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-ok">
                        #{row.agent.agentId} · {row.agent.pulse} · {kindLabel(row.agent.kind)}
                        {row.agent.protocols.length > 0 ? ` · door ${row.agent.protocols.join("/")}` : " · no door"}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
            </>
          )}
        </aside>

        <section
          className={`min-h-0 flex-col overflow-y-auto overscroll-contain bg-panel/40 ${
            workOpen ? "flex" : "hidden lg:flex"
          }`}
        >
          {workOpen ? (
            <button
              type="button"
              onClick={() => setWorkOpen(false)}
              className="lg:hidden min-h-11 border-b border-line px-6 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-amber"
            >
              {desk === "hires" ? "Back to leases" : desk === "logs" ? "Back to log" : "Back to agents"}
            </button>
          ) : null}
          {desk === "hires" ? (
            <MyHireDetail
              book={book}
              onRevokeChain={async (envelopeOnchainId) => {
                if (envelopeOnchainId && kiln.contractsReady) {
                  try {
                    await kiln.revoke(BigInt(envelopeOnchainId));
                  } catch {
                    setError("On-chain revoke failed. The lease is still marked revoked in the book.");
                  }
                }
              }}
            />
          ) : desk === "logs" ? (
            <HireLogsDetail />
          ) : catalogBusy && !selected ? (
            <div className="p-8">
              <div className="kiln-skeleton h-4 w-1/3" />
              <div className="kiln-skeleton mt-4 h-3 w-2/3" />
              <div className="kiln-skeleton mt-2 h-3 w-1/2" />
            </div>
          ) : !selected ? (
            <p className="p-8 font-mono text-sm">No agents match this view.</p>
          ) : (
            <>
              <HireFilm current={film} />
              <div className="border-b border-line px-6 py-5">
                <h2 className="font-mono text-xl text-ink">{selected.agent.handle}</h2>
                <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-ink/85">
                  {selected.agent.mandate}
                </p>
                <p className={`mt-3 font-mono text-[11px] ${heatClass(selected.trust.heat)}`}>
                  {heatLabel(selected.trust.heat)} — {selected.trust.summary}
                </p>
                <ul className="mt-2 font-mono text-[10px] text-ink/70">
                  {selected.trust.flags.map((flag) => (
                    <li key={flag}>{flagLabel(flag)}</li>
                  ))}
                </ul>
                <dl className="mt-4 grid gap-3 font-mono text-[11px] sm:grid-cols-2">
                  <div>
                    <dt className="text-ok">
                      <JargonTip term="ERC-8004" />
                    </dt>
                    <dd className="mt-1 break-all text-ink">{selected.agent.erc8004}</dd>
                  </div>
                  <div>
                    <dt className="text-ok">Owner</dt>
                    <dd className="mt-1 break-all text-ink">{selected.agent.owner}</dd>
                  </div>
                  <div>
                    <dt className="text-ok">Feedback</dt>
                    <dd className="mt-1 text-ink">
                      {selected.agent.totalFeedbacks}
                      {selected.agent.averageScore !== null
                        ? ` · score ${selected.agent.averageScore}`
                        : " · no score"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ok">
                      <JargonTip term="x402" /> on card
                    </dt>
                    <dd className="mt-1 text-ink">
                      {selected.agent.x402Supported ? "Supported" : "Not listed"}
                    </dd>
                  </div>
                </dl>
              </div>

              <CategoryDeckPanel agent={selected.agent} />

              <div className="border-b border-line px-6 py-5">
                <h3 className="font-mono text-xs tracking-[0.18em] uppercase">
                  <JargonTip term="sample" /> run
                </h3>
                <p className="mt-2 font-sans text-sm leading-6 text-ink/80">
                  Before you hire, Kiln shows what this agent published as its job. Fire sample
                  GETs that catalog over HTTP, shows pass or fail, then stamps a hash. Kiln does
                  not send the agent’s payments from this panel. Hiring stays locked until the
                  check is attested, or until you skip.
                </p>
                <div className="mt-4">
                  <KilnChamber
                    key={selected.agent.id}
                    agent={selected.agent}
                    work={attestation?.work ?? null}
                    trace={attestation?.trace ?? preview}
                    phase={chamberPhase({
                      revoked: envelope.revoked,
                      hired: Boolean(hire),
                      sealing: kiln.isPending && !hire,
                      firing,
                      attested: Boolean(attestation),
                      skipped,
                    })}
                    maxUsdt={envelope.maxUsdt}
                    hours={envelope.hours}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onFire()}
                    disabled={firing}
                    className="min-h-11 border border-amber bg-amber px-4 py-2 font-mono text-xs font-semibold tracking-wide text-bg uppercase disabled:opacity-40"
                  >
                    {firing ? "Firing…" : "Fire sample"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSkip()}
                    className="min-h-11 border border-heat px-4 py-2 font-mono text-xs tracking-wide text-heat uppercase"
                  >
                    Skip (logged)
                  </button>
                </div>
                {attestation ? (
                  <p className="mt-3 font-mono text-[11px] leading-5 text-ok">
                    Attested · hash {attestation.resultHash}
                    <br />
                    {attestation.txHash
                      ? `TX ${attestation.txHash}`
                      : kiln.contractsReady
                        ? "Connect a wallet to publish the attestation on-chain."
                        : "Sample hash is ready. Deploy Kiln contracts to record it on-chain."}
                  </p>
                ) : null}
                {skipped && !attestation ? (
                  <p className="mt-3 font-mono text-[11px] text-heat">
                    Sample skipped. Hiring is allowed; this extra risk is on the record.
                  </p>
                ) : null}
              </div>

              <div className="px-6 py-5">
                <h3 className="font-mono text-xs tracking-[0.18em] uppercase">
                  Spend <JargonTip term="envelope" />
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="font-mono text-[11px] text-ok">
                    Max USDT
                    <input
                      type="number"
                      min={1}
                      value={envelope.maxUsdt}
                      onChange={(e) =>
                        setEnvelope((prev) => ({
                          ...prev,
                          maxUsdt: Number(e.target.value),
                          revoked: false,
                        }))
                      }
                      className="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
                    />
                  </label>
                  <label className="font-mono text-[11px] text-ok">
                    Hours
                    <input
                      type="number"
                      min={1}
                      value={envelope.hours}
                      onChange={(e) =>
                        setEnvelope((prev) => ({
                          ...prev,
                          hours: Number(e.target.value),
                          revoked: false,
                        }))
                      }
                      className="mt-1 w-full border border-line bg-bg px-3 py-2 text-sm text-ink"
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onRevoke()}
                    className="min-h-11 border border-heat px-4 py-2 font-mono text-xs tracking-wide text-heat uppercase"
                  >
                    Revoke
                  </button>
                  <button
                    type="button"
                    onClick={() => void onHire()}
                    disabled={!canHire || kiln.isPending || book.signing}
                    className="min-h-11 border border-ok bg-ok px-4 py-2 font-mono text-xs font-semibold tracking-wide text-bg uppercase disabled:opacity-35"
                  >
                    {kiln.isPending || book.signing
                      ? "Waiting for wallet…"
                      : book.signedForThisWallet
                        ? "Hire via x402"
                        : "Hire (sign + lock cap)"}
                  </button>
                </div>
                {!canHire && !hire ? (
                  <ul className="mt-3 grid gap-1 font-mono text-[11px] leading-5 text-amber">
                    {blockers.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 font-mono text-[10px] text-ink/60">
                  Payments are settled through Kiln’s <JargonTip term="x402" /> facilitator.
                  Hiring requires a completed <JargonTip term="sample" /> or an explicit skip.
                  The envelope is the spend cap — Kiln does not send user funds to the agent
                  wallet. First hire signs the <JargonTip term="hire book" /> on this wallet,
                  then locks the cap. Use MetaMask on BNB Smart Chain testnet.
                </p>
                {envelope.revoked ? (
                  <p className="mt-3 font-mono text-[11px] text-heat">
                    Envelope revoked. This agent cannot spend under the current cap.
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 font-mono text-[11px] text-heat">{error}</p>
                ) : null}
                {hire ? (
                  <p className="mt-3 font-mono text-[11px] leading-5 text-ok">
                    Hired · cap {hire.maxUsdt} USDT / {hire.hours}h ·{" "}
                    {hire.facilitator === "b402" ? "B402" : "Kiln"}
                    {hire.leaseId ? " · saved to My hires" : ""}
                    <br />
                    {hire.txHash ? `TX ${hire.txHash}` : "Hire stored. No on-chain envelope tx on this session."}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
