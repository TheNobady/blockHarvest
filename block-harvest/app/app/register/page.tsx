'use client'
import { useWallet }               from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { useRouter }               from 'next/navigation'
import { useState }                from 'react'
import { SystemProgram }           from '@solana/web3.js'
import { connection, IDL, PROGRAM_ID, getFarmerPDA } from '../../lib/anchor'
import { supabase }                from '../../lib/supabase'
import '@solana/wallet-adapter-react-ui/styles.css'

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
      const provider    = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
      const program     = new Program(IDL, PROGRAM_ID.toString(), provider)
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
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-green-800">Register as farmer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full name</label>
            <input
              className="w-full border rounded-lg px-4 py-2"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Crop type</label>
            <input
              className="w-full border rounded-lg px-4 py-2"
              value={form.crop_type}
              onChange={e => setForm({ ...form, crop_type: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Land size (acres)</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-4 py-2"
              value={form.land_size}
              onChange={e => setForm({ ...form, land_size: e.target.value })}
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !publicKey}
            className="w-full bg-green-700 text-white rounded-lg py-2 font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </main>
  )
}
