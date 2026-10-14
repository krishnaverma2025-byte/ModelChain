import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { readContract, config } from "../blockchain";
import { sharedHistoryReader, selectEvents } from "../activity-history.mjs";
import { Badge, CopyValue } from "./UI";

const filters = [
  "All Events",
  "Registrations",
  "Purchases",
  "Revenue",
  "Status Changes",
  "Withdrawals",
];
export default function History({
  modelId,
  refresh = 0,
  onEvents,
  onBusyChange,
}) {
  const reader = useRef(null);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [type, setType] = useState("All Events"),
    [visible, setVisible] = useState(50);
  useEffect(() => {
    let active = true,
      unsubscribe;
    onBusyChange?.(true);
    Promise.resolve().then(async () => {
      try {
        const contract = await readContract();
        if (!active) return;
        let storage;
        try {
          storage = window.localStorage;
        } catch {
          /* Cache may be disabled. */
        }
        const stream = sharedHistoryReader({
          contract,
          chainId: config.chainId,
          deploymentBlock: config.deploymentBlock,
          storage,
        });
        reader.current = stream;
        const update = () => {
          if (!active) return;
          const snapshot = stream.snapshot();
          setData(snapshot);
          setError(snapshot.error);
          onEvents?.(
            selectEvents(snapshot.events, { modelId }).filter(
              (event) => !event.stale
            )
          );
          onBusyChange?.(snapshot.busy);
        };
        unsubscribe = stream.subscribe(update);
        update();
        const initial = stream.snapshot().phase === "idle";
        await stream.run({
          refresh: true,
          recentOnly: !initial && retry === 0,
          maxRequests: initial || retry ? 400 : 80,
        });
      } catch (error) {
        if (active) {
          setData((previous) =>
            previous ? { ...previous, busy: false } : previous
          );
          setError(
            /Configure VITE_DEPLOYMENT_BLOCK/.test(error.message)
              ? error.message
              : "Blockchain history could not be read. Check the RPC connection, then retry history."
          );
          onBusyChange?.(false);
        }
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [modelId, refresh, retry, onEvents, onBusyChange]);
  const busy = (!data && !error) || Boolean(data?.busy);
  const loaded = selectEvents(data?.events || [], { modelId, type }),
    events = loaded.slice(0, visible);
  const older = () => {
    setVisible((n) => n + 50);
    reader.current?.run({
      maxRequests: 120,
      maxDurationMs: 45000,
      eventTarget: 20,
      modelId,
      type,
    });
  };
  return (
    <div className="history">
      <nav className="category-tabs" aria-label="Contract event filters">
        {filters
          .filter((filter) => !modelId || filter !== "Withdrawals")
          .map((filter) => (
            <button
              key={filter}
              aria-pressed={type === filter}
              onClick={() => {
                setType(filter);
                setVisible(50);
              }}
            >
              {filter}
            </button>
          ))}
      </nav>
      <p className="muted" role="status">
        {error
          ? "History scan interrupted. Retry to continue from saved progress."
          : !data
          ? "Loading recent blockchain activity…"
          : data.busy
          ? `Searching older contract events… ${data.covered.toLocaleString()} of ${data.total.toLocaleString()} blocks scanned (${
              data.requests
            } requests this run).`
          : data.complete
          ? "All available contract history loaded."
          : `Historical activity loaded through block ${
              data.through ?? "pending"
            }. Backfill paused; resume from the saved cursor.`}
      </p>
      {data && (
        <p className="caption">
          {data.events.length} events loaded · {loaded.length} match this view ·
          RPC ranges up to {data.span} blocks · {data.cache}. Latest scanned
          head: {data.latest ?? "pending"}.
        </p>
      )}
      {data?.reorganized && (
        <p className="notice">
          The chain checkpoint changed. Cached history was discarded and is
          being rebuilt from the RPC.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button disabled={busy} onClick={() => setRetry((n) => n + 1)}>
            Retry history
          </button>
        </p>
      )}
      {busy && (
        <button disabled={!data} onClick={() => reader.current?.pause()}>
          Pause historical backfill
        </button>
      )}
      {data && !busy && !error && !loaded.length && (
        <p className="empty-state">
          {data.complete
            ? "No matching events in the complete scanned contract history."
            : "No matching events loaded yet. Older ranges have not all been scanned."}
        </p>
      )}
      {!!events.length && modelId && (
        <ol className="event-timeline">
          {events.map((event) => (
            <li key={event.key}>
              <div className="event-title">
                <strong>{event.title}</strong>
                <Badge tone={event.stale ? "warning" : "info"}>
                  {event.stale ? "STALE · RECHECK NEEDED" : "ON-CHAIN"}
                </Badge>
                <code>Block #{event.block}</code>
                {event.value !== null && <span>{event.value} ETH</span>}
              </div>
              <div className="event-data">
                <div>
                  <span>
                    {event.name === "LicensePurchased"
                      ? "Buyer"
                      : event.name === "ModelStatusChanged"
                      ? "Actor (not emitted)"
                      : "Creator"}
                  </span>
                  <CopyValue value={event.wallet} label="event wallet" />
                </div>
                <div>
                  <span>Transaction</span>
                  <CopyValue value={event.transaction} label="transaction" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {!!events.length && !modelId && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Model</th>
                <th>Transaction</th>
                <th>Block</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.key}>
                  <td>
                    <strong className="event-type">{event.title}</strong>
                    {event.stale && (
                      <Badge tone="warning">STALE · RECHECK NEEDED</Badge>
                    )}
                  </td>
                  <td>
                    {event.modelId ? (
                      <Link to={`/model/${event.modelId}`}>
                        #{event.modelId}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <details className="event-extra">
                      <summary>Event details</summary>
                      <p>
                        {event.value !== null
                          ? `${event.value} ETH`
                          : "No amount emitted"}
                      </p>
                      <CopyValue value={event.wallet} label="event wallet" />
                    </details>
                  </td>
                  <td>
                    <CopyValue value={event.transaction} label="transaction" />
                  </td>
                  <td>
                    <code>#{event.block}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && !data.complete && !error && (
        <div className="actions">
          <button disabled={busy} onClick={older}>
            Load older events
          </button>
          <button disabled={busy} onClick={() => reader.current?.run()}>
            Resume historical backfill
          </button>
        </div>
      )}
      {loaded.length > visible && (
        <button onClick={() => setVisible((n) => n + 50)}>
          Show more loaded events
        </button>
      )}
      <p className="caption">
        Confirmed historical cache is checkpoint-checked; recent events are
        provisional and re-read on refresh. RoyaltyPaid records creator revenue
        accrual, not a withdrawal. Withdrawals are account-level and are
        excluded from model history. ModelStatusChanged emits no actor address.
      </p>
    </div>
  );
}
