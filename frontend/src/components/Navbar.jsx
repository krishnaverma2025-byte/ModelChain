import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleConnectWallet = () => {
    setShowComingSoon(true);

    setTimeout(() => {
      setShowComingSoon(false);
    }, 2500);
  };

  return (
    <>
      <header className="navbar">

        <Link to="/" className="navbar-logo">
          MontAI
        </Link>

        <nav className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/upload-model">Upload Model</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>

        <div className="navbar-right">

          <button
            className="navbar-wallet-button"
            onClick={handleConnectWallet}
          >
            ◈ Connect Wallet
          </button>

          {user ? (
            <div className="user-section">

              <Link
                to="/profile"
                className="profile-button"
              >
                {user.email}
              </Link>

              <button
                className="logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>

            </div>
          ) : (
            <Link
              to="/login"
              className="login-button"
            >
              Login
            </Link>
          )}

        </div>

      </header>

      {showComingSoon && (
        <div className="wallet-coming-soon">
          🚀 Ethereum wallet connection is coming soon!
        </div>
      )}
    </>
  );
}

export default Navbar;