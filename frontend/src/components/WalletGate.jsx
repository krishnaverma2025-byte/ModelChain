import { useState } from "react";
import useIdentity from "../useIdentity";
import { signInWallet, switchWallet, switchNetwork } from "../identity";
import { config, errorText } from "../blockchain";
import { CopyValue, NetworkBadge } from "./UI";
export default function WalletGate({ action = "continue" }) {
  const state = useIdentity();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const mismatch =
    state.linked &&
    state.connected &&
    state.linked.toLowerCase() !== state.connected.toLowerCase();
  const wrong = state.chain && state.chain !== String(config.chainId);
  if (state.authenticated && !mismatch && !wrong) return null;
  return (
    <section className="auth-prerequisite" aria-label="Wallet authentication">
      <h3>
        {mismatch
          ? "Wallet mismatch"
          : wrong
            ? "Wrong network"
            : "Authentication required"}
      </h3>
      {mismatch ? (
        <>
          <p>Your MontAI profile is linked to:</p>
          <CopyValue value={state.linked} label="linked wallet" />
          <p>Currently connected:</p>
          <CopyValue value={state.connected} label="connected wallet" />
          <button onClick={() => run(switchWallet)} disabled={busy}>
            Switch wallet
          </button>
        </>
      ) : wrong ? (
        <>
          <p>
            MontAI currently requires <NetworkBadge />.
          </p>
          <button onClick={() => run(switchNetwork)} disabled={busy}>
            Switch network
          </button>
        </>
      ) : (
        <>
          <p>Sign in with your wallet to {action}.</p>
          <button
            className="primary-button"
            onClick={() => run(signInWallet)}
            disabled={busy}
          >
            {busy
              ? state.status || "Authenticating wallet…"
              : "Sign in with MetaMask"}
          </button>
        </>
      )}
      {(error || state.status) && (
        <p role={error ? "alert" : "status"}>{error || state.status}</p>
      )}
    </section>
  );
}
