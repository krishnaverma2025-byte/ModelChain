import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import { readContract, metadata, errorText } from "../blockchain";
import { Badge, CopyValue, Icon } from "../components/UI";
export default function Marketplace() {
  const [models, setModels] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [status, setStatus] = useState("Active"),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const c = await readContract();
        const count = await c.getModelCount();
        const items = [];
        for (let id = 1n; id <= count; id++) {
          const m = await c.getModel(id);
          items.push({
            id: String(m.id),
            name: m.name,
            owner: m.owner,
            active: m.active,
            price: formatEther(m.price),
            ...(await metadata(id)),
          });
        }
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
    };
  }, [revision]);
  const visible = models.filter(
    (m) =>
      (status === "All statuses" || m.active === (status === "Active")) &&
      (category === "All categories" || m.category === category) &&
      [m.name, m.description, m.owner, m.id].some((v) =>
        v?.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  return (
    <main className="page marketplace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">MODEL REGISTRY</p>
          <h1>Discover AI Models</h1>
          <p>
            Explore registered models. Inspect their provenance before you
            license.
          </p>
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
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["All categories", ...new Set(models.map((m) => m.category))].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["Active", "Inactive", "All statuses"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setRevision((n) => n + 1)}>Refresh</button>
        </label>
      </div>
      {loading && <p role="status">Loading models from the blockchain…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!loading && !error && (
        <p className="caption">
          {visible.length} matching models · Blockchain-backed registry
        </p>
      )}
      {!loading && !error && !visible.length && (
        <div className="empty-state">
          <h2>No models available</h2>
          <p>Register a model or adjust your filters.</p>
        </div>
      )}
      <div className="models-grid">
        {visible.map((m) => (
          <article className="model-card" key={m.id}>
            <div className="section-head">
              <span className="model-category">{m.category}</span>
              <Badge tone={m.active ? "success" : "neutral"}>
                {m.active ? "ACTIVE" : "INACTIVE"}
              </Badge>
            </div>
            <p className="caption">
              MODEL <code>#{m.id}</code>
            </p>
            <h2>{m.name}</h2>
            <p className="model-description">{m.description}</p>
            <div className="card-creator">
              <span>Creator</span>
              <CopyValue value={m.owner} label="creator" />
            </div>
            <div className="model-footer">
              <strong>
                {m.price} <span>ETH</span>
              </strong>
              <Link to={`/model/${m.id}`}>View Model Details →</Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
