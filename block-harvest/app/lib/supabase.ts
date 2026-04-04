import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseKey.length > 0
}

export function isDuplicateFarmerRow(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return err.code === '23505' || msg.includes('duplicate') || msg.includes('unique')
}

export function isDuplicateTxSignature(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === '23505' || (err.message ?? '').toLowerCase().includes('duplicate')
}

const safeUrl = supabaseUrl || 'https://invalid.local'
const safeKey = supabaseKey || 'invalid-anon-key'

export const supabase = createClient(safeUrl, safeKey)

export type Farmer = {
  wallet_address: string
  name: string
  crop_type: string
  land_size: number
  created_at: string
}

export type LedgerTransaction = {
  id: string
  signature: string
  wallet_address: string
  tx_type: 'premium' | 'payout'
  amount_sol: number
  status: 'success' | 'pending'
  created_at: string
}

export type DashboardStats = {
  farmer_count: number
  tx_count: number
  total_volume_sol: number
  total_payout_sol: number
  total_premium_sol: number
  last_payout_at: string | null
}

const PREMIUM_SOL = 0.1

export { PREMIUM_SOL }

export async function upsertFarmerProfile(row: {
  wallet_address: string
  name: string
  crop_type: string
  land_size: number
}): Promise<{ message: string; code?: string } | null> {
  const { error } = await supabase.from('farmers').upsert(row, { onConflict: 'wallet_address' })
  return error ? { message: error.message, code: error.code } : null
}

export async function recordPremiumTransaction(
  walletAddress: string,
  signature: string,
  amountSol: number = PREMIUM_SOL
): Promise<{ message: string; code?: string } | null> {
  const { error } = await supabase.from('transactions').insert({
    signature,
    wallet_address: walletAddress,
    tx_type: 'premium',
    amount_sol: amountSol,
    status: 'success',
  })
  return error ? { message: error.message, code: error.code } : null
}

async function fetchDashboardStatsFromTables(): Promise<DashboardStats | null> {
  const [{ count: farmerCount, error: e1 }, { data: txs, error: e2 }] = await Promise.all([
    supabase.from('farmers').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('amount_sol, tx_type, status, created_at'),
  ])
  if (e1 || e2) {
    console.error('[BlockHarvest] stats fallback:', e1, e2)
    return null
  }
  const rows = (txs ?? []) as { amount_sol: number | string; tx_type: string; status: string; created_at: string }[]
  let total_volume_sol = 0
  let total_payout_sol = 0
  let total_premium_sol = 0
  let last_payout_at: string | null = null
  for (const r of rows) {
    if (r.status !== 'success') continue
    const amt = Number(r.amount_sol)
    total_volume_sol += amt
    if (r.tx_type === 'payout') {
      total_payout_sol += amt
      if (!last_payout_at || r.created_at > last_payout_at) last_payout_at = r.created_at
    }
    if (r.tx_type === 'premium') total_premium_sol += amt
  }
  return {
    farmer_count: farmerCount ?? 0,
    tx_count: rows.length,
    total_volume_sol,
    total_payout_sol,
    total_premium_sol,
    last_payout_at,
  }
}

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase.from('dashboard_stats').select('*').single()
  if (!error && data) {
    const row = data as Record<string, unknown>
    return {
      farmer_count: Number(row.farmer_count ?? 0),
      tx_count: Number(row.tx_count ?? 0),
      total_volume_sol: Number(row.total_volume_sol ?? 0),
      total_payout_sol: Number(row.total_payout_sol ?? 0),
      total_premium_sol: Number(row.total_premium_sol ?? 0),
      last_payout_at: row.last_payout_at ? String(row.last_payout_at) : null,
    }
  }
  return fetchDashboardStatsFromTables()
}

export async function fetchAllFarmers(limit = 100): Promise<Farmer[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('farmers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[BlockHarvest] farmers list:', error)
    return []
  }
  return (data ?? []) as Farmer[]
}

/** Wallets that have at least one successful premium row in the ledger */
export async function fetchWalletsWithPremiumTx(): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set()
  const { data, error } = await supabase
    .from('transactions')
    .select('wallet_address')
    .eq('tx_type', 'premium')
    .eq('status', 'success')
  if (error || !data) return new Set()
  return new Set(data.map((r: { wallet_address: string }) => r.wallet_address))
}

export async function fetchLedgerTransactions(limit = 200): Promise<LedgerTransaction[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[BlockHarvest] transactions:', error)
    return []
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    signature: String(r.signature),
    wallet_address: String(r.wallet_address),
    tx_type: r.tx_type as 'premium' | 'payout',
    amount_sol: Number(r.amount_sol),
    status: r.status as 'success' | 'pending',
    created_at: String(r.created_at),
  }))
}
