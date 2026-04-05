'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import ClientWalletButton from '@/components/ClientWalletButton'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { SystemProgram } from '@solana/web3.js'
import SecureHarvestModal from '@/components/SecureHarvestModal'
import {
  ensureProgramVaultInitialized,
  getFarmerPDA,
  getProgram,
  getVaultPDA,
} from '../../lib/anchor'
import {
  type DashboardStats,
  type Farmer,
  fetchAllFarmers,
  fetchDashboardStats,
  fetchWalletsWithPremiumTx,
  isDuplicateTxSignature,
  isSupabaseConfigured,
  PREMIUM_SOL,
  recordPremiumTransaction,
  supabase,
} from '../../lib/supabase'

type ChainData = {
  premiumPaid: boolean
  premiumAmount: number
  paymentTimestamp: number
  claimFiled: boolean
  claimApproved: boolean
}

type FarmerAccountFetched = {
  premiumPaid: boolean
  premiumAmount: { toNumber: () => number }
  paymentTimestamp: { toNumber: () => number }
  claimFiled: boolean
  claimApproved: boolean
}

function shortAddress(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`
}

function formatSol(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export default function Dashboard() {
  const { connection } = useConnection()
  const { publicKey, wallet } = useWallet()
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [chain, setChain] = useState<ChainData | null>(null)
  const [txSig, setTxSig] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [hasOnChainAccount, setHasOnChainAccount] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([])
  const [premiumWallets, setPremiumWallets] = useState<Set<string>>(new Set())
  const [payoutTxCount, setPayoutTxCount] = useState(0)

  const fetchAll = useCallback(async () => {
    if (!publicKey || !wallet) return
    setFetching(true)
    try {
      const program = getProgram(wallet, connection)
      const [pda] = getFarmerPDA(publicKey)
      const account = (await program.account.farmerAccount.fetch(pda)) as FarmerAccountFetched

      setHasOnChainAccount(true)
      setChain({
        premiumPaid: account.premiumPaid,
        premiumAmount: account.premiumAmount.toNumber(),
        paymentTimestamp: account.paymentTimestamp.toNumber(),
        claimFiled: account.claimFiled,
        claimApproved: account.claimApproved,
      })

      if (isSupabaseConfigured()) {
        const [{ data: f }, s, list, prem, payoutHead] = await Promise.all([
          supabase.from('farmers').select('*').eq('wallet_address', publicKey.toString()).maybeSingle(),
          fetchDashboardStats(),
          fetchAllFarmers(100),
          fetchWalletsWithPremiumTx(),
          supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('tx_type', 'payout')
            .eq('status', 'success'),
        ])
        setFarmer(f as Farmer | null)
        setStats(s)
        setAllFarmers(list)
        setPremiumWallets(prem)
        setPayoutTxCount(payoutHead.count ?? 0)
      } else {
        setFarmer(null)
        setStats(null)
        setAllFarmers([])
        setPremiumWallets(new Set())
        setPayoutTxCount(0)
      }
    } catch (err) {
      console.error(err)
      setHasOnChainAccount(false)
      setChain(null)
      setFarmer(null)
      setStats(null)
      setAllFarmers([])
      setPremiumWallets(new Set())
      setPayoutTxCount(0)
    } finally {
      setFetching(false)
    }
  }, [publicKey, wallet, connection])

  useEffect(() => {
    if (publicKey && wallet) void fetchAll()
  }, [publicKey, wallet, fetchAll])

  const payPremium = async () => {
    if (!publicKey || !wallet) return
    if (!isSupabaseConfigured()) {
      alert('Configure Supabase in .env.local so premium payments can be recorded in the ledger.')
      return
    }
    setLoading(true)
    try {
      const program = getProgram(wallet, connection)
      const [farmerPDA] = getFarmerPDA(publicKey)
      const [vaultPDA] = getVaultPDA()

      await ensureProgramVaultInitialized(program, publicKey)

      const tx = await program.methods
        .payPremium()
        .accounts({
          farmerAccount: farmerPDA,
          farmer: publicKey,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      const ledgerErr = await recordPremiumTransaction(publicKey.toString(), tx, PREMIUM_SOL)
      if (ledgerErr && !isDuplicateTxSignature(ledgerErr)) {
        alert(
          `On-chain payment succeeded (signature ${shortAddress(tx)}…), but the ledger row failed: ${ledgerErr.message}. Fix Supabase or insert the row manually.`
        )
      }

      setTxSig(tx)
      await fetchAll()
      setModalOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  if (!publicKey) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 lg:py-32">
        <div className="w-full max-w-md space-y-8 rounded-3xl bg-surface-container-low p-10 text-center bh-ambient">
          <p className="text-on-surface-variant">Connect your wallet to view your dashboard</p>
          <div className="flex justify-center">
            <ClientWalletButton />
          </div>
        </div>
      </main>
    )
  }

  if (fetching) {
    return (
      <main className="flex flex-1 items-center justify-center py-32">
        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-container-high border-t-primary-container" />
          Loading…
        </div>
      </main>
    )
  }

  const premiumPaid = chain?.premiumPaid ?? false
  const farmerCount = stats?.farmer_count ?? allFarmers.length
  const txCount = stats?.tx_count ?? 0
  const totalVol = stats?.total_volume_sol ?? 0
  const totalPayoutSol = stats?.total_payout_sol ?? 0
  const premCount = premiumWallets.size

  const pctFarmersWithPremium =
    farmerCount > 0 ? Math.min(100, Math.round((premCount / farmerCount) * 100)) : 0
  const pctPayoutMix =
    txCount > 0 ? Math.min(100, Math.round((payoutTxCount / txCount) * 100)) : 0
  const pctPayoutVsFarmers =
    farmerCount > 0 ? Math.min(100, Math.round((payoutTxCount / farmerCount) * 100)) : 0

  const hasDb = isSupabaseConfigured()

  const farmerPremiumActive = (w: Farmer) => {
    if (w.wallet_address === publicKey.toString()) {
      return chain?.premiumPaid ?? premiumWallets.has(w.wallet_address)
    }
    return premiumWallets.has(w.wallet_address)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {!hasDb && (
        <div className="mb-8 rounded-2xl bg-surface-container-high px-5 py-4 text-sm text-on-surface bh-ambient">
          Supabase is not configured. Set <code className="text-primary-container">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="text-primary-container">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run{' '}
          <code className="text-on-surface-variant">app/supabase/schema.sql</code>, then restart the dev server. Stats and
          ledger sync require the database.
        </div>
      )}

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
        <div className="max-w-2xl lg:flex-1">
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-on-surface sm:text-4xl lg:text-5xl">
            Agricultural{' '}
            <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">
              Resilience
            </span>
          </h1>
          <p className="mt-6 text-base leading-relaxed text-on-surface-variant">
            On-chain premium status below is authoritative. Aggregates and the farmer list come from Supabase when
            configured.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-4 sm:flex-row lg:flex-col lg:items-end">
          <button
            type="button"
            onClick={() => {
              if (!hasDb) {
                alert(
                  'Configure Supabase (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY) and run app/supabase/schema.sql so premiums can be recorded.'
                )
                return
              }
              if (!hasOnChainAccount) {
                alert('Register your farmer account on-chain first (Register page), then return here to buy insurance.')
                return
              }
              setModalOpen(true)
            }}
            className="bh-btn-primary inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm"
          >
            <span aria-hidden>🛒</span> Buy insurance
          </button>
        </div>
      </div>

      {!hasOnChainAccount && (
        <div className="mt-10 rounded-2xl bg-surface-container-low px-5 py-4 text-sm text-on-surface bh-ambient">
          Register your farmer account on-chain first, then you can pay the premium.{' '}
          <Link
            href="/register"
            className="font-semibold text-primary-container transition-all duration-300 hover:text-primary hover:underline"
          >
            Go to register
          </Link>
        </div>
      )}

      <div className="mt-14 grid gap-6 sm:grid-cols-3 lg:gap-8">
        <div className="rounded-2xl bg-surface-container-low p-8 transition-all duration-300 bh-ambient hover:bg-surface-container-high/90 lg:rounded-3xl lg:p-10">
          <div className="flex items-start justify-between">
            <span className="text-2xl opacity-60" aria-hidden>
              📄
            </span>
            <span className="bh-label text-primary-container">Supabase</span>
          </div>
          <p className="font-display mt-8 text-4xl font-bold text-primary-container">{farmerCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">Registered farmers (policies)</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-8 transition-all duration-300 bh-ambient hover:bg-surface-container-high/90 lg:rounded-3xl lg:p-10">
          <div className="flex items-start justify-between">
            <span className="text-2xl opacity-60" aria-hidden>
              💵
            </span>
          </div>
          <p className="font-display mt-8 text-4xl font-bold text-tertiary">{formatSol(totalPayoutSol)} SOL</p>
          <p className="mt-2 text-sm text-on-surface-variant">Total payouts (ledger)</p>
          <p className="mt-1 text-xs text-on-surface-variant/80">
            {stats?.last_payout_at
              ? `Last payout ${new Date(stats.last_payout_at).toLocaleString()}`
              : 'No payout rows yet'}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-8 transition-all duration-300 bh-ambient hover:bg-surface-container-high/90 lg:rounded-3xl lg:p-10">
          <div className="flex items-start justify-between">
            <span className="text-2xl opacity-60" aria-hidden>
              ⚡
            </span>
            <span className="bh-label text-primary-container">Ledger</span>
          </div>
          <p className="font-display mt-8 text-4xl font-bold text-on-surface">{txCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">Transactions recorded</p>
          <p className="mt-1 text-xs text-on-surface-variant/80">{formatSol(totalVol)} SOL total volume</p>
        </div>
      </div>

      {farmer && (
        <section className="mt-12 rounded-3xl bg-surface-container-low p-8 bh-ambient lg:p-10">
          <h2 className="bh-label text-primary-container">Your profile (Supabase)</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <div>
              <p className="bh-label mb-2">Name</p>
              <p className="font-medium text-on-surface">{farmer.name}</p>
            </div>
            <div>
              <p className="bh-label mb-2">Crop</p>
              <p className="font-medium text-on-surface">{farmer.crop_type}</p>
            </div>
            <div>
              <p className="bh-label mb-2">Land</p>
              <p className="font-medium text-on-surface">{farmer.land_size} acres</p>
            </div>
          </div>
        </section>
      )}

      {hasOnChainAccount && !farmer && hasDb && (
        <section className="mt-8 rounded-2xl bg-surface-container-high px-5 py-4 text-sm text-on-surface-variant">
          No Supabase profile for this wallet. Complete{' '}
          <Link href="/register" className="text-primary-container underline">
            Register
          </Link>{' '}
          to save name, crop, and land size.
        </section>
      )}

      {chain && (
        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div
            className={`rounded-3xl p-8 bh-ambient transition-all duration-300 ${
              chain.premiumPaid
                ? 'bg-surface-container-high shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-container)_18%,transparent)]'
                : 'bg-surface-container-low'
            }`}
          >
            <p className="bh-label">On-chain premium</p>
            {chain.premiumPaid ? (
              <>
                <p className="font-display mt-4 text-2xl font-bold text-primary-container">Paid · {PREMIUM_SOL} SOL</p>
                <p className="mt-2 text-xs text-on-surface-variant">
                  {new Date(chain.paymentTimestamp * 1000).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="mt-4 text-lg text-on-surface-variant">Not paid — use Buy insurance</p>
            )}
          </div>
          <div className="rounded-3xl bg-surface-container-low p-8 bh-ambient">
            <p className="bh-label">Claim</p>
            <p className="mt-4 text-lg font-medium text-on-surface">
              {chain.claimApproved ? 'Approved' : chain.claimFiled ? 'Filed — pending review' : 'No active claim'}
            </p>
          </div>
        </section>
      )}

      <section className="mt-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Farmers (Supabase)</h2>
        </div>
        <div className="space-y-4">
          {allFarmers.length === 0 && hasDb && (
            <p className="text-sm text-on-surface-variant">No farmers in the database yet.</p>
          )}
          {allFarmers.map((w) => {
            const active = farmerPremiumActive(w)
            const isYou = w.wallet_address === publicKey.toString()
            return (
              <div
                key={w.wallet_address}
                className="flex flex-col gap-6 rounded-2xl bg-surface-container-high p-6 transition-all duration-300 bh-ambient sm:flex-row sm:items-center sm:justify-between lg:p-8"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-on-surface">
                    {w.crop_type} — {w.name}
                    {isYou && <span className="ml-2 text-xs text-primary-container">(you)</span>}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {shortAddress(w.wallet_address)} · {w.land_size} acres
                  </p>
                </div>
                <div className="text-sm text-on-surface-variant">{PREMIUM_SOL} SOL program premium</div>
                <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-surface-container-lowest sm:w-[140px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary"
                    style={{ width: active ? '100%' : '12%' }}
                  />
                </div>
                <span className={active ? 'bh-chip' : 'bh-chip-muted'}>{active ? 'ACTIVE' : 'PENDING'}</span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="overflow-hidden rounded-3xl bg-surface-container-low bh-ambient">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-surface-dim via-surface-container-low to-black">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, color-mix(in srgb, var(--primary-container) 6%, transparent) 8px, color-mix(in srgb, var(--primary-container) 6%, transparent) 9px)`,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background: `radial-gradient(ellipse 70% 50% at 60% 40%, color-mix(in srgb, var(--tertiary) 35%, transparent), transparent)`,
              }}
              aria-hidden
            />
            <div className="bh-glass absolute inset-x-5 bottom-5 rounded-xl p-5 bh-ambient">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary-container">Ledger snapshot</p>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                    {hasDb
                      ? `${premCount} wallet(s) with premium rows · ${formatSol(totalVol)} SOL moved (success)`
                      : 'Connect Supabase to see ledger-backed metrics.'}
                  </p>
                </div>
                <Link href="/transactions" className="bh-btn-secondary shrink-0 px-4 py-2 text-center text-xs">
                  View ledger
                </Link>
              </div>
            </div>
          </div>
          <p className="px-6 py-4 text-xs text-on-surface-variant">Regional view (illustrative map)</p>
        </div>

        <div className="rounded-3xl bg-surface-container-low p-8 bh-ambient lg:p-10">
          <h3 className="font-display text-lg font-semibold text-on-surface">Insights from ledger + farmers</h3>
          {[
            {
              label: 'Farmers with premium (DB)',
              pct: pctFarmersWithPremium,
              barStyle: { background: 'linear-gradient(90deg, var(--primary-container), var(--primary))' },
            },
            {
              label: 'Payout share of tx count',
              pct: pctPayoutMix,
              barStyle: {
                background: 'linear-gradient(90deg, var(--tertiary), color-mix(in srgb, var(--tertiary) 55%, white))',
              },
            },
            {
              label: 'Payouts vs farmer count',
              pct: pctPayoutVsFarmers,
              barStyle: { background: 'linear-gradient(90deg, var(--primary-container), var(--primary))' },
            },
          ].map((row) => (
            <div key={row.label} className="mt-8 first:mt-6">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{row.label}</span>
                <span className="font-medium text-on-surface">{row.pct}%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container-lowest">
                <div className="h-full rounded-full" style={{ width: `${row.pct}%`, ...row.barStyle }} />
              </div>
            </div>
          ))}
          <p className="mt-10 rounded-xl bg-surface-container-high px-4 py-4 text-xs leading-relaxed text-on-surface-variant">
            Percentages are derived from your Supabase <code className="text-on-surface">farmers</code> and{' '}
            <code className="text-on-surface">transactions</code> tables.
          </p>
        </div>
      </div>

      {txSig && (
        <div className="mt-12 rounded-3xl bg-surface-container-high p-8 bh-ambient">
          <p className="font-semibold text-primary-container">Payment confirmed</p>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block break-all text-sm text-on-surface-variant transition-all duration-300 hover:text-primary-container hover:underline"
          >
            View on Solana Explorer →
          </a>
        </div>
      )}

      <p className="mt-10 text-center font-mono text-xs text-on-surface-variant" title={publicKey.toString()}>
        {shortAddress(publicKey.toString())}
      </p>

      <SecureHarvestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onIssuePolicy={payPremium}
        loading={loading}
        premiumPaid={premiumPaid}
      />
    </main>
  )
}
