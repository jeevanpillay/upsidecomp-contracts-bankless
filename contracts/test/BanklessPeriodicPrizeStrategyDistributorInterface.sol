pragma solidity 0.6.12;

import "../prize-strategy/PeriodicPrizeStrategy.sol";

/* solium-disable security/no-block-members */
interface BanklessPeriodicPrizeStrategyDistributorInterface {
    function distribute(uint256 randomNumber) external;
}
