-- BlockHarvest — run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Enables farmers + on-chain–linked ledger rows for the Next.js app.

create table if not exists public.farmers (
  wallet_address text primary key,
  name text not null,
  crop_type text not null,
  land_size numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  signature text not null unique,
  wallet_address text not null,
  tx_type text not null check (tx_type in ('premium', 'payout', 'register')),
  amount_sol numeric not null,
  status text not null default 'success' check (status in ('success', 'pending')),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_wallet on public.transactions (wallet_address);
create index if not exists idx_transactions_created on public.transactions (created_at desc);
create index if not exists idx_transactions_type on public.transactions (tx_type);

-- Single-row aggregates for dashboard (read via .from('dashboard_stats').select('*').single())
create or replace view public.dashboard_stats as
select
  (select count(*)::bigint from public.farmers) as farmer_count,
  (select count(*)::bigint from public.transactions) as tx_count,
  (select coalesce(sum(amount_sol), 0)::numeric from public.transactions where status = 'success') as total_volume_sol,
  (select coalesce(sum(amount_sol), 0)::numeric from public.transactions where status = 'success' and tx_type = 'payout') as total_payout_sol,
  (select coalesce(sum(amount_sol), 0)::numeric from public.transactions where status = 'success' and tx_type = 'premium') as total_premium_sol,
  (select max(created_at) from public.transactions where tx_type = 'payout' and status = 'success') as last_payout_at;

alter table public.farmers enable row level security;
alter table public.transactions enable row level security;

-- Prototype: public read/write for anon key (tighten for production, e.g. Edge Functions + service role)
drop policy if exists "farmers_select" on public.farmers;
drop policy if exists "farmers_insert" on public.farmers;
drop policy if exists "farmers_update" on public.farmers;
create policy "farmers_select" on public.farmers for select using (true);
create policy "farmers_insert" on public.farmers for insert with check (true);
create policy "farmers_update" on public.farmers for update using (true);

drop policy if exists "tx_select" on public.transactions;
drop policy if exists "tx_insert" on public.transactions;
create policy "tx_select" on public.transactions for select using (true);
create policy "tx_insert" on public.transactions for insert with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.farmers to anon, authenticated;
grant select, insert on public.transactions to anon, authenticated;
grant select on public.dashboard_stats to anon, authenticated;
