-- Kiln hire book. Catalog stays on 8004scan.
-- Applied 2026-08-18 to eybqdqnmkujxseztslge (hackathon project).

create table if not exists public.kiln_wallets (
  address text primary key,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.kiln_leases (
  id uuid primary key default gen_random_uuid(),
  wallet text not null references public.kiln_wallets(address) on delete cascade,
  agent_id text not null,
  token_id text not null,
  chain_id integer not null default 56,
  handle text not null,
  kind text not null,
  mandate text not null default '',
  protocols text[] not null default '{}',
  a2a_endpoint text,
  mcp_endpoint text,
  max_usdt numeric not null,
  hours integer not null,
  hired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  envelope_tx text,
  envelope_onchain_id integer,
  sample_hash text,
  sample_trace jsonb,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists kiln_leases_wallet_status_expires_idx
  on public.kiln_leases (wallet, status, expires_at);

create table if not exists public.kiln_heartbeats (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.kiln_leases(id) on delete cascade,
  at timestamptz not null default now(),
  reachable boolean not null default false,
  http_status integer,
  latency_ms integer,
  endpoint text,
  skills text[] not null default '{}',
  snippet text not null default '',
  verdict text not null default ''
);

create index if not exists kiln_heartbeats_lease_at_idx
  on public.kiln_heartbeats (lease_id, at desc);

alter table public.kiln_wallets enable row level security;
alter table public.kiln_leases enable row level security;
alter table public.kiln_heartbeats enable row level security;

revoke all on table public.kiln_wallets from anon, authenticated;
revoke all on table public.kiln_leases from anon, authenticated;
revoke all on table public.kiln_heartbeats from anon, authenticated;
grant all on table public.kiln_wallets to service_role;
grant all on table public.kiln_leases to service_role;
grant all on table public.kiln_heartbeats to service_role;
