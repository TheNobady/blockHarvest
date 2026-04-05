-- Run once if you already created `transactions` with the old check (premium | payout only).

alter table public.transactions drop constraint if exists transactions_tx_type_check;

alter table public.transactions
  add constraint transactions_tx_type_check
  check (tx_type in ('premium', 'payout', 'register'));

-- Recreate view so aggregates stay correct
create or replace view public.dashboard_stats as
select
  (select count(*)::bigint from public.farmers) as farmer_count,
  (select count(*)::bigint from public.transactions) as tx_count,
  (select coalesce(sum(amount_sol), 0)::numeric from public.transactions where status = 'success') as total_volume_sol,
  (select coalesce(sum(amount_sol), 0)::numeric from public.transactions where status = 'success' and tx_type = 'payout') as total_payout_sol,
  (select coalesce(sum(amount_sol), 0)::numeric from public.transactions where status = 'success' and tx_type = 'premium') as total_premium_sol,
  (select max(created_at) from public.transactions where tx_type = 'payout' and status = 'success') as last_payout_at;

grant select on public.dashboard_stats to anon, authenticated;
