'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchDashboardStats,
  fetchLedgerTransactions,
  isSupabaseConfigured,
  type LedgerTransaction,
} from '../../lib/supabase'

function shortPk(pk: string) {
  if (pk.length <= 12) return pk
  return `${pk.slice(0, 6)}…${pk.slice(-4)}`
}

function shortSig(sig: string) {
  if (sig.length <= 14) return sig
  return `${sig.slice(0, 6)}…${sig.slice(-4)}`
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return iso
  const sec = Math.floor((Date.now() - d) / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr} hr${hr === 1 ? '' : 's'} ago`
  const days = Math.floor(hr / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

type UiRow = {
  id: string
  wallet: string
  type: 'Premium' | 'Payout'
  amount: string
  status: 'Success' | 'Pending'
  time: string
  raw: LedgerTransaction
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<LedgerTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalVol, setTotalVol] = useState(0)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Premium' | 'Payout'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Pending'>('all')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([])
      setTotalVol(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [list, stats] = await Promise.all([fetchLedgerTransactions(500), fetchDashboardStats()])
      setRows(list)
      setTotalVol(stats?.total_volume_sol ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const uiRows: UiRow[] = useMemo(() => {
    return rows.map((r) => ({
      id: shortSig(r.signature),
      wallet: shortPk(r.wallet_address),
      type: r.tx_type === 'premium' ? 'Premium' : 'Payout',
      amount: `${Number(r.amount_sol).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`,
      status: r.status === 'success' ? 'Success' : 'Pending',
      time: formatRelativeTime(r.created_at),
      raw: r,
    }))
  }, [rows])

  const filtered = useMemo(() => {
    return uiRows.filter((r) => {
      const matchQ =
        !q.trim() ||
        r.raw.signature.toLowerCase().includes(q.toLowerCase()) ||
        r.raw.wallet_address.toLowerCase().includes(q.toLowerCase())
      const matchT = typeFilter === 'all' || r.type === typeFilter
      const matchS = statusFilter === 'all' || r.status === statusFilter
      return matchQ && matchT && matchS
    })
  }, [uiRows, q, typeFilter, statusFilter])

  const totalTxs = rows.length
  const configured = isSupabaseConfigured()

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {!configured && (
        <div className="mb-8 rounded-2xl bg-surface-container-high px-5 py-4 text-sm text-on-surface bh-ambient">
          Supabase is not configured. Set <code className="text-primary-container">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="text-primary-container">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run{' '}
          <code className="text-on-surface-variant">app/supabase/schema.sql</code>, then refresh. This page reads the{' '}
          <code className="text-on-surface">transactions</code> table.
        </div>
      )}

      <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl lg:flex-1">
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-on-surface sm:text-4xl lg:text-5xl">
            Ledger{' '}
            <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">
              History
            </span>
          </h1>
          <p className="mt-6 text-base leading-relaxed text-on-surface-variant">
            Every premium payment from the app is stored here after a successful on-chain transaction. Payout rows can be
            added when you wire claim settlement to the same table.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 lg:justify-end">
          <div className="min-w-[168px] rounded-2xl bg-surface-container-low px-6 py-5 bh-ambient">
            <p className="bh-label">Total volume</p>
            <p className="font-display mt-2 text-2xl font-bold text-on-surface">
              {totalVol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL
            </p>
          </div>
          <div className="min-w-[140px] rounded-2xl bg-surface-container-low px-6 py-5 bh-ambient">
            <p className="bh-label">Total TXs</p>
            <p className="font-display mt-2 text-2xl font-bold text-on-surface">{totalTxs}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 rounded-2xl bg-surface-container-low p-4 bh-ambient sm:flex-row sm:items-stretch sm:gap-4 sm:p-5">
        <div className="relative min-h-[48px] flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">⌕</span>
          <input
            type="search"
            placeholder="Search signature or full wallet…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bh-input h-full w-full py-3 pl-11 pr-4 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-3 sm:shrink-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="bh-input cursor-pointer py-3 pl-3 pr-8 text-sm text-on-surface"
          >
            <option value="all">All Types</option>
            <option value="Premium">Premium</option>
            <option value="Payout">Payout</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bh-input cursor-pointer py-3 pl-3 pr-8 text-sm text-on-surface"
          >
            <option value="all">All Status</option>
            <option value="Success">Success</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-on-surface-variant">Loading ledger…</p>
      ) : (
        <div className="mt-8 space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-on-surface-variant">No matching rows. Premium payments appear here after you pay from the dashboard.</p>
          )}
          {filtered.map((r) => (
            <div
              key={r.raw.id}
              className="grid gap-4 rounded-2xl bg-surface-container-high p-5 transition-all duration-300 bh-ambient sm:grid-cols-[1.2fr_1fr_auto_auto_auto] sm:items-center lg:p-6"
            >
              <div>
                <p className="bh-label sm:hidden">Transaction</p>
                <a
                  href={`https://explorer.solana.com/tx/${r.raw.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm text-primary-container hover:underline"
                >
                  {r.id}
                </a>
              </div>
              <div>
                <p className="bh-label sm:hidden">Wallet</p>
                <p className="font-mono text-sm text-on-surface-variant">{r.wallet}</p>
              </div>
              <div>
                <span className={r.type === 'Premium' ? 'bh-chip' : 'bh-chip-tertiary'}>{r.type}</span>
              </div>
              <div>
                <p className="bh-label sm:hidden">Amount</p>
                <p className="font-semibold text-on-surface">{r.amount}</p>
              </div>
              <div className="flex flex-col gap-1 sm:items-end">
                <p className="bh-label sm:hidden">Status</p>
                {r.status === 'Success' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-primary-container">
                    <span aria-hidden>✓</span> Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
                    <span aria-hidden>↻</span> Pending
                  </span>
                )}
                <p className="text-xs text-on-surface-variant sm:text-right">{r.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-on-surface-variant">
          Showing {filtered.length} of {totalTxs} transaction{totalTxs === 1 ? '' : 's'}
        </p>
      </div>
    </main>
  )
}
