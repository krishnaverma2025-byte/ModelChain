import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">

      <main className="hero">

        <div className="hero-badge">
          DECENTRALIZED AI MARKETPLACE
        </div>

        <h1 className="hero-title">
          <span>Own Your</span>
          <span className="gradient-text">AI License</span>
        </h1>

        <div className="hero-brand">
          MontAI
        </div>

        <p className="hero-description">
          Discover and license AI models through transparent,
          blockchain-based ownership and smart contracts.
        </p>

        <div className="hero-actions">

          <Link
            to="/marketplace"
            className="primary-button"
          >
            Explore Models
          </Link>

          <Link
            to="/upload-model"
            className="secondary-button"
          >
            List Your Model
          </Link>

        </div>

      </main>

    </div>
  );
}

export default Home;