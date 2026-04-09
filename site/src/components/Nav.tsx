import Link from "next/link";
import { Link2 } from "lucide-react";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0b14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#375BD2] group-hover:bg-[#4f74ec] transition-colors">
            <Link2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Chainlink Workshop</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/slides">Slides</NavLink>
          <NavLink href="/workshop">Workshop</NavLink>
          <a
            href="#"
            className="ml-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-[#4f74ec]/60 hover:text-white transition"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  );
}
