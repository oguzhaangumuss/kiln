-- Public hire tape reads kiln_leases by recency. Catalog stays on 8004scan.

create index if not exists kiln_leases_hired_at_desc_idx
  on public.kiln_leases (hired_at desc);
