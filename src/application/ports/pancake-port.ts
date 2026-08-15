export type PoolMetric = {
  aprBps: number | null;
  tvlUsd: number | null;
  source: string;
};

export type PancakePort = {
  snapshot(): Promise<PoolMetric | null>;
};
