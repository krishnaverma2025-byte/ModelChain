import { Link } from "react-router-dom";
import "./Marketplace.css";

function Marketplace() {
  return (
    <div className="marketplace-page">

      {/* HERO */}
      <section className="marketplace-hero">

        <div className="marketplace-badge">
          DECENTRALIZED AI MARKETPLACE
        </div>

        <h1>
          Discover AI Models
        </h1>

        <p>
          Explore, license, and own AI models through
          transparent blockchain-powered licensing.
        </p>

      </section>


      {/* MODELS HEADER */}
      <section className="models-header">

        <div className="models-title">

          <h2>
            Available Models
          </h2>

          <p>
            6 models available
          </p>

        </div>


        <div className="category-buttons">

          <button className="category-button active">
            All Models
          </button>

          <button className="category-button">
            Computer Vision
          </button>

          <button className="category-button">
            NLP
          </button>

        </div>

      </section>


      {/* MODEL GRID */}
      <section className="models-grid">


        {/* VISION AI */}
        <Link
          to="/model/visionai-pro"
          className="model-card-link"
        >

          <div className="model-card">

            <div className="model-card-top">

              <div className="model-icon">
                AI
              </div>

              <div className="model-category">
                Computer Vision
              </div>

            </div>


            <h3>
              VisionAI Pro
            </h3>

            <p className="model-description">
              Advanced image recognition and object
              detection model designed for intelligent
              visual applications.
            </p>


            <div className="model-card-footer">

              <div className="model-info">
                <span>Creator</span>
                <strong>0x7A...91F2</strong>
              </div>

              <div className="model-rating">
                <span>Rating</span>
                <strong>★ 4.9</strong>
              </div>

            </div>

          </div>

        </Link>


        {/* TEXTGEN */}
        <Link
          to="/model/textgen-x"
          className="model-card-link"
        >

          <div className="model-card">

            <div className="model-card-top">

              <div className="model-icon">
                AI
              </div>

              <div className="model-category">
                Natural Language
              </div>

            </div>


            <h3>
              TextGen X
            </h3>

            <p className="model-description">
              Powerful language model for text generation,
              summarization, and intelligent content
              processing.
            </p>


            <div className="model-card-footer">

              <div className="model-info">
                <span>Creator</span>
                <strong>0x3B...72AC</strong>
              </div>

              <div className="model-rating">
                <span>Rating</span>
                <strong>★ 4.8</strong>
              </div>

            </div>

          </div>

        </Link>


        {/* FRAUDGUARD */}
        <Link
          to="/model/fraudguard"
          className="model-card-link"
        >

          <div className="model-card">

            <div className="model-card-top">

              <div className="model-icon">
                AI
              </div>

              <div className="model-category">
                Fraud Detection
              </div>

            </div>


            <h3>
              FraudGuard
            </h3>

            <p className="model-description">
              Machine learning model built to identify
              suspicious transactions and detect
              fraudulent behavior.
            </p>


            <div className="model-card-footer">

              <div className="model-info">
                <span>Creator</span>
                <strong>0x9D...45BE</strong>
              </div>

              <div className="model-rating">
                <span>Rating</span>
                <strong>★ 4.7</strong>
              </div>

            </div>

          </div>

        </Link>


      </section>

    </div>
  );
}

export default Marketplace;