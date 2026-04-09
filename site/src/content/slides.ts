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

const PRICE_FEED_SNIPPET = `// Read a price from Chainlink — safely.
function getPrice(AggregatorV3Interface feed) internal view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();

    require(answer > 0, "price too low");
    require(block.timestamp - updatedAt < 1 hours, "price too old");

    // Chainlink USD feeds use 8 decimals. Scale up to 18.
    return uint256(answer) * 1e10;
}`;

const HEALTH_FACTOR_SNIPPET = `// From Cyfrin DSCEngine.sol — plain version.

// You need $200 of ETH to mint $100 of DSC (200% collateral).
uint256 constant LIQUIDATION_THRESHOLD = 50;
uint256 constant LIQUIDATION_BONUS     = 10;   // 10% bonus for liquidators
uint256 constant MIN_HEALTH_FACTOR     = 1e18;

function healthFactor(address user) public view returns (uint256) {
    uint256 dscMinted   = s_DSCMinted[user];
    uint256 collateralUsd = getCollateralValue(user);
    if (dscMinted == 0) return type(uint256).max;
    return (collateralUsd * 50 / 100) * 1e18 / dscMinted;
}

// If your health factor falls below 1, anyone can liquidate you.
// They pay your debt, take your collateral, and get a 10% bonus.`;

export const slides: Slide[] = [
  {
    id: "title",
    title: "Building Real-World Blockchain Apps with Chainlink",
    subtitle: "Nirma University · April 9, 2026 · 1:15 – 3:00 PM IST",
    footer: "Sagar Jethi · Chainlink Community Advocate · Founder, Codeminto",
    image: { src: "/workshop-poster.jpg", alt: "Workshop poster", width: 340 },
  },
  {
    id: "agenda",
    title: "What we'll do today",
    bullets: [
      "1 — A quick tour of DeFi and where Chainlink fits.",
      "2 — What a stablecoin really is.",
      "3 — Simple ways to group stablecoins.",
      "4 — How DAI works and why UST died.",
      "5 — We build a stablecoin together using Chainlink + Foundry.",
      "6 — Bonus: send it across chains with CCIP.",
    ],
  },
  {
    id: "defi-intro",
    title: "What is DeFi?",
    bullets: [
      "DeFi = Decentralized Finance.",
      "It's finance without banks or middlemen. Just smart contracts.",
      "You can lend, borrow, trade, and save — anywhere, any time.",
      "Top apps: Aave (lending), Uniswap (swapping), Sky/Maker (stablecoin).",
      "But smart contracts need real-world data to work. That's what Chainlink gives us.",
    ],
  },
  {
    id: "what-is-stablecoin",
    title: "What is a stablecoin?",
    bullets: [
      "Most people say: \"a crypto worth $1.\" That's only half right.",
      "A better answer: a crypto whose buying power stays stable.",
      "Being \"pegged\" to the dollar is just ONE way to do this.",
      "Some stablecoins don't track the dollar at all — they just keep their value.",
    ],
    quote: "\"A stablecoin is a crypto asset whose buying power stays the same.\"",
  },
  {
    id: "buying-power",
    title: "Apple example — what \"stable\" means",
    bullets: [
      "Today: $10 buys you 10 apples.",
      "In 5 years: $10 might only buy 5 apples. Your money lost power.",
      "A good stablecoin still buys 10 apples in 5 years.",
      "Bitcoin can't do this — its price jumps around too much.",
      "So we need a coin that holds its value.",
    ],
  },
  {
    id: "why-care",
    title: "Why do we need them? Money does 3 things",
    columns: [
      { title: "Save", body: "Hold your wealth without losing it overnight." },
      { title: "Measure", body: "Put prices on things. Coffee = $3, not 0.00003 BTC." },
      { title: "Spend", body: "Pay people easily. Everyone takes it." },
    ],
    footer: "Web3 needs a coin that does all 3. That's why stablecoins exist.",
  },
  {
    id: "categorization",
    title: "Simple way to group stablecoins",
    bullets: [
      "Forget the old lists (fiat, crypto, commodity, algo) — they're confusing.",
      "Ask 3 simple questions instead:",
      "1 — Does it track something, or float on its own?",
      "2 — Does a person control it, or does code control it?",
      "3 — Is the backing from outside the coin, or from inside?",
    ],
  },
  {
    id: "axis-stability",
    title: "Question 1 — Pegged or Floating?",
    columns: [
      {
        title: "Pegged",
        body: "Tracks another asset like the US dollar. Example: USDC, USDT, DAI. Always aims for $1.",
      },
      {
        title: "Floating",
        body: "Doesn't track anything — it just tries to keep its buying power. Example: RAI.",
      },
    ],
  },
  {
    id: "axis-method",
    title: "Question 2 — Who controls it?",
    columns: [
      {
        title: "Person / Company",
        body: "A team prints and burns the coin. USDC works this way — Circle runs it. Fast but centralized.",
      },
      {
        title: "Code only",
        body: "No humans. Just smart contracts. DAI and RAI work this way. Slower, but trustless.",
      },
    ],
    footer: "\"Code only\" does NOT mean \"risky\" — news often gets this wrong.",
  },
  {
    id: "axis-collateral",
    title: "Question 3 — What is it backed by?",
    bullets: [
      "Outside backing: backed by something that exists without the coin. USDC is backed by dollars. DAI is backed by ETH.",
      "Inside backing: backed by its own token. UST was backed by LUNA — made by the same project.",
      "Simple test: \"If the coin dies, does the backing also die?\"",
      "If yes → inside backing → dangerous.",
      "That's how UST + LUNA lost about $40 BILLION in one week (May 2022).",
    ],
  },
  {
    id: "top-coins",
    title: "Top stablecoins at a glance",
    table: {
      headers: ["Coin", "Tracks $1?", "Controlled by", "Backed by"],
      rows: [
        ["USDC", "Yes", "Circle (company)", "Real US dollars"],
        ["USDT", "Yes", "Tether (company)", "Dollars + T-bills"],
        ["DAI / USDS", "Yes", "Code", "ETH and other crypto"],
        ["RAI", "Floats", "Code", "Only ETH"],
        ["UST (dead)", "Tried to", "Code", "LUNA (itself) — died"],
      ],
    },
  },
  {
    id: "dai-how",
    title: "How DAI works — in 5 steps",
    mermaid: `flowchart LR
  U[User] -->|1. put in ETH| V[Vault]
  V -->|2. get DAI| U
  PF[Chainlink ETH/USD] -->|checks price| V
  U -->|3. pay back DAI| V
  V -->|4. get ETH back| U
  K[Keeper] -.->|if you fail| V`,
    bullets: [
      "Put in $600 of ETH → you can borrow up to $300 of DAI.",
      "You owe that DAI back. You also pay a small yearly fee.",
      "If ETH price drops too much, someone else takes your ETH and pays off your DAI. This is called liquidation.",
    ],
  },
  {
    id: "ust-lesson",
    title: "The UST / LUNA disaster — what we learned",
    bullets: [
      "UST was backed by LUNA. Both were made by the same project.",
      "UST lost its $1 peg → people dumped LUNA → LUNA crashed → UST crashed more.",
      "This is called a death spiral.",
      "About $40 billion gone in a week. May 2022.",
      "Lesson: if a coin is only backed by its own token, it can die fast.",
    ],
  },
  {
    id: "real-reason",
    title: "Why do people really mint stablecoins?",
    bullets: [
      "You don't need to mint DAI to buy coffee — you can just buy DAI.",
      "And minting costs a yearly fee. So why do people do it?",
      "The real answer: to bet bigger on crypto.",
      "Example: I have ETH → I lock it → mint DAI → buy more ETH → lock that too → repeat.",
      "This is called leverage. Stablecoins are good for everyone, but they're mostly minted by traders.",
    ],
    quote: "\"Stablecoins are minted because investors want to bet big.\" — Patrick Collins",
  },
  {
    id: "why-chainlink",
    title: "Why use Chainlink?",
    columns: [
      {
        title: "Price Feeds",
        body: "Real-world prices on-chain. Used by almost every DeFi app.",
      },
      {
        title: "Proof of Reserve",
        body: "Proves the coin has real backing. Stops over-minting.",
      },
      {
        title: "CCIP",
        body: "Send tokens across different chains safely.",
      },
    ],
  },
  {
    id: "our-build",
    title: "What we'll build — DSC",
    bullets: [
      "DSC = Decentralized Stable Coin.",
      "Built in the Cyfrin Foundry course by Patrick Collins.",
      "It tracks $1 using Chainlink.",
      "It's controlled only by code.",
      "You back it with wETH or wBTC.",
      "You must put in $200 of crypto for every $100 of DSC (200% safety).",
    ],
    footer: "github.com/Cyfrin/foundry-defi-stablecoin-cu",
  },
  {
    id: "dsc-architecture",
    title: "How our stablecoin works",
    mermaid: `flowchart LR
  U[User] -->|put in wETH / wBTC| E[DSCEngine]
  E -->|mint DSC| U
  PF1[Chainlink wETH/USD] --> E
  PF2[Chainlink wBTC/USD] --> E
  E -.->|if unsafe| L[Liquidator]
  L -->|pays debt, takes collateral| E`,
    bullets: [
      "DSCEngine is the brain. It handles all the rules.",
      "DSC is just a normal ERC-20 token. The engine mints and burns it.",
      "Chainlink tells us how much your crypto is worth.",
      "If you become unsafe, anyone can pay your debt and take your crypto + 10% bonus.",
    ],
  },
  {
    id: "price-feed-code",
    title: "Reading a price safely",
    code: {
      language: "solidity",
      content: PRICE_FEED_SNIPPET,
      caption: "Always check: is the price > 0? Is it fresh? Sepolia ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306",
    },
  },
  {
    id: "health-factor",
    title: "Health factor — are you safe?",
    code: {
      language: "solidity",
      content: HEALTH_FACTOR_SNIPPET,
      caption: "If health factor drops below 1, you can be liquidated.",
    },
  },
  {
    id: "ccip-banner",
    title: "Going cross-chain with Chainlink CCIP",
    subtitle: "Move your stablecoin across 20+ blockchains safely.",
    image: { src: "/ccip-banner.png", alt: "Chainlink CCIP", width: 780 },
  },
  {
    id: "ccip",
    title: "How CCIP works — burn here, mint there",
    mermaid: `sequenceDiagram
  participant U as User
  participant SC as DSC (Sepolia)
  participant B1 as Bridge (Sepolia)
  participant CCIP as CCIP Network
  participant B2 as Bridge (Fuji)
  participant SC2 as DSC (Fuji)
  U->>SC: send 100 DSC
  B1->>SC: burn 100 DSC
  B1->>CCIP: send message
  CCIP->>B2: deliver message
  B2->>SC2: mint 100 DSC
  SC2-->>U: 100 DSC on Fuji`,
    bullets: [
      "Step 1: burn the tokens on chain A.",
      "Step 2: CCIP sends a message to chain B.",
      "Step 3: chain B mints the same amount for you.",
      "No real tokens move — they're burned and recreated. Safer this way.",
    ],
  },
  {
    id: "lets-build",
    title: "Let's build it!",
    subtitle: "Open the Workshop tab and code along with us.",
    cta: { label: "Open the workshop guide →", href: "/workshop" },
  },
];
