'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SystemProgram } from '@solana/web3.js'
import { getProgram, getFarmerPDA } from '../../lib/anchor'
import {
  isDuplicateTxSignature,
  isSupabaseConfigured,
  recordRegisterTransaction,
  upsertFarmerProfile,
} from '../../lib/supabase'
import '@solana/wallet-adapter-react-ui/styles.css'

export default function Register() {
  const { connection } = useConnection()
  const { publicKey, wallet } = useWallet()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', crop_type: '', land_size: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !wallet) {
      setError('Connect your wallet first')
      return
    }
    if (!isSupabaseConfigured()) {
      setError(
        'Supabase is required: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then run the SQL in app/supabase/schema.sql in your Supabase project.'
      )
      return
    }

    setLoading(true)
    setError('')
    try {
      const program = getProgram(wallet, connection)
      const [farmerPDA] = getFarmerPDA(publicKey)

      let alreadyOnChain = false
      try {
        await program.account.farmerAccount.fetch(farmerPDA)
        alreadyOnChain = true
      } catch {
        // PDA not created yet — will register below
      }

      let registerSignature: string | null = null
      if (!alreadyOnChain) {
        registerSignature = await program.methods
          .registerFarmer()
          .accounts({
            farmerAccount: farmerPDA,
            farmer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      }

      const row = {
        wallet_address: publicKey.toString(),
        name: form.name,
        crop_type: form.crop_type,
        land_size: parseFloat(form.land_size),
      }

      const dbErr = await upsertFarmerProfile(row)
      if (dbErr) {
        throw new Error(
          `On-chain step ${alreadyOnChain ? 'skipped (already registered)' : 'succeeded'}, but Supabase failed: ${dbErr.message}. Check RLS policies and that tables exist (see app/supabase/schema.sql).`
        )
      }

      if (registerSignature) {
        const ledgerErr = await recordRegisterTransaction(publicKey.toString(), registerSignature, 0)
        if (ledgerErr && !isDuplicateTxSignature(ledgerErr)) {
          console.warn('[BlockHarvest] register ledger row:', ledgerErr.message)
        }
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const accountInUse = msg.includes('already in use') || msg.includes('Allocate: account')

      if (accountInUse) {
        const row = {
          wallet_address: publicKey.toString(),
          name: form.name,
          crop_type: form.crop_type,
          land_size: parseFloat(form.land_size),
        }
        const dbErr = await upsertFarmerProfile(row)
        if (dbErr) {
          setError(
            `Wallet already registered on-chain. Saving profile to Supabase failed: ${dbErr.message}`
          )
        } else {
          router.push('/dashboard')
        }
      } else {
        console.error(err)
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 lg:py-24">
      <div className="w-full max-w-md space-y-10 rounded-3xl bg-surface-container-low p-8 bh-ambient sm:p-10">
        <div>
          <p className="bh-label text-primary-container">Onboarding</p>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-[-0.02em] text-on-surface sm:text-3xl">
            Register as farmer
          </h2>
          <p className="mt-4 text-base text-on-surface-variant">
            Creates your Solana farmer account and saves your profile to Supabase (required). Run{' '}
            <code className="text-on-surface">app/supabase/schema.sql</code> in the Supabase SQL editor first.
          </p>
        </div>

        {!publicKey && (
          <p className="rounded-xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
            Use <span className="font-semibold text-on-surface">Wallet Connect</span> in the header first.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="bh-label mb-2 block">
              Full name
            </label>
            <input
              id="name"
              className="bh-input w-full px-4 py-3.5 text-base"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="crop" className="bh-label mb-2 block">
              Crop type
            </label>
            <input
              id="crop"
              className="bh-input w-full px-4 py-3.5 text-base"
              value={form.crop_type}
              onChange={(e) => setForm({ ...form, crop_type: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="land" className="bh-label mb-2 block">
              Land size (acres)
            </label>
            <input
              id="land"
              type="number"
              step="0.01"
              className="bh-input w-full px-4 py-3.5 text-base"
              value={form.land_size}
              onChange={(e) => setForm({ ...form, land_size: e.target.value })}
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-950/40 px-4 py-3 text-sm text-red-300 shadow-[0_0_0_1px_color-mix(in_srgb,#f87171_25%,transparent)]">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading || !publicKey} className="bh-btn-primary w-full py-3.5 text-sm">
            {loading ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-on-surface-variant">
          Already registered?{' '}
          <Link
            href="/dashboard"
            className="font-semibold text-primary-container transition-all duration-300 hover:text-primary hover:underline"
          >
            Dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}
