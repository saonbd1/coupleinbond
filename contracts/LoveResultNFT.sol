// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title Couple in Bond Love Results
/// @notice Free-to-mint calculator result NFTs. Collectors pay only Ink Chain gas.
contract LoveResultNFT is ERC721URIStorage {
    struct Result {
        string name1;
        string name2;
        uint8 score;
        string imageUrl;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => Result) private _results;

    event LoveResultMinted(
        address indexed collector,
        uint256 indexed tokenId,
        string name1,
        string name2,
        uint8 score,
        string imageUrl
    );

    constructor() ERC721("Couple in Bond Love Results", "CIBR") {}

    /// @notice Mint a free result NFT. The image URL should point to permanent public storage such as IPFS.
    function mintResult(
        string calldata name1,
        string calldata name2,
        uint8 score,
        string calldata imageUrl
    ) external returns (uint256 tokenId) {
        require(bytes(name1).length > 0, "First name required");
        require(bytes(name2).length > 0, "Second name required");
        require(score <= 101, "Invalid score");
        require(bytes(imageUrl).length > 0, "Image URL required");

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, imageUrl);
        _results[tokenId] = Result(name1, name2, score, imageUrl);

        emit LoveResultMinted(msg.sender, tokenId, name1, name2, score, imageUrl);
    }

    function getResult(uint256 tokenId) external view returns (Result memory) {
        require(_ownerOf(tokenId) != address(0), "Result does not exist");
        return _results[tokenId];
    }
}

// Deploy with Solidity 0.8.20+ and OpenZeppelin Contracts 5.x.
// Deploy through Remix on Ink Chain (chain ID 763373 / 0xdef1).
// There are no constructor arguments and no mint payment.
// Upload the generated PNG to permanent public storage before calling mintResult.
