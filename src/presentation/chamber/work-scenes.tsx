"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { AgentKind } from "@/domain/agent";
import type { WorkReport } from "@/domain/work-report";
import type { ChamberPhase } from "@/presentation/chamber/phase";

const AMBER = "#d4a017";
const HEAT = "#c45c26";
const OK = "#6f8f6a";
const STEEL = "#5a6b58";
const BODY = "#2a312c";
const INK = "#e8e4d9";

function working(phase: ChamberPhase): boolean {
  return phase === "firing" || phase === "attested" || phase === "sealing" || phase === "hired";
}

function Tag({
  position,
  text,
  color = AMBER,
}: {
  position: [number, number, number];
  text: string;
  color?: string;
}) {
  return (
    <Html position={position} center distanceFactor={8} zIndexRange={[20, 0]}>
      <div
        style={{
          fontFamily: "IBM Plex Mono, ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color,
          background: "rgba(18,20,23,0.82)",
          border: "1px solid #3d4a3a",
          padding: "3px 7px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {text}
      </div>
    </Html>
  );
}

export function AgentRig({
  phase,
  reduced,
}: {
  phase: ChamberPhase;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  const arm = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    if (reduced) {
      group.current.position.x = working(phase) ? -0.55 : -1.15;
      group.current.position.y = 0;
      return;
    }
    if (phase === "firing") {
      group.current.position.x = -1.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.4));
    } else if (working(phase)) {
      group.current.position.x = -0.55;
    } else {
      group.current.position.x = -1.15;
    }
    group.current.position.y = working(phase) ? Math.sin(t * 3) * 0.03 : 0;
    if (arm.current) {
      arm.current.rotation.x = working(phase) ? -0.5 + Math.sin(t * 4) * 0.25 : -0.2;
    }
  });

  const visor = phase === "hired" ? OK : phase === "revoked" ? HEAT : AMBER;

  return (
    <group ref={group} position={[-1.15, 0, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.28, 0.38, 0.22]} />
        <meshStandardMaterial color={BODY} metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.22, 0.18, 0.2]} />
        <meshStandardMaterial color={BODY} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.74, 0.11]}>
        <boxGeometry args={[0.16, 0.06, 0.02]} />
        <meshStandardMaterial color={visor} emissive={visor} emissiveIntensity={0.9} />
      </mesh>
      <group ref={arm} position={[0.18, 0.48, 0]}>
        <mesh position={[0.16, 0, 0]}>
          <boxGeometry args={[0.32, 0.07, 0.07]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.34, 0, 0.12]}>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
          <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.8} />
        </mesh>
      </group>
      <mesh position={[-0.07, 0.12, 0]}>
        <boxGeometry args={[0.08, 0.24, 0.08]} />
        <meshStandardMaterial color={STEEL} />
      </mesh>
      <mesh position={[0.07, 0.12, 0]}>
        <boxGeometry args={[0.08, 0.24, 0.08]} />
        <meshStandardMaterial color={STEEL} />
      </mesh>
      <Tag position={[0, 1.05, 0]} text="Agent" color={INK} />
    </group>
  );
}

export function JobStage({
  kind,
  work,
  phase,
  reduced,
}: {
  kind: AgentKind;
  work: WorkReport | null;
  phase: ChamberPhase;
  reduced: boolean;
}) {
  const active = working(phase) && !reduced;
  if (kind === "rebalancing") {
    return (
      <BandJob
        low={work?.bandLow ?? 0}
        high={work?.bandHigh ?? 0}
        price={work?.price ?? 0}
        active={active}
      />
    );
  }
  if (kind === "grid") {
    return (
      <BandJob
        low={work?.bandLow ?? 580}
        high={work?.bandHigh ?? 620}
        price={work?.price ?? 600}
        active={active}
      />
    );
  }
  if (kind === "health-factor") {
    return (
      <HealthJob
        health={work?.healthFactor ?? 1.18}
        line={work?.liquidationLine ?? 1.2}
        active={active}
        filling={phase === "firing"}
      />
    );
  }
  if (kind === "yield") {
    return <YieldJob aprBps={work?.aprBps ?? null} active={active} />;
  }
  return <UnknownJob />;
}

function WatchJob({
  pulse,
  wallets,
  active,
}: {
  pulse: string;
  wallets: number;
  active: boolean;
}) {
  const ring = useRef<Group>(null);
  const color = pulse === "live" ? OK : pulse === "stale" ? HEAT : STEEL;
  useFrame((_, d) => {
    if (ring.current && active) ring.current.rotation.y += d * 1.1;
  });
  const n = Math.min(Math.max(wallets, 3), 6);
  return (
    <group position={[0.7, 0, 0]}>
      <group ref={ring}>
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.55, 0.28, Math.sin(a) * 0.55]}>
              <boxGeometry args={[0.16, 0.2, 0.1]} />
              <meshStandardMaterial color={BODY} metalness={0.4} roughness={0.45} />
            </mesh>
          );
        })}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}>
          <torusGeometry args={[0.55, 0.015, 8, 40]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
        </mesh>
      </group>
      <Tag position={[0, 1.15, 0]} text={`Watch ${n} wallets · ${pulse}`} color={color} />
    </group>
  );
}

function BandJob({
  low,
  high,
  price,
  active,
}: {
  low: number;
  high: number;
  price: number;
  active: boolean;
}) {
  const tick = useRef<Mesh>(null);
  const t = useRef(0);
  const span = Math.max(high - low, 1);
  const x = ((price - low) / span) * 1.2 - 0.6;
  useFrame((_, d) => {
    if (!tick.current || !active) return;
    t.current += d;
    tick.current.position.x = x + Math.sin(t.current * 2) * 0.12;
    tick.current.position.y = 0.42 + Math.abs(Math.sin(t.current * 3)) * 0.08;
  });
  return (
    <group position={[0.75, 0, 0]}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.5]} />
        <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.58, 0.22]}>
        <boxGeometry args={[1.4, 0.02, 0.02]} />
        <meshStandardMaterial color={HEAT} emissive={HEAT} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.28, 0.22]}>
        <boxGeometry args={[1.4, 0.02, 0.02]} />
        <meshStandardMaterial color={HEAT} emissive={HEAT} emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={tick} position={[x, 0.42, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1} />
      </mesh>
      <Tag position={[0, 1.15, 0]} text={`Band ${low}–${high} · px ${price}`} />
    </group>
  );
}

function HealthJob({
  health,
  line,
  active,
  filling,
}: {
  health: number;
  line: number;
  active: boolean;
  filling: boolean;
}) {
  const fill = useRef<Mesh>(null);
  const target = Math.min(Math.max(health / 1.6, 0.15), 1);
  const shown = useRef(filling ? 0.08 : target);
  const lineY = 0.15 + (line / 1.6) * 0.9;

  useFrame((_, d) => {
    if (!fill.current) return;
    const goal = filling || active ? target : 0.2;
    shown.current += (goal - shown.current) * Math.min(d * 2.2, 1);
    fill.current.scale.y = shown.current;
    fill.current.position.y = 0.15 + (shown.current * 0.9) / 2;
  });

  const safe = health >= line;
  return (
    <group position={[0.7, 0, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.42, 1.05, 0.28]} />
        <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.35} transparent opacity={0.28} />
      </mesh>
      <mesh ref={fill} position={[0, 0.2, 0]} scale={[1, 0.2, 1]}>
        <boxGeometry args={[0.32, 0.9, 0.2]} />
        <meshStandardMaterial
          color={safe ? OK : HEAT}
          emissive={safe ? OK : HEAT}
          emissiveIntensity={0.75}
        />
      </mesh>
      <mesh position={[0, lineY, 0.16]}>
        <boxGeometry args={[0.5, 0.025, 0.04]} />
        <meshStandardMaterial color={HEAT} emissive={HEAT} emissiveIntensity={1} />
      </mesh>
      <Tag
        position={[0, 1.28, 0]}
        text={`Health ${health.toFixed(2)} vs ${line.toFixed(2)} line`}
        color={safe ? OK : HEAT}
      />
    </group>
  );
}

function YieldJob({ aprBps, active }: { aprBps: number | null; active: boolean }) {
  const drop = useRef<Mesh>(null);
  const t = useRef(0);
  const heat = aprBps !== null ? Math.min(aprBps / 1200, 1) : 0.3;
  useFrame((_, d) => {
    if (!drop.current || !active) return;
    t.current += d * 1.1;
    const p = (Math.sin(t.current) + 1) / 2;
    drop.current.position.x = -0.45 + p * 0.9;
    drop.current.position.y = 0.72 + Math.sin(t.current * 2) * 0.08;
  });
  const apr = aprBps !== null ? `${(aprBps / 100).toFixed(2)}% APR` : "APR n/a";
  return (
    <group position={[0.75, 0, 0]}>
      <mesh position={[-0.45, 0.35, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.7, 18]} />
        <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 0.35, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.7, 18]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.2 + heat * 0.55} />
      </mesh>
      <mesh ref={drop} position={[-0.45, 0.72, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1} />
      </mesh>
      <Tag position={[-0.45, 0.95, 0]} text="Idle USDT" color={INK} />
      <Tag position={[0.45, 0.95, 0]} text={`Cake ref · ${apr}`} />
    </group>
  );
}

function UnknownJob() {
  return (
    <group position={[0.7, 0.35, 0]}>
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color={BODY} wireframe />
      </mesh>
      <Tag position={[0, 0.85, 0]} text="Card incomplete" color={HEAT} />
    </group>
  );
}

export function EnvelopeGates({
  phase,
  maxUsdt,
  hours,
  reduced,
}: {
  phase: ChamberPhase;
  maxUsdt: number;
  hours: number;
  reduced: boolean;
}) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const show = phase === "sealing" || phase === "hired" || phase === "revoked";
  const closed = phase === "sealing" || phase === "hired";

  useFrame((_, d) => {
    if (!show || !left.current || !right.current) return;
    const goal = phase === "revoked" ? 2.2 : closed ? 0.85 : 2.2;
    const speed = reduced ? 1 : Math.min(d * 5, 1);
    left.current.position.x += (-goal - left.current.position.x) * speed;
    right.current.position.x += (goal - right.current.position.x) * speed;
  });

  if (!show) return null;

  return (
    <group>
      <group ref={left} position={[-2.2, 0.55, 0.4]}>
        <mesh>
          <boxGeometry args={[0.12, 1.4, 1.6]} />
          <meshStandardMaterial color={AMBER} metalness={0.7} roughness={0.25} transparent opacity={0.55} />
        </mesh>
      </group>
      <group ref={right} position={[2.2, 0.55, 0.4]}>
        <mesh>
          <boxGeometry args={[0.12, 1.4, 1.6]} />
          <meshStandardMaterial color={AMBER} metalness={0.7} roughness={0.25} transparent opacity={0.55} />
        </mesh>
      </group>
      <Tag
        position={[0, 1.55, 0.2]}
        text={phase === "revoked" ? "Cap released" : `Cap ${maxUsdt} USDT / ${hours}h`}
        color={phase === "revoked" ? HEAT : OK}
      />
    </group>
  );
}
