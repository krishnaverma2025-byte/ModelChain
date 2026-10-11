import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useIdentity from "../useIdentity";
import { config, errorText } from "../blockchain";
import {
  disconnectWallet,
  switchWallet,
  switchNetwork,
  logout,
} from "../identity";
import { CopyValue, NetworkBadge, Badge } from "./UI";
export default function WalletStatus() {
  const state = useIdentity(),
    ref = useRef(null);
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const close = (e) => {
      if (
        e.key === "Escape" ||
        (e.type === "pointerdown" && !ref.current?.contains(e.target))
      )
        setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, []);
  async function action(fn) {
    setOpen(false);
    try {
      await fn();
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }
  const wrong = state.chain && state.chain !== String(config.chainId);
  return (
    <div className="wallet-status" ref={ref}>
      {wrong ? (
        <>
          <Badge tone="error">Wrong network</Badge>
          <button onClick={() => action(switchNetwork)}>Switch network</button>
        </>
      ) : (
        <NetworkBadge />
      )}
      {state.authenticated ? (
        <div className="profile-menu-wrapper">
          <button
            aria-expanded={open}
            aria-controls="wallet-menu"
            onClick={() => setOpen(!open)}
          >
            ● {state.authenticated.slice(0, 6)}…{state.authenticated.slice(-4)}{" "}
            ▾
          </button>
          {open && (
            <div id="wallet-menu" className="profile-dropdown">
              <p className="eyebrow">CONNECTED WALLET</p>
              <CopyValue value={state.authenticated} label="wallet" compact />
              <button onClick={() => action(switchWallet)}>
                Switch wallet
              </button>
              <button onClick={() => action(disconnectWallet)}>
                Disconnect wallet
              </button>
              {!state.profile && (
                <Link to="/profile" onClick={() => setOpen(false)}>
                  Profile & options
                </Link>
              )}
              {!state.profile && (
                <button onClick={() => action(logout)}>Logout</button>
              )}
            </div>
          )}
        </div>
      ) : (
        <Link className="login-button" to="/login">
          Sign in
        </Link>
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
