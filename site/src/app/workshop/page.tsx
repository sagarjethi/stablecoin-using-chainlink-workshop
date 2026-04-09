import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { sections, type WorkshopSection } from "@/content/workshop";

const PRACTICAL_DIR = "/Users/sagarjethi/project/product2026/chainlink/practical";

function tryRead(relPath: string): string | null {
  try {
    return fs.readFileSync(path.join(PRACTICAL_DIR, relPath), "utf8");
  } catch {
    return null;
  }
}

function fileOverridesFor(id: string): { filename: string; language: string } | null {
  switch (id) {
    case "step1":
      return { filename: "src/PriceFeedLib.sol", language: "solidity" };
    case "step2":
      return { filename: "src/StableCoin.sol", language: "solidity" };
    case "step3":
      return { filename: "test/StableCoin.t.sol", language: "solidity" };
    case "step5":
      return { filename: "src/CCIPBridge.sol", language: "solidity" };
    default:
      return null;
  }
}

export default function WorkshopPage() {
  // Read the real Solidity files at build/request time and override the stub snippets.
  const enriched: WorkshopSection[] = sections.map((s) => {
    const o = fileOverridesFor(s.id);
    if (!o) return s;
    const content = tryRead(o.filename);
    if (!content) return s;
    return { ...s, code: { filename: o.filename, language: o.language, content } };
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="text-xs uppercase tracking-widest text-[#7d97ff] font-semibold">
            Workshop guide
          </div>
          <h2 className="mt-1 text-xl font-bold">Contents</h2>
          <nav className="mt-5 flex flex-col gap-1 text-sm">
            {enriched.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span className="font-mono text-xs text-[#7d97ff]">{s.number}</span>
                <span>{s.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          <div className="mb-10">
            <div className="text-xs uppercase tracking-widest text-[#7d97ff] font-semibold">
              Hands-on · April 9, 2026
            </div>
            <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight gradient-text">
              Building a Chainlink-Powered Stablecoin
            </h1>
            <p className="mt-4 max-w-2xl text-white/60">
              A complete, reproducible build log. Follow each step, run the verification
              checks, then move on. The code blocks below are read straight from the
              workshop repo.
            </p>
          </div>

          <div className="flex flex-col gap-16">
            {enriched.map((s) => (
              <Section key={s.id} section={s} />
            ))}
          </div>

          <div className="mt-20 border-t border-white/5 pt-8 text-sm text-white/50">
            <Link href="/" className="hover:text-white">
              ← Back to home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ section }: { section: WorkshopSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="flex items-center gap-3">
        {section.number && (
          <span className="font-mono text-sm text-[#7d97ff]">{section.number}</span>
        )}
        <h2 className="text-2xl md:text-3xl font-bold text-white">{section.title}</h2>
      </div>

      <div className="mt-5 flex flex-col gap-4 text-white/75 leading-relaxed max-w-3xl">
        {section.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {section.code && (
        <div className="mt-6">
          {section.code.filename && (
            <div className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {section.code.filename}
            </div>
          )}
          <pre className="code" style={{ borderTopLeftRadius: section.code.filename ? 0 : undefined }}>
            <code>{section.code.content}</code>
          </pre>
        </div>
      )}

      {section.links && section.links.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2">
          {section.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-[#7d97ff] hover:text-white underline underline-offset-4"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {section.verify && section.verify.length > 0 && (
        <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            ✅ What to verify
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {section.verify.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400">›</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
