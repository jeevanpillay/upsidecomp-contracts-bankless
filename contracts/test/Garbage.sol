pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract Garbage is ERC20Upgradeable {
    // 0 ----- 2^256
    uint256 public some_garbage = 1 * (10**18);

    uint256 public some_other_garbage = 1 ether;

    function compare_garbage() external returns (bool) {
        return some_garbage == some_other_garbage;
    }

    constructor() public {
        __ERC20_init("Garbage", "GAR");

        _mint(msg.sender, 1);
    }
}
