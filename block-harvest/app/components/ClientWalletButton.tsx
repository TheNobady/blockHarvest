'use client'

import dynamic from 'next/dynamic'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div
        className="inline-flex h-10 min-w-[152px] items-center justify-center rounded-xl opacity-50"
        style={{
          background: 'linear-gradient(135deg, var(--primary-container), var(--primary))',
        }}
        aria-hidden
      />
    ),
  }
)

/**
 * WalletMultiButton depends on browser-only state; load only on the client to avoid hydration mismatches.
 */
export default function ClientWalletButton() {
  return <WalletMultiButton />
}
