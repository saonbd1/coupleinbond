/* Design reminder: Love Letter Wall — keep the wallet control compact, legible, and honest about connection and network state on every viewport. */
(function () {
  "use strict";

  const INK_CHAIN_ID = 763373;
  const INK_CHAIN_HEX = "0xdef1";
  const button = document.getElementById("quotesWalletButton");
  const status = document.getElementById("quotesWalletStatus");
  if (!button || !status) return;

  const provider = () => window.ethereum;
  const isMobileWalletSurface = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const walletAppLink = () => `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
  const shortAddress = (address) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected";

  function setWalletState(address, message) {
    status.textContent = message || `Wallet: ${shortAddress(address)}`;
    button.textContent = address ? "Wallet connected" : "Connect wallet";
    button.classList.toggle("is-connected", Boolean(address));
  }

  async function switchToInk(currentProvider) {
    const chainId = await currentProvider.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) === INK_CHAIN_ID) return;
    try {
      await currentProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: INK_CHAIN_HEX }] });
    } catch (error) {
      if (!error || error.code !== 4902) throw error;
      await currentProvider.request({
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

  async function connect() {
    const currentProvider = provider();
    if (!currentProvider) {
      if (isMobileWalletSurface()) {
        status.textContent = "Opening MetaMask…";
        button.disabled = true;
        window.location.href = walletAppLink();
      } else {
        setWalletState(null, "Install or open a browser wallet to connect.");
      }
      return;
    }
    button.disabled = true;
    button.textContent = "Connecting…";
    try {
      const accounts = await currentProvider.request({ method: "eth_requestAccounts" });
      await switchToInk(currentProvider);
      const address = Array.isArray(accounts) ? accounts[0] : "";
      setWalletState(address, `Wallet: ${shortAddress(address)} · Ink ready`);
    } catch (error) {
      setWalletState(null, error && error.message ? error.message : "Connection was not completed.");
    } finally {
      button.disabled = false;
    }
  }

  async function restoreConnection() {
    const currentProvider = provider();
    if (!currentProvider || !currentProvider.request) return;
    try {
      const accounts = await currentProvider.request({ method: "eth_accounts" });
      if (Array.isArray(accounts) && accounts[0]) setWalletState(accounts[0]);
    } catch (_) {
      // A wallet may reject passive account discovery; leave the explicit button available.
    }
  }

  button.addEventListener("click", connect);
  const currentProvider = provider();
  if (currentProvider && currentProvider.on) {
    currentProvider.on("accountsChanged", (accounts) => setWalletState(accounts && accounts[0]));
    currentProvider.on("chainChanged", () => setWalletState(null, "Network changed · connect again"));
  }
  restoreConnection();
}());
