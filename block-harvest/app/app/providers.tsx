'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork, WalletReadyState, type WalletError } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

/** App-specific key so a bad legacy `walletName` entry does not trap users in a broken "Connect" state. */
const WALLET_STORAGE_KEY = 'blockharvest-solana-wallet'

/**
 * If localStorage remembers a wallet but the adapter never reaches Installed/Loadable (extension missing,
 * slow inject, or API change), the UI stays on "Connect" and throws WalletNotReadyError without clearing
 * selection. After a short grace period, drop the selection so "Select Wallet" works again.
 */
function StaleWalletSelectionReset({ children }: { children: ReactNode }) {
    const { wallet, connected, select } = useWallet()

    useEffect(() => {
        if (connected) return
        if (!wallet) return

        const rs = wallet.readyState
        if (rs === WalletReadyState.Unsupported) {
            select(null)
            return
        }
        if (rs === WalletReadyState.Installed || rs === WalletReadyState.Loadable) return

        if (rs === WalletReadyState.NotDetected) {
            const id = window.setTimeout(() => select(null), 2800)
            return () => window.clearTimeout(id)
        }
    }, [wallet, connected, select])

    return <>{children}</>
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const network = WalletAdapterNetwork.Devnet
    const endpoint = useMemo(() => {
        const fromEnv = process.env.NEXT_PUBLIC_RPC_URL?.trim()
        if (fromEnv) return fromEnv
        return clusterApiUrl(network)
    }, [network])

    const wallets = useMemo(
        () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
        []
    )

    const onWalletError = useMemo(
        () => (error: WalletError) => {
            console.error('[BlockHarvest wallet]', error.message, error)
        },
        []
    )

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider
                wallets={wallets}
                autoConnect
                localStorageKey={WALLET_STORAGE_KEY}
                onError={onWalletError}
            >
                <WalletModalProvider>
                    <StaleWalletSelectionReset>{children}</StaleWalletSelectionReset>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}