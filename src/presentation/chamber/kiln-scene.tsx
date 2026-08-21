"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { AgentKind } from "@/domain/agent";
import type { WorkReport } from "@/domain/work-report";
import type { ChamberPhase } from "@/presentation/chamber/phase";
import { AgentRig, EnvelopeGates, JobStage } from "@/presentation/chamber/work-scenes";

const BG = "#121417";
const STEEL = "#3d4a3a";
const AMBER = "#d4a017";
const OK = "#6f8f6a";

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#16191c" metalness={0.2} roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.6, 1.64, 48]} />
        <meshStandardMaterial color={STEEL} emissive={STEEL} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function ScanBeam({ phase, reduced }: { phase: ChamberPhase; reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const on = phase === "firing";
    mesh.current.visible = on;
    if (!on) return;
    const mat = mesh.current.material as MeshStandardMaterial;
    if (reduced) {
      mat.emissiveIntensity = 0.8;
      return;
    }
    const t = state.clock.elapsedTime;
    mesh.current.scale.x = 0.85 + Math.sin(t * 7) * 0.12;
    mat.emissiveIntensity = 0.7 + Math.sin(t * 10) * 0.35;
  });
  return (
    <mesh ref={mesh} position={[0.05, 0.58, 0]} rotation={[0, 0, -0.08]} visible={false}>
      <boxGeometry args={[1.7, 0.018, 0.018]} />
      <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1} />
    </mesh>
  );
}

function HirePlaque({ phase }: { phase: ChamberPhase }) {
  const group = useRef<Group>(null);
  useFrame((_, d) => {
    if (!group.current) return;
    const shown = phase === "hired" || phase === "attested";
    const y = shown ? 1.85 : 2.6;
    group.current.position.y += (y - group.current.position.y) * Math.min(d * 4, 1);
    group.current.visible = phase !== "idle" && phase !== "skipped";
  });
  const color = phase === "hired" ? OK : AMBER;
  return (
    <group ref={group} position={[0, 2.6, -0.4]}>
      <mesh>
        <boxGeometry args={[0.7, 0.12, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

export function KilnScene({
  kind,
  work,
  phase,
  maxUsdt,
  hours,
  reduced,
}: {
  kind: AgentKind;
  work: WorkReport | null;
  phase: ChamberPhase;
  maxUsdt: number;
  hours: number;
  reduced: boolean;
}) {
  const dpr: [number, number] = typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1] : [1, 1.75];

  return (
    <Canvas
      dpr={dpr}
      frameloop="always"
      shadows
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0.2, 1.4, 4.2], fov: 38 }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(BG, 1);
        camera.lookAt(0.1, 0.45, 0);
      }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={1.15} color="#fff4d6" />
      <pointLight position={[-2, 2, 2]} intensity={0.55} color={AMBER} />
      <pointLight position={[2.2, 1.4, -1]} intensity={0.35} color={OK} />
      <Floor />
      <AgentRig phase={phase} reduced={reduced} />
      <ScanBeam phase={phase} reduced={reduced} />
      <JobStage kind={kind} work={work} phase={phase} reduced={reduced} />
      <EnvelopeGates phase={phase} maxUsdt={maxUsdt} hours={hours} reduced={reduced} />
      <HirePlaque phase={phase} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 3.4}
        target={[0.1, 0.45, 0]}
        makeDefault
      />
    </Canvas>
  );
}
