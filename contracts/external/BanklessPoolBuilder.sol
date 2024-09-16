// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/SafeCastUpgradeable.sol";

import "@pooltogether/pooltogether-contracts/contracts/registry/RegistryInterface.sol";

import "../prize-pool/BanklessPrizePoolProxyFactory.sol";
import "../prize-pool/BanklessPrizePool.sol";
import "./BanklessMultipleWinnersBuilder.sol";

contract BanklessPoolBuilder {
    using SafeCastUpgradeable for uint256;

    event BanklessPrizePoolWithMultipleWinnersCreated(
        BanklessPrizePool indexed prizePool,
        BanklessMultipleWinners indexed prizeStrategy
    );

    struct BanklessPrizePoolConfig {
        IERC20Upgradeable token;
        uint256 maxExitFeeMantissa;
    }

    RegistryInterface public reserveRegistry;
    BanklessPrizePoolProxyFactory public banklessPrizePoolProxyFactory;
    BanklessMultipleWinnersBuilder public multipleWinnersBuilder;

    constructor(
        RegistryInterface _reserveRegistry,
        BanklessPrizePoolProxyFactory _banklessPrizePoolProxyFactory,
        BanklessMultipleWinnersBuilder _multipleWinnersBuilder
    ) public {
        require(address(_reserveRegistry) != address(0), "GlobalBuilder/reserveRegistry-not-zero");
        require(
            address(_banklessPrizePoolProxyFactory) != address(0),
            "GlobalBuilder/banklessPrizePoolProxyFactory-not-zero"
        );
        require(address(_multipleWinnersBuilder) != address(0), "GlobalBuilder/multipleWinnersBuilder-not-zero");

        reserveRegistry = _reserveRegistry;
        banklessPrizePoolProxyFactory = _banklessPrizePoolProxyFactory;
        multipleWinnersBuilder = _multipleWinnersBuilder;
    }

    function createBanklessMultipleWinners(
        BanklessPrizePoolConfig memory prizePoolConfig,
        BanklessMultipleWinnersBuilder.MultipleWinnersConfig memory prizeStrategyConfig,
        uint8 decimals,
        address owner
    ) external returns (BanklessPrizePool) {
        BanklessPrizePool prizePool = banklessPrizePoolProxyFactory.create();
        BanklessMultipleWinners prizeStrategy = multipleWinnersBuilder.createMultipleWinners(
            prizePool,
            prizeStrategyConfig,
            decimals,
            owner
        );
        prizePool.initialize(
            reserveRegistry,
            _tokens(prizeStrategy),
            prizePoolConfig.maxExitFeeMantissa,
            prizePoolConfig.token
        );
        prizePool.setPrizeStrategy(prizeStrategy);
        prizePool.setCreditPlanOf(
            address(prizeStrategy.ticket()),
            prizeStrategyConfig.ticketCreditRateMantissa.toUint128(),
            prizeStrategyConfig.ticketCreditLimitMantissa.toUint128()
        );
        prizePool.transferOwnership(owner);
        emit BanklessPrizePoolWithMultipleWinnersCreated(prizePool, prizeStrategy);
        return prizePool;
    }

    function _tokens(BanklessMultipleWinners _multipleWinners)
        internal
        view
        returns (ControlledTokenInterface[] memory)
    {
        ControlledTokenInterface[] memory tokens = new ControlledTokenInterface[](2);
        tokens[0] = ControlledTokenInterface(address(_multipleWinners.ticket()));
        tokens[1] = ControlledTokenInterface(address(_multipleWinners.sponsorship()));
        return tokens;
    }
}
