// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {StableCoin} from "../src/StableCoin.sol";
import {MockV3Aggregator} from "../test/mocks/MockV3Aggregator.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/// @notice Sepolia deploy script.
///   - ETH/USD feed is the real Chainlink Sepolia aggregator.
///   - PoR is a mock the workshop attendee deploys + controls, because
///     Chainlink does not run a PoR feed for a workshop token.
contract Deploy is Script {
    // Chainlink Sepolia ETH/USD, 8 decimals, 3600s heartbeat.
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

        console2.log("StableCoin deployed:", address(coin));
        console2.log("Mock PoR feed:      ", address(porFeed));
        console2.log("Admin:              ", admin);
    }
}
