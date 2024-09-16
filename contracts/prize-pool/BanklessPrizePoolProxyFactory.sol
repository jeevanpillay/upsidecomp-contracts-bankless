// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./BanklessPrizePool.sol";
import "@pooltogether/pooltogether-contracts/contracts/external/openzeppelin/ProxyFactory.sol";

contract BanklessPrizePoolProxyFactory is ProxyFactory {
    /// @notice Contract template for deploying proxied Prize Pools
    BanklessPrizePool public instance;

    /// @notice Initializes the Factory with an instance of the Stake Prize Pool
    constructor() public {
        instance = new BanklessPrizePool();
    }

    /// @notice Creates a new Stake Prize Pool as a proxy of the template instance
    /// @return A reference to the new proxied Stake Prize Pool
    function create() external returns (BanklessPrizePool) {
        return BanklessPrizePool(deployMinimal(address(instance), ""));
    }
}
