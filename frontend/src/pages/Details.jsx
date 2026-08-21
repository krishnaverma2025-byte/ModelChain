import { Link, useParams } from "react-router-dom";

const models = {
  "visionai-pro": {
    name: "VisionAI Pro",
    category: "Computer Vision",
    description:
      "Advanced image recognition and object detection model designed for intelligent visual applications.",
    creator: "0x7A...91F2",
    rating: "4.9",
    price: "0.15 ETH",
  },

  "textgen-x": {
    name: "TextGen X",
    category: "Natural Language",
    description:
      "Powerful language model for text generation, summarization, and intelligent content processing.",
    creator: "0x3B...72AC",
    rating: "4.8",
    price: "0.12 ETH",
  },

  "fraudguard": {
    name: "FraudGuard",
    category: "Fraud Detection",
    description:
      "Machine learning model built to identify suspicious transactions and detect fraudulent behavior.",
    creator: "0x9D...45BE",
    rating: "4.7",
    price: "0.18 ETH",
  },
};

function Details() {
  const { id } = useParams();

  // Normalize the URL ID
  const modelId = id?.toLowerCase().trim();

  const model = models[modelId];

  if (!model) {
    return (
      <main className="details-page not-found">
        <h1>Model Not Found</h1>

        <p>
          Model ID: <strong>{id}</strong>
        </p>

        <Link to="/marketplace">
          Back to Marketplace
        </Link>
      </main>
    );
  }

  return (
    <main className="details-page">

      <Link to="/marketplace" className="back-link">
        ← Back to Marketplace
      </Link>

      <div className="details-card">

        <div className="model-icon">
          AI
        </div>

        <div className="model-category">
          {model.category}
        </div>

        <h1>
          {model.name}
        </h1>

        <p className="model-description">
          {model.description}
        </p>

        <div className="details-info">

          <div>
            <span>Creator</span>
            <strong>{model.creator}</strong>
          </div>

          <div>
            <span>Rating</span>
            <strong>★ {model.rating}</strong>
          </div>

          <div>
            <span>License Price</span>
            <strong>{model.price}</strong>
          </div>

        </div>

        <button className="license-button">
          License Model
        </button>

      </div>

    </main>
  );
}

export default Details;