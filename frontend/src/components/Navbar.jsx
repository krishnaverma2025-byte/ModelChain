import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get currently logged-in user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for login/logout changes
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="navbar">

      {/* LOGO */}
      <Link to="/" className="navbar-logo">
        Mont<span>AI</span>
      </Link>

      {/* CENTER NAVIGATION */}
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/marketplace">Marketplace</Link>
        <Link to="/upload-model">Upload Model</Link>
        <Link to="/dashboard">Dashboard</Link>
      </div>

      {/* RIGHT SIDE */}
      <div className="navbar-right">

        {user ? (
          <div className="user-section">

            {/* PROFILE */}
            <Link to="/profile" className="profile-button">
              {user.email}
            </Link>

            {/* LOGOUT */}
            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>
        ) : (
          /* LOGIN */
          <Link to="/login" className="login-button">
            Login
          </Link>
        )}

      </div>

    </nav>
  );
}

export default Navbar;