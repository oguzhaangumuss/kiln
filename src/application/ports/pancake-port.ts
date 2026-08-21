export type PoolMetric = {
  aprBps: number | null;
  tvlUsd: number | null;
  source: string;
  pair: string | null;
  feeBps: number | null;
  tick: number | null;
  price: number | null;
};

export type PancakePort = {
  snapshot(): Promise<PoolMetric | null>;
};
