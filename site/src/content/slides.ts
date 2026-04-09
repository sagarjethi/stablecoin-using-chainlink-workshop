export type Slide = {
  id: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  columns?: { title: string; body: string }[];
  image?: { src: string; alt: string; width?: number };
  mermaid?: string;
  code?: { language: string; content: string; caption?: string };
  cta?: { label: string; href: string };
  footer?: string;
  quote?: string;
};

const PRICE_FEED_SNIPPET = `// Safe Chainlink read — never call latestRoundData() raw.
function getPrice(AggregatorV3Interface feed, uint256 heartbeat)
    internal view returns (uint256 price1e18)
{
    (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound)
        = feed.latestRoundData();

    if (answer <= 0)               revert NegativeOrZeroPrice(answer);
    if (updatedAt == 0)            revert ZeroUpdatedAt();
    if (answeredInRound < roundId) revert IncompleteRound();
    if (block.timestamp - updatedAt > heartbeat) revert StalePrice();

    uint8 d = feed.decimals();
    uint256 raw = uint256(answer);
    price1e18 = d < 18 ? raw * 10 ** (18 - d) : raw / 10 ** (d - 18);
}`;

const HEALTH_FACTOR_SNIPPET = `// From Cyfrin DSCEngine.sol — Patrick Collins
uint256 private constant LIQUIDATION_THRESHOLD = 50;   // 200% over-collateralized
uint256 private constant LIQUIDATION_BONUS     = 10;   // 10% keeper bonus
uint256 private constant MIN_HEALTH_FACTOR     = 1e18;

function _healthFactor(address user) private view returns (uint256) {
    (uint256 totalDscMinted, uint256 collateralValueInUsd) = _getAccountInformation(user);
    if (totalDscMinted == 0) return type(uint256).max;
    uint256 collateralAdjusted = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / 100;
    return (collateralAdjusted * 1e18) / totalDscMinted;
}

function liquidate(address collateral, address user, uint256 debtToCover) external {
    if (_healthFactor(user) >= MIN_HEALTH_FACTOR) revert HealthFactorOk();
    uint256 tokenFromDebt = getTokenAmountFromUsd(collateral, debtToCover);
    uint256 bonus        = (tokenFromDebt * LIQUIDATION_BONUS) / 100;
    _redeemCollateral(collateral, tokenFromDebt + bonus, user, msg.sender);
    _burnDsc(debtToCover, user, msg.sender);
}`;

export const slides: Slide[] = [
  {
    id: "title",
    title: "Building Real-World Blockchain Applications with Chainlink",
    subtitle: "Nirma University · April 9, 2026 · 1:15 – 3:00 PM IST",
    footer: "Sagar Jethi · Chainlink Community Advocate · Founder, Codeminto",
    image: { src: "/workshop-poster.jpg", alt: "Workshop poster", width: 340 },
  },
  {
    id: "agenda",
    title: "What we'll cover today",
    bullets: [
      "1 — A 2-minute tour of DeFi: where Chainlink fits in.",
      "2 — What a stablecoin really is (hint: it's not just 'pegged to the dollar').",
      "3 — The 3 axes that actually categorize stablecoins.",
      "4 — How DAI works, why UST collapsed, and why people really mint them.",
      "5 — Build along: a Chainlink-priced, over-collateralized DSC stablecoin in Foundry.",
      "6 — Stretch: take it cross-chain with Chainlink CCIP.",
    ],
  },
  {
    id: "defi-intro",
    title: "Welcome to DeFi",
    bullets: [
      "Permissionless, open-source finance — no bank, no broker, no gatekeeper.",
      "DeFiLlama tracks the top protocols by TVL: Lido, Aave, MakerDAO/Sky, Curve, Uniswap.",
      "Aave = permissionless lending. Uniswap = permissionless DEX. Maker/Sky = the stablecoin.",
      "DeFi gives everyday users access to sophisticated financial instruments — but only if the on-chain data is honest. That's where oracles come in.",
    ],
    footer: "defillama.com · aave.com · sky.money · uniswap.org",
  },
  {
    id: "what-is-stablecoin",
    title: "What is a stablecoin, really?",
    bullets: [
      "Most articles say: \"a crypto pegged to the dollar.\" That's half the story.",
      "Better definition (Patrick Collins): a crypto asset whose buying power stays relatively stable.",
      "\"Pegged\" is ONE way to achieve stability — not the definition itself.",
      "A floating stablecoin can actually be more stable than a pegged one over long time horizons.",
    ],
    quote: "\"A stablecoin is a crypto asset whose buying power fluctuates very little relative to the rest of the market.\"",
  },
  {
    id: "buying-power",
    title: "Buying power — the apple analogy",
    bullets: [
      "Go to the market and buy 10 apples with $10 today.",
      "Come back in 5 years: $10 might only buy 5 apples. That's inflation — USD buying power fell.",
      "An asset whose $10 always buys 10 apples has stable buying power — even if its USD price moves.",
      "Bitcoin's buying power swings wildly. Fiat's drifts slowly. A good stablecoin keeps it flat.",
    ],
  },
  {
    id: "why-care",
    title: "Why we need them — the 3 functions of money",
    columns: [
      {
        title: "Store of value",
        body: "Keep wealth over time without rotting (apples) or crashing 30% overnight (BTC).",
      },
      {
        title: "Unit of account",
        body: "Price things in it. Labeling a coffee '0.00003 BTC' is useless — it changes every minute.",
      },
      {
        title: "Medium of exchange",
        body: "Transact with it easily. Everyone accepts it, it settles fast, it doesn't fragment liquidity.",
      },
    ],
    footer: "Web3 needs on-chain money that performs all three. That's the job description.",
  },
  {
    id: "categorization",
    title: "How to categorize stablecoins — 3 axes",
    bullets: [
      "Forget the old \"fiat / crypto / commodity / algo\" buckets — they paint an inaccurate picture.",
      "Axis 1 — Relative stability: Pegged  ←→  Floating",
      "Axis 2 — Stability method: Governed  ←→  Algorithmic",
      "Axis 3 — Collateral type: Exogenous  ←→  Endogenous",
      "Every stablecoin is a point in this 3-D space. Let's walk through each axis.",
    ],
  },
  {
    id: "axis-stability",
    title: "Axis 1 — Pegged vs Floating",
    columns: [
      {
        title: "Pegged / Anchored",
        body: "Tracks a specific asset (usually $1). USDC, USDT, DAI. Simple mental model. Fails if the anchor drifts.",
      },
      {
        title: "Floating",
        body: "Maintains stable buying power without tracking a specific asset. RAI is the canonical example.",
      },
    ],
    footer: "Anchor vs buoy: which is more stable? Depends on what you're comparing it to.",
  },
  {
    id: "axis-method",
    title: "Axis 2 — Governed vs Algorithmic",
    columns: [
      {
        title: "Governed",
        body: "A human entity (or DAO) controls mint/burn. USDC is maximally governed — Circle does it. Fast, trusted, centralized.",
      },
      {
        title: "Algorithmic",
        body: "A permissionless algorithm mints and burns with no human intervention. DAI, RAI, UST — all far on this side.",
      },
    ],
    footer: "⚠ \"Algorithmic\" does NOT mean \"under-collateralized\" — media conflates these constantly.",
  },
  {
    id: "axis-collateral",
    title: "Axis 3 — Exogenous vs Endogenous collateral",
    bullets: [
      "Exogenous: collateral originates OUTSIDE the protocol. USDC ← USD. DAI ← ETH. If the stablecoin fails, the collateral keeps its value.",
      "Endogenous: collateral originates INSIDE the protocol. UST was backed by Luna — issued by Terra itself.",
      "The failure test: \"If the stablecoin fails, does the collateral also fail?\" Yes ⇒ endogenous.",
      "Endogenous is capital-efficient but reflexive — if confidence drops, the whole thing spirals. Exactly how Terra lost $45B in a week (May 2022).",
    ],
  },
  {
    id: "top-coins",
    title: "Top stablecoins through the 3 axes",
    table: {
      headers: ["Coin", "Peg", "Method", "Collateral", "Notes"],
      rows: [
        ["USDC", "Pegged", "Governed", "Exogenous (USD)", "Centralized, deep liquidity"],
        ["USDT", "Pegged", "Governed", "Exogenous (USD+T-bills)", "Largest by mcap"],
        ["DAI / USDS", "Pegged", "Algorithmic", "Exogenous (ETH, RWAs)", "CDP / over-collateralized"],
        ["RAI", "Floating", "Algorithmic", "Exogenous (ETH only)", "Minimal governance"],
        ["Frax (v3)", "Pegged", "Hybrid", "Mostly exogenous", "Moved to 100% CR"],
        ["UST (dead)", "Pegged", "Algorithmic", "Endogenous (Luna)", "Collapsed May 2022 — $45B wiped"],
      ],
    },
  },
  {
    id: "dai-how",
    title: "How DAI works — a CDP walkthrough",
    mermaid: `flowchart LR
  U[User] -->|1. deposit ETH| V[Vault / CDP]
  V -->|2. mint DAI up to max| U
  PF[Chainlink ETH/USD] -->|marks value each block| V
  V -->|3. stability fee accrues| T[Treasury]
  U -->|4. repay DAI + fee| V
  V -->|5. unlock ETH| U
  K[Keeper] -.->|if health < 1| V`,
    bullets: [
      "Deposit $600 ETH → mint up to $300 DAI (200% CR). You owe DAI back.",
      "Stability fee (≈2%/yr) accrues continuously. Protocol makes money.",
      "ETH tanks? Collateral ratio breaks → keeper liquidates you and takes the ETH.",
    ],
  },
  {
    id: "ust-lesson",
    title: "The UST / Luna collapse — one slide",
    bullets: [
      "UST was pegged, algorithmic, and 100% ENDOGENOUSLY collateralized by Luna.",
      "UST lost peg → Luna became unattractive → Luna price fell → UST peg got harder → Luna price fell more…",
      "Death spiral. ~$45B in market cap gone in a week. May 2022.",
      "Lesson: endogenous collateral means the airbag is made of the same thing that's on fire.",
    ],
  },
  {
    id: "real-reason",
    title: "So why are stablecoins REALLY minted?",
    bullets: [
      "Average users don't mint DAI to buy coffee — they just buy it on an exchange.",
      "Protocols charge a stability fee. Nobody pays 2% per year just for \"the 3 functions of money.\"",
      "The real answer: LEVERAGED INVESTING.",
      "I'm long ETH → I deposit ETH → mint DAI → buy more ETH → deposit that too → repeat.",
      "Stablecoins are good for the people. But they're MINTED because whales want leverage on their bags.",
    ],
    quote: "\"Why are stable coins minted? Because investors want to make leveraged bets.\" — Patrick Collins",
  },
  {
    id: "why-chainlink",
    title: "Why Chainlink for stablecoins?",
    columns: [
      {
        title: "Price Feeds",
        body: "Tamper-resistant market data. Secures >$20T in DeFi. The reference oracle the entire industry has agreed on.",
      },
      {
        title: "Proof of Reserve",
        body: "On-chain attestation of off-chain collateral. Turn opaque attestations into an automatic mint gate.",
      },
      {
        title: "CCIP",
        body: "Cross-Chain Interoperability Protocol. Move your stablecoin across 20+ chains with burn-and-mint.",
      },
    ],
  },
  {
    id: "our-build",
    title: "Our workshop build — DSC",
    bullets: [
      "Decentralized Stable Coin — the one Patrick Collins builds in the Cyfrin course.",
      "Relative stability: Anchored to USD via Chainlink price feeds.",
      "Stability method: Algorithmic — no humans mint or burn, only code.",
      "Collateral type: Exogenous — wETH and wBTC only.",
      "Mechanism: over-collateralized CDP with on-chain liquidations at 200% CR.",
    ],
    footer: "github.com/Cyfrin/foundry-defi-stablecoin-cu",
  },
  {
    id: "dsc-architecture",
    title: "DSC architecture",
    mermaid: `flowchart LR
  U[User] -->|deposit wETH / wBTC| E[DSCEngine]
  E -->|mint DSC| U
  PF1[Chainlink wETH/USD] --> E
  PF2[Chainlink wBTC/USD] --> E
  E -.->|health < 1| L[Liquidator]
  L -->|burns DSC, takes collateral + 10% bonus| E
  E -->|mint / burn| DSC[DecentralizedStableCoin ERC-20]`,
    bullets: [
      "DSCEngine holds the logic. DecentralizedStableCoin is a dumb ERC-20 the engine owns.",
      "Every collateral token has its own Chainlink price feed, registered at constructor time.",
      "Liquidation is permissionless: anyone can call liquidate() on an unhealthy vault and earn a 10% bonus.",
    ],
  },
  {
    id: "price-feed-code",
    title: "Chainlink Price Feed — safe read",
    code: {
      language: "solidity",
      content: PRICE_FEED_SNIPPET,
      caption: "4 safety checks · Sepolia ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306 (8 dec, 3600s heartbeat)",
    },
  },
  {
    id: "health-factor",
    title: "Health factor & liquidation",
    code: {
      language: "solidity",
      content: HEALTH_FACTOR_SNIPPET,
      caption: "Health factor = (collateralUSD × 50 / 100) × 1e18 / totalDscMinted. < 1e18 ⇒ liquidatable.",
    },
  },
  {
    id: "ccip-banner",
    title: "Building Cross-Chain dApps with Chainlink CCIP",
    subtitle: "Move value and messages across 20+ chains, securely.",
    image: { src: "/ccip-banner.png", alt: "Chainlink CCIP", width: 780 },
  },
  {
    id: "ccip",
    title: "CCIP burn-and-mint",
    mermaid: `sequenceDiagram
  participant U as User
  participant SC as DSC (Sepolia)
  participant B1 as CCIPBridge (Sepolia)
  participant R1 as Router (Sepolia)
  participant CCIP as CCIP Network
  participant R2 as Router (Fuji)
  participant B2 as CCIPBridge (Fuji)
  participant SC2 as DSC (Fuji)
  U->>SC: approve + transfer
  B1->>SC: bridgeBurn(amount)
  B1->>R1: ccipSend(destSelector, msg)
  R1->>CCIP: route + sign
  CCIP->>R2: deliver
  R2->>B2: _ccipReceive
  B2->>SC2: bridgeMint(recipient, amount)
  SC2-->>U: tokens on Fuji`,
    bullets: [
      "Allowlist source chain selector + sender — never trust raw _ccipReceive input.",
      "Pre-fund LINK in the bridge and approve the router for the exact fee from getFee().",
      "Track every message live on https://ccip.chain.link.",
    ],
  },
  {
    id: "lets-build",
    title: "Let's build it",
    subtitle: "Open the Workshop tab and follow along step-by-step.",
    cta: { label: "Open the workshop guide →", href: "/workshop" },
  },
];
