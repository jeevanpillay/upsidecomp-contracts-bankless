pragma solidity 0.6.12;

import "../prize-pool/BanklessPrizePool.sol";

/* solium-disable security/no-block-members */
contract BanklessPrizePoolHarness is BanklessPrizePool {
    uint256 public currentTime;

    function setCurrentTime(uint256 _currentTime) external {
        currentTime = _currentTime;
    }

    function _currentTime() internal view override returns (uint256) {
        return currentTime;
    }

    function supply(uint256 mintAmount) external {
        //_supply(mintAmount);
    }

    function redeem(uint256 redeemAmount) external returns (uint256) {
        return redeemAmount;
    }
}
