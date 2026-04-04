import Image from 'next/image'
import Link from 'next/link'

const links = [
  { href: '#', label: 'Privacy Policy' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Docs' },
  { href: '#', label: 'Status' },
]

export default function SiteFooter() {
  return (
    <footer className="bg-surface-dim">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/BlockHarvest.png" alt="" width={36} height={36} className="h-8 w-auto object-contain" />
            <p className="font-display font-semibold text-on-surface">BlockHarvest</p>
          </div>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
            © {new Date().getFullYear()} BlockHarvest. Secure. Decentralized. Biological.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-sm text-on-surface-variant transition-all duration-300 hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
