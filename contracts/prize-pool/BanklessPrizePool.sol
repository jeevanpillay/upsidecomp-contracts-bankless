// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@pooltogether/pooltogether-contracts/contracts/prize-pool/stake/StakePrizePool.sol";

contract BanklessPrizePool is StakePrizePool {
    event AwardedExternalSingleERC721(address indexed to, address indexed externalToken, uint256 externalTokenId);

    function awardPrize(
        address to,
        address externalToken,
        uint256 tokenId
    ) external onlyPrizeStrategy returns (bool) {
        require(_canAwardExternal(externalToken), "BanklessPrizePool/invalid-external-token");

        try IERC721Upgradeable(externalToken).safeTransferFrom(address(this), to, tokenId){
            
        } catch(bytes memory error){
            emit ErrorAwardingExternalERC721(error);
            return false;
        }

        emit AwardedExternalSingleERC721(to, externalToken, tokenId);
        return true;
    }
}
