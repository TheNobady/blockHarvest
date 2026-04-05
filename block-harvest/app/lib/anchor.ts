import { Connection, PublicKey, SystemProgram, clusterApiUrl } from '@solana/web3.js'
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import type { Wallet as ProviderWallet } from '@coral-xyz/anchor/dist/cjs/provider.js'

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!)

export const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl('devnet'),
    'confirmed'
)

export const IDL = {
  version: '0.1.0',
  name:    'block_harvest',
  instructions: [
    {
      name: 'initializeVault',
      accounts: [
        { name: 'vault',         isMut: true,  isSigner: false },
        { name: 'payer',         isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'registerFarmer',
      accounts: [
        { name: 'farmerAccount', isMut: true,  isSigner: false },
        { name: 'farmer',        isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'payPremium',
      accounts: [
        { name: 'farmerAccount', isMut: true,  isSigner: false },
        { name: 'farmer',        isMut: true,  isSigner: true  },
        { name: 'vault',         isMut: true,  isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'fileClaim',
      accounts: [
        { name: 'farmerAccount', isMut: true,  isSigner: false },
        { name: 'farmerWallet',  isMut: false, isSigner: false },
        { name: 'admin',         isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'approveClaim',
      accounts: [
        { name: 'farmerAccount', isMut: true,  isSigner: false },
        { name: 'farmerWallet',  isMut: true,  isSigner: false },
        { name: 'vault',         isMut: true,  isSigner: false },
        { name: 'admin',         isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'ProgramVault',
      type: {
        kind:   'struct',
        fields: [{ name: 'bump', type: 'u8' }],
      },
    },
    {
      name: 'FarmerAccount',
      type: {
        kind:   'struct',
        fields: [
          { name: 'farmer',           type: 'publicKey' },
          { name: 'premiumPaid',      type: 'bool'      },
          { name: 'premiumAmount',    type: 'u64'       },
          { name: 'paymentTimestamp', type: 'i64'       },
          { name: 'claimFiled',       type: 'bool'      },
          { name: 'claimApproved',    type: 'bool'      },
          { name: 'bump',             type: 'u8'        },
        ],
      },
    },
  ],
  errors: [],
} as Idl

type AdapterLike = {
  publicKey: PublicKey | null
  signTransaction: ProviderWallet['signTransaction']
  signAllTransactions: ProviderWallet['signAllTransactions']
}

function toAdapter(wallet: unknown): AdapterLike {
  if (wallet == null) throw new Error('Wallet required')
  const raw =
    typeof wallet === 'object' &&
    wallet !== null &&
    'adapter' in wallet &&
    (wallet as { adapter: unknown }).adapter != null
      ? (wallet as { adapter: AdapterLike }).adapter
      : (wallet as AdapterLike)
  if (raw?.publicKey == null) throw new Error('Wallet not connected')
  return raw
}

// ── The single source of truth for creating a provider ───────────────
export function getProvider(wallet: unknown, connectionOverride?: Connection) {
  const adapter = toAdapter(wallet)
  const publicKey = adapter.publicKey
  if (!publicKey) throw new Error('Wallet not connected')
  const signerWallet: ProviderWallet = {
    publicKey,
    signTransaction: adapter.signTransaction.bind(adapter),
    signAllTransactions: adapter.signAllTransactions.bind(adapter),
  }

  const conn = connectionOverride ?? connection
  return new AnchorProvider(conn, signerWallet, { commitment: 'confirmed' })
}

export function getProgram(wallet: unknown, connectionOverride?: Connection) {
  return new Program(IDL, PROGRAM_ID.toString(), getProvider(wallet, connectionOverride))
}

/** Creates the vault PDA on first use (one-time per deployment). Requires upgraded program + redeploy. */
export async function ensureProgramVaultInitialized(
  program: Program<typeof IDL>,
  payerPubkey: PublicKey
): Promise<void> {
  const [vaultPDA] = getVaultPDA()
  try {
    await program.account.programVault.fetch(vaultPDA)
  } catch {
    await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPDA,
        payer: payerPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }
}

export function getFarmerPDA(walletPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
      [Buffer.from('farmer'), walletPubkey.toBuffer()],
      PROGRAM_ID
  )
}

export function getVaultPDA() {
  return PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      PROGRAM_ID
  )
}