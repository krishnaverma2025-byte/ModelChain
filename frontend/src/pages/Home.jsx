import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadCatalog } from "../catalog";
import { config, errorText } from "../blockchain";
import { networkInfo } from "../networks.mjs";
import ModelCard from "../components/ModelCard";
import { Icon, CopyValue } from "../components/UI";
import {
  AuroraText,
  InteractiveGridPattern,
  VerificationRing,
} from "../components/BrandEffects";

export default function Home() {
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
              .filter((model) => model.active)
              .reverse()
              .slice(0, 3)
          );
      })
      .catch((error) => {
        if (active) setError(errorText(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  const featured = models[0];
  return (
    <main className="home-page">
      <section className="home-hero">
        <InteractiveGridPattern />
        <div className="home-intro">
          <div className="hero-copy">
            <p className="hero-network">
              Built on {networkInfo(config.chainId).name}
            </p>
            <h1>
              AI models, owned and licensed <AuroraText>on-chain.</AuroraText>
            </h1>
            <p className="lead">
              Discover AI models with verifiable provenance, secure delivery,
              and transparent licensing.
            </p>
            <div className="actions">
              <Link className="primary-button" to="/marketplace">
                Explore models <Icon name="arrow" />
              </Link>
              <Link className="secondary-button" to="/upload-model">
                Publish a model
              </Link>
            </div>
          </div>
          <aside
            className="hero-provenance"
            aria-label="Model provenance preview"
          >
            <InteractiveGridPattern dark />
            <div className="hero-provenance-content">
              <div className="section-head">
                <span className="eyebrow">Model provenance</span>
                <span className="registration-status">
                  {featured
                    ? "Registered"
                    : loading
                    ? "Reading…"
                    : error
                    ? "Unavailable"
                    : "No models"}
                </span>
              </div>
              <div className="hero-model-row">
                <div className="hero-model-summary">
                  <div className="hero-model-icon">
                    {featured ? (
                      featured.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()
                    ) : (
                      <Icon />
                    )}
                  </div>
                  <h2>
                    {featured?.name ||
                      (loading
                        ? "Reading the registry…"
                        : error
                        ? "Registry unavailable"
                        : "No active models")}
                  </h2>
                </div>
                <VerificationRing
                  verified={Boolean(featured)}
                  label="Registration"
                />
              </div>
              <div className="hero-references">
                <div className="hero-reference">
                  <span>
                    <Icon name="shield" /> SHA-256 reference
                  </span>
                  {featured ? (
                    <CopyValue
                      value={featured.modelHash}
                      label="model SHA-256"
                      compact
                    />
                  ) : (
                    <strong>Not available</strong>
                  )}
                </div>
                <div className="hero-reference">
                  <span>
                    <Icon /> Smart contract
                  </span>
                  <strong>{networkInfo(config.chainId).name}</strong>
                </div>
                <div className="hero-reference">
                  <span>
                    <Icon name="download" /> Encrypted storage
                  </span>
                  <strong>
                    {featured?.cid?.startsWith("local-")
                      ? "Local dev"
                      : featured
                      ? "IPFS"
                      : "Not available"}
                  </strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section
        className="recent-models"
        aria-labelledby="recent-models-heading"
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">Featured marketplace</p>
            <h2 id="recent-models-heading">Models built to ship</h2>
            <p>License models directly from their creators.</p>
          </div>
          <Link className="secondary-button" to="/marketplace">
            Explore all models
          </Link>
        </div>
        {loading && <p role="status">Loading models from the blockchain…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && !models.length && (
          <div className="empty-state">
            <h3>No active models</h3>
            <p>Registered active models will appear here.</p>
            <Link to="/upload-model">Publish a model →</Link>
          </div>
        )}
        <div className="models-grid">
          {!error &&
            models.map((model) => <ModelCard key={model.id} model={model} />)}
        </div>
      </section>
      <section className="protocol-banner">
        <div className="protocol-banner-inner">
          <div>
            <p className="eyebrow">TRANSPARENT BY DESIGN</p>
            <h2>Every registration. Every license. On-chain.</h2>
          </div>
          <Link className="secondary-button" to="/activity">
            View protocol activity
          </Link>
        </div>
      </section>
    </main>
  );
}
