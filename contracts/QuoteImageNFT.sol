// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title Couple in Bond Quote Images
/// @notice Free-to-mint quote image NFTs. Collectors pay only Ink Chain gas.
contract QuoteImageNFT is ERC721URIStorage {
    uint256 private _nextTokenId = 1;

    event QuoteMinted(address indexed collector, uint256 indexed tokenId, string imageUrl);

    constructor() ERC721("Couple in Bond Quote Images", "CIBQ") {}

    /// @notice Mint one quote image NFT using its public image URL as the token URI.
    function mintQuote(string calldata imageUrl) external returns (uint256 tokenId) {
        require(bytes(imageUrl).length > 0, "Image URL required");
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, imageUrl);
        emit QuoteMinted(msg.sender, tokenId, imageUrl);
    }
}

// Deploy with Solidity 0.8.20 and OpenZeppelin Contracts 5.x.
// Use MetaMask on Ink Chain: chain ID 763373 (0xdef1).
// Minting is free at the contract level; collectors still pay network gas.
// tokenURI intentionally returns the image URL directly, as requested.
// Add the deployed address to quotes-mint.js after deployment.
