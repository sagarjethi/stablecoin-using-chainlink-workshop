# Chainlink Workshop — Practical: Reserve-Backed Stablecoin + CCIP Bridge

A hands-on Foundry project that walks you through building a production-shaped,
Chainlink-powered stablecoin. You will wire up a **safe price reader**, a
**Proof-of-Reserve–gated mint**, and (as a stretch) a **CCIP burn-and-mint
bridge** between Sepolia and Fuji.

---

## 1. What we're building

A minimal but faithful slice of a real reserve-backed stablecoin:

- `wUSD` — an ERC20 minted 1:1 (in USD value) against ETH collateral.
- Price comes from the **Chainlink ETH/USD** feed on Sepolia.
- Every mint is gated by a **Chainlink Proof-of-Reserve (PoR)** feed: the
  new `totalSupply` can never exceed attested reserves.
- The contract is **Pausable**, uses **AccessControl** for privileged actions,
  **ReentrancyGuard** on state-changing entrypoints, and strictly follows the
  **Checks-Effects-Interactions** pattern.
- Stretch: a **CCIP bridge** that burns wUSD on chain A and mints it on chain B,
  with router validation + source-sender whitelisting on the receiver side.

Architecture at a glance:

- `PriceFeedLib` — safe `latestRoundData` reader (staleness, negative, round,
  decimals → 1e18 normalization).
- `StableCoin` — ERC20 + `mint()` / `redeem()` / `bridgeMint/Burn`.
- `CCIPBridge` — `sendCrossChain()` outbound + `_ccipReceive()` inbound.
- `MockV3Aggregator` — local test double for both price and PoR feeds.

---

## 2. Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- Node 18+ (only needed if you use an RPC provider's CLI)
- A funded **Sepolia** wallet (0.1 ETH is plenty)
- A small amount of **LINK on Sepolia** (for the CCIP stretch step) — get it from [faucets.chain.link](https://faucets.chain.link/)

---

## 3. Setup

If you cloned this repo, `foundry.toml` already has the remappings you need.
Install the four dependencies:

```bash
cd practical

# (only if you started from scratch — this repo is already initialized)
# forge init --no-commit --no-git .

forge install smartcontractkit/chainlink-brownie-contracts --no-commit
forge install smartcontractkit/ccip --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

The remappings in `foundry.toml`:

```
@chainlink/contracts/=lib/chainlink-brownie-contracts/contracts/
@chainlink/contracts-ccip/=lib/ccip/contracts/
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
forge-std/=lib/forge-std/src/
```

Copy env template:

```bash
cp .env.example .env
# then edit .env with your SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
```

---

## 4. Step 1 — Implement the safe price reader (`src/PriceFeedLib.sol`)

Chainlink aggregators are simple on the surface but there are four things a
production consumer **must** check on every read. `PriceFeedLib.getPrice()`
does all four:

1. **Negative / zero answer** — the signed `int256` could theoretically be
   non-positive. Revert with `NegativeOrZeroPrice`.
2. **`updatedAt == 0`** — means the round never completed. Revert.
3. **`answeredInRound < roundId`** — stale round carried forward. Revert with
   `IncompleteRound`.
4. **Staleness vs heartbeat** — if `block.timestamp - updatedAt > heartbeat`
   the data is too old to trust. For Sepolia ETH/USD the heartbeat is **3600s**.

Finally, feeds come in assorted decimals (ETH/USD is **8**). We normalize to
**18 decimals** so the rest of the system can reason in one unit system.

---

## 5. Step 2 — Implement the reserve-backed StableCoin (`src/StableCoin.sol`)

The mint formula is deliberately tiny:

```
price1e18 = PriceFeedLib.getPrice(ethUsdFeed, heartbeat)
stableOut = msg.value * price1e18 / 1e18
```

Every mint must pass the **PoR gate**:

```
(, int256 reserves, , uint256 updatedAt, ) = porFeed.latestRoundData();
require(reserves > 0);
require(block.timestamp - updatedAt <= 1 days);
require(totalSupply() + stableOut <= uint256(reserves));
```

Guards and why each one is there:

| Guard | Purpose |
|---|---|
| `whenNotPaused` | Kill-switch for oracles misbehaving / migrations |
| `nonReentrant`  | `redeem()` calls out with ETH; keep it safe |
| CEI ordering    | State updated *before* `call{value: ..}` in `redeem` |
| `AccessControl` | `PAUSER_ROLE`, `BRIDGE_ROLE` isolate privileged paths |
| PoR gate        | Hard upper bound on `totalSupply` per attestation |
| Price sanity    | Staleness + non-positive + round checks in library |

`redeem()` mirrors `mint()`: burn first (effects), then `call{value: ethOut}`
(interactions). Never flip that order.

`bridgeMint` / `bridgeBurn` are gated by `BRIDGE_ROLE`; we wire the CCIP bridge
as a holder of that role in Step 5.

---

## 6. Step 3 — Run the tests

```bash
forge test -vvv
```

The suite covers:

- Happy-path mint and redeem (ETH in → wUSD out → ETH back).
- Revert on stale price, zero price, negative price.
- Revert on exceeds-reserves and stale PoR.
- Pausability blocks `mint()`.
- `bridgeMint` is rejected without `BRIDGE_ROLE` and accepted with it.
- `quoteMint` produces the same formula the contract enforces.

The `MockV3Aggregator` in `test/mocks/` lets you freely set `answer`,
`updatedAt`, and `decimals`, which is exactly what you need to exercise the
safety branches of `PriceFeedLib`.

---

## 7. Step 4 — Deploy to Sepolia

```bash
source .env

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvvv
```

The script:

- Deploys a **Mock PoR** aggregator (18 decimals, seeded with 10M reserves) —
  Chainlink does not run a real PoR feed for a workshop token, so we control
  this one ourselves for the demo.
- Deploys `StableCoin` pointing at the real Sepolia ETH/USD feed at
  `0x694AA1769357215DE4FAC081bf1f309aDC325306`.

After deploy, try a mint from `cast`:

```bash
cast send <STABLECOIN> "mint()" --value 0.01ether \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

cast call <STABLECOIN> "balanceOf(address)(uint256)" <YOUR_ADDR> \
  --rpc-url $SEPOLIA_RPC_URL
```

---

## 8. Step 5 (stretch) — CCIP bridge: Sepolia ↔ Fuji

`CCIPBridge.sol` implements a **burn-and-mint** cross-chain transfer:

1. User approves the bridge for `amount` of wUSD.
2. `sendCrossChain(destSelector, recipient, amount)`:
   - Transfers wUSD in, calls `stable.bridgeBurn(address(this), amount)`.
   - Builds `Client.EVM2AnyMessage` with `extraArgs = EVMExtraArgsV2{gasLimit: 200_000, allowOutOfOrderExecution: true}`.
   - Pays the fee in LINK (contract must be pre-funded with LINK).
   - Calls `IRouterClient(router).ccipSend(...)`.
3. On the destination chain, CCIP calls `_ccipReceive`. We:
   - Trust the **router** (enforced by `CCIPReceiver`'s `onlyRouter`).
   - Check the **source chain selector** and **source sender** are on our allowlist.
   - Decode `(recipient, amount)` and call `stable.bridgeMint(recipient, amount)`.
   - The `nonReentrant` modifier on `_ccipReceive` keeps the path safe even if
     the token contract is later upgraded to one with hooks.

Wiring steps (per chain):

```solidity
// After deploying bridges on both chains:
stable.grantRole(stable.BRIDGE_ROLE(), address(bridge));
bridge.setDestinationBridge(<peerChainSelector>, <peerBridgeAddress>);
bridge.setAllowlistedSender(<peerChainSelector>, <peerBridgeAddress>, true);
// Fund the bridge with LINK for fees:
linkToken.transfer(address(bridge), 2 ether);
```

Chain selectors live at [docs.chain.link/ccip/directory](https://docs.chain.link/ccip/directory).

---

## 9. Common pitfalls

- **Staleness**: picking an aggressive heartbeat (e.g. 60s) will DoS your
  contract the first time a feed update is slow. Match the feed's published
  heartbeat (3600s for ETH/USD Sepolia).
- **L2 sequencer feeds**: on Arbitrum/Optimism/Base you must *also* read the
  sequencer uptime feed:
  ```solidity
  (, int256 answer, uint256 startedAt, , ) = seqFeed.latestRoundData();
  require(answer == 0, "down");           // sequencer up
  require(block.timestamp - startedAt > 3600, "grace"); // grace period elapsed
  ```
- **Decimals mismatch**: never assume 8. Always read `feed.decimals()` and
  normalize.
- **CCIP approval order**: approve the **router** for the fee token (and any
  tokenAmounts) **before** calling `ccipSend`. A stale allowance from a
  previous run can silently undercut the new call.
- **Reentrancy in `_ccipReceive`**: the router calls you back inside a message
  delivery — if your receive touches an external token with hooks, wrap the
  handler in `nonReentrant` (as we do) and finish state updates before any
  further external calls.
- **PoR staleness**: a PoR feed that has not updated in >1 day should always
  halt minting. Do not "fall back" to the last known reserves.

---

## 10. Further reading

- Chainlink docs: <https://docs.chain.link>
- Data Feeds API reference: <https://docs.chain.link/data-feeds/api-reference>
- Proof of Reserve: <https://docs.chain.link/data-feeds/proof-of-reserve>
- CCIP: <https://docs.chain.link/ccip>
- CRE templates — `stablecoin-ace-ccip` (the inspiration for this workshop,
  with progressive phases: bank mint → CCIP → PoR + ACE + PolicyEngine):
  <https://github.com/smartcontractkit/cre-templates>
- Stretch extension: add an **ACE / PolicyEngine** layer on top of `mint()`
  and `bridgeMint()` to gate on a blacklist + per-address volume limits. That
  is exactly how the full `stablecoin-ace-ccip` template progresses.
