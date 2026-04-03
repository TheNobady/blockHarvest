'use client'
import { useWallet }               from '@solana/wallet-adapter-react'
import { WalletMultiButton }       from '@solana/wallet-adapter-react-ui'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { useEffect, useState }     from 'react'
import { connection, IDL, PROGRAM_ID, getFarmerPDA, getVaultPDA } from '../../lib/anchor'
import { supabase, Farmer }        from '../../lib/supabase'
import { SystemProgram }           from '@solana/web3.js'

type ChainData = {
  premiumPaid:      boolean
  premiumAmount:    number
  paymentTimestamp: number
  claimFiled:       boolean
  claimApproved:    boolean
}

export default function Dashboard() {
  const { publicKey, wallet }        = useWallet()
  const [farmer, setFarmer]          = useState<Farmer | null>(null)
  const [chain, setChain]            = useState<ChainData | null>(null)
  const [txSig, setTxSig]            = useState('')
  const [loading, setLoading]        = useState(false)
  const [fetching, setFetching]      = useState(true)

  useEffect(() => {
    if (publicKey && wallet) fetchAll()
  }, [publicKey])

  const fetchAll = async () => {
    if (!publicKey || !wallet) return
    setFetching(true)
    try {
      // Fetch profile from Supabase
      const { data } = await supabase
        .from('farmers')
        .select('*')
        .eq('wallet_address', publicKey.toString())
        .single()
      setFarmer(data)

      // Fetch payment status from chain
      const provider = new AnchorProvider(connection, wallet as any, {})
      const program  = new Program(IDL, PROGRAM_ID, provider)
      const [pda]    = getFarmerPDA(publicKey)
      const account  = await program.account.farmerAccount.fetch(pda) as any
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
      const provider    = new AnchorProvider(connection, wallet as any, {})
      const program     = new Program(IDL, PROGRAM_ID, provider)
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
      await fetchAll() // refresh UI
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

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-800">BlockHarvest</h1>
          <WalletMultiButton />
        </div>

        {/* Farmer profile from Supabase */}
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

        {/* Chain status */}
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
                  ? 'Approved'
                  : chain.claimFiled
                  ? 'Filed — pending'
                  : 'No active claim'}
              </p>
            </div>
          </div>
        )}

        {/* Pay premium button */}
        {chain && !chain.premiumPaid && (
          <button
            onClick={payPremium}
            disabled={loading}
            className="w-full bg-green-700 text-white rounded-2xl py-4 font-bold text-lg hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Pay Premium — 0.1 SOL'}
          </button>
        )}

        {/* TX confirmation */}
        {txSig && (
          <div className="bg-white rounded-2xl shadow p-4 text-sm">
            <p className="text-green-700 font-semibold mb-1">Payment confirmed</p>
            
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              className="text-blue-500 underline break-all"
            >
              View on Solana Explorer →
            </a>
          </div>
        )}

        {/* Wallet address */}
        <p className="text-xs text-gray-400 text-center">
          {publicKey.toString()}
        </p>
      </div>
    </main>
  )
}
