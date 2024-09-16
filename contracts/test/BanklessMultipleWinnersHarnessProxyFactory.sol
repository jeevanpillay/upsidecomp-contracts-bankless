// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

import "./BanklessMultipleWinnersHarness.sol";
import "@pooltogether/pooltogether-contracts/contracts/external/openzeppelin/ProxyFactory.sol";

/// @title Creates a minimal proxy to the MultipleWinners prize strategy.  Very cheap to deploy.
contract BanklessMultipleWinnersHarnessProxyFactory is ProxyFactory {
    BanklessMultipleWinnersHarness public instance;

    constructor() public {
        instance = new BanklessMultipleWinnersHarness();
    }

    function create() external returns (BanklessMultipleWinnersHarness) {
        return BanklessMultipleWinnersHarness(deployMinimal(address(instance), ""));
    }
}
