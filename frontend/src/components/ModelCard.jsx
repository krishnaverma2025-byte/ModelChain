import { Link } from "react-router-dom";
import { Badge, CopyValue, Icon } from "./UI";
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
          <Icon name="shield" />
          SHA-256 registered
        </span>
      </div>
      <div className="model-card-body">
        <div className="card-heading">
          <div>
            <h2>{model.name}</h2>
            <CopyValue value={model.owner} label="creator" compact />
          </div>
          <Badge tone={model.active ? "success" : "neutral"}>
            {model.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="model-footer">
          <div>
            <p>License</p>
            <strong>{model.price} ETH</strong>
          </div>
          <Link to={`/model/${model.id}`}>
            View model <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
