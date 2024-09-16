//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract ERC721Mintable is ERC721Upgradeable {
    event Minted(address indexed owner, uint256 tokenId);

    uint256 private _tokenId = 0;

    constructor(string memory name, string memory symbol) public {
        ERC721Upgradeable.__ERC721_init(name, symbol);
    }

    function mintFast(address to) public returns (uint256) {
        _safeMint(to, _tokenId);

        emit Minted(to, _tokenId);

        _tokenId++;

        return _tokenId - 1; // quick hack
    }

    function mintFastMany(address to, uint256 count) public returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = _tokenId;

            _safeMint(to, _tokenId);

            emit Minted(to, _tokenId);

            _tokenId++;
        }

        return tokenIds;
    }

    function mint(address to, uint256 tokenId) public returns (bool) {
        _safeMint(to, tokenId);

        emit Minted(to, tokenId);

        return true;
    }

    function setBaseURI(string calldata newBaseTokenURI) public {
      _setBaseURI(newBaseTokenURI);
    }
}
