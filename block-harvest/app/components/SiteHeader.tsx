'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ClientWalletButton from './ClientWalletButton'

const nav = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
]

export default function SiteHeader() {
  const pathname = usePathname()

  const linkClass = (href: string) => {
    const active =
      href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(href + '/')
    return `relative pb-1 text-sm font-medium transition-all duration-300 ${
      active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
    }`
  }

  return (
    <header className="sticky top-0 z-50 bh-glass bh-ambient">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight text-on-surface"
          >
            <Image
              src="/BlockHarvest.png"
              alt=""
              width={40}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
            <span>BlockHarvest</span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {nav.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                {label}
                {(href === '/'
                  ? pathname === '/'
                  : pathname === href || pathname.startsWith(href + '/')) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-primary-container to-primary" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bh-label text-on-surface-variant">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-container opacity-35" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-container" />
              </span>
              <span className="hidden sm:inline normal-case tracking-normal">Devnet</span>
            </div>
            <ClientWalletButton />
          </div>
        </div>

        <nav className="mt-6 flex justify-center gap-8 pt-6 md:hidden bg-surface-container-low/40 -mx-4 px-4 rounded-xl">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
