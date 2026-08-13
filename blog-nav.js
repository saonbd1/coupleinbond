// Current CoupleIn theme reminder: keep the pink-to-lilac gradient, rounded white navigation, coral actions, and playful Web3 language.
(function () {
  "use strict";

  const INK_CHAIN_ID = 763373;
  const INK_CHAIN_HEX = "0xdef1";

  function ethereum() {
    return window.ethereum;
  }

  function shortAddress(address) {
    return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected";
  }

  function renderNavigation() {
    const nav = document.querySelector(".blog-nav");
    if (!nav) return;

    const root = nav.dataset.root || ".";
    nav.innerHTML = `
      <div class="blog-nav-main">
        <a class="blog-brand" href="${root}/index.html">💕 Couple in Bond</a>
        <div class="blog-nav-actions">
          <div class="blog-wallet-wrap">
            <span class="blog-wallet-status" id="blogWalletStatus">Wallet: Not connected</span>
            <button class="blog-wallet-button" id="blogWalletButton" type="button">Connect wallet</button>
          </div>
        </div>
      </div>
    `;

    const socialScript = document.createElement("script");
    socialScript.src = `${root}/social-icons.js`;
    socialScript.defer = true;
    document.head.appendChild(socialScript);

    const walletButton = document.getElementById("blogWalletButton");
    const walletStatus = document.getElementById("blogWalletStatus");
    const setWalletState = (address, message) => {
      walletStatus.textContent = message || `Wallet: ${shortAddress(address)}`;
      walletButton.textContent = address ? "Wallet connected" : "Connect wallet";
      walletButton.classList.toggle("is-connected", Boolean(address));
    };

    const switchToInk = async (provider) => {
      const chainId = await provider.request({ method: "eth_chainId" });
      if (parseInt(chainId, 16) === INK_CHAIN_ID) return;
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: INK_CHAIN_HEX }] });
      } catch (error) {
        if (error && error.code !== 4902) throw error;
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
    };

    const connect = async () => {
      const provider = ethereum();
      if (!provider) {
        setWalletState(null, "Install a browser wallet to connect.");
        return;
      }
      walletButton.disabled = true;
      walletButton.textContent = "Connecting…";
      try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        await switchToInk(provider);
        const address = Array.isArray(accounts) ? accounts[0] : "";
        setWalletState(address, `Wallet: ${shortAddress(address)} · Ink Chain ready`);
      } catch (error) {
        setWalletState(null, error && error.message ? error.message : "Connection was not completed.");
      } finally {
        walletButton.disabled = false;
      }
    };

    walletButton.addEventListener("click", connect);
    if (ethereum && ethereum().on) {
      ethereum().on("accountsChanged", (accounts) => setWalletState(accounts && accounts[0]));
      ethereum().on("chainChanged", () => setWalletState(null, "Network changed · connect again if needed"));
    }
  }

  document.addEventListener("DOMContentLoaded", renderNavigation);
}());
