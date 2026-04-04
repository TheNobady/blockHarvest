'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onIssuePolicy: () => void
  loading: boolean
  premiumPaid: boolean
}

export default function SecureHarvestModal({
  open,
  onClose,
  onIssuePolicy,
  loading,
  premiumPaid,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="secure-harvest-title"
        className="relative w-full max-w-lg rounded-2xl bg-surface-container-low p-6 bh-ambient sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-on-surface"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="bh-label text-primary-container">Precision protocol</p>
        <h2 id="secure-harvest-title" className="font-display mt-3 text-2xl font-bold tracking-[-0.02em] text-on-surface sm:text-3xl">
          Secure Harvest
        </h2>
        <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
          Configure your parametric insurance policy. Coverage is triggered automatically based on verifiable on-chain
          weather data.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="bh-label mb-2 block">Target region</label>
            <div className="flex cursor-default items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface shadow-[var(--ghost-outline)] transition-shadow duration-300">
              Central Valley, CA
              <span className="text-on-surface-variant">▾</span>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="bh-label mb-2 block">Rainfall threshold (mm)</label>
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface shadow-[var(--ghost-outline)]">
                <span className="text-primary-container" aria-hidden>
                  💧
                </span>
                15.00
              </div>
            </div>
            <div>
              <label className="bh-label mb-2 block">Premium amount (SOL)</label>
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface shadow-[var(--ghost-outline)]">
                <span className="text-primary-container" aria-hidden>
                  ◈
                </span>
                2.5
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-xl bg-surface-container-high p-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              background: `radial-gradient(ellipse 80% 80% at 80% 20%, var(--tertiary), transparent)`,
            }}
            aria-hidden
          />
          <div className="relative space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Estimated coverage</span>
              <span className="font-semibold text-tertiary">450.00 SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Protocol fee (0.5%)</span>
              <span className="text-on-surface">0.0125 SOL</span>
            </div>
            <div className="pt-6">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-on-surface-variant">Total cost</span>
                <span className="font-display text-xl font-bold text-primary-container">2.5125 SOL</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mb-6 mt-6 text-center text-xs text-on-surface-variant">
          Devnet demo: your program charges a fixed <span className="text-on-surface">0.1 SOL</span> premium on-chain.
        </p>

        <button type="button" onClick={onIssuePolicy} disabled={loading || premiumPaid} className="bh-btn-primary w-full py-3.5 text-sm">
          {premiumPaid ? 'Premium already paid' : loading ? 'Processing…' : 'Issue insurance policy'}
        </button>

        <p className="bh-label mt-6 flex items-center justify-center gap-2 text-on-surface-variant">
          <span aria-hidden>🛡</span>
          <span className="normal-case tracking-normal">Secured by Solana smart contract</span>
        </p>
      </div>
    </div>
  )
}
