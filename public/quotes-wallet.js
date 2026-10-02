/* Love Letter Wall wallet control with explicit connection state and graceful recovery. */
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
  let currentAddress = "";

  function readableError(error, fallback) {
    if (error && error.code === 4001) return "Request cancelled in wallet.";
    if (error && error.code === -32002) return "Wallet request already open.";
    return error && error.message ? error.message.replace(/^.*?:\s*/, "") : fallback;
  }

  function setWalletState(address, message, state) {
    currentAddress = address || "";
    status.textContent = message || `Wallet: ${shortAddress(currentAddress)}`;
    button.textContent = currentAddress ? "Disconnect wallet" : "Connect wallet";
    button.classList.toggle("is-connected", Boolean(currentAddress));
    button.classList.toggle("is-wrong-network", state === "wrong-network");
    button.setAttribute("aria-pressed", String(Boolean(currentAddress)));
    button.title = currentAddress ? "Disconnect this wallet from this page" : "Connect a browser wallet";
  }

  async function switchToInk(currentProvider) {
    const chainId = await currentProvider.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) === INK_CHAIN_ID) return;
    try {
      await currentProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: INK_CHAIN_HEX }] });
    } catch (error) {
      if (!error || error.code !== 4902) throw error;
      await currentProvider.request({ method: "wallet_addEthereumChain", params: [{ chainId: INK_CHAIN_HEX, chainName: "Ink Chain", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc-gel.inkonchain.com"], blockExplorerUrls: ["https://explorer.inkonchain.com"] }] });
    }
  }

  async function connect() {
    const currentProvider = provider();
    if (!currentProvider) {
      if (isMobileWalletSurface()) { status.textContent = "Opening MetaMask…"; button.disabled = true; window.location.href = walletAppLink(); }
      else setWalletState("", "Install or open a browser wallet to connect.");
      return;
    }
    button.disabled = true; button.textContent = "Connecting…";
    try {
      const accounts = await currentProvider.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) ? accounts[0] : "";
      if (!address) { setWalletState("", "No wallet account was selected."); return; }
      await switchToInk(currentProvider);
      setWalletState(address, `Wallet: ${shortAddress(address)} · Ink Chain ready`, "connected");
    } catch (error) {
      setWalletState(currentAddress, readableError(error, "Connection was not completed."), "error");
    } finally { button.disabled = false; }
  }

  function disconnect() { setWalletState("", "Wallet disconnected for this page. Click connect to reconnect.", "disconnected"); }

  async function handleAccountsChanged(accounts) {
    const address = Array.isArray(accounts) ? accounts[0] : "";
    if (!address) { setWalletState("", "Wallet disconnected.", "disconnected"); return; }
    try { await switchToInk(provider()); setWalletState(address, `Wallet: ${shortAddress(address)} · Ink Chain ready`, "connected"); }
    catch (_) { setWalletState(address, `Wallet: ${shortAddress(address)} · switch to Ink Chain`, "wrong-network"); }
  }

  function handleChainChanged(chainId) {
    if (!currentAddress) return;
    if (parseInt(chainId, 16) === INK_CHAIN_ID) setWalletState(currentAddress, `Wallet: ${shortAddress(currentAddress)} · Ink Chain ready`, "connected");
    else setWalletState(currentAddress, `Wallet: ${shortAddress(currentAddress)} · switch to Ink Chain`, "wrong-network");
  }

  button.addEventListener("click", () => currentAddress ? disconnect() : connect());
  const currentProvider = provider();
  if (currentProvider && currentProvider.on) { currentProvider.on("accountsChanged", handleAccountsChanged); currentProvider.on("chainChanged", handleChainChanged); }
  if (currentProvider && currentProvider.request) currentProvider.request({ method: "eth_accounts" }).then(handleAccountsChanged).catch(() => {});
}());
