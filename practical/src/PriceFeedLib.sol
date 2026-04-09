// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/// @title PriceFeedLib
/// @notice Safe wrapper around Chainlink AggregatorV3Interface. Performs
///         staleness, negativity, round-completion and decimals normalization
///         checks, returning a price scaled to 18 decimals.
library PriceFeedLib {
    error StalePrice(uint256 updatedAt, uint256 blockTimestamp, uint256 heartbeat);
    error NegativeOrZeroPrice(int256 answer);
    error IncompleteRound(uint80 roundId, uint80 answeredInRound);
    error ZeroUpdatedAt();
    error InvalidDecimals(uint8 decimals);

    uint256 internal constant TARGET_DECIMALS = 18;

    /// @notice Reads the latest price from a Chainlink feed with full safety checks
    ///         and normalizes to 1e18 precision.
    /// @param feed      The aggregator to query.
    /// @param heartbeat Max allowed age (in seconds) for the feed's last update.
    /// @return price1e18 Latest answer scaled to 18 decimals.
    function getPrice(AggregatorV3Interface feed, uint256 heartbeat)
        internal
        view
        returns (uint256 price1e18)
    {
        (
            uint80 roundId,
            int256 answer,
            /* uint256 startedAt */,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        if (answer <= 0) revert NegativeOrZeroPrice(answer);
        if (updatedAt == 0) revert ZeroUpdatedAt();
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
}
