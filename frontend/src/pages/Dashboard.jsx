import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./Dashboard.css";

function Dashboard() {
  const [models, setModels] = useState([]);
  const [editingModel, setEditingModel] = useState(null);
  const [showModels, setShowModels] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const fetchModels = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("models")
      .select("*")
      .eq("owner_id", user.id);

    if (error) {
      console.error("Error fetching models:", error);
      return;
    }

    setModels(data || []);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleEdit = (model) => {
    setEditingModel({ ...model });
  };

  const handleSaveChanges = async () => {
    if (!editingModel) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }

    const { error } = await supabase
      .from("models")
      .update({
        name: editingModel.name,
        description: editingModel.description,
        category: editingModel.category,
        price_eth: Number(editingModel.price_eth),
      })
      .eq("id", editingModel.id)
      .eq("owner_id", user.id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      alert("Could not update the model: " + error.message);
      return;
    }

    alert("Model updated successfully!");

    setEditingModel(null);
    fetchModels();
  };

  // DELETE MODEL
  const handleDelete = async (model) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${model.name}"?`
    );

    if (!confirmDelete) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }

    const { data, error } = await supabase
      .from("models")
      .delete()
      .eq("id", model.id)
      .eq("owner_id", user.id)
      .select();

    if (error) {
      console.error("DELETE ERROR:", error);
      alert("Could not delete the model: " + error.message);
      return;
    }

    // Make sure Supabase actually deleted something
    if (!data || data.length === 0) {
      console.error("DELETE FAILED: No row was deleted.");
      alert(
        "The model could not be deleted. Please check the Supabase DELETE policy."
      );
      return;
    }

    // Remove immediately from Dashboard
    setModels((currentModels) =>
      currentModels.filter((item) => item.id !== model.id)
    );

    // Keep View My Models button visible
    setShowModels(true);

    alert("Model deleted successfully!");
  };

  const handleConnectWallet = () => {
    setShowComingSoon(true);

    setTimeout(() => {
      setShowComingSoon(false);
    }, 2500);
  };

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">

        {/* HEADER */}
        <div className="dashboard-header">
          <div>
            <div className="section-label">
              YOUR DASHBOARD
            </div>

            <h1>Welcome to MontAI</h1>

            <p>
              Manage your AI models, licenses, and marketplace activity.
            </p>
          </div>
        </div>

        {/* COMING SOON */}
        {showComingSoon && (
          <div className="coming-soon-message">
            🚀 Ethereum wallet connection is coming soon!
          </div>
        )}

        {/* DASHBOARD CARDS */}
        <div className="dashboard-grid">

          {/* MODELS */}
          <div className="dashboard-card">

            <div className="card-number">
              {models.length}
            </div>

            <h2>Models Listed</h2>

            <p>
              AI models you have listed on the marketplace.
            </p>

            {/* ALWAYS VISIBLE */}
            <button
              className="view-models-button"
              onClick={() => setShowModels(!showModels)}
            >
              {showModels ? "Hide My Models ▲" : "View My Models ▼"}
            </button>

            {/* MODEL LIST */}
            {showModels && (
              <div className="my-models-list">

                {models.map((model) => (
                  <div
                    className="my-model-item"
                    key={model.id}
                  >
                    <div>
                      <strong>{model.name}</strong>

                      <span>
                        {model.category} •{" "}
                        {model.price_eth
                          ? `${model.price_eth} ETH`
                          : "Price not set"}
                      </span>
                    </div>

                    <div className="model-actions">

                      <button
                        className="edit-model-button"
                        onClick={() => handleEdit(model)}
                      >
                        ✎ Edit
                      </button>

                      <button
                        className="delete-model-button"
                        onClick={() => handleDelete(model)}
                      >
                        🗑 Delete
                      </button>

                    </div>
                  </div>
                ))}

              </div>
            )}

          </div>

          {/* LICENSES */}
          <div className="dashboard-card">

            <div className="card-number">
              0
            </div>

            <h2>Licenses Owned</h2>

            <p>
              AI model licenses you currently own.
            </p>

          </div>

          {/* TRANSACTIONS */}
          <div className="dashboard-card">

            <div className="card-number">
              0
            </div>

            <h2>Transactions</h2>

            <p>
              Your marketplace transactions and activity.
            </p>

            <button
              className="dashboard-wallet-button"
              onClick={handleConnectWallet}
            >
              ◈ Connect Wallet
            </button>

          </div>

        </div>

        {/* EDIT MODEL MODAL */}
        {editingModel && (
          <div className="edit-overlay">

            <div className="edit-modal">

              <button
                className="close-edit-button"
                onClick={() => setEditingModel(null)}
              >
                ×
              </button>

              <div className="section-label">
                EDIT MODEL
              </div>

              <h2>{editingModel.name}</h2>

              <div className="edit-form-group">

                <label>Model Name</label>

                <input
                  type="text"
                  value={editingModel.name || ""}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      name: e.target.value,
                    })
                  }
                />

              </div>

              <div className="edit-form-group">

                <label>Description</label>

                <textarea
                  rows="4"
                  value={editingModel.description || ""}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      description: e.target.value,
                    })
                  }
                />

              </div>

              <div className="edit-form-group">

                <label>Category</label>

                <select
                  value={editingModel.category || ""}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      category: e.target.value,
                    })
                  }
                >
                  <option>Computer Vision</option>
                  <option>Natural Language</option>
                  <option>Predictive AI</option>
                  <option>Generative AI</option>
                </select>

              </div>

              <div className="edit-form-group">

                <label>License Price (ETH)</label>

                <input
                  type="number"
                  step="0.01"
                  value={editingModel.price_eth || ""}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      price_eth: e.target.value,
                    })
                  }
                />

              </div>

              <div className="edit-buttons">

                <button
                  className="cancel-edit-button"
                  onClick={() => setEditingModel(null)}
                >
                  Cancel
                </button>

                <button
                  className="save-edit-button"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </button>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default Dashboard;