import { Link } from "react-router-dom";
import { Badge, CopyValue, VerifiedBadge, Icon } from "./UI";

export default function ModelCard({ model }) {
  return (
    <article className="model-card">
      <div className="model-art" data-category={model.category}>
        <span className="art-category">{model.category}</span>
        <span className="model-monogram" aria-hidden="true">
          {model.name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase()}
        </span>
        <span className="art-proof">
          <Icon name="shield" /> SHA-256 registered
        </span>
      </div>
      <div className="model-card-body">
        <div className="section-head">
          <p className="caption">
            MODEL <code>#{model.id}</code>
          </p>
          <Badge tone={model.active ? "success" : "neutral"}>
            {model.active ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>
        <h2>{model.name}</h2>
        <p className="model-description">{model.description}</p>
        <VerifiedBadge />
        <div className="card-creator">
          <span>Creator</span>
          <CopyValue value={model.owner} label="creator" compact />
        </div>
        <div className="model-footer">
          <div>
            <span className="caption">License</span>
            <strong>
              {model.price} <span>ETH</span>
            </strong>
          </div>
          <Link to={`/model/${model.id}`}>View Model →</Link>
        </div>
      </div>
    </article>
  );
}
