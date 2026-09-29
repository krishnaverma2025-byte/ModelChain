import { useEffect, useState } from "react";
import { config, readContract, errorText } from "../blockchain";
import useWalletRead from "../useWalletRead";
import { Architecture, CopyValue, NetworkBadge } from "../components/UI";
import History from "../components/History";
export default function Activity() {
  const address = useWalletRead();
  const [count, setCount] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    readContract()
      .then((c) => c.getModelCount())
      .then((n) => {
        if (active) {
          setCount(String(n));
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setCount(null);
          setError(errorText(e));
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  return (
    <main className="page activity-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PROTOCOL / EXPLORER</p>
          <h1>Protocol Activity</h1>
          <p>The public record behind every model license.</p>
        </div>
        <button onClick={() => setRefresh((n) => n + 1)}>
          Refresh chain data
        </button>
      </header>
      <div className="metrics">
        <article>
          <span>Network</span>
          <NetworkBadge />
        </article>
        <article>
          <span>Registered Models</span>
          <strong>{count ?? "Unavailable"}</strong>
        </article>
        <article>
          <span>Connected Wallet</span>
          {address ? (
            <CopyValue value={address} label="connected wallet" />
          ) : (
            <span>Not connected</span>
          )}
        </article>
      </div>
      <div className="contract-strip">
        <span>Contract</span>
        <CopyValue value={config.address} label="contract" />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="panel">
        <h2>Contract events</h2>
        <History refresh={refresh} />
      </section>
      <h2 className="section-heading">What belongs on the blockchain?</h2>
      <Architecture />
    </main>
  );
}
