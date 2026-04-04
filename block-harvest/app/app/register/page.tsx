'use client'
import { useWallet }   from '@solana/wallet-adapter-react'
import { useRouter }   from 'next/navigation'
import { useState }    from 'react'
import { SystemProgram } from '@solana/web3.js'
import { getProgram, getFarmerPDA } from '../../lib/anchor'
import { supabase }    from '../../lib/supabase'
import '@solana/wallet-adapter-react-ui/styles.css'

const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50'

export default function Register() {
  const { publicKey, wallet } = useWallet()
  const router                = useRouter()
  const [form, setForm]       = useState({ name: '', crop_type: '', land_size: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !wallet) { setError('Connect your wallet first'); return }
    setLoading(true)
    setError('')
    try {
      const program     = getProgram(wallet)
      const [farmerPDA] = getFarmerPDA(publicKey)

      await program.methods
          .registerFarmer()
          .accounts({
            farmerAccount: farmerPDA,
            farmer:        publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

      const { error: dbError } = await supabase
          .from('farmers')
          .insert({
            wallet_address: publicKey.toString(),
            name:           form.name,
            crop_type:      form.crop_type,
            land_size:      parseFloat(form.land_size),
          })

      if (dbError) throw new Error(dbError.message)
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  return (
      <main className="relative min-h-screen">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(52,211,153,0.09),transparent)]"
          aria-hidden
        />
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Onboarding</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Register as farmer</h2>
              <p className="mt-2 text-sm text-zinc-500">Create your on-chain account and save your profile.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm text-zinc-400">Full name</label>
                <input
                    id="name"
                    className={inputClass}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="crop" className="mb-1.5 block text-sm text-zinc-400">Crop type</label>
                <input
                    id="crop"
                    className={inputClass}
                    value={form.crop_type}
                    onChange={e => setForm({ ...form, crop_type: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="land" className="mb-1.5 block text-sm text-zinc-400">Land size (acres)</label>
                <input
                    id="land"
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={form.land_size}
                    onChange={e => setForm({ ...form, land_size: e.target.value })}
                />
              </div>
              {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
              )}
              <button
                  type="submit"
                  disabled={loading || !publicKey}
                  className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Registering…' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </main>
  )
}
