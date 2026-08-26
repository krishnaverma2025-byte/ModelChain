import { Link } from "react-router-dom";
import "./Marketplace.css";

function Marketplace() {
  const models = [
    {
      id: "vision-ai",
      name: "Vision AI",
      description:
        "Advanced computer vision model for image recognition and analysis.",
      price: "0.05 ETH",
      category: "Computer Vision",
    },
    {
      id: "textmind",
      name: "TextMind",
      description:
        "Powerful language model designed for intelligent text generation.",
      price: "0.08 ETH",
      category: "Natural Language",
    },
    {
      id: "predictx",
      name: "PredictX",
      description:
        "Machine learning model for predictive analytics and forecasting.",
      price: "0.04 ETH",
      category: "Predictive AI",
    },
  ];

  return (
    <div className="marketplace-page">

      <main className="marketplace-content">

        <div className="section-label">
          FEATURED MODELS
        </div>

        <h1>Discover AI Models</h1>

        <p className="section-description">
          Explore models available for decentralized licensing.
        </p>

        <div className="models-grid">

          {models.map((model) => (
            <div className="model-card" key={model.id}>

              <div className="model-icon">
                AI
              </div>

              <h2>{model.name}</h2>

              <p>{model.description}</p>

              <div className="model-info">
                <strong>{model.price}</strong>
                <span>{model.category}</span>
              </div>

              <Link
                to={`/model/${model.id}`}
                className="model-button"
              >
                <span>View Model Details</span>
                <span className="button-arrow">→</span>
              </Link>

            </div>
          ))}

        </div>

      </main>

    </div>
  );
}

export default Marketplace;