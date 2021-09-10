// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@pooltogether/pooltogether-contracts/contracts/prize-strategy/PrizeSplit.sol";

import "../PeriodicPrizeStrategy.sol";

contract BanklessMultipleWinners is PeriodicPrizeStrategy {
  // Mapping of addresses isBlocked status. Can prevent an address from selected during award distribution
  mapping(address => bool) public isBlocklisted;

  // Carry over the awarded prize for the next drawing when selected winners is less than __numberOfWinners
  bool public carryOverBlocklist;

  // Limit ticket.draw() retry attempts when a blocked address is selected in _distribute.
  uint256 public blocklistRetryCount;

  /**
    * @notice Emitted when carryOverBlocklist is toggled.
    * @dev Emitted when carryOverBlocklist is toggled for distribution of the primary and secondary prizes.
    * @param carry Awarded prize carry over status
  */
  event BlocklistCarrySet(bool carry);

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

  /**
    * @notice Emitted when the winner selection retry limit is reached during award distribution.
    * @dev Emitted when the maximum number of users has not been selected after the blocklistRetryCount is reached.
    * @param numberOfWinners Total number of winners selected before the blocklistRetryCount is reached.
  */
  event RetryMaxLimitReached(uint256 numberOfWinners);

  /**
    * @notice Emitted when no winner can be selected during the prize distribution.
    * @dev Emitted when no winner can be selected in _distribute due to ticket.totalSupply() equaling zero.
  */
  event NoWinners();

  function initializeMultipleWinners (
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
    * @notice Toggle if an unawarded prize amount should be kept for the next draw or evenly distrubted to selected winners.
    * @dev Toggles if the main prize (prizePool.captureAwardBalance) and secondary prizes (LootBox) should be kept for the next draw or evenly distrubted if maximum number of winners is not selected.
    * @param _carry Award carry over status (true or false)
  */
  function setCarryBlocklist(bool _carry) external onlyOwner requireAwardNotInProgress returns (bool) {
    carryOverBlocklist = _carry;

    emit BlocklistCarrySet(_carry);

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
    * @dev Distributes the captured award balance to the main winner and secondary winners if __numberOfWinners greater than 1.
    * @param randomNumber Random number seed used to select winners
  */
  function _distribute(uint256 randomNumber) internal override {
    require(numberOfPrizes > 0, "BanklessMultipleWinners/no-prizes-to-award");

    if (IERC20Upgradeable(address(ticket)).totalSupply() == 0) {
      emit NoWinners();
      return;
    }

    bool _carryOverBlocklistPrizes = carryOverBlocklist;

    // main winner is simply the first that is drawn
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
        emit RetryMaxLimitReached(winnerCount);
        if(winnerCount == 0) {
          emit NoWinners();
        }
        break;
      }

      // add some arbitrary numbers to the previous random number to ensure no matches with the UniformRandomNumber lib
      bytes32 nextRandomHash = keccak256(abi.encodePacked(nextRandom + 499 + winnerCount*521));
      nextRandom = uint256(nextRandomHash);
    }

    require(winnerCount > 0, "BanklessMultipleWinners/winner-count-zero");

    _awardPrizes(winners);
  }
}
