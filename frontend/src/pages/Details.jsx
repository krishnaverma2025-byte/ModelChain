import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Details.css";

const dummyModels = [
  {
    id: "vision-ai",
    name: "Vision AI",
    description:
      "Advanced computer vision model for image recognition and analysis.",
    category: "Computer Vision",
    price_eth: 0.05,
    owner_id: "MontAI",
  },
  {
    id: "textmind",
    name: "TextMind",
    description:
      "Powerful language model designed for intelligent text generation.",
    category: "Natural Language",
    price_eth: 0.08,
    owner_id: "MontAI",
  },
  {
    id: "predictx",
    name: "PredictX",
    description:
      "Machine learning model for predictive analytics and forecasting.",
    category: "Predictive AI",
    price_eth: 0.04,
    owner_id: "MontAI",
  },
];

function Details() {
  const { id } = useParams();

  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModel = async () => {
      setLoading(true);

      // First check Supabase
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (data) {
        setModel(data);
        setLoading(false);
        return;
      }

      // If not found in Supabase, check dummy models
      const dummyModel = dummyModels.find(
        (item) => item.id === id
      );

      if (dummyModel) {
        setModel(dummyModel);
      } else {
        setModel(null);
      }

      if (error) {
        console.error("Supabase lookup:", error);
      }

      setLoading(false);
    };

    fetchModel();
  }, [id]);

  if (loading) {
    return (
      <div className="details-page">
        <main className="details-content">
          <div className="section-label">
            MODEL DETAILS
          </div>

          <h1>Loading Model...</h1>
        </main>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="details-page">
        <main className="details-content">

          <div className="section-label">
            MODEL DETAILS
          </div>

          <h1>Model Not Found</h1>

          <p className="details-description">
            The model you are looking for does not exist.
          </p>

          <Link
            to="/marketplace"
            className="back-button"
          >
            ← Back to Marketplace
          </Link>

        </main>
      </div>
    );
  }

  return (
    <div className="details-page">

      <main className="details-content">

        <div className="section-label">
          MODEL DETAILS
        </div>

        <h1>{model.name}</h1>

        <p className="details-description">
          {model.description}
        </p>

        <div className="details-card">

          {/* AI ICON */}
          <div className="details-icon">
            AI
          </div>

          {/* MODEL INFORMATION */}
          <div className="details-info">

            <div className="detail-item">
              <span>Category</span>
              <strong>
                {model.category}
              </strong>
            </div>

            <div className="detail-item">
              <span>License Price</span>

              <strong>
                {model.price_eth !== null &&
                model.price_eth !== undefined &&
                model.price_eth !== ""
                  ? `${model.price_eth} ETH`
                  : "Price not set"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Owner</span>

              <strong>
                {model.owner_id
                  ? model.owner_id.length > 12
                    ? `${model.owner_id.substring(0, 8)}...`
                    : model.owner_id
                  : "Unknown"}
              </strong>
            </div>

          </div>

          {/* LICENSE BUTTON */}
          <button className="license-button">
            License This Model
          </button>

        </div>

        <Link
          to="/marketplace"
          className="back-link"
        >
          ← Back to Marketplace
        </Link>

      </main>

    </div>
  );
}

export default Details;