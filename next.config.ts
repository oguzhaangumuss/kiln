import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
