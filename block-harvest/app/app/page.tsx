'use client'
import { useWallet }               from '@solana/wallet-adapter-react'
import { WalletMultiButton }       from '@solana/wallet-adapter-react-ui'
import { useEffect, useState }     from 'react'
import { useRouter }               from 'next/navigation'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { connection, IDL, PROGRAM_ID, getFarmerPDA } from '../lib/anchor'
import '@solana/wallet-adapter-react-ui/styles.css'

export default function Home() {
  const { publicKey, wallet }   = useWallet()
  const router                  = useRouter()
  const [checking, setChecking] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!publicKey || !wallet) return
    checkRegistration()
  }, [publicKey])

  const checkRegistration = async () => {
    if (!publicKey || !wallet) return
    setChecking(true)
    try {
      const provider = new AnchorProvider(connection, wallet as any, {})
      const program  = new Program(IDL, PROGRAM_ID, provider)
      const [pda]    = getFarmerPDA(publicKey)
      await program.account.farmerAccount.fetch(pda)
      router.push('/dashboard')
    } catch {
      router.push('/register')
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-green-800">BlockHarvest</h1>
        <p className="text-green-600 text-lg">
          Decentralised crop insurance on Solana
        </p>
        <div className="flex flex-col items-center gap-4">
          {mounted && <WalletMultiButton />}
          {checking && (
            <p className="text-sm text-gray-500">Checking registration...</p>
          )}
        </div>
      </div>
    </main>
  )
}
