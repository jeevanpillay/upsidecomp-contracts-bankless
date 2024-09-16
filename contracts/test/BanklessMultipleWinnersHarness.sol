// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../prize-strategy/multiple-winners/BanklessMultipleWinners.sol";

/// @title Creates a minimal proxy to the MultipleWinners prize strategy.  Very cheap to deploy.
contract BanklessMultipleWinnersHarness is BanklessMultipleWinners {
    uint256 public currentTime;

    function setCurrentTime(uint256 _currentTime) external {
        currentTime = _currentTime;
    }

    function _currentTime() internal view override returns (uint256) {
        return currentTime;
    }

    function distribute(uint256 randomNumber) external {
        _distribute(randomNumber);
    }

    // function awardPrizes(address[] memory winners) external {
    //   _awardPrizes(winners);
    // }
}
