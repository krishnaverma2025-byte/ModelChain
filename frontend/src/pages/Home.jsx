import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { categories, loadCatalog } from "../catalog";
import { config, errorText } from "../blockchain";
import ModelCard from "../components/ModelCard";
import {
  Architecture,
  Badge,
  CopyValue,
  Icon,
  NetworkBadge,
} from "../components/UI";
import { AuroraText, InteractiveGridPattern } from "../components/BrandEffects";
export default function Home() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    loadCatalog({ signal: controller.signal })
      .then((items) => {
        if (active)
          setModels(
            items
              .filter((m) => m.active)
              .reverse()
              .slice(0, 3)
          );
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  return (
    <main className="page home-page">
      <section className="home-intro">
        <InteractiveGridPattern />
        <div className="hero-copy">
          <p className="hero-network">
            <NetworkBadge />
          </p>
          <h1>
            AI models, owned and licensed <AuroraText>on-chain.</AuroraText>
          </h1>
          <p className="lead">
            Discover AI models with verifiable provenance, secure delivery, and
            transparent licensing. Direct from independent creators.
          </p>
          <p className="caption">
            On-chain verification confirms registration metadata, not model
            quality or safety.
          </p>
          <div className="actions">
            <Link className="primary-button" to="/marketplace">
              Explore Models <Icon name="arrow" />
            </Link>
            <Link className="secondary-button" to="/upload-model">
              Publish a Model
            </Link>
          </div>
        </div>
        <aside
          className="hero-provenance"
          aria-label="Model provenance preview"
        >
          <InteractiveGridPattern dark />
          <div className="section-head">
            <span className="eyebrow">MODEL PROVENANCE</span>
            <Badge tone={error ? "warning" : "info"}>
              {loading
                ? "READING"
                : error
                ? "UNAVAILABLE"
                : models.length
                ? "ON-CHAIN RECORD"
                : "NO ACTIVE MODELS"}
            </Badge>
          </div>
          <div className="hero-model-icon">
            <Icon />
          </div>
          <h2>
            {models[0]?.name ||
              (loading
                ? "Reading the registry…"
                : error
                ? "Registry unavailable"
                : "Your model belongs here.")}
          </h2>
          <p>
            {models[0]
              ? `Model #${models[0].id} · ${models[0].category}`
              : "An auditable record. Not a trust score."}
          </p>
          <div className="hero-reference">
            <span>
              <Icon name="shield" /> Integrity
            </span>
            <strong>SHA-256 reference</strong>
          </div>
          <div className="hero-reference">
            <span>
              <Icon /> Smart contract
            </span>
            <CopyValue
              value={config.address}
              label="registry contract"
              compact
            />
          </div>
          <div className="hero-reference">
            <span>
              <Icon name="trace" /> Delivery
            </span>
            <strong>Encrypted off-chain</strong>
          </div>
          {models[0] && (
            <Link className="hero-trace-link" to={`/model/${models[0].id}`}>
              Trace this registration <Icon name="arrow" />
            </Link>
          )}
        </aside>
      </section>
      <form
        action="/marketplace"
        className="home-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const query = new FormData(event.currentTarget).get("q").trim();
          navigate(
            `/marketplace${
              query ? `?${new URLSearchParams({ q: query })}` : ""
            }`
          );
        }}
      >
        <label htmlFor="catalog-search">Find your next model</label>
        <div>
          <input
            id="catalog-search"
            name="q"
            type="search"
            placeholder="Search models, creators or categories…"
          />
          <button className="primary-button" type="submit">
            Search models <Icon name="arrow" />
          </button>
        </div>
      </form>
      <nav className="category-tabs" aria-label="Browse model categories">
        <Link to="/marketplace">All</Link>
        {categories.map((category) => (
          <Link
            key={category}
            to={`/marketplace?category=${encodeURIComponent(category)}`}
          >
            {category}
          </Link>
        ))}
      </nav>
      <section
        className="recent-models"
        aria-labelledby="recent-models-heading"
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">FEATURED MARKETPLACE</p>
            <h2 id="recent-models-heading">Discover your next model.</h2>
          </div>
          <Link to="/marketplace">Explore all models →</Link>
        </div>
        {loading && <p role="status">Loading models from the blockchain…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && !models.length && (
          <div className="empty-state">
            <h3>A marketplace ready for your model</h3>
            <p>
              No active registrations yet. Publish a model to make it
              discoverable.
            </p>
            <Link to="/upload-model">Publish a Model →</Link>
          </div>
        )}
        <div className="models-grid">
          {!error &&
            models.map((model) => <ModelCard key={model.id} model={model} />)}
        </div>
      </section>
      <section className="protocol-banner">
        <div>
          <p className="eyebrow">TRANSPARENT BY DESIGN</p>
          <h2>Every registration. Every license. On-chain.</h2>
        </div>
        <Link className="secondary-button" to="/activity">
          View protocol activity <Icon name="arrow" />
        </Link>
      </section>
      <h2 className="section-heading">Why MontAI</h2>
      <section className="capabilities">
        {[
          [
            "trace",
            "VERIFIABLE PROVENANCE",
            "Blockchain-backed creator and model registration.",
          ],
          [
            "cube",
            "WALLET-BOUND LICENSING",
            "Smart contracts record model licenses and payments.",
          ],
          [
            "shield",
            "ENCRYPTED DELIVERY",
            "Only encrypted model files are uploaded to off-chain storage.",
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
