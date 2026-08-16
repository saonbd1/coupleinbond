(function () {
  "use strict";

  const INK_CHAIN_ID = 763373;
  const INK_CHAIN_HEX = "0xdef1";

  function ethereum() {
    return window.ethereum;
  }

  function isMobileWalletSurface() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  function shortAddress(address) {
    return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected";
  }

  function walletAppLink() {
    const dappPath = `${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
    return `https://metamask.app.link/dapp/${dappPath}`;
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
            <span class="blog-wallet-status" id="blogWalletStatus" aria-live="polite">Wallet: Not connected</span>
            <button class="blog-wallet-button" id="blogWalletButton" type="button">Connect wallet</button>
          </div>
          <button class="blog-menu-toggle" id="blogMenuToggle" type="button" aria-expanded="false" aria-controls="blogMobileMenu">Menu</button>
        </div>
      </div>
      <nav class="blog-mobile-menu" id="blogMobileMenu" aria-label="More navigation">
        <a href="${root}/blog.html">Blog</a>
        <a href="${root}/calculator.html">Calculator</a>
        <a href="${root}/polls.html">Polls</a>
        <a href="${root}/about.html">About Us</a>
        <a href="${root}/privacy.html">Privacy</a>
        <a href="${root}/contact.html">Contact</a>
      </nav>
    `;

    const socialScript = document.createElement("script");
    socialScript.src = `${root}/social-icons.js`;
    socialScript.defer = true;
    document.head.appendChild(socialScript);

    const walletButton = document.getElementById("blogWalletButton");
    const walletStatus = document.getElementById("blogWalletStatus");
    const menuToggle = document.getElementById("blogMenuToggle");
    const mobileMenu = document.getElementById("blogMobileMenu");
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
        if (isMobileWalletSurface()) {
          walletStatus.textContent = "Opening MetaMask…";
          walletButton.disabled = true;
          window.location.href = walletAppLink();
        } else {
          setWalletState(null, "Install a browser wallet to connect.");
        }
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

    const restoreConnection = async () => {
      const provider = ethereum();
      if (!provider || !provider.request) return;
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (Array.isArray(accounts) && accounts[0]) setWalletState(accounts[0]);
      } catch (_) {
        // Some mobile wallets reject passive account discovery; the explicit button remains available.
      }
    };

    walletButton.addEventListener("click", connect);
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener("click", () => {
        const open = mobileMenu.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(open));
      });
    }
    if (ethereum && ethereum().on) {
      ethereum().on("accountsChanged", (accounts) => setWalletState(accounts && accounts[0]));
      ethereum().on("chainChanged", () => setWalletState(null, "Network changed · connect again if needed"));
    }
    restoreConnection();
  }

  document.addEventListener("DOMContentLoaded", renderNavigation);
}());
