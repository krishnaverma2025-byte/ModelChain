import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UploadModel.css";
import { supabase } from "../supabaseClient";

function UploadModel() {
  const navigate = useNavigate();

  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Computer Vision");
  const [price, setPrice] = useState("0.05");
  const [modelFile, setModelFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setModelFile(e.target.files[0] || null);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    // Basic validation
    if (!modelName.trim()) {
      setError("Please enter a model name.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!modelFile) {
      setError("Please select a model file.");
      return;
    }

    if (!price || Number(price) < 0) {
      setError("Please enter a valid license price.");
      return;
    }

    setLoading(true);

    try {
      // 1. Get currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You must be logged in to upload a model.");
        setLoading(false);
        return;
      }

      // 2. Create a unique file path
      const fileExtension = modelFile.name.includes(".")
        ? modelFile.name.split(".").pop()
        : "";

      const uniqueFileName = `${crypto.randomUUID()}${
        fileExtension ? "." + fileExtension : ""
      }`;

      const filePath = `${user.id}/${uniqueFileName}`;

      // 3. Upload actual model file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("models")
        .upload(filePath, modelFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 4. Save model information in database
      const { error: databaseError } = await supabase
        .from("models")
        .insert([
          {
            owner_id: user.id,
            name: modelName.trim(),
            description: description.trim(),
            category: category,
            price_eth: Number(price),
            file_path: filePath,
            file_name: modelFile.name,
          },
        ]);

      // If database insert fails, remove uploaded file
      if (databaseError) {
        await supabase.storage
          .from("models")
          .remove([filePath]);

        throw databaseError;
      }

      // 5. Success
      setMessage("Model registered successfully!");

      // 6. Go to Dashboard after successful upload
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err) {
      console.error("Model upload error:", err);
      setError(err.message || "Something went wrong while uploading the model.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">

      <main className="upload-content">

        <div className="section-label">
          LIST YOUR MODEL
        </div>

        <h1>Upload AI Model</h1>

        <p className="upload-description">
          Register your AI model and make it available for decentralized
          licensing.
        </p>

        <div className="upload-card">

          <div className="form-group">
            <label>Model Name</label>

            <input
              type="text"
              placeholder="Enter model name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>


          <div className="form-group">
            <label>Description</label>

            <textarea
              placeholder="Describe your AI model"
              rows="5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>


          <div className="form-row">

            <div className="form-group">
              <label>Category</label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Computer Vision</option>
                <option>Natural Language</option>
                <option>Predictive AI</option>
                <option>Generative AI</option>
              </select>
            </div>


            <div className="form-group">
              <label>License Price (ETH)</label>

              <input
                type="number"
                placeholder="0.05"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

          </div>


          <div className="form-group">
            <label>Model File</label>

            <div className="file-upload">
              <input
                type="file"
                onChange={handleFileChange}
              />

              <span>
                {modelFile
                  ? modelFile.name
                  : "Select model file"}
              </span>
            </div>
          </div>


          {/* Success message */}
          {message && (
            <p
              style={{
                color: "#4ade80",
                marginTop: "15px",
                textAlign: "center",
              }}
            >
              {message}
            </p>
          )}


          {/* Error message */}
          {error && (
            <p
              style={{
                color: "#ff6b6b",
                marginTop: "15px",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}


          <button
            className="upload-button"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Uploading..." : "Register Model"}
          </button>

        </div>

      </main>

    </div>
  );
}

export default UploadModel;