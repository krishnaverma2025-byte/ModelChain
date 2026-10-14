import { useEffect, useState } from "react";
import { config, readContract, errorText } from "../blockchain";
import { CopyValue, NetworkBadge } from "../components/UI";
import History from "../components/History";
export default function Activity() {
  const [count, setCount] = useState(null),
    [error, setError] = useState(""),
    [historyBusy, setHistoryBusy] = useState(true),
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
          <p className="eyebrow">PROTOCOL EXPLORER</p>
          <h1>Blockchain activity</h1>
          <p>
            An auditable event history read directly from the ModelChain
            contract.
          </p>
        </div>
        <button
          disabled={historyBusy}
          onClick={() => {
            setHistoryBusy(true);
            setRefresh((n) => n + 1);
          }}
        >
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
          <span>Contract</span>
          <CopyValue value={config.address} label="contract" compact />
        </article>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="activity-history" aria-label="Contract events">
        <History refresh={refresh} onBusyChange={setHistoryBusy} />
      </section>
    </main>
  );
}
