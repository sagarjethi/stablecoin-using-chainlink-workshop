export type WorkshopSection = {
  id: string;
  number?: string;
  title: string;
  body: string[];
  code?: { language: string; content: string; filename?: string };
  verify?: string[];
  links?: { label: string; href: string }[];
};

export const PRICE_FEED_LIB = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

library PriceFeedLib {
    error StalePrice(uint256 updatedAt, uint256 blockTimestamp, uint256 heartbeat);
    error NegativeOrZeroPrice(int256 answer);
    error IncompleteRound(uint80 roundId, uint80 answeredInRound);
    error ZeroUpdatedAt();
    error InvalidDecimals(uint8 decimals);

    uint256 internal constant TARGET_DECIMALS = 18;

    function getPrice(AggregatorV3Interface feed, uint256 heartbeat)
        internal view returns (uint256 price1e18)
    {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        if (answer <= 0)               revert NegativeOrZeroPrice(answer);
        if (updatedAt == 0)            revert ZeroUpdatedAt();
        if (answeredInRound < roundId) revert IncompleteRound(roundId, answeredInRound);
        if (block.timestamp - updatedAt > heartbeat) {
            revert StalePrice(updatedAt, block.timestamp, heartbeat);
        }

        uint8 feedDecimals = feed.decimals();
        if (feedDecimals == 0 || feedDecimals > 36) revert InvalidDecimals(feedDecimals);

        uint256 raw = uint256(answer);
        if (feedDecimals < TARGET_DECIMALS) {
            price1e18 = raw * (10 ** (TARGET_DECIMALS - feedDecimals));
        } else if (feedDecimals > TARGET_DECIMALS) {
            price1e18 = raw / (10 ** (feedDecimals - TARGET_DECIMALS));
        } else {
            price1e18 = raw;
        }
    }
}`;

export const STABLECOIN_CORE = `// Mint: ETH in -> wUSD out, gated by Chainlink price + PoR.
function mint() external payable whenNotPaused nonReentrant {
    if (msg.value == 0) revert ZeroAmount();

    uint256 price1e18 = ethUsdFeed.getPrice(priceHeartbeat);
    uint256 stableOut = (msg.value * price1e18) / 1e18;
    if (stableOut == 0) revert ZeroAmount();

    uint256 reserves = _readPoR();
    uint256 newSupply = totalSupply() + stableOut;
    if (newSupply > reserves) revert ExceedsReserves(newSupply, reserves);

    _mint(msg.sender, stableOut);
    emit Minted(msg.sender, msg.value, stableOut, price1e18);
}

function redeem(uint256 stableIn) external whenNotPaused nonReentrant {
    if (stableIn == 0) revert ZeroAmount();

    uint256 price1e18 = ethUsdFeed.getPrice(priceHeartbeat);
    uint256 ethOut = (stableIn * 1e18) / price1e18;
    if (ethOut == 0) revert ZeroAmount();
    if (ethOut > address(this).balance) {
        revert InsufficientEthInContract(ethOut, address(this).balance);
    }

    _burn(msg.sender, stableIn);
    (bool ok, ) = payable(msg.sender).call{value: ethOut}("");
    if (!ok) revert EthTransferFailed();

    emit Redeemed(msg.sender, stableIn, ethOut, price1e18);
}

function _readPoR() internal view returns (uint256) {
    (, int256 reserves, , uint256 updatedAt, ) = porFeed.latestRoundData();
    if (reserves <= 0) revert PoRNonPositive(reserves);
    if (updatedAt == 0 || block.timestamp - updatedAt > POR_MAX_STALENESS) {
        revert PoRStale(updatedAt, block.timestamp);
    }
    return uint256(reserves);
}`;

export const TEST_SNIPPET = `function test_Mint_HappyPath() public {
    vm.prank(user);
    coin.mint{value: 1 ether}();

    // 1 ETH * $2000 => 2000 wUSD
    assertEq(coin.balanceOf(user), 2000e18);
    assertEq(address(coin).balance, 1 ether);
}

function test_Mint_RevertsOnStalePrice() public {
    vm.warp(block.timestamp + 10_000);
    vm.prank(user);
    vm.expectRevert();
    coin.mint{value: 1 ether}();
}

function test_Mint_RevertsOnZeroPrice() public {
    priceFeed.setAnswer(0);
    vm.prank(user);
    vm.expectRevert(abi.encodeWithSelector(PriceFeedLib.NegativeOrZeroPrice.selector, int256(0)));
    coin.mint{value: 1 ether}();
}`;

export const DEPLOY_SNIPPET = `// script/Deploy.s.sol
address internal constant SEPOLIA_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
uint256 internal constant HEARTBEAT = 3600;

function run() external {
    uint256 pk = vm.envUint("PRIVATE_KEY");
    address admin = vm.addr(pk);
    vm.startBroadcast(pk);

    // Workshop mock PoR: 18 decimals, starts with 10M wUSD "reserves".
    MockV3Aggregator porFeed = new MockV3Aggregator(18, int256(10_000_000e18));

    StableCoin coin = new StableCoin(
        admin,
        AggregatorV3Interface(SEPOLIA_ETH_USD),
        AggregatorV3Interface(address(porFeed)),
        HEARTBEAT
    );

    vm.stopBroadcast();
    console2.log("StableCoin:", address(coin));
}`;

export const CCIP_SNIPPET = `function sendCrossChain(uint64 destChainSelector, address recipient, uint256 amount)
    external nonReentrant returns (bytes32 messageId)
{
    if (amount == 0) revert ZeroAmount();
    address peer = destinationBridge[destChainSelector];
    if (peer == address(0)) revert UnknownDestination(destChainSelector);

    stableAsERC20.safeTransferFrom(msg.sender, address(this), amount);
    stable.bridgeBurn(address(this), amount);

    Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
        receiver: abi.encode(peer),
        data: abi.encode(recipient, amount),
        tokenAmounts: new Client.EVMTokenAmount[](0),
        feeToken: address(linkToken),
        extraArgs: Client._argsToBytes(
            Client.EVMExtraArgsV2({gasLimit: 200_000, allowOutOfOrderExecution: true})
        )
    });

    IRouterClient router = IRouterClient(this.getRouter());
    uint256 fee = router.getFee(destChainSelector, message);
    if (fee > linkToken.balanceOf(address(this)))
        revert InsufficientLinkFee(fee, linkToken.balanceOf(address(this)));

    linkToken.approve(address(router), fee);
    messageId = router.ccipSend(destChainSelector, message);
    emit OutboundSent(messageId, destChainSelector, recipient, amount, fee);
}`;

export const DSC_ENGINE_CORE = `// From Cyfrin foundry-defi-stablecoin-cu · DSCEngine.sol (Patrick Collins)
// WETH + WBTC collateral · Chainlink-priced · 200% over-collateralized

uint256 private constant LIQUIDATION_THRESHOLD = 50;  // 200% overcollateralization
uint256 private constant LIQUIDATION_BONUS     = 10;  // 10% bonus to liquidators
uint256 private constant MIN_HEALTH_FACTOR     = 1e18;

function depositCollateralAndMintDsc(
    address tokenCollateralAddress,
    uint256 amountCollateral,
    uint256 amountDscToMint
) external {
    depositCollateral(tokenCollateralAddress, amountCollateral);
    mintDsc(amountDscToMint);
}

function liquidate(address collateral, address user, uint256 debtToCover)
    external isAllowedToken(collateral) moreThanZero(debtToCover) nonReentrant
{
    uint256 startingUserHealthFactor = _healthFactor(user);
    if (startingUserHealthFactor >= MIN_HEALTH_FACTOR) revert DSCEngine__HealthFactorOk();

    // Cover DSC debt with liquidator's tokens + take collateral at a 10% discount.
    uint256 tokenAmountFromDebtCovered = getTokenAmountFromUsd(collateral, debtToCover);
    uint256 bonusCollateral = (tokenAmountFromDebtCovered * LIQUIDATION_BONUS) / 100;

    _redeemCollateral(collateral, tokenAmountFromDebtCovered + bonusCollateral, user, msg.sender);
    _burnDsc(debtToCover, user, msg.sender);

    uint256 endingUserHealthFactor = _healthFactor(user);
    if (endingUserHealthFactor <= startingUserHealthFactor) revert DSCEngine__HealthFactorNotImproved();
    _revertIfHealthFactorIsBroken(msg.sender);
}

// Health factor = (collateralValueUsd * 50 / 100) * 1e18 / totalDscMinted
// < 1e18 ⇒ liquidatable`;

export const sections: WorkshopSection[] = [
  {
    id: "intro",
    number: "00",
    title: "Introduction",
    body: [
      "Today you will build wUSD — a reserve-backed, Chainlink-priced, Proof-of-Reserve-gated stablecoin, deploy it to Sepolia, and (stretch) bridge it to Avalanche Fuji over CCIP.",
      "The architecture in three layers: a safe Chainlink price-feed reader, an ERC-20 mint/redeem contract that gates every mint with a PoR feed, and a CCIPReceiver bridge that does burn-and-mint cross-chain transfers.",
    ],
    verify: [
      "You can articulate why every mint must check Proof of Reserve.",
      "You understand the difference between fiat-backed, CDP, and algorithmic stablecoins.",
    ],
  },
  {
    id: "prereqs",
    number: "01",
    title: "Prerequisites",
    body: [
      "Install Foundry, Node 20+, and make sure you have a wallet funded with Sepolia ETH and LINK from the Chainlink faucets.",
    ],
    code: {
      language: "bash",
      content: `# Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node (via nvm) and pnpm
nvm install 20 && nvm use 20
npm i -g pnpm

# Get test ETH + LINK
open https://faucets.chain.link`,
    },
    verify: [
      "forge --version prints a recent build.",
      "Your wallet shows Sepolia ETH and LINK on https://sepolia.etherscan.io.",
    ],
  },
  {
    id: "clone",
    number: "02",
    title: "Clone & install",
    body: ["Clone the workshop repo and install Foundry dependencies."],
    code: {
      language: "bash",
      content: `git clone https://github.com/YOUR_ORG/chainlink-workshop
cd chainlink-workshop/practical

forge install \\
  smartcontractkit/chainlink-brownie-contracts \\
  smartcontractkit/ccip \\
  OpenZeppelin/openzeppelin-contracts \\
  foundry-rs/forge-std \\
  --no-commit

forge build`,
    },
    verify: [
      "forge build completes with zero errors.",
      "lib/ contains chainlink-brownie-contracts, ccip, openzeppelin-contracts, forge-std.",
    ],
  },
  {
    id: "step1",
    number: "03",
    title: "Step 1 — Safe price reader",
    body: [
      "Chainlink AggregatorV3Interface is simple, but raw use of latestRoundData() is dangerous. PriceFeedLib wraps it with the four checks every production stablecoin needs:",
      "(1) the answer must be strictly positive, (2) updatedAt must be non-zero, (3) the round must be complete (answeredInRound ≥ roundId), and (4) the data must be fresher than the heartbeat. Finally we normalize to 18 decimals so the rest of the contract never thinks about feed precision.",
    ],
    code: { language: "solidity", filename: "src/PriceFeedLib.sol", content: PRICE_FEED_LIB },
    verify: [
      "All four reverts have a custom error with arguments useful for debugging.",
      "An 8-decimal feed (ETH/USD) returns a value scaled by 1e18 — i.e. ~3000 * 1e18 for $3000 ETH.",
    ],
  },
  {
    id: "step2",
    number: "04",
    title: "Step 2 — Reserve-backed StableCoin",
    body: [
      "StableCoin is an OpenZeppelin ERC20 + AccessControl + Pausable + ReentrancyGuard that holds two immutable Chainlink feeds: an ETH/USD price feed and a Proof-of-Reserve feed.",
      "mint() multiplies msg.value by the price, then refuses to mint if totalSupply + amount would exceed PoR-attested reserves. redeem() does the inverse with a strict CEI ordering — burn first, then send ETH.",
    ],
    code: { language: "solidity", filename: "src/StableCoin.sol", content: STABLECOIN_CORE },
    verify: [
      "Calling mint() with 1 ETH at $2000 yields exactly 2000e18 wUSD.",
      "Lowering PoR reserves below totalSupply + amount makes the next mint revert with ExceedsReserves.",
      "PoR data older than 1 day reverts with PoRStale.",
    ],
  },
  {
    id: "step3",
    number: "05",
    title: "Step 3 — Tests",
    body: [
      "MockV3Aggregator gives us a feed we can poke at runtime — change the price, age the timestamp, set a negative answer. Run the full suite with verbose traces.",
    ],
    code: {
      language: "solidity",
      filename: "test/StableCoin.t.sol",
      content: TEST_SNIPPET,
    },
    verify: [
      "forge test -vvv prints all green.",
      "Stale-price and zero-price tests both revert with the expected custom errors.",
    ],
  },
  {
    id: "step4",
    number: "06",
    title: "Step 4 — Deploy to Sepolia",
    body: [
      "The deploy script wires the real Chainlink Sepolia ETH/USD feed (0x694AA1769357215DE4FAC081bf1f309aDC325306, 8 decimals, 3600s heartbeat) and a workshop-owned mock PoR feed seeded with 10M wUSD of reserves.",
      "Export your private key + RPC, then broadcast and verify in one command.",
    ],
    code: {
      language: "bash",
      content: `export PRIVATE_KEY=0x...
export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<KEY>
export ETHERSCAN_API_KEY=...

forge script script/Deploy.s.sol:Deploy \\
  --rpc-url $SEPOLIA_RPC_URL \\
  --broadcast \\
  --verify`,
    },
    verify: [
      "You see two addresses logged: StableCoin and the mock PoR feed.",
      "The contract is verified on https://sepolia.etherscan.io.",
      "You can call quoteMint(1 ether) and see ~3000e18 (or whatever ETH is right now).",
    ],
  },
  {
    id: "step5",
    number: "07",
    title: "Step 5 — CCIP bridge (stretch)",
    body: [
      "CCIPBridge inherits CCIPReceiver and implements burn-and-mint. Outbound: pull tokens from the user, bridgeBurn them, build an EVM2AnyMessage, pay the fee in LINK, call router.ccipSend. Inbound: _ccipReceive validates the source-chain + sender allowlist, then calls bridgeMint on the local stablecoin.",
      "Sepolia router 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59 · Fuji router 0xF694E193200268f9a4868e4Aa017A0118C9a8177. Selectors: Sepolia 16015286601757825753, Fuji 14767482510784806043. LINK on Sepolia 0x779877A7B0D9E8603169DdbD7836e478b4624789, on Fuji 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846.",
    ],
    code: { language: "solidity", filename: "src/CCIPBridge.sol", content: CCIP_SNIPPET },
    verify: [
      "Both bridges have the peer set via setDestinationBridge and setAllowlistedSender.",
      "Each bridge has been pre-funded with LINK to cover router.getFee().",
      "You can track the message lifecycle on https://ccip.chain.link by message ID.",
    ],
  },
  {
    id: "dscengine",
    number: "08",
    title: "Reference — Cyfrin DSCEngine (CDP-style)",
    body: [
      "For a more advanced, battle-tested reference, we use Patrick Collins' DSCEngine from the Cyfrin Foundry DeFi Stablecoin course. This is a full CDP/MakerDAO-style design: users deposit WETH or WBTC as collateral, mint DSC (a USD-pegged token), and can be liquidated if their health factor drops below 1e18.",
      "Key differences from the wUSD contract above: (1) ERC-20 collateral (WETH/WBTC) instead of native ETH, (2) two Chainlink price feeds — one per collateral token, (3) a 200% over-collateralization threshold (LIQUIDATION_THRESHOLD = 50/100), and (4) a public liquidate() with a 10% bonus to keepers.",
      "Clone the reference into reference/ and read through DSCEngine.sol — it's only 464 lines and is the clearest production-grade example of a Chainlink-backed stablecoin. Video walkthrough: https://www.youtube.com/watch?v=8dRAd-Bzc_E",
    ],
    code: { language: "solidity", filename: "reference/foundry-defi-stablecoin-cu/src/DSCEngine.sol", content: DSC_ENGINE_CORE },
    verify: [
      "git clone https://github.com/Cyfrin/foundry-defi-stablecoin-cu reference/foundry-defi-stablecoin-cu",
      "cd into it and run forge test — all tests should pass.",
      "You can explain why LIQUIDATION_THRESHOLD = 50 means 200% collateralization.",
      "You can explain what happens when a user's health factor drops below 1e18.",
    ],
    links: [
      { label: "Cyfrin foundry-defi-stablecoin-cu", href: "https://github.com/Cyfrin/foundry-defi-stablecoin-cu" },
      { label: "Video walkthrough (Patrick Collins)", href: "https://www.youtube.com/watch?v=8dRAd-Bzc_E" },
      { label: "Live DSCEngine on Sepolia", href: "https://sepolia.etherscan.io/address/0x091ea0838ebd5b7dda2f2a641b068d6d59639b98#code" },
    ],
  },
  {
    id: "pitfalls",
    number: "08",
    title: "Pitfalls",
    body: ["Six classic ways to brick a Chainlink-powered stablecoin:"],
    verify: [
      "Wrong network feed address — every chain has different aggregator addresses, always read from docs.chain.link.",
      "Ignoring staleness — a heartbeat-aware check is mandatory; never trust latestRoundData() raw.",
      "Forgetting the L2 sequencer feed on Arbitrum / Optimism / Base — must be checked alongside the price.",
      "Missing token approvals before ccipSend — the LINK approval to the router is per-transaction.",
      "Hard-coded gasLimit too low in extraArgs — destination _ccipReceive will silently revert.",
      "Open _ccipReceive — always validate sourceChainSelector + decoded sender against an allowlist.",
    ],
  },
  {
    id: "resources",
    number: "09",
    title: "Resources",
    body: ["Bookmark these — you'll need them after the workshop."],
    links: [
      { label: "Workshop slides (Google Slides)", href: "https://docs.google.com/presentation/d/1MxWReYythS59-lydwZTAyFBHFtyy7EsYC5vrXfO72aQ/edit" },
      { label: "Workshop handout (Google Doc)", href: "https://docs.google.com/document/d/16oTtgst9uqZS7bk8Ej4tL-Ew6-e-UxzC4rJ8B3iBPVM/edit" },
      { label: "Feedback form", href: "https://docs.google.com/forms/d/e/1FAIpQLSfqXZHnMvLgNrbaoKOrR8KPB0Ou-JKhMyFTfOLDDslILGGPWQ/viewform" },
      { label: "Cyfrin foundry-defi-stablecoin-cu (practical reference)", href: "https://github.com/Cyfrin/foundry-defi-stablecoin-cu" },
      { label: "CRE Templates — stablecoin-ace-ccip", href: "https://github.com/smartcontractkit/cre-templates/tree/main/starter-templates/stablecoin-ace-ccip" },
      { label: "Video: Patrick Collins — DeFi Stablecoin", href: "https://www.youtube.com/watch?v=8dRAd-Bzc_E" },
      { label: "Chainlink Docs (docs.chain.link)", href: "https://docs.chain.link" },
      { label: "Chainlink Developer Hub (dev.chain.link)", href: "https://dev.chain.link" },
      { label: "CCIP Explorer (ccip.chain.link)", href: "https://ccip.chain.link" },
      { label: "Faucets (faucets.chain.link)", href: "https://faucets.chain.link" },
    ],
  },
];
