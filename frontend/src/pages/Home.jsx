import { Link } from "react-router-dom";
import { Architecture, Badge, Icon } from "../components/UI";
export default function Home() {
  return (
    <main className="page home-page">
      <section className="home-intro">
        <div>
          <p className="eyebrow">MONTAI / MODEL LICENSING INFRASTRUCTURE</p>
          <h1>
            License AI models with
            <br />
            <span>verifiable provenance.</span>
          </h1>
          <p className="lead">
            Register, license and verify AI models using blockchain-backed
            ownership and encrypted decentralized storage.
          </p>
          <div className="actions">
            <Link className="primary-button" to="/marketplace">
              Explore Models <Icon name="arrow" />
            </Link>
            <Link className="secondary-button" to="/upload-model">
              Register Model
            </Link>
          </div>
        </div>
        <aside
          className="registry-illustration"
          aria-label="Traceability layers"
        >
          <div className="illustration-top">
            <Icon name="trace" />
            <span>A verifiable chain of evidence</span>
          </div>
          {[
            ["01", "Creator → Model", "Wallet-bound registration"],
            ["02", "Model → License", "On-chain ownership record"],
            ["03", "License → Access", "Independent authorization"],
            ["04", "Download → Hash", "Local integrity verification"],
          ].map(([n, title, text]) => (
            <div className="trace-step" key={n}>
              <code>{n}</code>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <p className="caption">
            Public proof. Encrypted storage. Verifiable delivery.
          </p>
        </aside>
      </section>
      <section className="capabilities">
        {[
          [
            "trace",
            "MODEL PROVENANCE",
            "Blockchain-backed creator and model registration.",
          ],
          [
            "cube",
            "LICENSE OWNERSHIP",
            "Smart contracts record model licenses and payments.",
          ],
          [
            "shield",
            "INTEGRITY VERIFICATION",
            "Downloaded models are checked against their registered SHA-256 hash.",
          ],
        ].map(([icon, title, copy]) => (
          <article key={title}>
            <Icon name={icon} />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="panel workflow">
        <div className="section-head">
          <div>
            <p className="eyebrow">FROM CREATOR TO VERIFIED FILE</p>
            <h2>Trace the complete lifecycle</h2>
          </div>
          <Link to="/activity">View protocol activity →</Link>
        </div>
        <ol>
          {[
            ["MODEL", "OFF-CHAIN"],
            ["SHA-256", "LOCAL"],
            ["ENCRYPT", "OFF-CHAIN"],
            ["IPFS", "OFF-CHAIN"],
            ["REGISTER", "ON-CHAIN"],
            ["LICENSE", "ON-CHAIN"],
            ["AUTHENTICATE", "OFF-CHAIN"],
            ["DOWNLOAD", "OFF-CHAIN"],
            ["VERIFY", "LOCAL"],
          ].map(([title, layer], i) => (
            <li key={title}>
              <code>{String(i + 1).padStart(2, "0")}</code>
              <strong>{title}</strong>
              <Badge
                tone={
                  layer === "ON-CHAIN"
                    ? "info"
                    : layer === "LOCAL"
                      ? "success"
                      : "neutral"
                }
              >
                {layer}
              </Badge>
            </li>
          ))}
        </ol>
      </section>
      <Architecture />
    </main>
  );
}
