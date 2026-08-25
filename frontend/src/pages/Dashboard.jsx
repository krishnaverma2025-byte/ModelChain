import { Link } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        <h1 className="dashboard-title">
          Dashboard
        </h1>

        <p className="dashboard-subtitle">
          Manage your AI models, licenses, and marketplace activity.
        </p>

        <div className="dashboard-grid">

          <div className="dashboard-card">
            <div className="dashboard-stat">0</div>
            <h3>My Models</h3>
            <p>
              AI models you have uploaded to MontAI.
            </p>

            <Link
              to="/upload-model"
              className="dashboard-button"
            >
              Upload Model
            </Link>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-stat">0</div>
            <h3>Licensed Models</h3>
            <p>
              Models you have licensed from the marketplace.
            </p>

            <Link
              to="/marketplace"
              className="dashboard-button"
            >
              Explore Models
            </Link>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-stat">0</div>
            <h3>Transactions</h3>
            <p>
              Your marketplace transactions and activity.
            </p>
          </div>

        </div>

        <div className="dashboard-section">

          <h2>Recent Activity</h2>

          <div className="empty-dashboard">
            <p>
              No activity yet.
            </p>

            <Link
              to="/marketplace"
              className="dashboard-button"
            >
              Browse Marketplace
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Dashboard;