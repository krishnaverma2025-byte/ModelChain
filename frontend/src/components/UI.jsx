import { useEffect, useRef, useState } from "react";
import { config, short } from "../blockchain";
import { explorerLink, networkInfo } from '../networks.mjs';

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
// Render only for models successfully read from the configured contract.
export function VerifiedBadge() {
  return (
    <span
      className="verified-registration"
      title="Registration and integrity metadata are verifiable from MontAI's smart contract. This does not guarantee model quality or safety."
    >
      ✓ Verified on-chain
    </span>
  );
}
export function Icon({ name = "cube" }) {
  const paths = {
    cube: "M12 3 3 8v9l9 5 9-5V8L12 3Zm0 9L3 8m9 4 9-4m-9 4v10",
    trace: "M5 4v12a4 4 0 0 0 4 4h10M5 8h10M5 14h7",
    shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    download: "M12 3v12m0 0 5-5m-5 5-5-5M5 21h14",
    upload: "M12 16V4m0 0L7 9m5-5 5 5M4 15v5h16v-5",
    search: "m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.cube} />
    </svg>
  );
}
export function CopyValue({ value, label = "value", compact = false }) {
  const [status, setStatus] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!value) return <span className="muted">Not available</span>;
  return (
    <span className="technical-value">
      <button
        type="button"
        className="copy-value"
        title={value}
        aria-label={`Copy ${label}: ${value}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setStatus("Copied ✓");
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setStatus(""), 1800);
          } catch {
            setStatus("Copy unavailable");
          }
        }}
      >
        <code>{short(value)}</code>
        <small>{status || "Copy"}</small>
      </button>
      {!compact && (
        <details>
          <summary aria-label={`Show full ${label}`}>Full value</summary>
          <code>{value}</code>
        </details>
      )}
      {!compact && explorerLink(config.chainId, /transaction/i.test(label) ? 'tx' : 'address', value) && <a className="caption" href={explorerLink(config.chainId, /transaction/i.test(label) ? 'tx' : 'address', value)} target="_blank" rel="noopener noreferrer">View on Etherscan ↗</a>}
    </span>
  );
}
export function NetworkBadge({ compact = false }) {
  return (
    <Badge tone="info">
      {compact ? networkInfo(config.chainId).name.replace(' Testnet', '') : <>{networkInfo(config.chainId).name} · <code>{String(config.chainId)}</code></>}
    </Badge>
  );
}
export function TestnetHelp() {
  const network=networkInfo(config.chainId);
  return network.testnet ? <p className="caption">Sepolia Testnet · Test ETH only — no real money. <a href={network.faucet} target="_blank" rel="noopener noreferrer">Get test ETH ↗</a></p> : null;
}
export function Architecture() {
  return (
    <section className="architecture" aria-label="System responsibilities">
      {[
        [
          "ON-CHAIN",
          "info",
          "The verifiable record",
          "Registration, creator, model ID, hash, CID reference, price, licenses, payment accounting and withdrawal events.",
        ],
        [
          "OFF-CHAIN",
          "neutral",
          "The access service",
          "Encryption, Pinata/IPFS upload, wallet challenges, signature authentication, authorization and model delivery.",
        ],
        [
          "LOCAL",
          "success",
          "The integrity check",
          "SHA-256 of the delivered model is compared with its blockchain hash. A CID is a reference, not access control.",
        ],
      ].map(([label, tone, title, copy]) => (
        <article key={label}>
          <Badge tone={tone}>{label}</Badge>
          <h3>{title}</h3>
          <p>{copy}</p>
        </article>
      ))}
    </section>
  );
}
