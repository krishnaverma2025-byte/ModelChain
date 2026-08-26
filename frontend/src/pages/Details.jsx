import { Link, useParams } from "react-router-dom";
import "./Details.css";

function Details() {
  const { id } = useParams();

  const models = {
    "vision-ai": {
      name: "Vision AI",
      category: "Computer Vision",
      description:
        "Advanced computer vision model for image recognition and analysis.",
      about:
        "Vision AI is a computer vision model designed to analyze images and identify objects, patterns, and visual information. It can be used for image recognition, classification, and other computer vision applications.",
      price: "0.05 ETH",
      creator: "MontAI Developer",
      version: "1.0.0",
      license: "Commercial AI License",
    },

    textmind: {
      name: "TextMind",
      category: "Natural Language",
      description:
        "Powerful language model designed for intelligent text generation.",
      about:
        "TextMind is a natural language model designed for intelligent text generation, language understanding, summarization, and other text-based AI applications.",
      price: "0.08 ETH",
      creator: "MontAI Developer",
      version: "1.0.0",
      license: "Commercial AI License",
    },

    predictx: {
      name: "PredictX",
      category: "Predictive AI",
      description:
        "Machine learning model for predictive analytics and forecasting.",
      about:
        "PredictX is a machine learning model designed for predictive analytics and forecasting. It can analyze historical data and generate useful predictions for different applications.",
      price: "0.04 ETH",
      creator: "MontAI Developer",
      version: "1.0.0",
      license: "Commercial AI License",
    },
  };

  const model = models[id];

  if (!model) {
    return (
      <div className="details-page">
        <div className="not-found">
          <h1>Model Not Found</h1>

          <p>
            The model you are looking for does not exist.
          </p>

          <Link
            to="/marketplace"
            className="back-button"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="details-page">

      <main className="details-content">

        <Link
          to="/marketplace"
          className="back-link"
        >
          ← Back to Marketplace
        </Link>

        {/* MODEL HEADER */}
        <div className="details-header">

          <div className="details-icon">
            AI
          </div>

          <div className="details-title">

            <div className="details-category">
              {model.category}
            </div>

            <h1>{model.name}</h1>

            <p>{model.description}</p>

          </div>

        </div>

        {/* MAIN CONTENT */}
        <div className="details-grid">

          <div className="details-left">

            {/* ABOUT */}
            <section className="details-card">

              <h2>About this model</h2>

              <p>
                {model.about}
              </p>

            </section>

            {/* INFORMATION */}
            <section className="details-card">

              <h2>Model Information</h2>

              <div className="info-row">
                <span>Creator</span>
                <strong>{model.creator}</strong>
              </div>

              <div className="info-row">
                <span>Version</span>
                <strong>{model.version}</strong>
              </div>

              <div className="info-row">
                <span>Category</span>
                <strong>{model.category}</strong>
              </div>

              <div className="info-row">
                <span>License</span>
                <strong>{model.license}</strong>
              </div>

            </section>

          </div>

          {/* PRICE CARD */}
          <aside className="license-card">

            <div className="license-label">
              LICENSE PRICE
            </div>

            <div className="license-price">
              {model.price}
            </div>

            <p>
              Purchase a license to use this AI model.
            </p>

            <button className="license-button">
              License Model
            </button>

          </aside>

        </div>

      </main>

    </div>
  );
}

export default Details;