import Image from 'next/image'
import Link from 'next/link'

/** Hero visual from Stitch export (farmland HUD). */
const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAxF4tfkVRZwNfvcZdUqIBf2Twb-jn5g8a9QTmNn_-LOw8se1NgaQEi-YmdMD5DNVBeerAJAyL1VSBfstNSGydwU4qx6jIIwZbem28shtS98IVDcAd7ufz7_BSB8CgI2KRy2OWjrRbDKnMHRvow-mK3dxS0g5gbUoTZwK1YxACDJbEH1dEtAAF3m5iQ2R9NDRIFFMsVpzIflU4QkPk9LZXv_mYrvPG31d_dM77pkZHqEjUR467DcvKD4gSLRBNioupgxaeiA0vAKoE'

function MsIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ''}`} aria-hidden>
      {name}
    </span>
  )
}

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
            <div className="z-10 flex-1 lg:pr-4">
              <h1 className="font-display text-balance text-5xl font-extrabold leading-[1.1] tracking-tighter text-on-surface md:text-6xl lg:text-7xl">
                Insurance that{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-primary-fixed bg-clip-text text-transparent">
                  pays itself
                </span>
                .
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-on-surface-variant md:text-xl md:leading-relaxed">
                Decentralized crop insurance powered by rainfall data and blockchain automation. Protecting the future of
                farming with precision.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="bh-btn-primary inline-flex scale-100 items-center justify-center rounded-xl px-10 py-4 text-lg active:scale-95"
                >
                  Get insured
                </Link>
                <a
                  href="#mechanism"
                  className="bh-btn-secondary inline-flex scale-100 items-center justify-center rounded-xl px-10 py-4 text-lg active:scale-95"
                >
                  Learn more
                </a>
              </div>
            </div>

            <div className="relative flex w-full max-w-lg flex-1 justify-center lg:max-w-none">
              <div
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/20 to-purple-500/10 blur-[120px]"
                aria-hidden
              />
              <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-[2rem] p-1 bh-glass bh-ambient lg:max-w-none">
                <div className="relative h-full w-full overflow-hidden rounded-[1.9rem]">
                  <Image
                    src={HERO_IMAGE}
                    alt="Abstract minimal illustration of futuristic geometric farmland with rain and blockchain nodes"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-6 bottom-6 rounded-xl border border-outline-variant/10 p-6 bh-glass bh-ambient">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="bh-label text-primary-container">Network status</span>
                      <span className="font-mono text-xs opacity-50">#82910</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-lowest">
                      <div className="h-full w-2/3 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 pb-24 sm:px-6 sm:pb-32 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-xl bg-surface-container-low p-8 transition-all duration-300 bh-ambient hover:bg-surface-container-high">
            <div className="pointer-events-none absolute -right-4 -top-4 text-primary/5 transition-colors group-hover:text-primary/10">
              <MsIcon name="auto_mode" className="!text-9xl" />
            </div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MsIcon name="bolt" className="!text-2xl" />
            </div>
            <h3 className="font-display text-2xl font-bold text-on-surface">Auto payouts</h3>
            <p className="mt-3 leading-relaxed text-on-surface-variant">
              No paperwork. When rainfall sensors detect drought, your claim is processed and paid instantly.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-surface-container-low p-8 transition-all duration-300 bh-ambient hover:bg-surface-container-high">
            <div className="pointer-events-none absolute -right-4 -top-4 text-tertiary/5 transition-colors group-hover:text-tertiary/10">
              <MsIcon name="visibility" className="!text-9xl" />
            </div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
              <MsIcon name="visibility" className="!text-2xl" />
            </div>
            <h3 className="font-display text-2xl font-bold text-on-surface">Transparent transactions</h3>
            <p className="mt-3 leading-relaxed text-on-surface-variant">
              Every policy and payout is recorded on-chain. Real-time auditability for every single farmer.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-surface-container-low p-8 transition-all duration-300 bh-ambient hover:bg-surface-container-high">
            <div className="pointer-events-none absolute -right-4 -top-4 text-secondary/5 transition-colors group-hover:text-secondary/10">
              <MsIcon name="security" className="!text-9xl" />
            </div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <MsIcon name="shield" className="!text-2xl" />
            </div>
            <h3 className="font-display text-2xl font-bold text-on-surface">Secure on blockchain</h3>
            <p className="mt-3 leading-relaxed text-on-surface-variant">
              Built on decentralized infrastructure. No central point of failure, ensuring your funds are always safe.
            </p>
          </div>
        </div>
      </section>

      <section id="mechanism" className="px-4 pb-24 sm:px-6 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative flex flex-col items-center gap-12 overflow-hidden rounded-2xl bg-surface-container-low p-10 bh-ambient md:flex-row md:gap-12 md:p-12">
            <div className="flex-1">
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.2em] text-primary">The mechanism</span>
              <h2 className="font-display text-4xl font-extrabold text-on-surface">Rainfall-triggered resilience</h2>
              <p className="mt-6 text-lg leading-relaxed text-on-surface-variant">
                Our smart contracts connect directly to global meteorological nodes. If rainfall drops below the historic
                average for your region, the insurance pool triggers a decentralized distribution.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-outline-variant/10 p-4 bh-glass">
                  <div className="font-display text-2xl font-black text-primary">99.9%</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-tighter text-on-surface/60">Uptime</div>
                </div>
                <div className="rounded-xl border border-outline-variant/10 p-4 bh-glass">
                  <div className="font-display text-2xl font-black text-tertiary">0.5s</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-tighter text-on-surface/60">Settle time</div>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-1 justify-center">
              <div className="relative flex aspect-square w-full max-w-md items-center justify-center rounded-full border-[20px] border-surface-container-high/30">
                <div className="pointer-events-none absolute inset-0 animate-pulse rounded-full bg-tertiary/10 blur-[60px]" aria-hidden />
                <div className="relative z-10 text-center">
                  <MsIcon name="cloudy_snowing" className="!mb-2 !text-7xl text-primary" />
                  <div className="font-display text-3xl font-black text-on-surface">12.4mm</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.3em] opacity-50">Local precipitation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
