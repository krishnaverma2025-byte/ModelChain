import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { readContract, errorText, config } from "../blockchain";
import { readEventPage, explorerTransaction } from "../activity";
import { Badge, CopyValue } from "./UI";

export default function History({ modelId, refresh = 0, onEvents }) {
  const revision = useRef(0);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    const requests = revision;
    requests.current++;
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setBusy(true);
      setError("");
      setData(null);
      try {
        const c = await readContract();
        const result = await readEventPage(c, { modelId });
        if (active) {
          setData(result);
          onEvents?.(result.events);
        }
      } catch (e) {
        if (active) setError(errorText(e));
      } finally {
        if (active) setBusy(false);
      }
    });
    return () => {
      active = false;
      requests.current++;
    };
  }, [modelId, refresh, onEvents, retry]);
  async function older() {
    const request = revision.current;
    setBusy(true);
    setError("");
    try {
      const c = await readContract();
      const page = await readEventPage(c, { modelId, toBlock: data.older });
      if (request !== revision.current) return;
      const merged = {
        ...page,
        to: data.to,
        events: [...data.events, ...page.events],
      };
      setData(merged);
      onEvents?.(merged.events);
    } catch (e) {
      if (request === revision.current) setError(errorText(e));
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }
  return (
    <div className="history">
      <p className="muted">
        {data
          ? `Blocks ${data.from}–${data.to} · ${data.events.length} events in loaded range`
          : "Reading contract logs…"}{" "}
        · Confirmed chain data, not off-chain activity.
      </p>
      {error && (
        <p role="alert" className="error">
          {error} <button disabled={busy} onClick={() => setRetry(n => n + 1)}>Retry history</button>
        </p>
      )}
      {busy && <p aria-live="polite">Loading events…</p>}
      {data?.events.length === 0 && !busy && (
        <p className="empty-state">No events in this block range.</p>
      )}
      {!!data?.events.length && modelId && (
        <ol className="event-timeline">
          {[...data.events].reverse().map((e) => (
            <li key={e.key}>
              <div className="event-title">
                <strong>{e.title}</strong>
                <Badge tone="info">ON-CHAIN</Badge>
                <code>Block #{e.block}</code>
                {e.value !== null && <span>{e.value} ETH</span>}
              </div>
              <div className="event-data">
                <div>
                  <span>
                    {e.name === "LicensePurchased" ? "Buyer" : e.name === "ModelStatusChanged" ? "Actor (not emitted)" : "Creator"}
                  </span>
                  <CopyValue value={e.wallet} label="event wallet" />
                </div>
                <div>
                  <span>Transaction</span>
                  <CopyValue value={e.transaction} label="transaction" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {!!data?.events.length && !modelId && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Model</th>
                <th>Wallet</th>
                <th>Value</th>
                <th>Block</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.key}>
                  <td>
                    <strong>{e.title}</strong>
                    <br />
                    <Badge tone="info">ON-CHAIN</Badge>
                  </td>
                  <td>
                    {e.modelId ? (
                      <Link to={`/model/${e.modelId}`}>#{e.modelId}</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <CopyValue value={e.wallet} label="event wallet" />
                  </td>
                  <td>{e.value !== null ? `${e.value} ETH` : "—"}</td>
                  <td>
                    <code>#{e.block}</code>
                  </td>
                  <td>
                    <CopyValue value={e.transaction} label="transaction" />
                    {explorerTransaction(
                      config.chainId,
                      e.transaction,
                      import.meta.env.VITE_EXPLORER_URL,
                    ) && (
                      <a
                        href={explorerTransaction(
                          config.chainId,
                          e.transaction,
                          import.meta.env.VITE_EXPLORER_URL,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Explorer
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.older !== null && data && (
        <button disabled={busy} onClick={older}>
          Load older blocks
        </button>
      )}
      <p className="caption">
        RoyaltyPaid records creator revenue accrual, not a withdrawal.
        Withdrawals are account-level and cannot be attributed to one model.
        ModelStatusChanged does not include a wallet address in its event.
      </p>
    </div>
  );
}
