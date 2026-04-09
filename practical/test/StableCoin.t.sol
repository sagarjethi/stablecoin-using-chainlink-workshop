// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StableCoin} from "../src/StableCoin.sol";
import {PriceFeedLib} from "../src/PriceFeedLib.sol";
import {MockV3Aggregator} from "./mocks/MockV3Aggregator.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract StableCoinTest is Test {
    StableCoin internal coin;
    MockV3Aggregator internal priceFeed; // 8 decimals, like ETH/USD
    MockV3Aggregator internal porFeed;   // 18 decimals, like PoR for wUSD

    address internal admin = address(0xA11CE);
    address internal user  = address(0xBEEF);

    uint256 internal constant HEARTBEAT = 3600;

    function setUp() public {
        // ETH = $2000, 8 decimals
        priceFeed = new MockV3Aggregator(8, 2000e8);
        // Reserves = 1,000,000 wUSD worth, 18 decimals
        porFeed = new MockV3Aggregator(18, int256(1_000_000e18));

        coin = new StableCoin(
            admin,
            AggregatorV3Interface(address(priceFeed)),
            AggregatorV3Interface(address(porFeed)),
            HEARTBEAT
        );

        vm.deal(user, 100 ether);
        // Warp forward so "block.timestamp - updatedAt" math is meaningful but fresh.
        vm.warp(block.timestamp + 1);
    }

    // --- happy path ---
    function test_Mint_HappyPath() public {
        vm.prank(user);
        coin.mint{value: 1 ether}();

        // 1 ETH * $2000 => 2000 wUSD
        assertEq(coin.balanceOf(user), 2000e18);
        assertEq(address(coin).balance, 1 ether);
    }

    function test_Redeem_BurnsAndReturnsEth() public {
        vm.prank(user);
        coin.mint{value: 1 ether}();

        uint256 balBefore = user.balance;
        vm.prank(user);
        coin.redeem(2000e18);

        assertEq(coin.balanceOf(user), 0);
        assertEq(user.balance, balBefore + 1 ether);
    }

    // --- price feed safety ---
    function test_Mint_RevertsOnStalePrice() public {
        // Move updatedAt far in the past.
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
    }

    function test_Mint_RevertsOnNegativePrice() public {
        priceFeed.setAnswer(-1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(PriceFeedLib.NegativeOrZeroPrice.selector, int256(-1)));
        coin.mint{value: 1 ether}();
    }

    // --- PoR gate ---
    function test_Mint_RevertsWhenExceedsReserves() public {
        // Shrink reserves below what 1 ETH would mint.
        porFeed.setAnswer(int256(1000e18)); // only 1000 wUSD of reserves
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(StableCoin.ExceedsReserves.selector, 2000e18, 1000e18)
        );
        coin.mint{value: 1 ether}();
    }

    function test_Mint_RevertsOnStalePoR() public {
        // Price feed fresh, but PoR stale.
        porFeed.setUpdatedAt(1); // ancient
        vm.prank(user);
        vm.expectRevert();
        coin.mint{value: 1 ether}();
    }

    // --- pausability ---
    function test_Mint_RevertsWhenPaused() public {
        vm.prank(admin);
        coin.pause();

        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        coin.mint{value: 1 ether}();
    }

    // --- access control on bridge mint ---
    function test_BridgeMint_RevertsWithoutRole() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                coin.BRIDGE_ROLE()
            )
        );
        coin.bridgeMint(user, 1e18);
    }

    function test_BridgeMint_WorksWithRole() public {
        vm.prank(admin);
        coin.grantRole(coin.BRIDGE_ROLE(), admin);

        vm.prank(admin);
        coin.bridgeMint(user, 500e18);

        assertEq(coin.balanceOf(user), 500e18);
    }

    // --- quote views ---
    function test_QuoteMint_MatchesFormula() public view {
        (uint256 stableOut, uint256 price1e18) = coin.quoteMint(1 ether);
        assertEq(price1e18, 2000e18);
        assertEq(stableOut, 2000e18);
    }
}
