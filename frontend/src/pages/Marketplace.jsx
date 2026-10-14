import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorText } from "../blockchain";
import { categories, loadCatalog } from "../catalog";
import ModelCard from "../components/ModelCard";
import { Icon } from "../components/UI";
export default function Marketplace() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const category = params.get("category") || "All categories";
  function filter(key, value) {
    const next = new URLSearchParams(params);
    if (value && value !== "All categories") next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const [models, setModels] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Active"),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller=new AbortController();
    async function load() {
      setLoading(true);
      try {
        const items = await loadCatalog({signal:controller.signal});
        if (active) {
          setModels(items);
          setError("");
        }
      } catch (e) {
        if (active) setError(errorText(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [revision]);
  const visible = models.filter(
    (m) =>
      (status === "All statuses" || m.active === (status === "Active")) &&
      (category === "All categories" || m.category === category) &&
      [m.name, m.description, m.owner, m.id, m.category].some((v) =>
        v?.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  return (
    <main className="page marketplace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">MONTAI MARKETPLACE</p>
          <h1>Explore AI Models</h1>
          <p>Find verified AI model registrations from independent creators.</p>
        </div>
        <Link className="primary-button" to="/upload-model">
          Register Model <Icon name="arrow" />
        </Link>
      </header>
      <div className="registry-toolbar">
        <label className="search">
          Search models
          <input
            type="search"
            placeholder="Name, description, creator or model ID"
            value={query}
            onChange={(e) => filter("q", e.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => filter("category", e.target.value)}
          >
            {[
              "All categories",
              ...new Set([
                ...categories,
                ...models.map((m) => m.category).filter(Boolean),
              ]),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["Active", "Inactive", "All statuses"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button onClick={() => setRevision((n) => n + 1)} disabled={loading}>
          Refresh
        </button>
      </div>
      <nav className="category-tabs" aria-label="Model categories">
        {["All categories", ...categories].map((item) => (
          <button
            key={item}
            aria-pressed={category === item}
            onClick={() => filter("category", item)}
          >
            {item === "All categories" ? "All" : item}
          </button>
        ))}
      </nav>
      {loading && <p role="status">Loading models from the blockchain…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!loading && !error && (
        <p className="caption">
          {visible.length} matching models · Registration verifiable on-chain
        </p>
      )}
      {!loading && !error && !visible.length && (
        <div className="empty-state">
          <h2>No models available</h2>
          <p>Register a model or adjust your filters.</p>
        </div>
      )}
      <div className="models-grid">
        {!loading &&
          !error &&
          visible.map((m) => <ModelCard model={m} key={m.id} />)}
      </div>
    </main>
  );
}
