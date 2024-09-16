pragma solidity 0.6.12;

import "./BanklessPrizePoolHarness.sol";
import "@pooltogether/pooltogether-contracts/contracts/external/openzeppelin/ProxyFactory.sol";

/// @title Bankless Prize Pool Proxy Factory
/// @notice Minimal proxy pattern for creating new Bankless Prize Pools
contract BanklessPrizePoolHarnessProxyFactory is ProxyFactory {
    /// @notice Contract template for deploying proxied Prize Pools
    BanklessPrizePoolHarness public instance;

    /// @notice Initializes the Factory with an instance of the Bankless Prize Pool
    constructor() public {
        instance = new BanklessPrizePoolHarness();
    }

    /// @notice Creates a new Bankless Prize Pool as a proxy of the template instance
    /// @return A reference to the new proxied Bankless Prize Pool
    function create() external returns (BanklessPrizePoolHarness) {
        return BanklessPrizePoolHarness(deployMinimal(address(instance), ""));
    }
}
