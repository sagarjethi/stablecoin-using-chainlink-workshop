// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import {PriceFeedLib} from "./PriceFeedLib.sol";

/// @title StableCoin — Reserve-backed, Chainlink-priced, PoR-gated ERC20
/// @notice Mints a USD-pegged stablecoin against ETH collateral. Price comes
///         from a Chainlink ETH/USD feed; every mint is gated by a Chainlink
///         Proof-of-Reserve feed. Follows CEI throughout.
contract StableCoin is ERC20, AccessControl, Pausable, ReentrancyGuard {
    using PriceFeedLib for AggregatorV3Interface;

    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    // ---------------------------------------------------------------------
    // Immutables / storage
    // ---------------------------------------------------------------------
    AggregatorV3Interface public immutable ethUsdFeed;
    AggregatorV3Interface public immutable porFeed;

    /// @notice Heartbeat (seconds) accepted for the ETH/USD feed.
    uint256 public immutable priceHeartbeat;

    /// @notice Max accepted staleness for the PoR feed.
    uint256 public constant POR_MAX_STALENESS = 1 days;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event Minted(address indexed user, uint256 ethIn, uint256 stableOut, uint256 price1e18);
    event Redeemed(address indexed user, uint256 stableIn, uint256 ethOut, uint256 price1e18);
    event BridgeMinted(address indexed to, uint256 amount);
    event BridgeBurned(address indexed from, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    error ZeroAmount();
    error ExceedsReserves(uint256 requested, uint256 available);
    error PoRStale(uint256 updatedAt, uint256 nowTs);
    error PoRNonPositive(int256 reserves);
    error EthTransferFailed();
    error InsufficientEthInContract(uint256 requested, uint256 available);

    constructor(
        address admin,
        AggregatorV3Interface _ethUsdFeed,
        AggregatorV3Interface _porFeed,
        uint256 _priceHeartbeat
    ) ERC20("Workshop USD", "wUSD") {
        ethUsdFeed = _ethUsdFeed;
        porFeed = _porFeed;
        priceHeartbeat = _priceHeartbeat;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Quote how many stable tokens `ethIn` would mint at the current price.
    function quoteMint(uint256 ethIn) public view returns (uint256 stableOut, uint256 price1e18) {
        price1e18 = ethUsdFeed.getPrice(priceHeartbeat);
        stableOut = (ethIn * price1e18) / 1e18;
    }

    /// @notice Quote how much ETH a `stableIn` redemption returns at the current price.
    function quoteRedeem(uint256 stableIn) public view returns (uint256 ethOut, uint256 price1e18) {
        price1e18 = ethUsdFeed.getPrice(priceHeartbeat);
        ethOut = (stableIn * 1e18) / price1e18;
    }

    /// @notice Read the PoR feed with staleness checks and return reserves (absolute units, same decimals as token).
    function currentReserves() public view returns (uint256) {
        return _readPoR();
    }

    // ---------------------------------------------------------------------
    // Core: mint / redeem
    // ---------------------------------------------------------------------

    /// @notice Deposit ETH, mint wUSD. Gated by Chainlink price + PoR.
    function mint() external payable whenNotPaused nonReentrant {
        // ---------- Checks ----------
        if (msg.value == 0) revert ZeroAmount();

        uint256 price1e18 = ethUsdFeed.getPrice(priceHeartbeat);
        uint256 stableOut = (msg.value * price1e18) / 1e18;
        if (stableOut == 0) revert ZeroAmount();

        uint256 reserves = _readPoR();
        uint256 newSupply = totalSupply() + stableOut;
        if (newSupply > reserves) revert ExceedsReserves(newSupply, reserves);

        // ---------- Effects ----------
        _mint(msg.sender, stableOut);

        // ---------- Interactions ----------
        // (ETH already received via msg.value; no external call needed here.)
        emit Minted(msg.sender, msg.value, stableOut, price1e18);
    }

    /// @notice Burn wUSD, receive ETH back at the current oracle price.
    function redeem(uint256 stableIn) external whenNotPaused nonReentrant {
        // ---------- Checks ----------
        if (stableIn == 0) revert ZeroAmount();

        uint256 price1e18 = ethUsdFeed.getPrice(priceHeartbeat);
        uint256 ethOut = (stableIn * 1e18) / price1e18;
        if (ethOut == 0) revert ZeroAmount();
        if (ethOut > address(this).balance) {
            revert InsufficientEthInContract(ethOut, address(this).balance);
        }

        // ---------- Effects ----------
        _burn(msg.sender, stableIn);

        // ---------- Interactions ----------
        (bool ok, ) = payable(msg.sender).call{value: ethOut}("");
        if (!ok) revert EthTransferFailed();

        emit Redeemed(msg.sender, stableIn, ethOut, price1e18);
    }

    // ---------------------------------------------------------------------
    // Bridge hooks (used by CCIPBridge for burn-and-mint cross-chain flow)
    // ---------------------------------------------------------------------

    /// @notice Mint tokens on behalf of a cross-chain transfer. PoR still gates.
    function bridgeMint(address to, uint256 amount) external whenNotPaused onlyRole(BRIDGE_ROLE) {
        if (amount == 0) revert ZeroAmount();
        uint256 reserves = _readPoR();
        uint256 newSupply = totalSupply() + amount;
        if (newSupply > reserves) revert ExceedsReserves(newSupply, reserves);

        _mint(to, amount);
        emit BridgeMinted(to, amount);
    }

    /// @notice Burn tokens from `from` as part of an outbound cross-chain transfer.
    /// @dev Caller must hold BRIDGE_ROLE. `from` is typically the bridge contract
    ///      itself after the user has transferred tokens into it.
    function bridgeBurn(address from, uint256 amount) external whenNotPaused onlyRole(BRIDGE_ROLE) {
        if (amount == 0) revert ZeroAmount();
        _burn(from, amount);
        emit BridgeBurned(from, amount);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------
    function _readPoR() internal view returns (uint256) {
        (, int256 reserves, , uint256 updatedAt, ) = porFeed.latestRoundData();
        if (reserves <= 0) revert PoRNonPositive(reserves);
        if (updatedAt == 0 || block.timestamp - updatedAt > POR_MAX_STALENESS) {
            revert PoRStale(updatedAt, block.timestamp);
        }
        return uint256(reserves);
    }

    /// @notice Accept bare ETH transfers (useful for topping up redeem liquidity).
    receive() external payable {}
}
