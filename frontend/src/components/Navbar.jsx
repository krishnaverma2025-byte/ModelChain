import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useIdentity from "../useIdentity";
import { logout } from "../identity";
import { errorText } from "../blockchain";
import WalletStatus from "./WalletStatus";
export default function Navbar() {
  const { profile } = useIdentity(),
    navigate = useNavigate(),
    ref = useRef(null);
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const close = (e) => {
      if (
        e.key === "Escape" ||
        (e.type === "pointerdown" && !ref.current?.contains(e.target))
      )
        setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, []);
  const name = profile?.user_metadata?.full_name || profile?.email || "Profile";
  return (
    <header className="navbar">
      <Link to="/" className="navbar-logo">
        MontAI
      </Link>
      <nav className="navbar-links" aria-label="Primary navigation">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/marketplace">Marketplace</NavLink>
        <NavLink to="/upload-model">Upload</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/activity">Activity</NavLink>
      </nav>
      <div className="navbar-right">
        <WalletStatus />
        {profile && (
          <div className="profile-menu-wrapper" ref={ref}>
            <button
              className="profile-menu-button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {name} ▾
            </button>
            {open && (
              <div className="profile-dropdown">
                <strong>{name}</strong>
                <p>{profile.email}</p>
                <Link to="/profile" onClick={() => setOpen(false)}>
                  View Profile
                </Link>
                <Link to="/profile" onClick={() => setOpen(false)}>
                  Edit Profile
                </Link>
                <Link to="/profile" onClick={() => setOpen(false)}>
                  Linked Wallet
                </Link>
                <button
                  onClick={async () => {
                    setOpen(false);
                    try {
                      await logout();
                      navigate("/");
                    } catch (e) {
                      setError(errorText(e));
                    }
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </header>
  );
}
