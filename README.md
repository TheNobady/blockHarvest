# BlockHarvest

A decentralised crop insurance platform built on the Solana blockchain. Farmers can register, pay premiums, and file claims — with all payments recorded immutably on-chain and farmer profiles stored in Supabase.

---

## What it does

- Farmers connect their Phantom wallet and register with their name, crop type, and land size
- Premium payments (0.1 SOL) are transferred on-chain to a program vault and recorded immutably
- Claims are filed and approved by an admin wallet, releasing SOL back to the farmer
- Every transaction is publicly verifiable on Solana Explorer
- Farmer profile data is stored in Supabase for fast, flexible display

---

## Tech stack

| Layer | Technology |
|---|---|
| Smart contract | Rust, Anchor 0.29.0 |
| Blockchain | Solana Devnet |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Wallet | Phantom via Solana Wallet Adapter |
| Database | Supabase (PostgreSQL) |
| JS client | @coral-xyz/anchor 0.29.0, @solana/web3.js |

---

## Project structure

```
blockHarvest/
└── block-harvest/
    ├── programs/
    │   └── block-harvest/
    │       └── src/
    │           └── lib.rs          # Anchor smart contract
    ├── app/                        # Next.js frontend
    │   ├── app/
    │   │   ├── layout.tsx          # Root layout
    │   │   ├── providers.tsx       # Wallet provider wrapper
    │   │   ├── page.tsx            # Landing + wallet connect
    │   │   ├── register/
    │   │   │   └── page.tsx        # Farmer registration form
    │   │   └── dashboard/
    │   │       └── page.tsx        # Farmer dashboard + pay premium
    │   └── lib/
    │       ├── anchor.ts           # Anchor client + PDA helpers
    │       └── supabase.ts         # Supabase client + types
    ├── Anchor.toml                 # Anchor config
    └── Cargo.toml                  # Rust workspace
```

---

## Smart contract

**Program ID:** `C54J4haBjNNGYfV8ZENqvDRzvhX5ReeJPjyCVnySbdXj`  
**Network:** Solana Devnet  
**Framework:** Anchor 0.29.0

### Instructions

| Instruction | Who can call | What it does |
|---|---|---|
| `register_farmer` | Any wallet | Creates a PDA account tied to the farmer's wallet |
| `pay_premium` | Registered farmer | Transfers 0.1 SOL to vault, marks `premium_paid = true` |
| `file_claim` | Admin only | Marks `claim_filed = true` on farmer's account |
| `approve_claim` | Admin only | Releases SOL from vault back to farmer's wallet |

### On-chain data (FarmerAccount PDA)

```
farmer            Pubkey    wallet address
premium_paid      bool      whether premium has been paid
premium_amount    u64       amount paid in lamports
payment_timestamp i64       unix timestamp of payment
claim_filed       bool      whether a claim has been filed
claim_approved    bool      whether the claim was approved
bump              u8        PDA bump seed
```

### PDA derivation

```
Farmer PDA  →  seeds: ["farmer", wallet_address]
Vault PDA   →  seeds: ["vault"]
```

---

## Local setup

### Prerequisites

- Rust 1.85+
- Solana CLI 3.x
- Node.js 20+
- Anchor CLI 0.29.0
- Phantom browser extension

### 1. Clone and install

```bash
git clone https://github.com/yourname/block-harvest.git
cd block-harvest
```

### 2. Set up Rust toolchain

```bash
rustup default stable
rustup update
```

### 3. Configure Solana for Devnet

```bash
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
# Get free SOL at https://faucet.solana.com
```

### 4. Build the smart contract

```bash
anchor build
```

### 5. Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### 6. Set up the frontend

```bash
cd app
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PROGRAM_ID=C54J4haBjNNGYfV8ZENqvDRzvhX5ReeJPjyCVnySbdXj
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### 7. Set up Supabase

Run this in the Supabase SQL editor:

```sql
create table farmers (
  wallet_address text primary key,
  name           text not null,
  crop_type      text not null,
  land_size      numeric not null,
  created_at     timestamp with time zone default now()
);

alter table farmers disable row level security;
```

### 8. Run the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## User flow

```
1. Open app → connect Phantom wallet
2. First time? → redirected to /register
3. Fill in name, crop type, land size → submit
   - Creates on-chain PDA account
   - Saves profile to Supabase
4. Redirected to /dashboard
   - Profile loaded from Supabase
   - Payment status loaded from chain
5. Click "Pay Premium — 0.1 SOL"
   - Phantom prompts for approval
   - 0.1 SOL transferred to vault PDA
   - premium_paid = true stored on-chain
   - Transaction link shown (Solana Explorer)
6. Admin can file and approve claims
   - SOL released back to farmer wallet
```

---

## Verifying payments on-chain

Every premium payment produces a transaction signature. Paste it into:

```
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

You will see:
- The program that was called (`block_harvest`)
- The instruction (`pay_premium`)
- SOL transferred from farmer wallet to vault
- `premium_paid = true` written to the farmer's PDA account

This is the tamper-proof payment record — no database, no admin, no server can alter it.

---

## Known setup notes

- Anchor 0.29.0 is required for Rust and the JS client — do not mix versions
- The Solana platform tools ship their own Cargo; if you see edition2024 errors, delete `~/.cache/solana/` and let it re-download
- The `pubkey!()` macro is not available in Anchor 0.29.0 — admin is compared using `.to_string()`
- Wallet adapter components require a `mounted` guard in Next.js to avoid hydration errors

---

## Acknowledgements

Built as a college showcase project to demonstrate real-world use of the Solana blockchain for agricultural insurance use cases.
