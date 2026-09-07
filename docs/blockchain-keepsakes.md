# Blockchain keepsakes

The blockchain features are optional. The core relationship tools remain usable without a wallet.

## Network

The contracts are written for Solidity `0.8.20+` and are intended for Ink Chain, whose chain ID is `763373` (`0xdef1`). Users need a compatible wallet such as MetaMask and must pay the network gas required by the transaction.

## Love Result NFT

`contracts/LoveResultNFT.sol` stores two names, a score, and an image URL for each minted result. The contract itself does not charge a mint price. A generated image should be uploaded to permanent public storage before minting.

## Quote Image NFT

`contracts/QuoteImageNFT.sol` mints a quote image using its public image URL as the token URI. The contract does not charge a mint price; the collector still pays network gas.

## Important considerations

- Minting is optional and should be treated as a technical keepsake, not as a guarantee of permanent availability for third-party storage.
- Never place wallet private keys or seed phrases in the repository.
- Confirm the deployed contract address and network before connecting a wallet.
- Review the transaction details in the wallet before approving a mint.
