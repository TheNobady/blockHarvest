'use client'
import { useWallet }               from '@solana/wallet-adapter-react'
import { WalletMultiButton }       from '@solana/wallet-adapter-react-ui'
import { useCallback, useEffect, useState } from 'react'
import { useRouter }               from 'next/navigation'
import { Program } from '@coral-xyz/anchor'
import { IDL, PROGRAM_ID, getFarmerPDA, getProvider } from '../lib/anchor'
import '@solana/wallet-adapter-react-ui/styles.css'

export default function Home() {
  const { publicKey, wallet }   = useWallet()
  const router                  = useRouter()
  const [checking, setChecking] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const checkRegistration = useCallback(async () => {
    if (!publicKey || !wallet) return
    setChecking(true)
    try {
      const provider = getProvider(wallet)
      const program  = new Program(IDL, PROGRAM_ID, provider)
      const [pda]    = getFarmerPDA(publicKey)
      await program.account.farmerAccount.fetch(pda)
      router.push('/dashboard')
    } catch {
      router.push('/register')
    } finally {
      setChecking(false)
    }
  }, [publicKey, wallet, router])

  useEffect(() => {
    if (!publicKey || !wallet) return
    void checkRegistration()
  }, [publicKey, wallet, checkRegistration])

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(52,211,153,0.12),transparent_55%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]" aria-hidden />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Solana · Devnet
          </p>
          <h1 className="text-balance bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
            BlockHarvest
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-zinc-400">
            Decentralised crop insurance. Connect your wallet to register or open your dashboard.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            {mounted && <WalletMultiButton />}
            {checking && (
              <p className="text-sm text-zinc-500">Checking registration…</p>
            )}
          </div>
          <p className="text-center text-xs leading-relaxed text-zinc-600">
            By connecting you agree to interact with the program on devnet only.
          </p>
        </div>
      </div>
    </main>
  )
}
