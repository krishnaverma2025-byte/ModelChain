import { Link } from "react-router-dom";
import "./Marketplace.css";

function Marketplace() {
  const models = [
    {
      name: "Vision AI",
      description:
        "Advanced computer vision model for image recognition and analysis.",
      price: "0.05 ETH",
      category: "Computer Vision",
    },
    {
      name: "TextMind",
      description:
        "Powerful language model designed for intelligent text generation.",
      price: "0.08 ETH",
      category: "Natural Language",
    },
    {
      name: "PredictX",
      description:
        "Machine learning model for predictive analytics and forecasting.",
      price: "0.04 ETH",
      category: "Predictive AI",
    },
  ];

  return (
    <div className="marketplace-page">

      <header className="page-navbar">
        <Link to="/" className="page-logo">
          MontAI
        </Link>

        <nav>
          <Link to="/">Home</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/upload">Upload Model</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>

        <Link to="/login" className="page-login">
          Login
        </Link>
      </header>

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
            <div className="model-card" key={model.name}>

              <div className="model-icon">
                AI
              </div>

              <h2>{model.name}</h2>

              <p>{model.description}</p>

              <div className="model-info">
                <strong>{model.price}</strong>
                <span>{model.category}</span>
              </div>

              <button className="model-button">
                View Model Details →
              </button>

            </div>
          ))}
        </div>

      </main>

    </div>
  );
}

export default Marketplace;