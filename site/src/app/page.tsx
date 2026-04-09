import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Presentation, BookOpen, Shield, Cable, LineChart } from "lucide-react";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 glow-bg pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-20 relative grid lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
         <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live workshop · April 9, 2026 · 1:15 PM – 3:00 PM IST · Nirma University, Ahmedabad
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl font-bold tracking-tight gradient-text leading-[1.05]">
            Building Real-World Blockchain Applications with Chainlink
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/65 leading-relaxed">
            A hands-on workshop on shipping a reserve-backed, oracle-priced, Proof-of-Reserve-gated
            stablecoin in Solidity — and bridging it cross-chain with CCIP. Foundry, real Sepolia
            feeds, no shortcuts.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/slides"
              className="inline-flex items-center gap-2 rounded-xl bg-[#375BD2] hover:bg-[#4f74ec] px-5 py-3 text-sm font-semibold text-white transition shadow-lg shadow-[#375BD2]/30"
            >
              <Presentation className="h-4 w-4" />
              Open the slides
            </Link>
            <Link
              href="/workshop"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-semibold text-white transition"
            >
              <BookOpen className="h-4 w-4" />
              Workshop guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-8 text-sm text-white/55">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#375BD2] to-[#4f74ec] flex items-center justify-center text-white font-bold">SJ</div>
              <div>
                <div className="text-white/90 font-semibold">Sagar Jethi</div>
                <div>Chainlink Community Advocate · Founder, Codeminto</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white/80">NU</div>
              <div>
                <div className="text-white/90 font-semibold">Nirma University</div>
                <div>Ahmedabad, Gujarat, India</div>
              </div>
            </div>
          </div>
         </div>
         <div className="hidden lg:block relative">
           <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#375BD2]/20">
             <Image
               src="/workshop-poster.jpg"
               alt="Workshop poster — Building Real-World Blockchain Applications with Chainlink"
               width={600}
               height={600}
               className="w-full h-auto"
               priority
             />
           </div>
         </div>
        </div>
      </section>

      {/* Two big cards */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/slides" className="card p-8 group transition">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#375BD2]/15 border border-[#375BD2]/30">
                <Presentation className="h-5 w-5 text-[#7d97ff]" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold">Slides</h3>
            <p className="mt-2 text-white/60">
              The 11-deck briefing — what stablecoins are, the design space, and where Chainlink
              Price Feeds, Proof of Reserve, and CCIP fit in.
            </p>
            <div className="mt-6 flex gap-2 text-xs">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Reveal.js</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Press <span className="kbd">F</span> for fullscreen</span>
            </div>
          </Link>

          <Link href="/workshop" className="card p-8 group transition">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                <BookOpen className="h-5 w-5 text-emerald-300" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold">Workshop guide</h3>
            <p className="mt-2 text-white/60">
              Step-by-step build: safe price reader → reserve-backed mint/redeem → tests → Sepolia
              deploy → CCIP bridge. With every &ldquo;what to verify&rdquo; check.
            </p>
            <div className="mt-6 flex gap-2 text-xs">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Foundry</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Solidity 0.8.24</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">CCIP</span>
            </div>
          </Link>
        </div>
      </section>

      {/* About Chainlink */}
      <section className="border-t border-white/5 bg-black/20">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs uppercase tracking-widest text-[#7d97ff] font-semibold">
            About Chainlink
          </div>
          <h2 className="mt-2 text-3xl font-bold">The standard for verifiable data and cross-chain compute</h2>
          <p className="mt-4 max-w-3xl text-white/60">
            Chainlink is the most-used oracle network in the world, securing tens of trillions in
            transaction value. The three primitives we use today:
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Feature icon={<LineChart className="h-5 w-5" />} title="Price Feeds">
              Decentralized, tamper-proof market data. Sepolia ETH/USD updates every block within
              its heartbeat — your contract just calls latestRoundData and trusts the math.
            </Feature>
            <Feature icon={<Shield className="h-5 w-5" />} title="Proof of Reserve">
              On-chain attestations of off-chain (or cross-chain) collateral. Mint gates that prove
              the dollars actually exist before any tokens are issued.
            </Feature>
            <Feature icon={<Cable className="h-5 w-5" />} title="CCIP">
              Cross-Chain Interoperability Protocol — secure burn-and-mint and lock-and-mint
              messaging across 20+ EVM and non-EVM chains.
            </Feature>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-white/40">
          Chainlink Workshop · Nirma University · April 9, 2026 · 1:15–3:00 PM IST · Sagar Jethi (Codeminto)
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#375BD2]/15 border border-[#375BD2]/30 text-[#7d97ff]">
        {icon}
      </div>
      <div className="mt-4 text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm text-white/60 leading-relaxed">{children}</p>
    </div>
  );
}
