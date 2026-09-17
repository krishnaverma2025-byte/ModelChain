import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Navbar.css";
import WalletStatus from './WalletStatus';

function Navbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch profile from Supabase
  const fetchProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  useEffect(() => {
    if (!supabase) return;
    // Get current logged-in user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser);
      }
    });

    // Listen for login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();

    setUser(null);
    setProfile(null);
    setMenuOpen(false);

    navigate("/");
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!user?.email) return;

    const { error } =
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset link has been sent to your email.");
    }

    setMenuOpen(false);
  };

  // Get user's name
  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "User";

  // Get profile picture
  const avatarUrl =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName
    )}&background=6d3df5&color=fff`;

  return (
    <header className="navbar">

      {/* LOGO */}
      <Link to="/" className="navbar-logo">
        MontAI
      </Link>


      {/* NAVIGATION */}
      <nav className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/marketplace">Marketplace</Link>
        <Link to="/upload-model">Upload Model</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>


      {/* RIGHT SIDE */}
      <div className="navbar-right">
        <WalletStatus />

        {user ? (

          <div className="profile-menu-wrapper">

            {/* PROFILE BUTTON */}
            <button
              className="profile-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
            >

              <img
                src={avatarUrl}
                alt="Profile"
                className="navbar-avatar"
              />

              <span className="navbar-user-name">
                {fullName}
              </span>

              <span className="dropdown-arrow">
                {menuOpen ? "▲" : "▼"}
              </span>

            </button>


            {/* PROFILE DROPDOWN */}
            {menuOpen && (

              <div className="profile-dropdown">

                {/* PROFILE HEADER */}
                <div className="dropdown-user">

                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="dropdown-avatar"
                  />

                  <div>
                    <strong>{fullName}</strong>
                  </div>

                </div>


                {/* DIVIDER */}
                <div className="dropdown-divider" />


                {/* VIEW PROFILE */}
                <button
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
                >
                  👤 View Profile
                </button>


                {/* EDIT PROFILE */}
                <button
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
                >
                  ✏️ Edit Profile
                </button>


                {/* RESET PASSWORD */}
                <button onClick={handleResetPassword}>
                  🔒 Reset Password
                </button>


                {/* DIVIDER */}
                <div className="dropdown-divider" />


                {/* LOGOUT */}
                <button
                  className="logout-menu-button"
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>

              </div>

            )}

          </div>

        ) : (

          /* LOGIN */
          <Link
            to="/login"
            className="login-button"
          >
            Login
          </Link>

        )}

      </div>

    </header>
  );
}

export default Navbar;
