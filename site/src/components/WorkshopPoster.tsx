// Faithful HTML/CSS recreation of the workshop poster.
// Used in the landing hero and on the title slide so the design travels
// with the repo — no binary asset required.

export function WorkshopPoster({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-square w-full max-w-[600px] rounded-2xl overflow-hidden shadow-2xl shadow-[#375BD2]/30 ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at center, #0e1226 0%, #06080f 80%)",
      }}
      role="img"
      aria-label="Workshop poster — Building Real-World Blockchain Applications with Chainlink, April 9 2026, Nirma University"
    >
      {/* Ornate floral border — CSS pattern replica */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          padding: 18,
          background:
            "repeating-linear-gradient(45deg, rgba(255,153,0,0.25) 0 8px, rgba(255,102,0,0.18) 8px 16px, rgba(200,30,30,0.18) 16px 24px, rgba(255,153,0,0.25) 24px 32px)",
          WebkitMaskImage:
            "linear-gradient(#000,#000), linear-gradient(#000,#000)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskRepeat: "no-repeat",
        }}
      />

      {/* Inner dark card */}
      <div className="absolute inset-[18px] rounded-xl bg-[#0a0d1a] border border-white/5 overflow-hidden">
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(55,91,210,0.25), transparent 50%)",
          }}
        />

        {/* Top row: Chainlink logo + WORKSHOP pill */}
        <div className="relative flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
              <path
                d="M16 3 L28 10 L28 22 L16 29 L4 22 L4 10 Z"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M16 9 L22 12.5 L22 19.5 L16 23 L10 19.5 L10 12.5 Z"
                fill="#ffffff"
              />
            </svg>
            <span className="text-white text-xl font-semibold tracking-tight">
              Chainlink
            </span>
          </div>
          <div className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-white/80">
            WORKSHOP
          </div>
        </div>

        {/* Divider */}
        <div className="relative mx-6 mt-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Title */}
        <div className="relative px-6 pt-7">
          <h2 className="text-white font-bold leading-[1.04] tracking-tight text-[clamp(1.7rem,4.6vw,3rem)]">
            Building Real-<br />
            World Blockchain<br />
            Applications with<br />
            Chainlink
          </h2>
          <p className="mt-5 font-mono text-[11px] md:text-[12.5px] text-white/70 tracking-[0.04em]">
            APRIL 9, 2026&nbsp;&nbsp;/&nbsp;&nbsp;1:15 PM – 3:00 PM (IST)
          </p>
        </div>

        {/* Divider */}
        <div className="relative mx-6 mt-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Bottom row: Nirma + Sagar */}
        <div className="relative grid grid-cols-2 gap-4 px-6 pt-5 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#f5a623] to-[#d0021b] flex items-center justify-center text-white font-black text-[10px] border-2 border-white/90 shadow">
              NU
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-[13px] leading-tight truncate">
                Nirma University
              </div>
              <div className="text-white/55 text-[10.5px] leading-tight truncate">
                Ahmedabad, Gujarat, India
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#375BD2] to-[#7d97ff] flex items-center justify-center text-white font-black text-[11px] border-2 border-white/90 shadow">
              SJ
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-[13px] leading-tight truncate">
                Sagar Jethi
              </div>
              <div className="text-white/55 text-[10.5px] leading-tight truncate">
                Chainlink Community Advocate
              </div>
              <div className="text-white/70 text-[10.5px] font-semibold leading-tight truncate">
                Founder, Codeminto
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
