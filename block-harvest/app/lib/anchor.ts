import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Program, AnchorProvider, Idl }         from '@coral-xyz/anchor'

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

// ── The single source of truth for creating a provider ───────────────
export function getProvider(wallet: any) {
  const adapter = wallet?.adapter ?? wallet

  const signerWallet = {
    publicKey:           adapter.publicKey,
    signTransaction:     adapter.signTransaction.bind(adapter),
    signAllTransactions: adapter.signAllTransactions.bind(adapter),
  }

  return new AnchorProvider(connection, signerWallet, { commitment: 'confirmed' })
}

export function getProgram(wallet: any) {
  return new Program(IDL, PROGRAM_ID.toString(), getProvider(wallet))
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