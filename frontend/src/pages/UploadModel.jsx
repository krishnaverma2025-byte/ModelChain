import { Link } from "react-router-dom";
import "./UploadModel.css";

function UploadModel() {
  return (
    <div className="upload-page">

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
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Describe your AI model"
              rows="5"
            />
          </div>

          <div className="form-row">

            <div className="form-group">
              <label>Category</label>
              <select>
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
              />
            </div>

          </div>

          <div className="form-group">
            <label>Model File</label>

            <div className="file-upload">
              <input type="file" />
              <span>Select model file</span>
            </div>
          </div>

          <button className="upload-button">
            Register Model
          </button>

        </div>

      </main>

    </div>
  );
}

export default UploadModel;