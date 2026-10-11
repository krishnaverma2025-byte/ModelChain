import { useEffect, useRef, useState } from "react";
import { NetworkBadge, Badge } from "./UI";
import { config, wallet, short, errorText } from "../blockchain";

export default function WalletStatus() {
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    let disposed = false;
    const accounts = (values) => {
      if (!disposed) {
        setAccount(values[0] || "");
        setMenuOpen(false);
      }
    };
    const network = (value) => {
      if (!disposed) setChain(value);
    };
    ethereum
      .request({ method: "eth_accounts" })
      .then(accounts)
      .catch(() => {});
    ethereum
      .request({ method: "eth_chainId" })
      .then(network)
      .catch(() => {});
    ethereum.on("accountsChanged", accounts);
    ethereum.on("chainChanged", network);
    return () => {
      disposed = true;
      ethereum.removeListener("accountsChanged", accounts);
      ethereum.removeListener("chainChanged", network);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function connect() {
    try {
      const result = await wallet();
      setAccount(result.address);
      setError("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function switchWallet() {
    setMenuOpen(false);
    try {
      // This opens MetaMask's account picker
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      setAccount(accounts[0] || "");
      setError("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  function disconnect() {
    setMenuOpen(false);
    setAccount("");
    setError("");
  }

  const wrong = chain && BigInt(chain) !== config.chainId;

  return (
    <div className="wallet-status" ref={wrapperRef}>
      {wrong ? <Badge tone="error">Wrong network</Badge> : <NetworkBadge />}
      {account ? (
        <div className="wallet-menu-wrapper">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            title={account}
            aria-expanded={menuOpen}
            className="wallet-address-button"
          >
            <span className="wallet-dot" />
            {short(account)}
            <span className="wallet-chevron">{menuOpen ? "▲" : "▼"}</span>
          </button>
          {menuOpen && (
            <div className="wallet-dropdown">
              <div className="wallet-dropdown-header">
                <span className="wallet-dropdown-label">Connected wallet</span>
                <code className="wallet-dropdown-address" title={account}>
                  {account}
                </code>
              </div>
              <div className="wallet-dropdown-divider" />
              <button onClick={switchWallet}>Switch wallet</button>
              <button onClick={disconnect} className="wallet-disconnect-btn">
                Disconnect
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={connect} title="Connect MetaMask">
          Connect wallet
        </button>
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
