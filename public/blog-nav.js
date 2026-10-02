(function () {
  "use strict";

  const INK_CHAIN_ID = 763373;
  const INK_CHAIN_HEX = "0xdef1";

  function ethereum() { return window.ethereum; }
  function isMobileWalletSurface() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches); }
  function shortAddress(address) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"; }
  function walletAppLink() { return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`; }
  function readableError(error, fallback) {
    if (error && error.code === 4001) return "Request cancelled in wallet.";
    if (error && error.code === -32002) return "Wallet request already open.";
    return error && error.message ? error.message.replace(/^.*?:\s*/, "") : fallback;
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
            <button class="blog-wallet-button" id="blogWalletButton" type="button" aria-pressed="false">Connect wallet</button>
          </div>
          <button class="blog-menu-toggle" id="blogMenuToggle" type="button" aria-expanded="false" aria-controls="blogMobileMenu">Menu</button>
        </div>
      </div>
      <nav class="blog-mobile-menu" id="blogMobileMenu" aria-label="More navigation">
        <a href="${root}/blog.html">Blog</a><a href="${root}/calculator.html">Calculator</a><a href="${root}/polls.html">Polls</a><a href="${root}/about.html">About Us</a><a href="${root}/privacy.html">Privacy</a><a href="${root}/contact.html">Contact</a>
      </nav>`;

    const socialScript = document.createElement("script");
    socialScript.src = `${root}/social-icons.js`; socialScript.defer = true; document.head.appendChild(socialScript);

    const walletButton = document.getElementById("blogWalletButton");
    const walletStatus = document.getElementById("blogWalletStatus");
    const menuToggle = document.getElementById("blogMenuToggle");
    const mobileMenu = document.getElementById("blogMobileMenu");
    let currentAddress = "";
    let currentChainId = "";

    function setWalletState(address, message, state) {
      currentAddress = address || "";
      walletStatus.textContent = message || `Wallet: ${shortAddress(currentAddress)}`;
      walletButton.textContent = currentAddress ? "Disconnect wallet" : "Connect wallet";
      walletButton.classList.toggle("is-connected", Boolean(currentAddress));
      walletButton.classList.toggle("is-wrong-network", state === "wrong-network");
      walletButton.setAttribute("aria-pressed", String(Boolean(currentAddress)));
      walletButton.title = currentAddress ? "Disconnect this wallet from this page" : "Connect a browser wallet";
    }

    async function switchToInk(provider) {
      const chainId = await provider.request({ method: "eth_chainId" });
      currentChainId = chainId;
      if (parseInt(chainId, 16) === INK_CHAIN_ID) return true;
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: INK_CHAIN_HEX }] });
      } catch (error) {
        if (!error || error.code !== 4902) throw error;
        await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: INK_CHAIN_HEX, chainName: "Ink Chain", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc-gel.inkonchain.com"], blockExplorerUrls: ["https://explorer.inkonchain.com"] }] });
      }
      currentChainId = INK_CHAIN_HEX;
      return true;
    }

    async function connect() {
      const provider = ethereum();
      if (!provider) {
        if (isMobileWalletSurface()) { walletStatus.textContent = "Opening MetaMask…"; walletButton.disabled = true; window.location.href = walletAppLink(); }
        else setWalletState("", "Install a browser wallet to connect.");
        return;
      }
      walletButton.disabled = true; walletButton.textContent = "Connecting…";
      try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        const address = Array.isArray(accounts) ? accounts[0] : "";
        if (!address) { setWalletState("", "No wallet account was selected."); return; }
        await switchToInk(provider);
        setWalletState(address, `Wallet: ${shortAddress(address)} · Ink Chain ready`, "connected");
      } catch (error) {
        setWalletState(currentAddress, readableError(error, "Connection was not completed."), "error");
      } finally { walletButton.disabled = false; }
    }

    function disconnect() {
      setWalletState("", "Wallet disconnected for this page. Click connect to reconnect.", "disconnected");
    }

    async function handleAccountsChanged(accounts) {
      const address = Array.isArray(accounts) ? accounts[0] : "";
      if (!address) { setWalletState("", "Wallet disconnected.", "disconnected"); return; }
      const provider = ethereum();
      if (provider) {
        try { await switchToInk(provider); setWalletState(address, `Wallet: ${shortAddress(address)} · Ink Chain ready`, "connected"); }
        catch (error) { setWalletState(address, `Wallet: ${shortAddress(address)} · switch network to continue`, "wrong-network"); }
      }
    }

    async function handleChainChanged(chainId) {
      currentChainId = chainId || "";
      if (!currentAddress) return;
      if (parseInt(chainId, 16) === INK_CHAIN_ID) setWalletState(currentAddress, `Wallet: ${shortAddress(currentAddress)} · Ink Chain ready`, "connected");
      else setWalletState(currentAddress, `Wallet: ${shortAddress(currentAddress)} · switch to Ink Chain`, "wrong-network");
    }

    walletButton.addEventListener("click", () => currentAddress ? disconnect() : connect());
    if (menuToggle && mobileMenu) menuToggle.addEventListener("click", () => { const open = mobileMenu.classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open)); });
    const provider = ethereum();
    if (provider && provider.on) { provider.on("accountsChanged", handleAccountsChanged); provider.on("chainChanged", handleChainChanged); }
    if (provider && provider.request) provider.request({ method: "eth_accounts" }).then(handleAccountsChanged).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", renderNavigation);
}());
