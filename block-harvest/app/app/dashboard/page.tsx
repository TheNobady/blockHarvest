'use client'
import { useWallet }     from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
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

export default function Dashboard() {
  const { publicKey, wallet }   = useWallet()
  const [farmer, setFarmer]     = useState<Farmer | null>(null)
  const [chain, setChain]       = useState<ChainData | null>(null)
  const [txSig, setTxSig]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (publicKey && wallet) fetchAll()
  }, [publicKey, wallet])

  const fetchAll = async () => {
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
      const account = await program.account.farmerAccount.fetch(pda) as any

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
  }

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
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!publicKey) return (
      <main className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center space-y-4">
          <p className="text-gray-600">Connect your wallet to continue</p>
          <WalletMultiButton />
        </div>
      </main>
  )

  if (fetching) return (
      <main className="min-h-screen flex items-center justify-center bg-green-50">
        <p className="text-gray-500">Loading...</p>
      </main>
  )

  return (
      <main className="min-h-screen bg-green-50 p-8">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-green-800">BlockHarvest</h1>
            <WalletMultiButton />
          </div>

          {farmer && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-sm text-gray-500 mb-4">Farmer profile</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="font-semibold text-gray-800">{farmer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Crop type</p>
                    <p className="font-semibold text-gray-800">{farmer.crop_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Land size</p>
                    <p className="font-semibold text-gray-800">{farmer.land_size} acres</p>
                  </div>
                </div>
              </div>
          )}

          {chain && (
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-2xl shadow p-6 ${chain.premiumPaid ? 'bg-green-100' : 'bg-white'}`}>
                  <p className="text-xs text-gray-400 mb-1">Premium status</p>
                  {chain.premiumPaid ? (
                      <>
                        <p className="font-bold text-green-700">Paid — 0.1 SOL</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(chain.paymentTimestamp * 1000).toLocaleString()}
                        </p>
                      </>
                  ) : (
                      <p className="font-bold text-gray-500">Not paid</p>
                  )}
                </div>
                <div className="bg-white rounded-2xl shadow p-6">
                  <p className="text-xs text-gray-400 mb-1">Claim status</p>
                  <p className="font-bold text-gray-700">
                    {chain.claimApproved
                        ? '✅ Approved'
                        : chain.claimFiled
                            ? '🕐 Filed — pending review'
                            : 'No active claim'}
                  </p>
                </div>
              </div>
          )}

          {chain && !chain.premiumPaid && (
              <button
                  onClick={payPremium}
                  disabled={loading}
                  className="w-full bg-green-700 text-white rounded-2xl py-4 font-bold text-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Pay Premium — 0.1 SOL'}
              </button>
          )}

          {txSig && (
              <div className="bg-white rounded-2xl shadow p-4 text-sm">
                <p className="text-green-700 font-semibold mb-1">Payment confirmed ✅</p>

                <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 underline break-all"
                >
                View on Solana Explorer →
              </a>
            </div>
            )}

          <p className="text-xs text-gray-400 text-center">
            {publicKey.toString()}
          </p>
        </div>
      </main>
  )
}