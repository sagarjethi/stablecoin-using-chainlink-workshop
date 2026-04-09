import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = "https://chainlink-stablecoin-workshop.vercel.app";
const SITE_TITLE =
  "Building Real-World Blockchain Applications with Chainlink · Nirma University · April 9, 2026";
const SITE_DESCRIPTION =
  "Hands-on workshop by Sagar Jethi on building a Chainlink-powered stablecoin: Price Feeds, Proof of Reserve, and CCIP. Nirma University, April 9 2026.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Chainlink Stablecoin Workshop",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Chainlink",
    "Stablecoin",
    "DeFi",
    "Price Feeds",
    "CCIP",
    "Proof of Reserve",
    "Foundry",
    "Solidity",
    "Nirma University",
    "Sagar Jethi",
  ],
  authors: [{ name: "Sagar Jethi", url: "https://github.com/sagarjethi" }],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Chainlink Stablecoin Workshop",
    images: [
      {
        url: "/workshop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "Building Real-World Blockchain Applications with Chainlink",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/workshop-poster.jpg"],
    creator: "@sagarjethi",
  },
  robots: { index: true, follow: true },
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
