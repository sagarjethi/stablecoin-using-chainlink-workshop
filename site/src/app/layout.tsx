import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Building Real-World Blockchain Applications with Chainlink · Nirma University · April 9, 2026",
  description:
    "Hands-on workshop on building a Chainlink-powered stablecoin: price feeds, Proof of Reserve, and CCIP.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#0a0b14] text-[#e6e9f2]">
        <Nav />
        {children}
      </body>
    </html>
  );
}
