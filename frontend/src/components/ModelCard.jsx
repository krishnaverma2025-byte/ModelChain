import { Link } from "react-router-dom";
import { Badge, CopyValue, VerifiedBadge } from "./UI";

export default function ModelCard({ model }) {
  return (
    <article className="model-card">
      <div className="section-head">
        <span className="model-category">{model.category}</span>
        <Badge tone={model.active ? "success" : "neutral"}>
          {model.active ? "ACTIVE" : "INACTIVE"}
        </Badge>
      </div>
      <p className="caption">
        MODEL <code>#{model.id}</code>
      </p>
      <h2>{model.name}</h2>
      <p className="model-description">{model.description}</p>
      <VerifiedBadge />
      <div className="card-creator">
        <span>Creator</span>
        <CopyValue value={model.owner} label="creator" compact />
      </div>
      <div className="model-footer">
        <strong>
          {model.price} <span>ETH</span>
        </strong>
        <Link to={`/model/${model.id}`}>View Model →</Link>
      </div>
    </article>
  );
}
