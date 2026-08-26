import { useState } from "react";
import "./Dashboard.css";

function Dashboard() {
  const [showComingSoon, setShowComingSoon] = useState(false);

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

        {/* COMING SOON MESSAGE */}
        {showComingSoon && (
          <div className="coming-soon-message">
            🚀 Ethereum wallet connection is coming soon!
          </div>
        )}

        {/* DASHBOARD CARDS */}
        <div className="dashboard-grid">

          <div className="dashboard-card">
            <div className="card-number">0</div>

            <h2>Models Listed</h2>

            <p>
              AI models you have listed on the marketplace.
            </p>
          </div>

          <div className="dashboard-card">
            <div className="card-number">0</div>

            <h2>Licenses Owned</h2>

            <p>
              AI model licenses you currently own.
            </p>
          </div>

          <div className="dashboard-card">
            <div className="card-number">0</div>

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

      </main>

    </div>
  );
}

export default Dashboard;