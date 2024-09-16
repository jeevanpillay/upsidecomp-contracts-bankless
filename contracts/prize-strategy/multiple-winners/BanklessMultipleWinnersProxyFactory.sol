// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

import "./BanklessMultipleWinners.sol";
import "@pooltogether/pooltogether-contracts/contracts/external/openzeppelin/ProxyFactory.sol";

/// @title Creates a minimal proxy to the MultipleWinners prize strategy.  Very cheap to deploy.
contract BanklessMultipleWinnersProxyFactory is ProxyFactory {
    BanklessMultipleWinners public instance;

    constructor() public {
        instance = new BanklessMultipleWinners();
    }

    function create() external returns (BanklessMultipleWinners) {
        return BanklessMultipleWinners(deployMinimal(address(instance), ""));
    }
}
