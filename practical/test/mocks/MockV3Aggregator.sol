// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/// @notice Minimal mock Chainlink aggregator for tests. Lets tests freely set
///         price, updatedAt and decimals.
contract MockV3Aggregator is AggregatorV3Interface {
    uint8 private _decimals;
    string private constant _description = "MockV3Aggregator";
    uint256 private constant _version = 1;

    uint80 public roundId;
    int256 public answer;
    uint256 public startedAt;
    uint256 public updatedAt;
    uint80 public answeredInRound;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _set(initialAnswer, block.timestamp);
    }

    // --- test helpers ---
    function setAnswer(int256 newAnswer) external {
        _set(newAnswer, block.timestamp);
    }

    function setAnswerAndUpdatedAt(int256 newAnswer, uint256 newUpdatedAt) external {
        _set(newAnswer, newUpdatedAt);
    }

    function setUpdatedAt(uint256 newUpdatedAt) external {
        updatedAt = newUpdatedAt;
        startedAt = newUpdatedAt;
    }

    function setDecimals(uint8 d) external {
        _decimals = d;
    }

    function setAnsweredInRound(uint80 r) external {
        answeredInRound = r;
    }

    function _set(int256 newAnswer, uint256 ts) internal {
        roundId += 1;
        answer = newAnswer;
        startedAt = ts;
        updatedAt = ts;
        answeredInRound = roundId;
    }

    // --- AggregatorV3Interface ---
    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return _description;
    }

    function version() external pure override returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 /*_roundId*/)
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }
}
