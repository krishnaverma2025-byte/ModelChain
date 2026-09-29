import { useEffect, useRef } from "react";
import { config } from "../blockchain";
import { Badge, CopyValue, NetworkBadge } from "./UI";

export function ProvenanceFields({ model, license, registration, integrity }) {
  return (
    <dl className="provenance-fields">
      {[
        ["Model", `${model.name} · #${model.id}`],
        ["Network", <NetworkBadge />],
        ["Creator", <CopyValue value={model.creator} label="creator" />],
        ["Contract", <CopyValue value={config.address} label="contract" />],
        [
          "Storage reference",
          <CopyValue value={model.cid} label="storage reference" />,
        ],
        ["SHA-256", <CopyValue value={model.modelHash} label="SHA-256" />],
        ["License price", `${model.price} ETH`],
        ["Current wallet", license],
        [
          "Registration block",
          registration ? (
            <code>#{registration.block}</code>
          ) : (
            "Not available in loaded logs"
          ),
        ],
        [
          "Registration transaction",
          <CopyValue
            value={registration?.transaction}
            label="registration transaction"
          />,
        ],
        ["Integrity", integrity || "Not verified in this session"],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function ProvenanceDrawer({ onClose, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="provenance-drawer"
      aria-labelledby="provenance-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="drawer-body">
        <header className="section-head">
          <div>
            <p className="eyebrow">CHAIN OF EVIDENCE</p>
            <h2 id="provenance-title">Model provenance</h2>
          </div>
          <button autoFocus onClick={onClose} aria-label="Close provenance">
            Close
          </button>
        </header>
        <Badge tone="info">ON-CHAIN RECORD</Badge>
        <ProvenanceFields {...props} />
        <p className="caption">
          A registration establishes this wallet's on-chain claim; it does not
          independently prove authorship or model quality. IPFS stores encrypted
          bytes, not access rights.
        </p>
      </div>
    </dialog>
  );
}
export function SessionTimeline({ events }) {
  return (
    <section className="session-timeline">
      <h3>Current-session evidence</h3>
      <p className="caption">
        Cleared when wallet, network or model changes. Off-chain history is not
        reconstructed from blockchain logs.
      </p>
      {events.length ? (
        <ol>
          {events.map((e, i) => (
            <li key={i}>
              <Badge tone={e.tone || "neutral"}>{e.layer}</Badge>
              <strong>{e.title}</strong>
              <span>{e.detail}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">
          No authentication, download or integrity result observed in this
          session.
        </p>
      )}
    </section>
  );
}
