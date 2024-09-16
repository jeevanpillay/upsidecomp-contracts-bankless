// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@pooltogether/pooltogether-contracts/contracts/prize-strategy/PrizeSplit.sol";

import "../PeriodicPrizeStrategy.sol";

contract BanklessMultipleWinners is PeriodicPrizeStrategy {
    /**
     * @notice Emitted when no winner can be selected during the prize distribution.
     * @dev Emitted when no winner can be selected in _distribute due to ticket.totalSupply() equaling zero.
     */
    event NoWinners();

    /**
     * @notice Emitted when a user is blocked/unblocked from receiving a prize award.
     * @dev Emitted when a contract owner blocks/unblocks user from award selection in _distribute.
     * @param user Address of user to block or unblock
     * @param isBlocked User blocked status
     */
    event BlocklistSet(address indexed user, bool isBlocked);

    /**
     * @notice Emitted when a new draw retry limit is set.
     * @dev Emitted when a new draw retry limit is set. Retry limit is set to limit gas spendings if a blocked user continues to be drawn.
     * @param count Number of winner selection retry attempts 
     */
    event BlocklistRetryCountSet(uint256 count);

    // Mapping of addresses isBlocked status. Can prevent an address from selected during award distribution
    mapping(address => bool) public isBlocklisted;

    // Limit ticket.draw() retry attempts when a blocked address is selected in _distribute.
    uint256 public blocklistRetryCount;

    /**
        * @notice Emitted when the winner selection retry limit is reached during award distribution.
        * @dev Emitted when the maximum number of users has not been selected after the blocklistRetryCount is reached.
        * @param numberOfWinners Total number of winners selected before the blocklistRetryCount is reached.
    */
    event RetryMaxLimitReached(uint256 numberOfWinners);

    function initializeMultipleWinners(
        uint256 _prizePeriodStart,
        uint256 _prizePeriodSeconds,
        BanklessPrizePool _prizePool,
        TicketInterface _ticket,
        IERC20Upgradeable _sponsorship,
        RNGInterface _rng
    ) public initializer {
        PeriodicPrizeStrategy.initialize(
            _prizePeriodStart,
            _prizePeriodSeconds,
            _prizePool,
            _ticket,
            _sponsorship,
            _rng
        );
    }

    /**
     * @notice Block/unblock a user from winning during prize distribution.
     * @dev Block/unblock a user from winning award in prize distribution by updating the isBlocklisted mapping.
     * @param _user Address of blocked user
     * @param _isBlocked Blocked Status (true or false) of user
     */
    function setBlocklisted(address _user, bool _isBlocked) external onlyOwner requireAwardNotInProgress returns (bool) {
        isBlocklisted[_user] = _isBlocked;

        emit BlocklistSet(_user, _isBlocked);

        return true;
    }

    /**
     * @notice Sets the number of attempts for winner selection if a blocked address is chosen.
     * @dev Limits winner selection (ticket.draw) retries to avoid to gas limit reached errors. Increases the probability of not reaching the maximum number of winners if to low.
     * @param _count Number of retry attempts
     */
    function setBlocklistRetryCount(uint256 _count) external onlyOwner requireAwardNotInProgress returns (bool) {
        blocklistRetryCount = _count;

        emit BlocklistRetryCountSet(_count);

        return true;
    }

    /**
     * @notice Maximum number of winners per award distribution period
     * @dev Read maximum number of winners per award distribution period from internal __numberOfWinners variable.
     * @return __numberOfWinners The total number of winners per prize award.
     */
    function numberOfWinners() external view returns (uint256) {
        return numberOfPrizes;
    }

    /**
     * @notice Distributes captured award balance to winners
     * @dev Distributes the captured award balance to the main winner and secondary winners if numberOfPrizes greater than 1.
     * @dev Edge Case: During award of prize, that is, starting from line 130, if an ERC721 cannot be awarded and fails,
     *      follow these steps:
     *      1. Check list of address that the send event failed.
     *      2. Add addresses to blocklist if contract address without onERC721Receive function
     *      3. Change the prizePeriodSeconds to some arbritrary number within the same hour of prize giveaway.
     *      4. Add the prizes back into the prizeStrategy
     *      5. Retry _distribute.
     * @param randomNumber Random number seed used to select winners
     */
    function _distribute(uint256 randomNumber) internal override {
        require(numberOfPrizes > 0, "BanklessMultipleWinners/no-prizes-to-award");

        if (IERC20Upgradeable(address(ticket)).totalSupply() == 0) {
            emit NoWinners();
            return;
        }

        uint256 numberOfWinners = numberOfPrizes;
        address[] memory winners = new address[](numberOfWinners);
        uint256 nextRandom = randomNumber;
        uint256 winnerCount = 0;
        uint256 retries = 0;
        uint256 _retryCount = blocklistRetryCount;
        while (winnerCount < numberOfWinners) {
            address winner = ticket.draw(nextRandom);

            if (!isBlocklisted[winner]) {
                winners[winnerCount++] = winner;
            } else if (++retries >= _retryCount) {
                    // emit address of guy fucking it up!
                    emit RetryMaxLimitReached(winnerCount);
                if (winnerCount == 0) {
                    // optimize: returns if no winner; however, enforcing a larger blocklistRetryCount 
                    // would ensure that this doesn't occur
                    emit NoWinners();
                    return;
                }
                break;
            }

            // add some arbitrary numbers to the previous random number to ensure no matches with the UniformRandomNumber lib
            bytes32 nextRandomHash = keccak256(abi.encodePacked(nextRandom + 499 + winnerCount * 521));
            nextRandom = uint256(nextRandomHash);
        }

        address currentToken = prizesErc721.start();
        uint256 winnerIndex = 0;
        while (currentToken != address(0) && currentToken != prizesErc721.end()) {
            uint256 balance = IERC721Upgradeable(currentToken).balanceOf(address(prizePool));
            if (balance > 0) {
                for (uint256 i = 0; i < prizesErc721TokenIds[IERC721Upgradeable(currentToken)].length; i++) {
                    address winner = winners[winnerIndex];
                    if (winner != address(0)) {
                        // optimize: awardPrize pool wrapped in try/catch to test if
                        // both winner address is valid and tokenId in one operation
                        prizePool.awardPrize(winner, currentToken, prizesErc721TokenIds[IERC721Upgradeable(currentToken)][i]);
                        winnerIndex++;
                    } else {
                        // optimize: address(0) is only found when the retryMaxLimitReached
                        // event is emitted
                        break;
                    }
                }
            }
            _removePrizeByAwardTokens(IERC721Upgradeable(currentToken));
            currentToken = prizesErc721.next(currentToken);
        }
        prizesErc721.clearAll();
        numberOfPrizes = 0;
    }
}