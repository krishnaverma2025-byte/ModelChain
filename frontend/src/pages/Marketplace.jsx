import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Marketplace.css";

function Marketplace() {
  // Original dummy models
  const dummyModels = [
    {
      id: "vision-ai",
      name: "Vision AI",
      description:
        "Advanced computer vision model for image recognition and analysis.",
      price_eth: 0.05,
      category: "Computer Vision",
    },
    {
      id: "textmind",
      name: "TextMind",
      description:
        "Powerful language model designed for intelligent text generation.",
      price_eth: 0.08,
      category: "Natural Language",
    },
    {
      id: "predictx",
      name: "PredictX",
      description:
        "Machine learning model for predictive analytics and forecasting.",
      price_eth: 0.04,
      category: "Predictive AI",
    },
  ];

  const [models, setModels] = useState(dummyModels);

  // Fetch models from Supabase
  const fetchModels = async () => {
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching models:", error);

      // Keep dummy models if Supabase fails
      setModels(dummyModels);
      return;
    }

    // Dummy + models currently existing in Supabase
    setModels([...dummyModels, ...(data || [])]);
  };

  useEffect(() => {
    // Initial fetch
    fetchModels();

    // Listen for changes in the models table
    const channel = supabase
      .channel("models-marketplace-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "models",
        },
        () => {
          // Refresh Marketplace whenever a model is
          // inserted, updated, or deleted
          fetchModels();
        }
      )
      .subscribe();

    // Also refresh when returning to the Marketplace tab/page
    const handleFocus = () => {
      fetchModels();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

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
            <div
              className="model-card"
              key={model.id}
            >

              <div className="model-icon">
                AI
              </div>

              <h2>
                {model.name}
              </h2>

              <p>
                {model.description || "No description available."}
              </p>

              <div className="model-info">

                <strong>
                  {model.price_eth !== null &&
                  model.price_eth !== undefined &&
                  model.price_eth !== ""
                    ? `${model.price_eth} ETH`
                    : "Price not set"}
                </strong>

                <span>
                  {model.category}
                </span>

              </div>

              <Link
                to={`/model/${model.id}`}
                className="model-button"
              >
                <span>
                  View Model Details
                </span>

                <span className="button-arrow">
                  →
                </span>
              </Link>

            </div>
          ))}

        </div>

      </main>
    </div>
  );
}

export default Marketplace;