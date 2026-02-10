// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Brushies is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor(address initialOwner)
        ERC721("Brushie's", "BRSH")
        Ownable(initialOwner)
    {}

    /// @notice Mint a new Brushie NFT to `to` with the given IPFS metadata URI.
    /// @dev Open minting — any wallet can call this.
    /// @param to          The recipient address.
    /// @param metadataUri The IPFS metadata URI (e.g. "ipfs://Qm...").
    function mint(address to, string memory metadataUri) external {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
    }

    /// @notice Returns the next token ID that will be minted.
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    // ─── Required Overrides ──────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
