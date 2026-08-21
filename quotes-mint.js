/* Free quote-image minting for Ink Chain. Add the deployed contract address below. */
(function () {
  "use strict";

  const INK_CHAIN_ID = 763373;
  const INK_CHAIN_HEX = "0xdef1";
  const QUOTE_CONTRACT_ADDRESS = "";
  const QUOTE_CONTRACT_ABI = ["function mintQuote(string imageUrl) external returns (uint256 tokenId)"];
  const dialog = document.querySelector("[data-lightbox]");
  const mintButton = dialog && dialog.querySelector("[data-lightbox-mint]");
  const mintStatus = dialog && dialog.querySelector("[data-lightbox-mint-status]");
  if (!dialog || !mintButton) return;

  let currentImageUrl = "";

  function setStatus(message, state) {
    if (mintStatus) mintStatus.textContent = message || "";
    mintButton.classList.toggle("is-success", state === "success");
    mintButton.classList.toggle("is-error", state === "error");
  }

  async function switchToInk(provider) {
    const chainId = await provider.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) === INK_CHAIN_ID) return;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: INK_CHAIN_HEX }] });
    } catch (error) {
      if (!error || error.code !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: INK_CHAIN_HEX,
          chainName: "Ink Chain",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc-gel.inkonchain.com"],
          blockExplorerUrls: ["https://explorer.inkonchain.com"]
        }]
      });
    }
  }

  function setQuoteImage(url) {
    currentImageUrl = url || "";
    mintButton.disabled = false;
    mintButton.textContent = "Mint this quote";
    setStatus(QUOTE_CONTRACT_ADDRESS ? "Free mint · Ink Chain gas applies" : "Contract address pending deployment");
  }

  async function mintQuote() {
    if (!QUOTE_CONTRACT_ADDRESS) {
      setStatus("The quote contract address will be added after deployment.", "error");
      return;
    }
    if (!currentImageUrl) {
      setStatus("Open a quote image first.", "error");
      return;
    }
    if (!window.ethereum) {
      setStatus("Install or open a browser wallet to mint.", "error");
      return;
    }
    if (typeof ethers === "undefined") {
      setStatus("Wallet library failed to load. Refresh and try again.", "error");
      return;
    }

    mintButton.disabled = true;
    mintButton.textContent = "Preparing mint…";
    setStatus("Approve the free mint transaction in your wallet.");
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await switchToInk(window.ethereum);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(QUOTE_CONTRACT_ADDRESS, QUOTE_CONTRACT_ABI, provider.getSigner());
      const tx = await contract.mintQuote(currentImageUrl);
      mintButton.textContent = "Minting…";
      setStatus("Waiting for confirmation on Ink Chain…");
      await tx.wait();
      mintButton.textContent = "Minted ✓";
      setStatus(`Mint confirmed · ${tx.hash.slice(0, 10)}…`, "success");
    } catch (error) {
      if (error && error.code === 4001) setStatus("Transaction cancelled in wallet.", "error");
      else setStatus(error && error.message ? error.message : "Minting failed.", "error");
      mintButton.textContent = "Mint this quote";
      mintButton.disabled = false;
    }
  }

  mintButton.addEventListener("click", mintQuote);
  window.quoteMint = { setQuoteImage };
}());
