"use client";

import { useEffect, useState } from "react";

export type ChamberCapability = "3d" | "2d";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(motion.matches);
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);
  return reduced;
}

export function useChamberCapability(): ChamberCapability {
  const [mode, setMode] = useState<ChamberCapability>("3d");

  useEffect(() => {
    if (!hasWebGL()) setMode("2d");
  }, []);

  return mode;
}
