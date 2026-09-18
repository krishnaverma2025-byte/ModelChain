import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { readContract, metadata, short } from "../blockchain";
import "./Marketplace.css";



function Marketplace() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchModels = async () => {
    try {

      // Read the explicitly configured chain, not a cached catalogue.
      const contract = await readContract();

      const count = await contract.getModelCount();

      const blockchainModels = [];

      for (let i = 1; i <= Number(count); i++) {
        try {
          const data = await contract.getModel(i);

          if (!data || !data.active) {
            continue;
          }

          const extra = await metadata(i);
          blockchainModels.push({
            id: data.id.toString(),
            name: data.name,
            description: extra.description,
            price_eth: ethers.formatEther(data.price),
            category: extra.category,
            owner: data.owner,
            cid: data.cid,
            modelHash: data.modelHash,
            royalty: data.royalty.toString(),
          });
        } catch (modelError) {
          console.log(
            `Skipping model ${i}:`,
            modelError
          );
        }
      }

      setModels(blockchainModels);
      setError("");
    } catch (err) {
      console.error(
        "Error fetching blockchain models:",
        err
      );

      setModels([]);

      setError(
        err?.shortMessage ||
          err?.message ||
          "Could not connect to the Hardhat blockchain."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) fetchModels(); });

    const handleFocus = () => {
      fetchModels();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  if (loading) {
    return (
      <div className="marketplace-page">
        <main className="marketplace-content">
          <div className="section-label">
            BLOCKCHAIN MARKETPLACE
          </div>

          <h1>Discover AI Models</h1>

          <p className="section-description">
            Loading models from the blockchain...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="marketplace-page">
      <main className="marketplace-content">

        <div className="section-label">
          BLOCKCHAIN MARKETPLACE
        </div>

        <h1>Discover AI Models</h1>

        <p className="section-description">
          Discover → License → Verify. Explore models registered on ModelChain.
        </p>

        {error && (
          <div
            style={{
              marginBottom: "30px",
              padding: "15px",
              borderRadius: "10px",
              color: "#ff6b6b",
              background: "rgba(255, 107, 107, 0.08)",
            }}
          >
            {error}
          </div>
        )}

        {models.length === 0 && !error && (
          <div className="not-found">
            <h2>No models available</h2>

            <p>
              Register an AI model on the blockchain
              to see it here.
            </p>
          </div>
        )}

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
                {model.description}
              </p>
              <small title={model.owner}>Creator {short(model.owner)}</small>

              <div className="model-info">

                <strong>
                  {model.price_eth} ETH
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
