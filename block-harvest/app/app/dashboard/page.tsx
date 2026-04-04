'use client'
import { useWallet }     from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useCallback, useEffect, useState } from 'react'
import { SystemProgram } from '@solana/web3.js'
import { getProgram, getFarmerPDA, getVaultPDA } from '../../lib/anchor'
import { supabase, Farmer } from '../../lib/supabase'

type ChainData = {
  premiumPaid:      boolean
  premiumAmount:    number
  paymentTimestamp: number
  claimFiled:       boolean
  claimApproved:    boolean
}

/** On-chain account shape from Anchor (numeric fields as BN). */
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

export default function Dashboard() {
  const { publicKey, wallet }   = useWallet()
  const [farmer, setFarmer]     = useState<Farmer | null>(null)
  const [chain, setChain]       = useState<ChainData | null>(null)
  const [txSig, setTxSig]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!publicKey || !wallet) return
    setFetching(true)
    try {
      const { data } = await supabase
          .from('farmers')
          .select('*')
          .eq('wallet_address', publicKey.toString())
          .single()
      setFarmer(data)

      const program = getProgram(wallet)
      const [pda]   = getFarmerPDA(publicKey)
      const account = (await program.account.farmerAccount.fetch(
        pda
      )) as FarmerAccountFetched

      setChain({
        premiumPaid:      account.premiumPaid,
        premiumAmount:    account.premiumAmount.toNumber(),
        paymentTimestamp: account.paymentTimestamp.toNumber(),
        claimFiled:       account.claimFiled,
        claimApproved:    account.claimApproved,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }, [publicKey, wallet])

  useEffect(() => {
    if (publicKey && wallet) void fetchAll()
  }, [publicKey, wallet, fetchAll])

  const payPremium = async () => {
    if (!publicKey || !wallet) return
    setLoading(true)
    try {
      const program     = getProgram(wallet)
      const [farmerPDA] = getFarmerPDA(publicKey)
      const [vaultPDA]  = getVaultPDA()

      const tx = await program.methods
          .payPremium()
          .accounts({
            farmerAccount: farmerPDA,
            farmer:        publicKey,
            vault:         vaultPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

      setTxSig(tx)
      await fetchAll()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  if (!publicKey) return (
      <main className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(52,211,153,0.08),transparent)]" aria-hidden />
        <div className="relative flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-10 text-center shadow-2xl shadow-black/40 backdrop-blur-md">
            <p className="text-zinc-400">Connect your wallet to continue</p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </main>
  )

  if (fetching) return (
      <main className="flex min-h-screen items-center justify-center bg-[#030303]">
        <div className="flex items-center gap-3 text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          Loading…
        </div>
      </main>
  )

  return (
      <main className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-15%,rgba(52,211,153,0.1),transparent_50%)]" aria-hidden />
        <div className="relative mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">

          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">BlockHarvest</h1>
            </div>
            <WalletMultiButton />
          </header>

          {farmer && (
              <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-6 shadow-xl shadow-black/30 backdrop-blur-sm">
                <h2 className="mb-5 text-xs font-medium uppercase tracking-wider text-zinc-500">Farmer profile</h2>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-zinc-500">Name</p>
                    <p className="mt-1 font-medium text-zinc-100">{farmer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Crop type</p>
                    <p className="mt-1 font-medium text-zinc-100">{farmer.crop_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Land size</p>
                    <p className="mt-1 font-medium text-zinc-100">{farmer.land_size} acres</p>
                  </div>
                </div>
              </section>
          )}

          {chain && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  className={`rounded-2xl border p-6 shadow-lg shadow-black/20 ${
                    chain.premiumPaid
                      ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                      : 'border-zinc-800/80 bg-zinc-950/50'
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Premium</p>
                  {chain.premiumPaid ? (
                      <>
                        <p className="mt-2 text-lg font-semibold text-emerald-400">Paid · 0.1 SOL</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {new Date(chain.paymentTimestamp * 1000).toLocaleString()}
                        </p>
                      </>
                  ) : (
                      <p className="mt-2 text-lg font-medium text-zinc-400">Not paid</p>
                  )}
                </div>
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Claim</p>
                  <p className="mt-2 text-lg font-medium text-zinc-100">
                    {chain.claimApproved
                        ? 'Approved'
                        : chain.claimFiled
                            ? 'Filed — pending review'
                            : 'No active claim'}
                  </p>
                </div>
              </div>
          )}

          {chain && !chain.premiumPaid && (
              <button
                  type="button"
                  onClick={payPremium}
                  disabled={loading}
                  className="w-full rounded-xl bg-white py-4 text-base font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Processing…' : 'Pay premium — 0.1 SOL'}
              </button>
          )}

          {txSig && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-sm">
                <p className="font-medium text-emerald-400">Payment confirmed</p>
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block break-all text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-emerald-400/90"
                >
                  View on Solana Explorer →
                </a>
              </div>
            )}

          <p className="text-center font-mono text-[11px] text-zinc-600" title={publicKey.toString()}>
            {shortAddress(publicKey.toString())}
          </p>
        </div>
      </main>
  )
}
